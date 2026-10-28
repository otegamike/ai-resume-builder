import * as Sentry from "@sentry/nextjs";
import { getBaseSentryOptions } from "@/lib/sentry/options";

try {
  Sentry.init(getBaseSentryOptions("edge"));
} catch {
  // Monitoring must not prevent edge routes from running.
}
