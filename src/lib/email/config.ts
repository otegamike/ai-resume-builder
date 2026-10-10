import "server-only";

import { z } from "zod";

const rawEnvSchema = z.object({
  RESEND_API_KEY: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  EMAIL_REPLY_TO: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  EMAIL_DAILY_LIMIT: z.string().optional(),
  EMAIL_MONTHLY_LIMIT: z.string().optional(),
  EMAIL_ENABLED: z.string().optional(),
  EMAIL_DRY_RUN: z.string().optional(),
  EMAIL_DEV_ALLOWLIST: z.string().optional(),
  EMAIL_FLAG_APPLICATION_REMINDER: z.string().optional(),
  EMAIL_FLAG_JOB_ALERTS: z.string().optional(),
  EMAIL_TEST_RECIPIENT: z.string().optional(),
});

export interface EmailConfig {
  resendApiKey: string;
  resendWebhookSecret: string;
  from: string;
  replyTo: string;
  cronSecret: string;
  dailyLimit: number;
  monthlyLimit: number;
  enabled: boolean;
  dryRun: boolean;
  devAllowlist: string[];
  flagApplicationReminder: boolean;
  flagJobAlerts: boolean;
  testRecipient: string;
  isProduction: boolean;
}

function parseBool(value: string | undefined, fallback: boolean, name: string): boolean {
  if (value === undefined || value.trim() === "") return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  throw new Error(`Invalid boolean env var ${name}=${value}`);
}

function parsePositiveInt(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number.parseInt(value.trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid positive integer env var ${name}=${value}`);
  }
  return parsed;
}

function parseAllowlist(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

function parseFromAddress(value: string | undefined): string {
  const fallback = "AgenticApp.cv <notifications@agenticapp.cv>";
  const candidate = (value ?? "").trim() || fallback;
  const emailPart = candidate.includes("<")
    ? (candidate.split("<")[1]?.split(">")[0] ?? "")
    : candidate;
  if (!emailPart.includes("@") || !emailPart.includes(".")) {
    throw new Error(`Invalid EMAIL_FROM=${value}`);
  }
  return candidate;
}

let cached: EmailConfig | null = null;

export function getEmailConfig(): EmailConfig {
  if (cached) return cached;
  const raw = rawEnvSchema.parse(process.env);
  cached = {
    resendApiKey: (raw.RESEND_API_KEY ?? "").trim(),
    resendWebhookSecret: (raw.RESEND_WEBHOOK_SECRET ?? "").trim(),
    from: parseFromAddress(raw.EMAIL_FROM),
    replyTo: (raw.EMAIL_REPLY_TO ?? "").trim(),
    cronSecret: (raw.CRON_SECRET ?? "").trim(),
    dailyLimit: parsePositiveInt(raw.EMAIL_DAILY_LIMIT, 90, "EMAIL_DAILY_LIMIT"),
    monthlyLimit: parsePositiveInt(raw.EMAIL_MONTHLY_LIMIT, 2700, "EMAIL_MONTHLY_LIMIT"),
    enabled: parseBool(raw.EMAIL_ENABLED, true, "EMAIL_ENABLED"),
    dryRun: parseBool(raw.EMAIL_DRY_RUN, false, "EMAIL_DRY_RUN"),
    devAllowlist: parseAllowlist(raw.EMAIL_DEV_ALLOWLIST),
    flagApplicationReminder: parseBool(
      raw.EMAIL_FLAG_APPLICATION_REMINDER,
      false,
      "EMAIL_FLAG_APPLICATION_REMINDER"
    ),
    flagJobAlerts: parseBool(raw.EMAIL_FLAG_JOB_ALERTS, false, "EMAIL_FLAG_JOB_ALERTS"),
    testRecipient: (raw.EMAIL_TEST_RECIPIENT ?? "").trim().toLowerCase(),
    isProduction: process.env.NODE_ENV === "production",
  };
  return cached;
}

/** Test-only escape hatch so unit tests can re-read mutated env. */
export function resetEmailConfigForTests(): void {
  cached = null;
}
