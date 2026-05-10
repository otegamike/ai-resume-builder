export function sanitizeCallbackUrl(input: string | null | undefined): string {
  const fallback = "/dashboard";
  if (!input) return fallback;

  try {
    if (input.startsWith("/")) {
      return input;
    }

    const parsed = new URL(input);
    const appUrl = process.env.AUTH_URL;
    if (!appUrl) return fallback;

    const appOrigin = new URL(appUrl).origin;
    if (parsed.origin !== appOrigin) return fallback;

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}