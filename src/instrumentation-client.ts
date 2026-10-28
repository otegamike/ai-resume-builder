import * as Sentry from "@sentry/nextjs";
import { getBaseSentryOptions } from "@/lib/sentry/options";

try {
  Sentry.init({
    ...getBaseSentryOptions("client"),
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
} catch {
  // Monitoring must not prevent the app from hydrating.
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
