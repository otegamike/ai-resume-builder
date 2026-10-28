import * as Sentry from "@sentry/nextjs";
import { getBaseSentryOptions } from "@/lib/sentry/options";

try {
  Sentry.init(getBaseSentryOptions("server"));
} catch {
  // Monitoring must not prevent the server from starting.
}
