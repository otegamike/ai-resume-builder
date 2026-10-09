import "server-only";

import { Types } from "mongoose";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import EmailOutbox, { type EmailOutboxType, type EmailPriority } from "@/models/EmailOutbox";
import EmailSuppression from "@/models/EmailSuppression";
import { getEmailConfig } from "./config";

void User;
void EmailOutbox;
void EmailSuppression;

export interface EnqueueParams {
  type: EmailOutboxType;
  to: string;
  userId?: Types.ObjectId | string;
  payload?: Record<string, unknown>;
  dedupeKey: string;
  priority?: EmailPriority;
  sendAfter?: Date;
  relatedActivityId?: Types.ObjectId | string;
}

export type EnqueueResult =
  | { status: "queued"; outboxId: string }
  | { status: "duplicate"; outboxId: string }
  | { status: "skipped"; reason: string }
  | { status: "disabled" };

/** Canonical idempotency keys. Re-running the same event reuses the same key. */
export const dedupeKeys = {
  welcome: (userId: string) => `welcome:${userId}`,
  applicationSubmitted: (applicationId: string) => `app-submitted:${applicationId}`,
  applicationReceived: (applicationId: string) => `app-received:${applicationId}`,
  applicationReminder: (draftId: string, n = 1) => `app-reminder:${draftId}:${n}`,
};

export function defaultPriorityFor(type: EmailOutboxType): EmailPriority {
  if (type === "application-reminder" || type === "job-alert") return 1;
  return 0;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function isSuppressed(email: string): Promise<boolean> {
  await dbConnect();
  const found = await EmailSuppression.findOne({ email: normalizeEmail(email) })
    .select("_id")
    .lean();
  return !!found;
}

/**
 * Preference gate. Transactional mail always passes. Phase 2+ types require
 * explicit opt-in, which nobody has yet (defaults are OFF, no migration).
 */
export async function passesPreferences(
  type: EmailOutboxType,
  userId?: Types.ObjectId | string
): Promise<boolean> {
  if (type === "job-alert") {
    if (!userId) return false;
    const config = getEmailConfig();
    if (!config.flagJobAlerts) return false;
    await dbConnect();
    const user = await User.findById(userId).select("emailPreferences").lean();
    return user?.emailPreferences?.jobAlerts === true;
  }
  return true;
}

/**
 * Insert an outbox row (idempotent on dedupeKey). Never throws for expected
 * skip conditions; unexpected DB errors propagate so the caller can log them.
 * Callers must wrap in try/catch so email can never fail the triggering flow.
 */
export async function enqueue(params: EnqueueParams): Promise<EnqueueResult> {
  const config = getEmailConfig();
  if (!config.enabled) return { status: "disabled" };

  const to = normalizeEmail(params.to);
  if (!isValidEmail(to)) return { status: "skipped", reason: "invalid_recipient" };

  if (params.type === "application-reminder" && !config.flagApplicationReminder) {
    return { status: "skipped", reason: "flag_disabled" };
  }
  if (params.type === "job-alert" && !config.flagJobAlerts) {
    return { status: "skipped", reason: "flag_disabled" };
  }

  if (await isSuppressed(to)) return { status: "skipped", reason: "suppressed" };
  if (!(await passesPreferences(params.type, params.userId))) {
    return { status: "skipped", reason: "opted_out" };
  }

  // In non-production, only allowlisted addresses may receive real mail.
  // Dry-run still writes the row so drains can be observed without sending.
  if (!config.isProduction && !config.dryRun && config.devAllowlist.length > 0) {
    if (!config.devAllowlist.includes(to)) {
      return { status: "skipped", reason: "not_allowlisted" };
    }
  }

  await dbConnect();
  try {
    const created = await EmailOutbox.create({
      type: params.type,
      userId: params.userId ? new Types.ObjectId(String(params.userId)) : undefined,
      to,
      payload: params.payload ?? {},
      dedupeKey: params.dedupeKey,
      priority: params.priority ?? defaultPriorityFor(params.type),
      status: "pending",
      attempts: 0,
      sendAfter: params.sendAfter ?? new Date(),
      relatedActivityId: params.relatedActivityId
        ? new Types.ObjectId(String(params.relatedActivityId))
        : undefined,
    });
    return { status: "queued", outboxId: String(created._id) };
  } catch (error: unknown) {
    const err = error as { code?: number };
    if (err?.code === 11000) {
      const existing = await EmailOutbox.findOne({ dedupeKey: params.dedupeKey })
        .select("_id")
        .lean();
      if (existing) return { status: "duplicate", outboxId: String(existing._id) };
    }
    throw error;
  }
}
