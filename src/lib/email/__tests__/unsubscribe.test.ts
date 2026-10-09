import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import User from "@/models/User";
import { applyUnsubscribe, createUnsubscribeToken, verifyUnsubscribeToken } from "../unsubscribe";
import { clearTestDb, startTestDb, stopTestDb } from "./testDb";

void User;

beforeAll(async () => {
  await startTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

afterAll(async () => {
  await stopTestDb();
});

describe("unsubscribe tokens", () => {
  it("round-trips and applies an opt-out", async () => {
    const user = await User.create({
      name: "Jo",
      email: "jo-unsub@example.com",
      authProviders: ["credentials"],
      oauthAccounts: [],
    });
    const token = createUnsubscribeToken(String(user._id), "job-alerts");
    const decoded = verifyUnsubscribeToken(token);
    expect(decoded?.userId).toBe(String(user._id));
    expect(decoded?.type).toBe("job-alerts");

    await User.updateOne({ _id: user._id }, { $set: { "emailPreferences.jobAlerts": true } });
    expect(await applyUnsubscribe(String(user._id), "job-alerts")).toBe(true);
    const updated = await User.findById(user._id).select("emailPreferences").lean();
    expect(updated?.emailPreferences?.jobAlerts).toBe(false);
  });

  it("rejects tampered tokens", async () => {
    const user = await User.create({
      name: "Jo",
      email: "jo-tamper@example.com",
      authProviders: ["credentials"],
      oauthAccounts: [],
    });
    const token = createUnsubscribeToken(String(user._id), "all");
    expect(verifyUnsubscribeToken(`${token}x`)).toBeNull();
    expect(verifyUnsubscribeToken("garbage")).toBeNull();
  });
});
