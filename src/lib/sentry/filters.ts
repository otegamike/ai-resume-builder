import type { Event, EventHint } from "@sentry/nextjs";
import { AppError } from "@/lib/errors/AppError";
import { ApiClientError } from "@/lib/errors/api";
import { InputExtractionError } from "@/lib/errors/InputExtractionError";
import { InsufficientCreditsError } from "@/lib/errors/InsufficientCreditsError";
import { GroqCallError } from "@/lib/ai/groqError";
import { detectUnsupportedBrowserError } from "@/lib/errors/unsupportedBrowser";

const DUPLICATE_WINDOW_MS = 60_000;
const MAX_MESSAGE_LENGTH = 500;
const MAX_ARRAY_LENGTH = 20;
const MAX_OBJECT_DEPTH = 4;

const seenEvents = new Map<string, number>();

const NOISE_PATTERNS: RegExp[] = [
  /ResizeObserver loop (limit exceeded|completed with undelivered notifications)/i,
  /^Script error\.?$/i,
  /Non-Error promise rejection captured/i,
  /AbortError/i,
  /The operation was aborted/i,
  /The user aborted a request/i,
  /signal is aborted without reason/i,
  /Failed to fetch$/i,
  /Load failed$/i,
  /NetworkError when attempting to fetch resource/i,
  /Network request failed/i,
  /NetworkError: A network error occurred/i,
  /net::ERR_(NETWORK_CHANGED|INTERNET_DISCONNECTED|CONNECTION_RESET|CONNECTION_ABORTED|NAME_NOT_RESOLVED)/i,
];

const EXTENSION_PATTERN =
  /^(chrome|moz|safari-web|safari)-extension:|^webkit-masked-url:|^extensions::/i;

const SENSITIVE_KEY_PATTERN =
  /pass(word)?|secret|token|authorization|cookie|api[-_]?key|resume(text|content)?|cover[-_]?letter|job[-_]?description|prompt|completion|input|output|request[-_]?body|response[-_]?body|user[-_]?email|email|phone|full[-_]?name|first[-_]?name|last[-_]?name|address/i;

const EMAIL_PATTERN = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi;
const DATA_URL_PATTERN = /data:[^;]+;base64,[A-Za-z0-9+/=]+/gi;

export const IGNORE_ERRORS: Array<string | RegExp> = [
  ...NOISE_PATTERNS,
  "ResizeObserver loop limit exceeded",
  "ResizeObserver loop completed with undelivered notifications.",
  "Script error.",
  "Non-Error promise rejection captured",
];

export const DENY_URLS: Array<string | RegExp> = [EXTENSION_PATTERN];

function truncate(value: string, max = MAX_MESSAGE_LENGTH): string {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function scrubString(value: string): string {
  return truncate(value.replace(DATA_URL_PATTERN, "[data-url]").replace(EMAIL_PATTERN, "[email]"));
}

function scrubUrl(value: string): string {
  try {
    const parsed = new URL(value);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return scrubString(value);
  }
}

function sanitizeRecord(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return scrubString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (depth >= MAX_OBJECT_DEPTH) return "[Filtered]";
  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_LENGTH).map((item) => sanitizeRecord(item, depth + 1));
  }
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) continue;
      result[key] = sanitizeRecord(entry, depth + 1);
    }
    return result;
  }
  return String(value);
}

function getEventMessages(event: Event): string[] {
  const messages: string[] = [];
  if (event.message) messages.push(event.message);
  if (event.logentry?.message) messages.push(event.logentry.message);
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) messages.push(exception.value);
  }
  return messages;
}

function hasExtensionFrame(event: Event): boolean {
  for (const exception of event.exception?.values ?? []) {
    for (const frame of exception.stacktrace?.frames ?? []) {
      if (frame.filename && EXTENSION_PATTERN.test(frame.filename)) return true;
    }
  }
  return false;
}

function hasExtensionRequest(event: Event): boolean {
  const url = event.request?.url;
  return typeof url === "string" && EXTENSION_PATTERN.test(url);
}

function isBotUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  return /bot|crawler|spider|headless|bingpreview|facebookexternalhit|slurp|semrush|ahrefs|bytespider|gptbot|claudebot/i.test(
    navigator.userAgent
  );
}

function getResponseStatus(event: Event): number | undefined {
  const tagsStatus = event.tags?.status;
  if (typeof tagsStatus === "string" && /^\d{3}$/.test(tagsStatus)) {
    return Number(tagsStatus);
  }
  const response = event.contexts?.response as { status_code?: unknown } | undefined;
  return typeof response?.status_code === "number" ? response.status_code : undefined;
}

function isExpectedError(error: unknown): boolean {
  if (error instanceof InputExtractionError) return true;
  if (error instanceof InsufficientCreditsError) return true;
  if (error instanceof ApiClientError) return error.status < 500;
  if (error instanceof AppError) return error.expected;
  if (error instanceof GroqCallError) {
    return error.kind === "rate_limited" || error.kind === "truncated";
  }
  return false;
}

function isNoiseMessage(message: string): boolean {
  return NOISE_PATTERNS.some((pattern) => pattern.test(message));
}

export function shouldCaptureError(error: unknown): boolean {
  if (error instanceof InputExtractionError) return false;
  if (error instanceof InsufficientCreditsError) return false;
  if (error instanceof ApiClientError) return error.status >= 500;
  if (error instanceof AppError) return !error.expected;
  if (error instanceof GroqCallError) {
    return error.kind !== "rate_limited" && error.kind !== "truncated";
  }
  if (detectUnsupportedBrowserError(error).suspected) return true;
  const message = error instanceof Error ? error.message : String(error);
  return !isNoiseMessage(message);
}

function shouldDropEvent(event: Event, hint?: EventHint): boolean {
  if (event.type === "transaction" || event.type === "replay_event") return true;
  if (hasExtensionFrame(event) || hasExtensionRequest(event)) return true;
  if (isBotUserAgent()) return true;

  const responseStatus = getResponseStatus(event);
  if (responseStatus !== undefined && responseStatus >= 400 && responseStatus < 500) {
    return true;
  }

  const messages = getEventMessages(event);
  if (messages.some((message) => isNoiseMessage(message))) return true;

  const originalException = hint?.originalException;
  if (isExpectedError(originalException)) return true;

  return false;
}

function applyPrivacyFilters(event: Event, hint?: EventHint): void {
  if (event.user) {
    event.user = event.user.id ? { id: String(event.user.id) } : undefined;
  }

  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.query_string;
    if (typeof event.request.url === "string") {
      event.request.url = scrubUrl(event.request.url);
    }
  }

  if (event.transaction) event.transaction = scrubUrl(event.transaction);
  if (event.message) event.message = scrubString(event.message);
  if (event.logentry?.message) event.logentry.message = scrubString(event.logentry.message);

  if (event.extra) event.extra = sanitizeRecord(event.extra) as Record<string, unknown>;
  if (event.contexts) {
    delete event.contexts.request;
    delete event.contexts.response;
    event.contexts = sanitizeRecord(event.contexts) as Event["contexts"];
  }
  if (event.tags) event.tags = sanitizeRecord(event.tags) as Event["tags"];

  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = scrubString(exception.value);
    for (const frame of exception.stacktrace?.frames ?? []) {
      delete frame.vars;
    }
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs
      .filter((breadcrumb) => {
        const category = breadcrumb.category ?? "";
        return !/(console|ui\.input|fetch|xhr|sentry)/i.test(category);
      })
      .map((breadcrumb) => ({
        ...breadcrumb,
        message: breadcrumb.message ? scrubString(breadcrumb.message) : breadcrumb.message,
        data: breadcrumb.data ? (sanitizeRecord(breadcrumb.data) as Record<string, unknown>) : undefined,
      }));
  }

  const diagnosis = detectUnsupportedBrowserError(hint?.originalException);
  if (diagnosis.suspected) {
    event.tags = { ...event.tags, suspectedOldBrowser: "true" };
    event.fingerprint = [...(event.fingerprint ?? ["{{ default }}"]), "unsupported-browser"];
    if (diagnosis.missingFeatures.length > 0) {
      event.tags.missingBrowserFeatures = diagnosis.missingFeatures.join(",");
    }
  }
}

function dedupeEvent<T extends Event>(event: T): T | null {
  const message = getEventMessages(event)[0] ?? "";
  const route = String(event.tags?.route ?? event.request?.url ?? event.transaction ?? "");
  const flow = String(event.tags?.flow ?? "");
  const userId = String(event.user?.id ?? "");
  const key = `${truncate(message, 200)}|${route}|${flow}|${userId}`;
  const now = Date.now();
  const lastSeen = seenEvents.get(key);

  if (lastSeen !== undefined && now - lastSeen < DUPLICATE_WINDOW_MS) {
    return null;
  }

  seenEvents.set(key, now);

  if (seenEvents.size > 500) {
    for (const [seenKey, timestamp] of seenEvents) {
      if (now - timestamp >= DUPLICATE_WINDOW_MS) seenEvents.delete(seenKey);
    }
  }

  return event;
}

export function prepareSentryEvent<T extends Event>(event: T, hint?: EventHint): T | null {
  if (shouldDropEvent(event, hint)) return null;
  applyPrivacyFilters(event, hint);
  return dedupeEvent(event);
}

export function dropSentryLog(): null {
  return null;
}
