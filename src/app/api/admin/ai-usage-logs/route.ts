import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import AiUsageEvent from "@/models/AiUsageEvent";

void AiUsageEvent;

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const feature = searchParams.get("feature");
    const model = searchParams.get("model");
    const errorParam = searchParams.get("error");
    const truncatedParam = searchParams.get("truncated");
    const search = searchParams.get("search");
    const userId = searchParams.get("userId");
    const cursor = searchParams.get("cursor");
    const limitParam = searchParams.get("limit");
    const limit = Math.min(Math.max(parseInt(limitParam || "50", 10) || 50, 1), 100);

    await dbConnect();

    const query: Record<string, unknown> = {};

    if (feature) query.feature = feature;
    if (model) query.model = model;
    if (errorParam === "true") query.error = true;
    if (errorParam === "false") query.error = false;
    if (truncatedParam === "true") query.truncated = true;
    if (truncatedParam === "false") query.truncated = false;
    if (userId && Types.ObjectId.isValid(userId)) {
      query.userId = new Types.ObjectId(userId);
    }
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { feature: regex },
        { model: regex },
        { finishReason: regex },
        { errorMessage: regex },
      ];
    }
    if (cursor) {
      const cursorDate = new Date(cursor);
      if (!isNaN(cursorDate.getTime())) {
        query.createdAt = { $lt: cursorDate };
      }
    }

    const events = await AiUsageEvent.find(query)
      .populate("userId", "name email image")
      .sort({ createdAt: -1 })
      .limit(limit + 1);

    const hasMore = events.length > limit;
    const sliced = hasMore ? events.slice(0, limit) : events;
    const nextCursor = hasMore ? (sliced[sliced.length - 1] as unknown as { createdAt: Date }).createdAt.toISOString() : null;

    const data = sliced.map((e: unknown) => {
      const doc = e as {
        _id: Types.ObjectId;
        feature: string;
        model: string;
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        queueTimeMs?: number;
        latencyMs: number;
        truncated: boolean;
        finishReason: string;
        error: boolean;
        errorMessage?: string;
        userId?: { _id: Types.ObjectId; name?: string; email?: string; image?: string } | Types.ObjectId;
        createdAt: Date;
      };
      const populatedUser =
        doc.userId && typeof doc.userId === "object" && "email" in (doc.userId as Record<string, unknown>)
          ? (doc.userId as { _id: Types.ObjectId; name?: string; email?: string; image?: string })
          : null;
      return {
        _id: String(doc._id),
        feature: doc.feature,
        model: doc.model,
        promptTokens: doc.promptTokens,
        completionTokens: doc.completionTokens,
        totalTokens: doc.totalTokens,
        queueTimeMs: doc.queueTimeMs ?? null,
        latencyMs: doc.latencyMs,
        truncated: doc.truncated,
        finishReason: doc.finishReason,
        error: doc.error,
        errorMessage: doc.errorMessage || null,
        userId: populatedUser ? String(populatedUser._id) : doc.userId ? String(doc.userId) : null,
        userName: populatedUser?.name || null,
        userEmail: populatedUser?.email || null,
        userImage: populatedUser?.image || null,
        createdAt: doc.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ events: data, nextCursor, hasMore });
  } catch (err) {
    console.error("Error fetching ai usage logs:", err);
    return NextResponse.json({ error: "Failed to fetch ai usage logs" }, { status: 500 });
  }
}
