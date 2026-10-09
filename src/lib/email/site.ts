import "server-only";

/** Base site URL used for email links. No trailing slash. */
export function appUrl(): string {
  const raw = (process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  if (raw) return raw.replace(/\/+$/, "");
  return process.env.NODE_ENV === "production" ? "https://agenticapp.cv" : "http://localhost:3000";
}
