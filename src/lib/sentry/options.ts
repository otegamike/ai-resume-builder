import { DENY_URLS, dropSentryLog, IGNORE_ERRORS, prepareSentryEvent } from "./filters";

export type SentryRuntime = "client" | "server" | "edge";

const dataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
  mcp: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  stackFrameVariables: false,
  frameContextLines: 0,
};

export function getSentryDsn(runtime: SentryRuntime): string | undefined {
  if (runtime === "client") return process.env.NEXT_PUBLIC_SENTRY_DSN;
  return process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
}

export function getSentryRelease(): string | undefined {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.SENTRY_RELEASE ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
  );
}

export function getSentryEnvironment(): string {
  return process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
}

export function isSentryEnabled(runtime: SentryRuntime): boolean {
  return process.env.NODE_ENV === "production" && Boolean(getSentryDsn(runtime));
}

export function getBaseSentryOptions(runtime: SentryRuntime) {
  const dsn = getSentryDsn(runtime);

  return {
    dsn,
    enabled: isSentryEnabled(runtime),
    environment: getSentryEnvironment(),
    release: getSentryRelease(),
    tracesSampleRate: 0,
    sampleRate: 1,
    sendDefaultPii: false,
    enableLogs: false,
    maxBreadcrumbs: 0,
    attachStacktrace: true,
    ignoreErrors: IGNORE_ERRORS,
    denyUrls: DENY_URLS,
    dataCollection,
    beforeSend: prepareSentryEvent,
    beforeSendLog: dropSentryLog,
    initialScope: {
      tags: {
        app: "resumy-ai",
        runtime,
      },
    },
  };
}
