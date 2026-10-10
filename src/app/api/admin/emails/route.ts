import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import EmailOutbox from "@/models/EmailOutbox";
import User from "@/models/User";
import { MAX_SEND_ATTEMPTS, STALE_SENDING_MS } from "@/lib/email/outbox";
import type { EmailOutboxStatus, EmailOutboxType } from "@/types/EmailAdminData";

void EmailOutbox;
void User;

const VALID_STATUSES: EmailOutboxStatus[] = [
  "pending",
  "sending",
  "sent",
  "failed",
  "skipped",
  "cancelled",
];

const VALID_TYPES: EmailOutboxType[] = [
  "welcome",
  "application-submitted",
  "application-received",
  "application-reminder",
  "job-alert",
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const cursor = searchParams.get("cursor");
    const stuckSending = searchParams.get("stuckSending");
    const waitingForRetry = searchParams.get("waitingForRetry");
    const limitParam = searchParams.get("limit");
    const limit = Math.min(Math.max(parseInt(limitParam || "50", 10) || 50, 1), 100);

    await dbConnect();

    const query: Record<string, unknown> = {};
    const now = new Date();

    if (status && VALID_STATUSES.includes(status as EmailOutboxStatus)) {
      query.status = status;
    }
    if (type && VALID_TYPES.includes(type as EmailOutboxType)) {
      query.type = type;
    }
    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      query.$or = [{ to: regex }, { subject: regex }, { lastError: regex }];
    }
    if (stuckSending === "true") {
      query.status = "sending";
      query.lockedAt = { $lt: new Date(now.getTime() - STALE_SENDING_MS) };
    }
    if (waitingForRetry === "true") {
      query.status = "pending";
      query.attempts = { $gt: 0 };
      query.sendAfter = { $gt: now };
    }
    if (cursor) {
      const cursorDate = new Date(cursor);
      if (!isNaN(cursorDate.getTime())) {
        query.createdAt = { $lt: cursorDate };
      }
    }

    const rows = await EmailOutbox.find(query)
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const sliced = hasMore ? rows.slice(0, limit) : rows;
    const last = sliced[sliced.length - 1] as unknown as { createdAt: Date } | undefined;
    const nextCursor = hasMore && last ? last.createdAt.toISOString() : null;

    const staleBefore = new Date(now.getTime() - STALE_SENDING_MS);

    const data = sliced.map((row: unknown) => {
      const doc = row as {
        _id: { toString(): string };
        type: EmailOutboxType;
        to: string;
        subject?: string;
        status: EmailOutboxStatus;
        priority: 0 | 1 | 2;
        attempts: number;
        lastError?: string;
        sendAfter: Date;
        lockedAt?: Date | null;
        resendId?: string;
        userId?: { _id: { toString(): string }; name?: string; email?: string } | null;
        relatedActivityId?: { toString(): string } | null;
        createdAt: Date;
        updatedAt: Date;
        sentAt?: Date | null;
      };
      const populatedUser =
        doc.userId && typeof doc.userId === "object" && "email" in (doc.userId as Record<string, unknown>)
          ? (doc.userId as { _id: { toString(): string }; name?: string; email?: string })
          : null;
      return {
        _id: doc._id.toString(),
        type: doc.type,
        to: doc.to,
        subject: doc.subject ?? null,
        status: doc.status,
        priority: doc.priority,
        attempts: doc.attempts,
        maxAttempts: MAX_SEND_ATTEMPTS,
        lastError: doc.lastError || null,
        sendAfter: doc.sendAfter.toISOString(),
        lockedAt: doc.lockedAt ? doc.lockedAt.toISOString() : null,
        resendId: doc.resendId ?? null,
        userId: populatedUser ? populatedUser._id.toString() : null,
        userName: populatedUser?.name ?? null,
        userEmail: populatedUser?.email ?? null,
        relatedActivityId: doc.relatedActivityId ? doc.relatedActivityId.toString() : null,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
        sentAt: doc.sentAt ? doc.sentAt.toISOString() : null,
        waitingForRetry:
          doc.status === "pending" && doc.attempts > 0 && doc.sendAfter.getTime() > now.getTime(),
        stuckSending:
          doc.status === "sending" &&
          !!doc.lockedAt &&
          doc.lockedAt.getTime() < staleBefore.getTime(),
      };
    });

    return NextResponse.json({ emails: data, nextCursor, hasMore });
  } catch (error) {
    console.error("Error fetching admin emails:", error);
    return NextResponse.json({ error: "Failed to fetch emails" }, { status: 500 });
  }
}
