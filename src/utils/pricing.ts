export const CURRENCIES = {
  USD: { symbol: "$", code: "USD" },
  NGN: { symbol: "₦", code: "NGN" },
} as const;

export type CurrencyConfig = (typeof CURRENCIES)[keyof typeof CURRENCIES];

export const NGN_PRICING = {
  pro_monthly: '5,000.00',
  pro_annual: '54,000.00',
  proPlus_monthly: '12,000.00',
  proPlus_annual: '120,000.00',
} as const 

export const NGN_ANNUAL_DISCOUNT= {
  pro: 10,
  proPlus: 17,
} as const;

export const removeComma = (value: string): string => value.replace(/,/g, "");


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
