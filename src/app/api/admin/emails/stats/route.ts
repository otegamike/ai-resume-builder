import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import EmailOutbox from "@/models/EmailOutbox";
import EmailSuppression from "@/models/EmailSuppression";
import { getQuotaUsage } from "@/lib/email/quota";
import { STALE_SENDING_MS } from "@/lib/email/outbox";
import type { EmailOutboxStatus, EmailStatsResponse } from "@/types/EmailAdminData";

void EmailOutbox;
void EmailSuppression;

const ALL_STATUSES: EmailOutboxStatus[] = [
  "pending",
  "sending",
  "sent",
  "failed",
  "skipped",
  "cancelled",
];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const staleBefore = new Date(now.getTime() - STALE_SENDING_MS);

    const [byStatusAgg, byTypeAgg, waitingForRetry, stuckSending, failedLast24h, sentLast24h, quota, suppressionsCount, total] =
      await Promise.all([
        EmailOutbox.aggregate<{ _id: string; count: number }>([
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        EmailOutbox.aggregate<{ _id: string; count: number }>([
          { $group: { _id: "$type", count: { $sum: 1 } } },
        ]),
        EmailOutbox.countDocuments({
          status: "pending",
          attempts: { $gt: 0 },
          sendAfter: { $gt: now },
        }),
        EmailOutbox.countDocuments({
          status: "sending",
          lockedAt: { $lt: staleBefore },
        }),
        EmailOutbox.countDocuments({ status: "failed", updatedAt: { $gte: dayAgo } }),
        EmailOutbox.countDocuments({ status: "sent", sentAt: { $gte: dayAgo } }),
        getQuotaUsage(now),
        EmailSuppression.countDocuments({}),
        EmailOutbox.countDocuments({}),
      ]);

    const byStatus = Object.fromEntries(ALL_STATUSES.map((s) => [s, 0])) as Record<
      EmailOutboxStatus,
      number
    >;
    for (const entry of byStatusAgg) {
      if (entry._id in byStatus) {
        byStatus[entry._id as EmailOutboxStatus] = entry.count;
      }
    }

    const byType: Record<string, number> = {};
    for (const entry of byTypeAgg) {
      byType[entry._id] = entry.count;
    }

    const payload: EmailStatsResponse = {
      total,
      byStatus,
      byType,
      waitingForRetry,
      stuckSending,
      failedLast24h,
      sentLast24h,
      quota: {
        dayKey: quota.dayKey,
        dayCount: quota.dayCount,
        dailyLimit: quota.dailyLimit,
        dayPercent: quota.dailyLimit > 0 ? Math.round((quota.dayCount / quota.dailyLimit) * 100) : 0,
        monthKey: quota.monthKey,
        monthCount: quota.monthCount,
        monthlyLimit: quota.monthlyLimit,
        monthPercent:
          quota.monthlyLimit > 0 ? Math.round((quota.monthCount / quota.monthlyLimit) * 100) : 0,
      },
      suppressionsCount,
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error fetching admin email stats:", error);
    return NextResponse.json({ error: "Failed to fetch email stats" }, { status: 500 });
  }
}
