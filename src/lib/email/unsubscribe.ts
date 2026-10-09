import "server-only";

import crypto from "crypto";
import { Types } from "mongoose";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getEmailConfig } from "./config";

void User;

function signingKey(): string {
  const { resendWebhookSecret, cronSecret } = getEmailConfig();
  // Dedicated secret if ever added; today the cron secret doubles as the
  // signing key. Both are random server-side strings, never in bundles.
  const extra = (process.env.EMAIL_UNSUBSCRIBE_SECRET ?? "").trim();
  return extra || cronSecret || resendWebhookSecret;
}

function base64urlEncode(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export function createUnsubscribeToken(userId: string, type: "job-alerts" | "marketing" | "all"): string {
  const payload = `${userId}.${type}`;
  const signature = crypto.createHmac("sha256", signingKey()).update(payload).digest();
  return `${base64urlEncode(payload)}.${base64urlEncode(signature)}`;
}

export function verifyUnsubscribeToken(
  token: string
): { userId: string; type: "job-alerts" | "marketing" | "all" } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  let payload: string;
  let signature: Buffer;
  try {
    payload = Buffer.from(parts[0]!, "base64url").toString("utf8");
    signature = Buffer.from(parts[1]!, "base64url");
  } catch {
    return null;
  }
  const expected = crypto.createHmac("sha256", signingKey()).update(payload).digest();
  if (signature.length !== expected.length || !crypto.timingSafeEqual(signature, expected)) {
    return null;
  }
  const [userId, type] = payload.split(".");
  if (!userId || !Types.ObjectId.isValid(userId)) return null;
  if (type !== "job-alerts" && type !== "marketing" && type !== "all") return null;
  return { userId, type };
}

/** Apply an unsubscribe: flips the opt-in flags off, bumps token version. */
export async function applyUnsubscribe(
  userId: string,
  type: "job-alerts" | "marketing" | "all"
): Promise<boolean> {
  await dbConnect();
  const update: Record<string, unknown> = { $inc: { unsubscribeTokenVersion: 1 } };
  if (type === "job-alerts" || type === "all") {
    (update as Record<string, Record<string, boolean>>).$set = {
      ...((update.$set as Record<string, boolean> | undefined) ?? {}),
      "emailPreferences.jobAlerts": false,
    };
  }
  if (type === "marketing" || type === "all") {
    (update as Record<string, Record<string, boolean>>).$set = {
      ...((update.$set as Record<string, boolean> | undefined) ?? {}),
      "emailPreferences.marketing": false,
    };
  }
  const result = await User.updateOne({ _id: new Types.ObjectId(userId) }, update);
  return result.modifiedCount > 0;
}
