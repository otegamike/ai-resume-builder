import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import EmailOutbox from "@/models/EmailOutbox";
import EmailSuppression from "@/models/EmailSuppression";
import { dedupeKeys } from "../dispatcher";
import { enqueueAndSendNow, sendRowNow, SendError, type SendFn } from "../drain";
import { clearEmailEnv, clearTestDb, setEmailEnv, startTestDb, stopTestDb } from "./testDb";

void EmailOutbox;
void EmailSuppression;

const calls: string[] = [];
const fakeSender: SendFn = async ({ to }) => {
  calls.push(to);
  return { id: "re_sync_test_id" };
};

function welcomePayload() {
  return { name: "Sync" };
}

async function waitFor(condition: () => Promise<boolean>, timeoutMs = 45000): Promise<void> {
  const start = Date.now();
  for (;;) {
    if (await condition()) return;
    if (Date.now() - start > timeoutMs) throw new Error("waitFor timed out");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

beforeAll(async () => {
  await startTestDb();
});

beforeEach(async () => {
  await clearTestDb();
  calls.length = 0;
  setEmailEnv({ EMAIL_DRY_RUN: "false", EMAIL_DEV_ALLOWLIST: "", EMAIL_DAILY_LIMIT: "1000", EMAIL_MONTHLY_LIMIT: "10000" });
});

afterAll(async () => {
  clearEmailEnv(["EMAIL_DRY_RUN", "EMAIL_DEV_ALLOWLIST", "EMAIL_DAILY_LIMIT", "EMAIL_MONTHLY_LIMIT", "EMAIL_ENABLED"]);
  await stopTestDb();
});

describe("synchronous priority send", () => {
  it("sends inline and records the provider id", async () => {
    const result = await enqueueAndSendNow(
      {
        type: "welcome",
        to: "sync@example.com",
        payload: welcomePayload(),
        dedupeKey: "welcome:sync-1",
      },
      { sender: fakeSender }
    );
    expect(result).toEqual({ status: "sent", resendId: "re_sync_test_id" });
    expect(calls).toEqual(["sync@example.com"]);
    const row = await EmailOutbox.findOne({ dedupeKey: "welcome:sync-1" }).lean();
    expect(row?.status).toBe("sent");
  });

  it("never transmits twice for a duplicate event", async () => {
    const params = {
      type: "welcome" as const,
      to: "dup@example.com",
      payload: welcomePayload(),
      dedupeKey: "welcome:dup-1",
    };
    expect((await enqueueAndSendNow(params, { sender: fakeSender })).status).toBe("sent");
    const again = await enqueueAndSendNow(params, { sender: fakeSender });
    expect(again.status).toBe("already-sent");
    expect(again.resendId).toBe("re_sync_test_id");
    expect(calls).toHaveLength(1);
  });

  it("queues when the first flight still owns the row", async () => {
    await EmailOutbox.create({
      type: "welcome",
      to: "inflight@example.com",
      payload: welcomePayload(),
      dedupeKey: "welcome:inflight-1",
      priority: 0,
      status: "pending",
      attempts: 0,
      sendAfter: new Date(),
    });
    const result = await enqueueAndSendNow(
      {
        type: "welcome",
        to: "inflight@example.com",
        payload: welcomePayload(),
        dedupeKey: "welcome:inflight-1",
      },
      { sender: fakeSender }
    );
    expect(result).toEqual({ status: "queued", reason: "inflight" });
    expect(calls).toHaveLength(0);
  });

  it("leaves retryable failures pending for cron", async () => {
    const result = await enqueueAndSendNow(
      {
        type: "welcome",
        to: "flaky@example.com",
        payload: welcomePayload(),
        dedupeKey: "welcome:flaky-1",
      },
      {
        sender: async () => {
          throw new Error("socket hang up");
        },
      }
    );
    expect(result.status).toBe("queued");
    const row = await EmailOutbox.findOne({ dedupeKey: "welcome:flaky-1" }).lean();
    expect(row?.status).toBe("pending");
    expect(row?.sendAfter.getTime()).toBeGreaterThan(Date.now());
  });

  it("fails validation errors without retrying", async () => {
    const result = await enqueueAndSendNow(
      {
        type: "welcome",
        to: "bad@example.com",
        payload: welcomePayload(),
        dedupeKey: "welcome:bad-1",
      },
      {
        sender: async () => {
          throw new SendError({ kind: "failed", message: "invalid from" });
        },
      }
    );
    expect(result).toEqual({ status: "failed", reason: "invalid from" });
    const row = await EmailOutbox.findOne({ dedupeKey: "welcome:bad-1" }).lean();
    expect(row?.status).toBe("failed");
  });

  it("defers when the quota is exhausted", async () => {
    setEmailEnv({ EMAIL_DRY_RUN: "false", EMAIL_DEV_ALLOWLIST: "", EMAIL_DAILY_LIMIT: "1", EMAIL_MONTHLY_LIMIT: "10000" });
    const first = await enqueueAndSendNow(
      { type: "welcome", to: "q1@example.com", payload: welcomePayload(), dedupeKey: "welcome:sq-1" },
      { sender: fakeSender }
    );
    expect(first.status).toBe("sent");
    const second = await enqueueAndSendNow(
      { type: "welcome", to: "q2@example.com", payload: welcomePayload(), dedupeKey: "welcome:sq-2" },
      { sender: fakeSender }
    );
    expect(second).toEqual({ status: "queued", reason: "daily_quota_exceeded" });
    expect(calls).toEqual(["q1@example.com"]);
    const row = await EmailOutbox.findOne({ dedupeKey: "welcome:sq-2" }).lean();
    expect(row?.status).toBe("pending");
  });

  it("skips suppressed recipients without a row or a call", async () => {
    await EmailSuppression.create({ email: "gone@example.com", reason: "bounce" });
    const result = await enqueueAndSendNow(
      { type: "welcome", to: "gone@example.com", payload: welcomePayload(), dedupeKey: "welcome:gone-1" },
      { sender: fakeSender }
    );
    expect(result).toEqual({ status: "skipped", reason: "suppressed" });
    expect(calls).toHaveLength(0);
    expect(await EmailOutbox.countDocuments({})).toBe(0);
  });

  it("respects the kill switch", async () => {
    setEmailEnv({ EMAIL_ENABLED: "false", EMAIL_DRY_RUN: "false", EMAIL_DEV_ALLOWLIST: "" });
    const result = await enqueueAndSendNow(
      { type: "welcome", to: "off@example.com", payload: welcomePayload(), dedupeKey: "welcome:off-1" },
      { sender: fakeSender }
    );
    expect(result).toEqual({ status: "skipped", reason: "disabled" });
    expect(calls).toHaveLength(0);
  });

  it(
    "gives up waiting on timeout but still settles the row",
    // Retry: the gated sender below spans several Atlas round trips, so a
    // network dip mid-test looks identical to a code bug. Retries only
    // re-run on failure; a green first pass runs once.
    { retry: 2, timeout: 120_000 },
    async () => {
    // Pre-insert the row so the timer races the send itself, not the
    // enqueue round trips.
    const created = await EmailOutbox.create({
      type: "welcome",
      to: "slow@example.com",
      payload: welcomePayload(),
      dedupeKey: "welcome:slow-1",
      priority: 0,
      status: "pending",
      attempts: 0,
      sendAfter: new Date(),
    });
    const row = await EmailOutbox.findById(created._id);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const hanging: SendFn = async ({ to }) => {
      calls.push(to);
      await gate;
      return { id: "re_late_id" };
    };
    const resultP = sendRowNow(row!, hanging, 10000);
    // Wait until the sender is actually invoked (pre-send work done), then
    // the timer must win while the sender stays gated.
    await waitFor(async () => calls.length === 1);
    const result = await resultP;
    expect(result).toEqual({ status: "queued", reason: "send_timeout" });
    release();
    await waitFor(async () => {
      const settled = await EmailOutbox.findOne({ dedupeKey: "welcome:slow-1" }).lean();
      return settled?.status === "sent";
    });
    const settled = await EmailOutbox.findOne({ dedupeKey: "welcome:slow-1" }).lean();
    expect(settled?.resendId).toBe("re_late_id");
    },
  );

  it("skips rows that cannot render", async () => {
    const created = await EmailOutbox.create({
      type: "application-submitted",
      to: "norender@example.com",
      payload: { jobTitle: "X" },
      dedupeKey: "app-submitted:norender-1",
      priority: 0,
      status: "pending",
      attempts: 0,
      sendAfter: new Date(),
    });
    const row = await EmailOutbox.findById(created._id);
    const result = await sendRowNow(row!, fakeSender);
    expect(result.status).toBe("skipped");
    expect(calls).toHaveLength(0);
  });

  it("builds stable candidate-message keys per send", () => {
    expect(dedupeKeys.candidateMessage("app-1").startsWith("candidate-message:app-1:")).toBe(true);
  });
});
