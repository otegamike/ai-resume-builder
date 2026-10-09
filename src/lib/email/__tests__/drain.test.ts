import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import EmailOutbox from "@/models/EmailOutbox";
import EmailSuppression from "@/models/EmailSuppression";
import { enqueue } from "../dispatcher";
import { drainOutbox, SendError, type SendFn } from "../drain";
import { clearEmailEnv, clearTestDb, setEmailEnv, startTestDb, stopTestDb } from "./testDb";

void EmailOutbox;
void EmailSuppression;

const sentTo: string[] = [];
const fakeSender: SendFn = async ({ to }) => {
  sentTo.push(to);
  return { id: "re_test_message_id" };
};

beforeAll(async () => {
  await startTestDb();
});

beforeEach(async () => {
  await clearTestDb();
  sentTo.length = 0;
  setEmailEnv({ EMAIL_DRY_RUN: "false", EMAIL_DEV_ALLOWLIST: "", EMAIL_DAILY_LIMIT: "1000", EMAIL_MONTHLY_LIMIT: "10000" });
});

afterAll(async () => {
  clearEmailEnv(["EMAIL_DRY_RUN", "EMAIL_DEV_ALLOWLIST", "EMAIL_DAILY_LIMIT", "EMAIL_MONTHLY_LIMIT"]);
  await stopTestDb();
});

describe("outbox drain", () => {
  it("sends a queued row once and stores the provider id", async () => {
    await enqueue({
      type: "welcome",
      to: "ada@example.com",
      payload: { name: "Ada" },
      dedupeKey: "welcome:drain-1",
    });
    const summary = await drainOutbox({ limit: 10 }, fakeSender);
    expect(summary).toMatchObject({ claimed: 1, sent: 1 });
    expect(sentTo).toEqual(["ada@example.com"]);
    const row = await EmailOutbox.findOne({ dedupeKey: "welcome:drain-1" }).lean();
    expect(row?.status).toBe("sent");
    expect(row?.resendId).toBe("re_test_message_id");
    expect(row?.subject).toContain("Ada");

    // Nothing left due: a second drain sends nothing.
    const again = await drainOutbox({ limit: 10 }, fakeSender);
    expect(again).toMatchObject({ claimed: 0, sent: 0 });
    expect(sentTo).toHaveLength(1);
  });

  it("records dry runs without touching the network", async () => {
    setEmailEnv({ EMAIL_DRY_RUN: "true", EMAIL_DEV_ALLOWLIST: "", EMAIL_DAILY_LIMIT: "1000", EMAIL_MONTHLY_LIMIT: "10000" });
    await enqueue({
      type: "welcome",
      to: "ada@example.com",
      payload: { name: "Ada" },
      dedupeKey: "welcome:dry-1",
    });
    const summary = await drainOutbox({ limit: 10 }, fakeSender);
    expect(summary.sent).toBe(1);
    expect(sentTo).toHaveLength(0);
    const row = await EmailOutbox.findOne({ dedupeKey: "welcome:dry-1" }).lean();
    expect(row?.status).toBe("sent");
    expect(row?.resendId).toContain("dry-run");
  });

  it("skips recipients suppressed after enqueue", async () => {
    await enqueue({
      type: "welcome",
      to: "late@example.com",
      payload: { name: "Late" },
      dedupeKey: "welcome:late-1",
    });
    await EmailSuppression.create({ email: "late@example.com", reason: "complaint" });
    const summary = await drainOutbox({ limit: 10 }, fakeSender);
    expect(summary.skipped).toBe(1);
    expect(sentTo).toHaveLength(0);
    const row = await EmailOutbox.findOne({ dedupeKey: "welcome:late-1" }).lean();
    expect(row?.status).toBe("skipped");
  });

  it("reschedules retryable failures and fails validation errors", async () => {
    await enqueue({
      type: "welcome",
      to: "flaky@example.com",
      payload: { name: "Flaky" },
      dedupeKey: "welcome:flaky-1",
    });
    await drainOutbox({ limit: 10 }, async () => {
      throw new Error("socket hang up");
    });
    const pending = await EmailOutbox.findOne({ dedupeKey: "welcome:flaky-1" }).lean();
    expect(pending?.status).toBe("pending");
    expect(pending?.attempts).toBe(1);
    expect(pending?.sendAfter.getTime()).toBeGreaterThan(Date.now());

    await EmailOutbox.updateOne({ dedupeKey: "welcome:flaky-1" }, { $set: { sendAfter: new Date() } });
    // A validation rejection arrives as SendError kind "failed" (this is what
    // the real sender builds from a Resend 400); only that ends the row.
    await drainOutbox({ limit: 10 }, async () => {
      throw new SendError({ kind: "failed", message: "invalid from" });
    });
    const failed = await EmailOutbox.findOne({ dedupeKey: "welcome:flaky-1" }).lean();
    expect(failed?.status).toBe("failed");
    expect(sentTo).toHaveLength(0);
  });

  it("pauses on quota exhaustion and resumes after UTC midnight", async () => {
    setEmailEnv({ EMAIL_DRY_RUN: "false", EMAIL_DEV_ALLOWLIST: "", EMAIL_DAILY_LIMIT: "1", EMAIL_MONTHLY_LIMIT: "10000" });
    await enqueue({ type: "welcome", to: "one@example.com", payload: {}, dedupeKey: "welcome:q-1" });
    await enqueue({ type: "welcome", to: "two@example.com", payload: {}, dedupeKey: "welcome:q-2" });
    const summary = await drainOutbox({ limit: 10 }, fakeSender);
    expect(summary.sent).toBe(1);
    expect(summary.deferred).toBe(1);
    expect(summary.stoppedOnQuota).toBe(true);
    const waiting = await EmailOutbox.findOne({ dedupeKey: "welcome:q-2" }).lean();
    expect(waiting?.status).toBe("pending");
    // Resumes the next UTC day: sendAfter is tomorrow or later.
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    expect(waiting?.sendAfter.getTime()).toBeGreaterThanOrEqual(tomorrow.getTime());
  });
});
