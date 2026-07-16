import User from "@/models/User";
import dbConnect from "@/lib/db";
import { CREDIT_COST, type AiFeature } from "./creditCosts";

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
    { $inc: { AiCredits: -cost } },
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
