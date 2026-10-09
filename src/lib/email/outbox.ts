import "server-only";

import { Types } from "mongoose";
import dbConnect from "@/lib/db";
import EmailOutbox, { type IEmailOutbox } from "@/models/EmailOutbox";

void EmailOutbox;

export const MAX_SEND_ATTEMPTS = 5;

/** Backoff after each failed attempt: 1m, 5m, 30m, 2h, 12h. */
export const RETRY_BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 3_600_000, 12 * 3_600_000];

/** A row stuck in `sending` longer than this is treated as stale and re-claimable. */
export const STALE_SENDING_MS = 10 * 60_000;

export function computeBackoffMs(attempts: number): number {
  const index = Math.min(Math.max(attempts - 1, 0), RETRY_BACKOFF_MS.length - 1);
  return RETRY_BACKOFF_MS[index] ?? RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1]!;
}

/**
 * Atomically claim the next due row. Prefers higher priority (0 first), then
 * oldest send time. Either a due `pending` row or a stale `sending` row.
 */
export async function claimNext(now: Date = new Date()): Promise<IEmailOutbox | null> {
  await dbConnect();
  const staleBefore = new Date(now.getTime() - STALE_SENDING_MS);
  const claimed = await EmailOutbox.findOneAndUpdate(
    {
      $or: [
        { status: "pending", sendAfter: { $lte: now } },
        { status: "sending", lockedAt: { $lt: staleBefore } },
      ],
    },
    { $set: { status: "sending", lockedAt: now }, $inc: { attempts: 1 } },
    { returnDocument: "after", sort: { priority: 1, sendAfter: 1 } }
  );
  return claimed;
}

export async function markSent(outboxId: Types.ObjectId, resendId: string): Promise<void> {
  await dbConnect();
  await EmailOutbox.updateOne(
    { _id: outboxId },
    { $set: { status: "sent", resendId, sentAt: new Date(), lastError: "" } }
  );
}

export async function markSkipped(outboxId: Types.ObjectId, reason: string): Promise<void> {
  await dbConnect();
  await EmailOutbox.updateOne(
    { _id: outboxId },
    { $set: { status: "skipped", lastError: reason } }
  );
}

/**
 * Record a failure. Retryable errors (429/5xx/network) reschedule with
 * backoff while attempts remain; anything else ends the row as failed.
 */
export async function markFailed(
  outboxId: Types.ObjectId,
  errorMessage: string,
  retryable: boolean,
  now: Date = new Date()
): Promise<void> {
  await dbConnect();
  const row = await EmailOutbox.findById(outboxId).select("attempts").lean();
  const attempts = row?.attempts ?? 1;
  if (retryable && attempts < MAX_SEND_ATTEMPTS) {
    await EmailOutbox.updateOne(
      { _id: outboxId },
      {
        $set: {
          status: "pending",
          lockedAt: null,
          lastError: errorMessage,
          sendAfter: new Date(now.getTime() + computeBackoffMs(attempts)),
        },
      }
    );
    return;
  }
  await EmailOutbox.updateOne(
    { _id: outboxId },
    { $set: { status: "failed", lockedAt: null, lastError: errorMessage } }
  );
}
