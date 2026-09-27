import "server-only";

import { GroqCallError } from "./client";

const RATE_LIMIT_MESSAGE =
  "AI is in high demand right now. Upgrade to Pro or Pro Plus for higher AI limits and faster results.";
const TRUNCATED_MESSAGE =
  "This result was cut off before it finished. Try a shorter input, or upgrade to Pro or Pro Plus for larger AI capacity.";
const UNPARSEABLE_MESSAGE = "The AI returned an unreadable result. Please try again.";

function isRateLimitLike(message: string): boolean {
  return /rate[\s_-]?limit|too many requests|429|quota|capacity/i.test(message);
}

function isTruncationLike(message: string): boolean {
  return /truncat|cut off|max_completion_tokens|finish_reason.{0,20}length/i.test(message);
}

export function toAiErrorResponse(
  error: unknown,
  fallbackMessage: string
): { status: number; error: string } {
  const message = error instanceof Error ? error.message : String(error);
  const feature = error instanceof GroqCallError ? error.feature : "unspecified";
  const status = error instanceof GroqCallError ? error.status : undefined;
  const kind = error instanceof GroqCallError ? error.kind : undefined;

  console.error(`AI request failed (${feature}):`, {
    status,
    kind,
    message: message.slice(0, 500),
  });

  if (message.includes("Groq API key not configured")) {
    return { status: 500, error: "AI is temporarily unavailable. Please try again later." };
  }

  if (kind === "rate_limited" || status === 429 || isRateLimitLike(message)) {
    return { status: 429, error: RATE_LIMIT_MESSAGE };
  }

  if (kind === "truncated" || isTruncationLike(message)) {
    return { status: 502, error: TRUNCATED_MESSAGE };
  }

  if (kind === "unparseable") {
    return { status: 502, error: UNPARSEABLE_MESSAGE };
  }

  return { status: 500, error: fallbackMessage };
}
