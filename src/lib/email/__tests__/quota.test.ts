import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import EmailQuota from "@/models/EmailQuota";
import { getQuotaUsage, tryConsumeQuota } from "../quota";
import { clearEmailEnv, clearTestDb, setEmailEnv, startTestDb, stopTestDb } from "./testDb";

void EmailQuota;

beforeAll(async () => {
  await startTestDb();
});

beforeEach(async () => {
  await clearTestDb();
  setEmailEnv({ EMAIL_DRY_RUN: "true", EMAIL_DAILY_LIMIT: "1000", EMAIL_MONTHLY_LIMIT: "10000" });
});

afterAll(async () => {
  clearEmailEnv(["EMAIL_DRY_RUN", "EMAIL_DAILY_LIMIT", "EMAIL_MONTHLY_LIMIT"]);
  await stopTestDb();
});

describe("quota guard", () => {
  it("never exceeds the daily limit under concurrent drains", async () => {
    setEmailEnv({ EMAIL_DRY_RUN: "true", EMAIL_DAILY_LIMIT: "5", EMAIL_MONTHLY_LIMIT: "10000" });
    const attempts = await Promise.all(Array.from({ length: 10 }, () => tryConsumeQuota(0)));
    expect(attempts.filter((entry) => entry.allowed)).toHaveLength(5);
    const usage = await getQuotaUsage();
    expect(usage.dayCount).toBe(5);
    expect(await EmailQuota.countDocuments({})).toBe(2); // one day doc + one month doc
  });

  it("defers low-priority mail once daily usage passes 70%", async () => {
    setEmailEnv({ EMAIL_DRY_RUN: "true", EMAIL_DAILY_LIMIT: "10", EMAIL_MONTHLY_LIMIT: "10000" });
    for (let i = 0; i < 7; i += 1) {
      expect(await tryConsumeQuota(0)).toEqual({ allowed: true });
    }
    expect(await tryConsumeQuota(1)).toEqual({ allowed: false, reason: "deferred_priority" });
    expect(await tryConsumeQuota(0)).toEqual({ allowed: true });
  });

  it("stops on the monthly cap and reports usage", async () => {
    setEmailEnv({ EMAIL_DRY_RUN: "true", EMAIL_DAILY_LIMIT: "1000", EMAIL_MONTHLY_LIMIT: "2" });
    expect(await tryConsumeQuota(0)).toEqual({ allowed: true });
    expect(await tryConsumeQuota(0)).toEqual({ allowed: true });
    expect(await tryConsumeQuota(0)).toEqual({ allowed: false, reason: "monthly_quota_exceeded" });
    const usage = await getQuotaUsage();
    expect(usage.monthCount).toBe(2);
    expect(usage.dailyLimit).toBe(1000);
  });
});
