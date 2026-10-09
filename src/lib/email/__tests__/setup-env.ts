// Vitest setup file for the email suite (not a test itself).
// Runs before test files in each worker, so module-scope reads of
// process.env (e.g. src/lib/db.ts) see these values.
//
// Under Vitest, NODE_ENV is "test", so loadEnvConfig reads .env.test.local
// (plus .env.test and .env). Note .env.local is deliberately NOT loaded in
// test mode, which is why the test-only variables below live in
// .env.test.local. Pass forceReload so a second load in the same process
// cannot serve stale values.
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), false, console, true);

const missing = ["TEST_MONGODB_URI", "TEST_MONGODB_DB_NAME"].filter(
  (key) => !((process.env[key] ?? "").trim())
);
if (missing.length > 0) {
  throw new Error(
    `[email tests] Missing ${missing.join(" and ")}. Set both in .env.test.local ` +
      `(see README "Transactional Email"). Tests must never fall back to localhost or production.`
  );
}
process.env.MONGODB_URI = (process.env.TEST_MONGODB_URI ?? "").trim();

// Safety defaults: unit tests never send real mail unless a test opts out.
if (!process.env.EMAIL_DRY_RUN) process.env.EMAIL_DRY_RUN = "true";
if (!process.env.EMAIL_ENABLED) process.env.EMAIL_ENABLED = "true";
if (!process.env.EMAIL_FLAG_APPLICATION_REMINDER) process.env.EMAIL_FLAG_APPLICATION_REMINDER = "false";
if (!process.env.EMAIL_FLAG_JOB_ALERTS) process.env.EMAIL_FLAG_JOB_ALERTS = "false";
