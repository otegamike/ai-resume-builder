import "server-only";

import { Resend } from "resend";
import { getEmailConfig } from "./config";

let cached: Resend | null = null;

/**
 * Shared Resend instance. A placeholder key is used when no key is configured
 * (dry-run / tests) so importing never throws; the dispatcher short-circuits
 * before any network call in that case.
 */
export function getResend(): Resend {
  if (cached) return cached;
  const { resendApiKey } = getEmailConfig();
  cached = new Resend(resendApiKey || "re_dry_run_placeholder");
  return cached;
}

export function getFromAddress(): string {
  return getEmailConfig().from;
}

export function getReplyToAddress(): string | undefined {
  const replyTo = getEmailConfig().replyTo;
  return replyTo || undefined;
}

/** Test-only escape hatch. */
export function resetResendForTests(): void {
  cached = null;
}
