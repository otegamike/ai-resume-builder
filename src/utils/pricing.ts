export const CURRENCIES = {
  USD: { symbol: "$", code: "USD" },
  NGN: { symbol: "₦", code: "NGN" },
} as const;

export type CurrencyConfig = (typeof CURRENCIES)[keyof typeof CURRENCIES];

export const NGN_PRICING = {
  pro: { monthly: 5_000, annual: 4_500, savePercent: 10 },
  proPlus: { monthly: 12_000, annual: 10_000, savePercent: 17 },
} as const;

export function detectCurrency(): { currency: CurrencyConfig; isNigerian: boolean } {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const region = navigator.language.split("-")[1]?.toUpperCase();
    if (tz === "Africa/Lagos" || region === "NG") {
      return { currency: CURRENCIES.NGN, isNigerian: true };
    }
  } catch {}
  return { currency: CURRENCIES.USD, isNigerian: false };
}
