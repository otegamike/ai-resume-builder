import "server-only";

import dbConnect from "@/lib/db";
import EmailOutbox, { type IEmailOutbox } from "@/models/EmailOutbox";
import { getEmailConfig } from "./config";
import { getResend, getFromAddress, getReplyToAddress } from "./client";
import { claimNext, markSent, markSkipped, markFailed } from "./outbox";
import { tryConsumeQuota } from "./quota";
import { enqueue, isSuppressed, passesPreferences, type EnqueueParams } from "./dispatcher";
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

export type AttemptOutcome =
  | { status: "sent"; resendId: string }
  | { status: "skipped"; reason: string }
  | {
      status: "deferred";
      reason: "deferred_priority" | "daily_quota_exceeded" | "monthly_quota_exceeded" | "resend_quota";
    }
  | { status: "failed"; reason: string; retryable: boolean };

/**
 * Run one claimed row through the full pipeline: render, suppression,
 * preferences, flags, dry-run, quota, send. Shared by the cron drain and
 * the synchronous send path so both behave identically.
 */
export async function attemptRow(
  row: IEmailOutbox,
  sender: SendFn,
  now: Date = new Date()
): Promise<AttemptOutcome> {
  let rendered: RenderedEmail;
  try {
    rendered = await renderEmail(row.type, (row.payload ?? {}) as Record<string, unknown>);
  } catch (error) {
    const reason = `render_error:${error instanceof Error ? error.message : "unknown"}`;
    await markSkipped(row._id, reason);
    return { status: "skipped", reason };
  }
  await dbConnect();
  await EmailOutbox.updateOne({ _id: row._id }, { $set: { subject: rendered.subject } });

  if (await isSuppressed(row.to)) {
    await markSkipped(row._id, "suppressed");
    return { status: "skipped", reason: "suppressed" };
  }
  if (!(await passesPreferences(row.type, row.userId))) {
    await markSkipped(row._id, "opted_out");
    return { status: "skipped", reason: "opted_out" };
  }
  if (row.type === "application-reminder" && !getEmailConfig().flagApplicationReminder) {
    await markSkipped(row._id, "flag_disabled");
    return { status: "skipped", reason: "flag_disabled" };
  }
  if (row.type === "application-submitted" && !getEmailConfig().flagApplicationSubmitted) {
    await markSkipped(row._id, "flag_disabled");
    return { status: "skipped", reason: "flag_disabled" };
  }
  if (row.type === "job-alert" && !getEmailConfig().flagJobAlerts) {
    await markSkipped(row._id, "flag_disabled");
    return { status: "skipped", reason: "flag_disabled" };
  }

  if (getEmailConfig().dryRun) {
    const resendId = `dry-run-${row.dedupeKey}`.slice(0, 256);
    await markSent(row._id, resendId);
    return { status: "sent", resendId };
  }

  const quota = await tryConsumeQuota(row.priority);
  if (!quota.allowed) {
    await dbConnect();
    if (quota.reason === "deferred_priority") {
      // P1/P2 waits; the drain keeps going in case P0 rows remain behind it.
      await EmailOutbox.updateOne(
        { _id: row._id },
        {
          $set: { status: "pending", lockedAt: null, lastError: quota.reason, sendAfter: new Date(now.getTime() + 3_600_000) },
          $inc: { attempts: -1 },
        }
      );
      return { status: "deferred", reason: quota.reason };
    }
    // Daily/monthly budget hit: pause entirely, resume after UTC midnight.
    await EmailOutbox.updateOne(
      { _id: row._id },
      {
        $set: { status: "pending", lockedAt: null, lastError: quota.reason, sendAfter: nextUtcMidnight(now) },
        $inc: { attempts: -1 },
      }
    );
    return { status: "deferred", reason: quota.reason };
  }

  try {
    const { id } = await sender({
      to: row.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      dedupeKey: row.dedupeKey,
      from: rendered.from,
      replyTo: rendered.replyTo,
    });
    await markSent(row._id, id);
    return { status: "sent", resendId: id };
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
      return { status: "deferred", reason: "resend_quota" };
    }
    const retryable = error instanceof SendError ? error.failure.kind === "retryable" : true;
    const message = error instanceof Error ? error.message : "send_error";
    await markFailed(row._id, message.slice(0, 500), retryable, now);
    return { status: "failed", reason: message.slice(0, 500), retryable };
  }
}

export type SyncSendStatus = "sent" | "queued" | "failed" | "skipped" | "already-sent";

export interface SyncSendResult {
  status: SyncSendStatus;
  resendId?: string;
  reason?: string;
}

/** Upper bound for one inline send attempt. The row (and cron) owns the rest. */
export const SYNC_SEND_TIMEOUT_MS = 8000;

function mapAttemptToSync(outcome: AttemptOutcome): SyncSendResult {
  switch (outcome.status) {
    case "sent":
      return { status: "sent", resendId: outcome.resendId };
    case "skipped":
      return { status: "skipped", reason: outcome.reason };
    case "deferred":
      return { status: "queued", reason: outcome.reason };
    case "failed":
      return outcome.retryable
        ? { status: "queued", reason: outcome.reason }
        : { status: "failed", reason: outcome.reason };
  }
}

/**
 * Attempt one outbox row synchronously, bounded by a timeout. On timeout the
 * in-flight attempt keeps settling the row in the background (the Resend
 * idempotency key prevents duplicate delivery) while the caller moves on.
 */
export async function sendRowNow(
  row: IEmailOutbox,
  sender?: SendFn,
  timeoutMs: number = SYNC_SEND_TIMEOUT_MS,
  now: Date = new Date()
): Promise<SyncSendResult> {
  const send = sender ?? defaultSender();
  const settled: Promise<AttemptOutcome> = attemptRow(row, send, now).catch((err) => {
    console.error("Background email send failed:", err);
    return { status: "failed", reason: "send_error", retryable: true } as AttemptOutcome;
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const outcome = await Promise.race([
      settled,
      new Promise<AttemptOutcome>((resolve) => {
        timer = setTimeout(
          () => resolve({ status: "failed", reason: "send_timeout", retryable: true }),
          timeoutMs
        );
      }),
    ]);
    if (outcome.status === "failed" && outcome.reason === "send_timeout") {
      return { status: "queued", reason: "send_timeout" };
    }
    return mapAttemptToSync(outcome);
  } finally {
    // Never let a won race's timer hold the serverless invocation open.
    if (timer) clearTimeout(timer);
  }
}

/**
 * Synchronous priority send: idempotent enqueue followed by one inline
 * attempt. Double submits collapse onto the existing row — an already-sent
 * row is never transmitted twice.
 */
export async function enqueueAndSendNow(
  params: EnqueueParams,
  options?: { sender?: SendFn; timeoutMs?: number; now?: Date }
): Promise<SyncSendResult> {
  const placed = await enqueue(params);
  if (placed.status === "skipped") return { status: "skipped", reason: placed.reason };
  if (placed.status === "disabled") return { status: "skipped", reason: "disabled" };

  await dbConnect();
  const row = await EmailOutbox.findById(placed.outboxId);
  if (!row) return { status: "failed", reason: "row_missing" };

  if (placed.status === "duplicate") {
    if (row.status === "sent") {
      return { status: "already-sent", resendId: row.resendId ?? undefined };
    }
    if (row.status === "pending" || row.status === "sending") {
      // First flight (or cron) owns it; do not transmit twice.
      return { status: "queued", reason: "inflight" };
    }
    return { status: row.status === "skipped" ? "skipped" : "failed", reason: row.lastError || row.status };
  }

  return sendRowNow(row, options?.sender, options?.timeoutMs, options?.now);
}

/**
 * Claim and send up to `limit` due rows. Retry sweeper for anything the
 * synchronous path left pending, deferred, or scheduled.
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

    const outcome = await attemptRow(row, send, now);
    if (outcome.status === "sent") {
      result.sent += 1;
      continue;
    }
    if (outcome.status === "skipped") {
      result.skipped += 1;
      continue;
    }
    if (outcome.status === "deferred") {
      result.deferred += 1;
      if (outcome.reason !== "deferred_priority") {
        result.stoppedOnQuota = true;
        break;
      }
      continue;
    }
    // Failed non-retryably counts with skipped; retryable stays pending.
    if (!outcome.retryable) result.skipped += 1;
  }

  return result;
}
