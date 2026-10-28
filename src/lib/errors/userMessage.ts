import { ApiClientError } from "./api";
import { AppError } from "./AppError";
import { InputExtractionError } from "./InputExtractionError";
import { InsufficientCreditsError } from "./InsufficientCreditsError";
import { GroqCallError } from "@/lib/ai/groqError";
import {
  detectUnsupportedBrowserError,
  OLD_BROWSER_MESSAGE,
  OLD_BROWSER_TITLE,
} from "./unsupportedBrowser";

export interface UserMessage {
  title: string;
  message: string;
}

const GENERIC: UserMessage = {
  title: "Something went wrong",
  message: "Something went wrong on our side. Please try again.",
};

const RATE_LIMIT: UserMessage = {
  title: "AI is busy right now",
  message:
    "AI is in high demand right now. Please try again in a moment, or upgrade your plan for higher limits.",
};

function aiMessage(error: GroqCallError): UserMessage {
  if (error.kind === "rate_limited" || error.status === 429) return RATE_LIMIT;
  if (error.kind === "truncated") {
    return {
      title: "That result was too long",
      message:
        "This result was cut off before it finished. Try a shorter input, or upgrade your plan for larger AI capacity.",
    };
  }
  if (error.kind === "unparseable") {
    return {
      title: "The AI returned an unreadable result",
      message: "Please try again. If it keeps happening, try a shorter input.",
    };
  }
  if (error.kind === "config") {
    return {
      title: "AI is unavailable",
      message: "AI is temporarily unavailable. Please try again later.",
    };
  }
  return {
    title: "AI is unavailable",
    message: "The AI service couldn't complete this request. Please try again.",
  };
}

export function toUserMessage(
  error: unknown,
  options: { requireCanvas?: boolean } = {}
): UserMessage {
  if (detectUnsupportedBrowserError(error, options).suspected) {
    return { title: OLD_BROWSER_TITLE, message: OLD_BROWSER_MESSAGE };
  }

  if (error instanceof InsufficientCreditsError) {
    return {
      title: "Not enough AI credits",
      message:
        "You don't have enough credits for this action. Upgrade your plan or wait for your monthly reset.",
    };
  }

  if (error instanceof GroqCallError) return aiMessage(error);

  if (error instanceof InputExtractionError) {
    return {
      title: error.status === 422 ? "We couldn't read that file" : "We couldn't use that input",
      message: error.message,
    };
  }

  if (error instanceof ApiClientError) {
    if (error.status === 429) return RATE_LIMIT;
    if (error.status >= 500) return GENERIC;
    return {
      title: error.status === 401 ? "Please sign in again" : "That didn't work",
      message: error.message,
    };
  }

  if (error instanceof AppError) {
    return {
      title: error.status >= 500 ? GENERIC.title : "That didn't work",
      message: error.userMessage,
    };
  }

  return GENERIC;
}
