"use client";

import { useAlertStore } from "@/store/useAlertStore";
import { captureClientError } from "@/lib/sentry/capture";
import { toUserMessage, type UserMessage } from "./userMessage";

export interface ClientErrorOptions {
  flow: string;
  stage?: string;
  route?: string;
  templateId?: string;
  userId?: string;
  requireCanvas?: boolean;
  notify?: boolean;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function handleClientError(error: unknown, options: ClientErrorOptions): UserMessage {
  if (isAbortError(error)) {
    return { title: "Request cancelled", message: "That request was cancelled." };
  }

  const userMessage = toUserMessage(error, { requireCanvas: options.requireCanvas });

  captureClientError(error, {
    flow: options.flow,
    stage: options.stage,
    route: options.route,
    templateId: options.templateId,
    userId: options.userId,
    requireCanvas: options.requireCanvas,
  });

  if (options.notify !== false) {
    useAlertStore.getState().addAlert("error", userMessage.message);
  }

  return userMessage;
}
