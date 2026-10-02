import "server-only";

import Groq from "groq-sdk";

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Canonical version lives in @/lib/pdfConstants (shared with the browser).
export { EXTRACTION_VERSION } from "@/lib/pdfConstants";

// Use a capable model for structured JSON output
export const ATS_MODEL = "openai/gpt-oss-120b"; // good for structured JSON output
export const VISION_MODEL = "qwen/qwen3.8-27b";
export const GENERATION_MODEL = "openai/gpt-oss-20b"; // fine for simple text gen
export const LONG_CONTEXT_MODEL = "openai/gpt-oss-120b"; // for long cover letters, etc.

export const ATS_SYSTEM_INSTRUCTION =
  "You are an expert ATS resume analyst. You ONLY output raw valid JSON. Never use markdown code fences. Never add explanations before or after the JSON object. Your entire response must be parseable by JSON.parse().";

export const WRITER_SYSTEM_INSTRUCTION =
  "You are a professional resume writer. Write concise, impactful content that is ATS-friendly and highlights achievements. Use action verbs and quantify results when possible.";

export const COVER_LETTER_SYSTEM_INSTRUCTION =
  "You are a professional cover letter writer. You ONLY output raw valid JSON. Never use markdown code fences. Never add explanations before or after the JSON object. Your entire response must be parseable by JSON.parse().";

export const TAILOR_SYSTEM_INSTRUCTION =
  "You are an expert recruiter and resume writer. You ONLY output raw valid JSON. Never use markdown code fences. Never add explanations before or after the JSON object. Your entire response must be parseable by JSON.parse().";

export const PARSER_SYSTEM_INSTRUCTION =
  "You are a precise resume parser. You ONLY output raw valid JSON. Never use markdown code fences. Never add explanations before or after the JSON object. Your entire response must be parseable by JSON.parse().";

export function assertApiKey() {
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === "your-groq-api-key-here") {
    throw new Error("Groq API key not configured");
  }
}

export type GroqFailureKind =
  | "rate_limited"
  | "truncated"
  | "unparseable"
  | "provider"
  | "config";

export class GroqCallError extends Error {
  status?: number;
  feature: string;
  kind: GroqFailureKind;
  cause?: unknown;

  constructor(
    message: string,
    opts: { status?: number; feature?: string; kind?: GroqFailureKind; cause?: unknown } = {}
  ) {
    super(message);
    this.name = "GroqCallError";
    this.status = opts.status;
    this.feature = opts.feature ?? "unspecified";
    this.kind = opts.kind ?? "provider";
    this.cause = opts.cause;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRetriableGroqError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const record = err as Record<string, unknown>;
  const status =
    typeof record.status === "number"
      ? record.status
      : typeof (record as { statusCode?: unknown }).statusCode === "number"
        ? (record as { statusCode?: number }).statusCode
        : undefined;
  if (status !== undefined) {
    if ([429, 500, 502, 503, 504].includes(status)) return true;
    if (status >= 400 && status < 500) return false;
  }
  const code = typeof record.code === "string" ? record.code : "";
  if (["ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "ECONNREFUSED"].includes(code)) return true;
  const message = typeof record.message === "string" ? record.message : "";
  if (/timeout|econnreset|etimedout|fetch failed|network/i.test(message)) return true;
  return false;
}

export function getGroqErrorStatus(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;
  const record = err as Record<string, unknown>;
  if (typeof record.status === "number") return record.status;
  if (typeof (record as { statusCode?: unknown }).statusCode === "number") return (record as { statusCode?: number }).statusCode;
  return undefined;
}
