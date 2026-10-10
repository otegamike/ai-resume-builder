import "server-only";

import dbConnect from "@/lib/db";
import EmailOutbox from "@/models/EmailOutbox";
import { getEmailConfig } from "./config";
import { getResend, getFromAddress, getReplyToAddress } from "./client";
import { claimNext, markSent, markSkipped, markFailed } from "./outbox";
import { tryConsumeQuota } from "./quota";
import { isSuppressed, passesPreferences } from "./dispatcher";
import { renderEmail, type RenderedEmail } from "./render";

void EmailOutbox;

export interface DrainOptions {
  limit?: number;
  now?: Date;
}

export interface DrainResult {
  claimed: number;
  sent: number;
  skipped: number;
  deferred: number;
  stoppedOnQuota: boolean;
}

export interface SendFn {
  (args: {
    to: string;
    subject: string;
    html: string;
    text: string;
    dedupeKey: string;
    from?: string;
    replyTo?: string;
  }): Promise<{ id: string }>;
}

export type SendFailure =
  | { kind: "retryable"; message: string }
  | { kind: "failed"; message: string }
  | { kind: "quota"; message: string };

export class SendError extends Error {
  failure: SendFailure;
  constructor(failure: SendFailure) {
    super(failure.message);
    this.failure = failure;
  }
}

/** Map a Resend SDK error (or network throw) onto an outbox decision. */
export function classifyResendError(error: unknown): SendFailure {
  const err = error as {
    statusCode?: number;
    status?: number;
    name?: string;
    message?: string;
  };
  const status = err?.statusCode ?? err?.status ?? 0;
  const name = String(err?.name ?? "");
  const message = String(err?.message ?? "resend_error");

  if (name === "daily_quota_exceeded" || name === "monthly_quota_exceeded") {
    return { kind: "quota", message };
  }
  if (status === 429 || status >= 500 || status === 0) {
    return { kind: "retryable", message };
  }
  return { kind: "failed", message };
}

function nextUtcMidnight(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 1, 0));
}

export function defaultSender(): SendFn {
  return async ({ to, subject, html, text, dedupeKey, from, replyTo }) => {
    const resend = getResend();
    let result: { data: { id: string } | null; error: unknown };
    try {
      result = (await resend.emails.send(
        {
          from: from || getFromAddress(),
          to,
          subject,
          html,
          text,
          replyTo: replyTo || getReplyToAddress(),
        },
        { idempotencyKey: dedupeKey }
      )) as { data: { id: string } | null; error: unknown };
    } catch (error) {
      throw new SendError(classifyResendError(error));
    }
    if (result.error || !result.data?.id) {
      throw new SendError(classifyResendError(result.error));
    }
    return { id: result.data.id };
  };
}

/**
 * Claim and send up to `limit` due rows. Single source of truth for both the
 * post-response `after()` drain and the cron safety net.
 */
export async function drainOutbox(options?: DrainOptions, sender?: SendFn): Promise<DrainResult> {
  const limit = options?.limit ?? 10;
  const now = options?.now ?? new Date();
  const send = sender ?? defaultSender();
  const result: DrainResult = { claimed: 0, sent: 0, skipped: 0, deferred: 0, stoppedOnQuota: false };

  for (let i = 0; i < limit; i += 1) {
    const row = await claimNext(now);
    if (!row) break;
    result.claimed += 1;

    let rendered: RenderedEmail;
    try {
      rendered = await renderEmail(row.type, (row.payload ?? {}) as Record<string, unknown>);
    } catch (error) {
      await markSkipped(row._id, `render_error:${error instanceof Error ? error.message : "unknown"}`);
      result.skipped += 1;
      continue;
    }
    await dbConnect();
    await EmailOutbox.updateOne({ _id: row._id }, { $set: { subject: rendered.subject } });

    if (await isSuppressed(row.to)) {
      await markSkipped(row._id, "suppressed");
      result.skipped += 1;
      continue;
    }
    if (!(await passesPreferences(row.type, row.userId))) {
      await markSkipped(row._id, "opted_out");
      result.skipped += 1;
      continue;
    }
    if (row.type === "application-reminder" && !getEmailConfig().flagApplicationReminder) {
      await markSkipped(row._id, "flag_disabled");
      result.skipped += 1;
      continue;
    }
    if (row.type === "application-submitted" && !getEmailConfig().flagApplicationSubmitted) {
      await markSkipped(row._id, "flag_disabled");
      result.skipped += 1;
      continue;
    }
    if (row.type === "job-alert" && !getEmailConfig().flagJobAlerts) {
      await markSkipped(row._id, "flag_disabled");
      result.skipped += 1;
      continue;
    }

    if (getEmailConfig().dryRun) {
      await markSent(row._id, `dry-run-${row.dedupeKey}`.slice(0, 256));
      result.sent += 1;
      continue;
    }

    const quota = await tryConsumeQuota(row.priority);
    if (!quota.allowed) {
      await dbConnect();
      if (quota.reason === "deferred_priority") {
        // P1/P2 waits; keep draining in case P0 rows remain behind it.
        await EmailOutbox.updateOne(
          { _id: row._id },
          {
            $set: { status: "pending", lockedAt: null, lastError: quota.reason, sendAfter: new Date(now.getTime() + 3_600_000) },
            $inc: { attempts: -1 },
          }
        );
        result.deferred += 1;
        continue;
      }
      // Daily/monthly budget hit: pause entirely, resume after UTC midnight.
      await EmailOutbox.updateOne(
        { _id: row._id },
        {
          $set: { status: "pending", lockedAt: null, lastError: quota.reason, sendAfter: nextUtcMidnight(now) },
          $inc: { attempts: -1 },
        }
      );
      result.deferred += 1;
      result.stoppedOnQuota = true;
      break;
    }

    try {
      const { id } = await send({
        to: row.to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        dedupeKey: row.dedupeKey,
        from: rendered.from,
        replyTo: rendered.replyTo,
      });
      await markSent(row._id, id);
      result.sent += 1;
    } catch (error) {
      if (error instanceof SendError && error.failure.kind === "quota") {
        // Resend-side quota (differs from our guard under clock skew): pause.
        await dbConnect();
        await EmailOutbox.updateOne(
          { _id: row._id },
          {
            $set: { status: "pending", lockedAt: null, lastError: "resend_quota", sendAfter: nextUtcMidnight(now) },
            $inc: { attempts: -1 },
          }
        );
        result.deferred += 1;
        result.stoppedOnQuota = true;
        break;
      }
      const retryable = error instanceof SendError ? error.failure.kind === "retryable" : true;
      const message = error instanceof Error ? error.message : "send_error";
      await markFailed(row._id, message.slice(0, 500), retryable, now);
      if (!retryable) result.skipped += 1;
    }
  }

  return result;
}
