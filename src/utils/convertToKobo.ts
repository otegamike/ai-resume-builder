/**
 * Converts a formatted currency string like "12,000.00" into an integer
 * amount in kobo (or cents), suitable for Paystack's `amount` field.
 *
 * @param value - formatted amount string, e.g. "12,000.00", "12000", "1,200"
 * @returns integer amount in kobo, e.g. 1200000
 * @throws if the input isn't a valid non-negative number
 */
export function toKobo(value: string): number {
  // Strip thousands separators (commas) and surrounding whitespace
  const cleaned = value.trim().replace(/[,_]/g, "");

  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error(`Invalid amount string: "${value}"`);
  }

  const naira = parseFloat(cleaned);
  if (!Number.isFinite(naira) || naira < 0) {
    throw new Error(`Invalid amount string: "${value}"`);
  }

  // Multiply in integer-safe way to avoid floating point drift
  // (e.g. 12000.00 * 100 can produce 1199999.9999... in JS)
  const kobo = Math.round(naira * 100);
  return kobo;
}