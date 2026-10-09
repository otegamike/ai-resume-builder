import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import EmailOutbox from "@/models/EmailOutbox";
import EmailSuppression from "@/models/EmailSuppression";
import EmailQuota from "@/models/EmailQuota";
import EmailEvent from "@/models/EmailEvent";
import User from "@/models/User";
import { resetEmailConfigForTests } from "../config";
import { resetResendForTests } from "../client";

const BLOCKED_DB_NAMES = ["resumy", "admin", "local", "config"];

/** The test database name. Refuses production and system database names. */
export function testDbName(): string {
  const name = (process.env.TEST_MONGODB_DB_NAME ?? "").trim();
  if (!name || BLOCKED_DB_NAMES.includes(name.toLowerCase())) {
    throw new Error(
      '[email tests] Refusing to use database "Resumy" (or a system database) for tests. ' +
        "Set TEST_MONGODB_DB_NAME to a dedicated test database in .env.test.local."
    );
  }
  return name;
}

/** Connect to the isolated test database on the test cluster. */
export async function startTestDb(): Promise<void> {
  await dbConnect(testDbName());
}

export async function clearTestDb(): Promise<void> {
  const expected = testDbName();
  await dbConnect(expected);
  // Guardrail: the mass delete below only ever runs against the expected
  // test database. It cannot touch sibling databases on the cluster.
  const actual = mongoose.connection.name;
  if (actual !== expected) {
    throw new Error(
      `[email tests] Connected to "${actual}", expected "${expected}". Refusing to clear.`
    );
  }
  // deleteMany (not dropDatabase): dropping the database also drops its
  // indexes, and the unique index on dedupeKey would not be rebuilt before
  // the next insert over cluster latency, breaking idempotency tests.
  await Promise.all([
    EmailOutbox.deleteMany({}),
    EmailSuppression.deleteMany({}),
    EmailQuota.deleteMany({}),
    EmailEvent.deleteMany({}),
    User.deleteMany({}),
  ]);
}

export async function stopTestDb(): Promise<void> {
  await mongoose.disconnect();
  const globalWithMongoose = globalThis as typeof globalThis & {
    mongoose?: { conn: unknown; promise: unknown; dbName: unknown } | undefined;
  };
  globalWithMongoose.mongoose = { conn: null, promise: null, dbName: null };
}

/** Override email env for one test, then drop the cached config. */
export function setEmailEnv(vars: Record<string, string>): void {
  for (const [key, value] of Object.entries(vars)) {
    process.env[key] = value;
  }
  resetEmailConfigForTests();
  resetResendForTests();
}

/** Remove overrides set by setEmailEnv so files stay independent. */
export function clearEmailEnv(keys: string[]): void {
  for (const key of keys) {
    delete process.env[key];
  }
  resetEmailConfigForTests();
  resetResendForTests();
}
