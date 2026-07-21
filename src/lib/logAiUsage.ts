import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import AiUsageEvent from "@/models/AiUsageEvent";

export async function logAiUsage(data: {
  feature: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  queueTimeMs?: number;
  latencyMs: number;
  truncated: boolean;
  finishReason: string;
  userId?: string;
}) {
  try {
    await dbConnect();
    await AiUsageEvent.create({
      ...data,
      userId: data.userId ? new mongoose.Types.ObjectId(data.userId) : undefined,
    });
  } catch (err) {
    console.error("Failed to log AI usage", err);
  }
}
