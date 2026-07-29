import "server-only";
import { NGN_PRICING } from "@/utils/pricing";
import { toKobo } from "@/utils/convertToKobo";

const PLAN_ENV_MAP: Record<string, { tier: "pro" | "proPlus"; interval: "monthly" | "annually"; amount: number }> = {};

function initPlanMap() {
  const entries: [string | undefined, "pro" | "proPlus", "monthly" | "annually", number][] = [
    [process.env.PAYSTACK_PLAN_PRO_MONTHLY, "pro", "monthly", toKobo(NGN_PRICING.pro_monthly)],
    [process.env.PAYSTACK_PLAN_PRO_ANNUAL, "pro", "annually", toKobo(NGN_PRICING.pro_annual)],
    [process.env.PAYSTACK_PLAN_PROPLUS_MONTHLY, "proPlus", "monthly", toKobo(NGN_PRICING.proPlus_monthly)],
    [process.env.PAYSTACK_PLAN_PROPLUS_ANNUAL, "proPlus", "annually", toKobo(NGN_PRICING.proPlus_annual)],
  ];
  for (const [code, tier, interval, amount] of entries) {
    if (code) PLAN_ENV_MAP[code] = { tier, interval, amount };
  }
}

export function buildPlanAllowlist(): Set<string> {
  initPlanMap();
  return new Set(Object.keys(PLAN_ENV_MAP));
}

export function getPlanCode(tier: "pro" | "proPlus", interval: "monthly" | "annually"): string | undefined {
  if (tier === "pro" && interval === "monthly") return process.env.PAYSTACK_PLAN_PRO_MONTHLY;
  if (tier === "pro" && interval === "annually") return process.env.PAYSTACK_PLAN_PRO_ANNUAL;
  if (tier === "proPlus" && interval === "monthly") return process.env.PAYSTACK_PLAN_PROPLUS_MONTHLY;
  if (tier === "proPlus" && interval === "annually") return process.env.PAYSTACK_PLAN_PROPLUS_ANNUAL;
  return undefined;
}

export function resolveTierFromPlanCode(planCode: string): { tier: "pro" | "proPlus"; interval: "monthly" | "annually" } | null {
  initPlanMap();
  return PLAN_ENV_MAP[planCode] ?? null;
}

export function getPlanAmount(tier: "pro" | "proPlus", interval: "monthly" | "annually"): number {
  if (tier === "pro" && interval === "monthly") return toKobo(NGN_PRICING.pro_monthly);
  if (tier === "pro" && interval === "annually") return toKobo(NGN_PRICING.pro_annual);
  if (tier === "proPlus" && interval === "monthly") return toKobo(NGN_PRICING.proPlus_monthly);
  if (tier === "proPlus" && interval === "annually") return toKobo(NGN_PRICING.proPlus_annual);
  throw new Error(`Unknown plan: ${tier} ${interval}`);
}

export function hasActiveAccess(subscription: { status: string; currentPeriodEnd?: Date | null } | null): boolean {
  if (!subscription) return false;
  if (subscription.status === "active") return true;
  if (subscription.status === "non-renewing" && subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) > new Date()) return true;
  return false;
}
