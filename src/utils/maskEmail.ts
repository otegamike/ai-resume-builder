/**
 * Masks an email address so only a hint is visible before the user clicks.
 * Keeps the first 2 characters of the local part, then 5 stars,
 * then @ plus the first 9 characters of the domain (fits gmail.com).
 * Adds "..." when the domain is longer.
 * Example: "hr@gmail.com" -> "hr*****@gmail.com"
 * Example: "jobs@verylongdomain.com" -> "jo*****@verylongd..."
 */
export function maskEmail(email: string): string {
  if (!email) return "****";
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf("@");
  if (atIndex <= 0) return "****";
  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  if (!domain) return "****";
  const localPart = local.slice(0, 2);
  const domainPart = domain.slice(0, 9);
  const suffix = domain.length > 9 ? "..." : "";
  return `${localPart}*****@${domainPart}${suffix}`;
}
