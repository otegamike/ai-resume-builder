import { NextResponse } from "next/server";
import { toAiErrorResponse } from "@/lib/ai/errors";
import { GroqCallError } from "@/lib/ai/groqError";
import { AppError } from "@/lib/errors/AppError";
import { ApiClientError, apiStatusMessage } from "@/lib/errors/api";
import { InputExtractionError } from "@/lib/errors/InputExtractionError";
import { InsufficientCreditsError } from "@/lib/errors/InsufficientCreditsError";
import { captureApiError } from "@/lib/sentry/capture";

export interface ApiErrorMeta {
  route: string;
  flow: string;
  stage?: string;
  userId?: string;
}

interface ErrorResult {
  status: number;
  message: string;
  code: string;
  expected: boolean;
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof Error && error.name === "AbortError") ||
    (typeof DOMException !== "undefined" && error instanceof DOMException && error.name === "AbortError")
  );
}

function isJsonSyntaxError(error: unknown): boolean {
  return error instanceof SyntaxError && /json|unexpected token|unexpected end/i.test(error.message);
}

function errorName(error: unknown): string {
  if (error instanceof Error) return error.name;
  return typeof error;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 500);
  return String(error).slice(0, 500);
}

function numericStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object" || !("status" in error)) return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

function resolveError(error: unknown): ErrorResult {
  if (isAbortError(error)) {
    return {
      status: 408,
      message: "That request took too long. Please try again.",
      code: "REQUEST_ABORTED",
      expected: true,
    };
  }

  if (error instanceof InputExtractionError) {
    return {
      status: error.status,
      message: error.message,
      code: "INPUT_INVALID",
      expected: error.status < 500,
    };
  }

  if (error instanceof InsufficientCreditsError) {
    return {
      status: 402,
      message:
        "You don't have enough credits for this action. Upgrade your plan or wait for your monthly reset.",
      code: "INSUFFICIENT_CREDITS",
      expected: true,
    };
  }

  if (error instanceof GroqCallError) {
    const result = toAiErrorResponse(
      error,
      "AI is temporarily unavailable. Please try again later."
    );
    return {
      status: result.status,
      message: result.error,
      code: result.status === 429 ? "AI_RATE_LIMITED" : "AI_FAILED",
      expected: result.status < 500 || error.kind === "truncated",
    };
  }

  if (error instanceof AppError) {
    return {
      status: error.status,
      message: error.userMessage,
      code: error.code,
      expected: error.expected,
    };
  }

  if (error instanceof ApiClientError) {
    return {
      status: error.status,
      message: error.message,
      code: error.code ?? "API_CLIENT_ERROR",
      expected: error.status < 500,
    };
  }

  if (isJsonSyntaxError(error)) {
    return {
      status: 400,
      message: "The request couldn't be read. Please check it and try again.",
      code: "INVALID_JSON",
      expected: true,
    };
  }

  const status = numericStatus(error);
  if (status !== undefined && status >= 400 && status < 500) {
    return {
      status,
      message: apiStatusMessage(status),
      code: `HTTP_${status}`,
      expected: true,
    };
  }

  return {
    status: 500,
    message: "Something went wrong on our side. Please try again.",
    code: "INTERNAL_ERROR",
    expected: false,
  };
}

export function handleApiError(error: unknown, meta: ApiErrorMeta): NextResponse {
  const result = resolveError(error);

  if (!result.expected) {
    console.error(`[api] ${meta.route} failed`, {
      flow: meta.flow,
      stage: meta.stage,
      name: errorName(error),
      message: errorMessage(error),
    });
  }

  captureApiError(error, {
    route: meta.route,
    flow: meta.flow,
    stage: meta.stage,
    userId: meta.userId,
    status: result.status,
    expected: result.expected,
  });

  return NextResponse.json(
    { error: result.message, code: result.code },
    {
      status: result.status,
      headers: result.status === 429 ? { "Retry-After": "30" } : undefined,
    }
  );
}
