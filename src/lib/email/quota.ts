import "server-only";

import dbConnect from "@/lib/db";
import EmailQuota from "@/models/EmailQuota";
import { getEmailConfig } from "./config";
import type { EmailPriority } from "@/models/EmailOutbox";

void EmailQuota;

export type QuotaDecision =
  | { allowed: true }
  | { allowed: false; reason: "daily_quota_exceeded" | "monthly_quota_exceeded" | "deferred_priority" };

/**
 * Resend's daily cap runs on a UTC calendar day (00:00-24:00 UTC, resets at
 * midnight UTC), so the day key is a UTC date string.
 */
export function utcDayKey(now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `day:${year}-${month}-${day}`;
}

export function utcMonthKey(now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `month:${year}-${month}`;
}

/**
 * Atomically consume one unit of quota for `key`, but only when the stored
 * count is under `limit`. Returns true when the unit was consumed.
 * The document is ensured first (insert race resolved via the unique index
 * on `key`), so the guarded `$inc` below is the single atomic gate and the
 * count can never exceed `limit`, no matter how many drains race.
 */
async function consumeOne(key: string, limit: number): Promise<boolean> {
  await dbConnect();
  try {
    await EmailQuota.updateOne({ key }, { $setOnInsert: { key, count: 0 } }, { upsert: true });
  } catch (error: unknown) {
    // Lost the insert race; the winner created the document. Anything else
    // rethrows and surfaces from the guarded increment below.
    if ((error as { code?: number })?.code !== 11000) throw error;
  }
  const updated = await EmailQuota.findOneAndUpdate(
    { key, count: { $lt: limit } },
    { $inc: { count: 1 } },
    { returnDocument: "after" }
  );
  return !!updated;
}

async function releaseOne(key: string): Promise<void> {
  await dbConnect();
  await EmailQuota.updateOne({ key, count: { $gt: 0 } }, { $inc: { count: -1 } });
}

export async function getQuotaUsage(now: Date = new Date()): Promise<{
  dayKey: string;
  dayCount: number;
  dailyLimit: number;
  monthKey: string;
  monthCount: number;
  monthlyLimit: number;
}> {
  const { dailyLimit, monthlyLimit } = getEmailConfig();
  await dbConnect();
  const dayKey = utcDayKey(now);
  const monthKey = utcMonthKey(now);
  const [dayDoc, monthDoc] = await Promise.all([
    EmailQuota.findOne({ key: dayKey }).select("count").lean(),
    EmailQuota.findOne({ key: monthKey }).select("count").lean(),
  ]);
  return {
    dayKey,
    dayCount: dayDoc?.count ?? 0,
    dailyLimit,
    monthKey,
    monthCount: monthDoc?.count ?? 0,
    monthlyLimit,
  };
}

/**
 * Budget guard for the free plan. One unit per recipient.
 * P1/P2 mail (reminders, digests) only sends while daily usage is under 70%
 * of the limit, so P0 transactional mail always has room.
 */
export async function tryConsumeQuota(priority: EmailPriority): Promise<QuotaDecision> {
  const { dailyLimit, monthlyLimit } = getEmailConfig();
  const now = new Date();
  const usage = await getQuotaUsage(now);

  if (priority >= 1 && usage.dayCount >= Math.floor(dailyLimit * 0.7)) {
    return { allowed: false, reason: "deferred_priority" };
  }

  if (usage.dayCount >= dailyLimit) {
    warnIfHigh(usage.dayCount, dailyLimit, usage.monthCount, monthlyLimit);
    return { allowed: false, reason: "daily_quota_exceeded" };
  }
  if (usage.monthCount >= monthlyLimit) {
    warnIfHigh(usage.dayCount, dailyLimit, usage.monthCount, monthlyLimit);
    return { allowed: false, reason: "monthly_quota_exceeded" };
  }

  const dayOk = await consumeOne(usage.dayKey, dailyLimit);
  if (!dayOk) return { allowed: false, reason: "daily_quota_exceeded" };
  const monthOk = await consumeOne(usage.monthKey, monthlyLimit);
  if (!monthOk) {
    await releaseOne(usage.dayKey);
    return { allowed: false, reason: "monthly_quota_exceeded" };
  }

  warnIfHigh(usage.dayCount + 1, dailyLimit, usage.monthCount + 1, monthlyLimit);
  return { allowed: true };
}

/** Test/maintenance helper: give back one unit (used to clean up after tests). */
export async function releaseQuotaUnits(dayKey: string, monthKey: string): Promise<void> {
  await releaseOne(dayKey);
  await releaseOne(monthKey);
}

function warnIfHigh(dayCount: number, dailyLimit: number, monthCount: number, monthlyLimit: number): void {
  if (dayCount >= Math.floor(dailyLimit * 0.8) || monthCount >= Math.floor(monthlyLimit * 0.8)) {
    console.warn(
      `[email] quota high: day ${dayCount}/${dailyLimit}, month ${monthCount}/${monthlyLimit}`
    );
  }
}
