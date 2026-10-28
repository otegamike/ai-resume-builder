import * as Sentry from "@sentry/nextjs";
import { shouldCaptureError } from "./filters";
import { detectUnsupportedBrowserError } from "@/lib/errors/unsupportedBrowser";

export interface ApiErrorContext {
  route: string;
  flow: string;
  stage?: string;
  method?: string;
  status?: number;
  expected?: boolean;
  userId?: string;
  requireCanvas?: boolean;
}

export interface ClientErrorContext {
  flow: string;
  stage?: string;
  route?: string;
  templateId?: string;
  userId?: string;
  requireCanvas?: boolean;
}

function currentPathname(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.location.pathname;
}

function applyTags(
  scope: Sentry.Scope,
  context: {
    route?: string;
    flow?: string;
    stage?: string;
    method?: string;
    status?: number;
    templateId?: string;
  }
): void {
  if (context.route) scope.setTag("route", context.route);
  if (context.flow) scope.setTag("flow", context.flow);
  if (context.stage) scope.setTag("stage", context.stage);
  if (context.method) scope.setTag("method", context.method);
  if (context.status !== undefined) scope.setTag("status", String(context.status));
  if (context.templateId) scope.setTag("templateId", context.templateId);
}

function applyOldBrowserTags(
  scope: Sentry.Scope,
  error: unknown,
  requireCanvas?: boolean
): void {
  const diagnosis = detectUnsupportedBrowserError(error, { requireCanvas });
  if (!diagnosis.suspected) return;

  scope.setTag("suspectedOldBrowser", "true");
  if (diagnosis.missingFeatures.length > 0) {
    scope.setTag("missingBrowserFeatures", diagnosis.missingFeatures.join(","));
  }
  scope.setFingerprint(["unsupported-browser"]);
}

export function captureApiError(error: unknown, context: ApiErrorContext): void {
  if (context.expected) return;
  if (!shouldCaptureError(error)) return;

  try {
    Sentry.withScope((scope) => {
      applyTags(scope, context);
      if (context.userId) scope.setUser({ id: context.userId });
      if (context.stage) scope.setExtra("stage", context.stage);
      applyOldBrowserTags(scope, error, context.requireCanvas);
      Sentry.captureException(error);
    });
  } catch {
    // Monitoring must never change the response the user receives.
  }
}

export function captureClientError(error: unknown, context: ClientErrorContext): void {
  if (!shouldCaptureError(error)) return;

  try {
    Sentry.withScope((scope) => {
      applyTags(scope, { ...context, route: context.route ?? currentPathname() });
      if (context.userId) scope.setUser({ id: context.userId });
      applyOldBrowserTags(scope, error, context.requireCanvas);
      Sentry.captureException(error);
    });
  } catch {
    // Monitoring must never break the page.
  }
}
