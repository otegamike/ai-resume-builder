import User from "@/models/User";
import dbConnect from "@/lib/db";
import { CREDIT_COST, type AiFeature } from "./creditCosts";
import { MAX_CREDITS_PER_PLAN } from "./creditCosts";

export function getCurrentCycleString(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function getNextMonthFirstDay(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

export async function resetCreditsIfNeeded(
  userId: string,
  subscriptionPlan: string | null | undefined
): Promise<{ reset: boolean }> {
  const currentCycle = getCurrentCycleString();
  const plan = subscriptionPlan || "free";
  const maxCredits =
    MAX_CREDITS_PER_PLAN[plan as keyof typeof MAX_CREDITS_PER_PLAN] ??
    MAX_CREDITS_PER_PLAN.free;

  const result = await User.findOneAndUpdate(
    {
      _id: userId,
      $or: [
        { "creditResetMeta.lastResetCycle": { $lt: currentCycle } },
        { "creditResetMeta.lastResetCycle": { $exists: false } },
      ],
    },
    {
      $set: {
        AiCredits: maxCredits,
        "creditResetMeta.lastResetCycle": currentCycle,
        "creditResetMeta.nextResetAt": getNextMonthFirstDay(),
      },
    },
    { new: true }
  );

  return { reset: result !== null };
}

export class InsufficientCreditsError extends Error {
  public creditsRemaining: number;
  public cost: number;

  constructor(creditsRemaining: number, cost: number) {
    super(`Insufficient AI credits. You have ${creditsRemaining} but need ${cost}.`);
    this.name = "InsufficientCreditsError";
    this.creditsRemaining = creditsRemaining;
    this.cost = cost;
  }
}

export async function deductCredits(userId: string, feature: AiFeature): Promise<number> {
  await dbConnect();
  const cost = CREDIT_COST[feature];

  const user = await User.findById(userId).select("AiCredits subscriptionPlan");
  if (!user) throw new Error("User not found");

  if (user.subscriptionPlan === "proPlus") {
    return user.AiCredits;
  }

  if (user.AiCredits < cost) {
    throw new InsufficientCreditsError(user.AiCredits, cost);
  }

  const updated = await User.findByIdAndUpdate(
    userId,
    [
      {
        $set: {
          SubscriptionPlan: { $ifNull: ["$subscriptionPlan", "free"] },
          AiCredits: {
            $max: [
              0,
              {
                $cond: {
                  if: { $setEquals: [{ $ifNull: ["$subscriptionPlan", null] }, []] }, 
                  then: { $subtract: [MAX_CREDITS_PER_PLAN.free, cost] },
                  else: { $subtract: ["$AiCredits", cost] }
                }
              }
            ]
          }
        }
      }
    ],
    { new: true, select: "AiCredits" }
 );

  return updated!.AiCredits;
}

export async function getCredits(userId: string): Promise<number> {
  await dbConnect();
  const user = await User.findById(userId).select("AiCredits subscriptionPlan");
  if (!user) throw new Error("User not found");
  return user.AiCredits;
}

