import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  allowedDevOrigins: ['172.20.10.3', '172.20.10.4', '192.168.0.159' ],
  async redirects() {
    return [
      { source: "/employer", destination: "/dashboard/jobs", permanent: true },
      { source: "/employer/:path*", destination: "/dashboard/jobs", permanent: true },
      { source: "/dashboard/employer", destination: "/dashboard/employers", permanent: true },
      { source: "/dashboard/employer/:path*", destination: "/dashboard/employers", permanent: true },
      { source: "/dashboard/improve", destination: "/dashboard/ai-tools", permanent: false },
      { source: "/dashboard/improve/:path*", destination: "/dashboard/ai-tools", permanent: false },
      { source: "/dashboard/tailor", destination: "/dashboard/ai-tools?tab=tailor", permanent: false },
      { source: "/dashboard/tailor/:path*", destination: "/dashboard/ai-tools?tab=tailor", permanent: false },
    ];
  },
};

const sentryRelease = process.env.VERCEL_GIT_COMMIT_SHA || process.env.SENTRY_RELEASE;

const sentryConfig = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG || "mikenzie",
  project: process.env.SENTRY_PROJECT || "resumy-ai",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.SENTRY_AUTH_TOKEN,
  telemetry: false,
  widenClientFileUpload: true,
  sourcemaps: {
    disable: false,
  },
  ...(sentryRelease ? { release: { name: sentryRelease } } : {}),
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeReplayIframe: true,
    excludeReplayShadowDom: true,
    excludeReplayWorker: true,
  },
  errorHandler: (error) => {
    console.warn("[sentry] build plugin warning:", error.message);
  },
});

const defines = sentryConfig.compiler?.define;
if (defines) {
  sentryConfig.compiler = {
    ...sentryConfig.compiler,
    define: Object.fromEntries(
      Object.entries(defines).map(([key, value]) => [key, String(value)])
    ),
  };
}

export default sentryConfig;
