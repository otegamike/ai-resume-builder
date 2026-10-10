import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import EmailOutbox from "@/models/EmailOutbox";
import EmailSuppression from "@/models/EmailSuppression";
import User from "@/models/User";
import { dedupeKeys, enqueue } from "../dispatcher";
import { clearEmailEnv, clearTestDb, setEmailEnv, startTestDb, stopTestDb } from "./testDb";

void EmailOutbox;
void EmailSuppression;
void User;

beforeAll(async () => {
  await startTestDb();
});

beforeEach(async () => {
  await clearTestDb();
  setEmailEnv({ EMAIL_DRY_RUN: "true", EMAIL_DEV_ALLOWLIST: "" });
});

afterAll(async () => {
  clearEmailEnv(["EMAIL_DRY_RUN", "EMAIL_DEV_ALLOWLIST", "EMAIL_FLAG_APPLICATION_REMINDER", "EMAIL_FLAG_APPLICATION_SUBMITTED", "EMAIL_FLAG_JOB_ALERTS"]);
  await stopTestDb();
});

describe("email dispatcher", () => {
  it("builds stable dedupe keys", () => {
    expect(dedupeKeys.welcome("u1")).toBe("welcome:u1");
    expect(dedupeKeys.applicationSubmitted("a1")).toBe("app-submitted:a1");
    expect(dedupeKeys.applicationReceived("a1")).toBe("app-received:a1");
    expect(dedupeKeys.applicationReminder("d1")).toBe("app-reminder:d1:1");
  });

  it("treats a repeated event as a duplicate, not a second email", async () => {
    const first = await enqueue({
      type: "welcome",
      to: "Ada@Example.com",
      payload: { name: "Ada" },
      dedupeKey: dedupeKeys.welcome("user-1"),
    });
    const second = await enqueue({
      type: "welcome",
      to: "ada@example.com",
      payload: { name: "Ada" },
      dedupeKey: dedupeKeys.welcome("user-1"),
    });
    expect(first.status).toBe("queued");
    expect(second.status).toBe("duplicate");
    if (first.status === "queued" && second.status === "duplicate") {
      expect(second.outboxId).toBe(first.outboxId);
    }
    expect(await EmailOutbox.countDocuments({})).toBe(1);
  });

  it("never enqueues a suppressed address", async () => {
    await EmailSuppression.create({ email: "bounced@example.com", reason: "bounce" });
    const result = await enqueue({
      type: "welcome",
      to: "Bounced@Example.com",
      payload: { name: "Bo" },
      dedupeKey: dedupeKeys.welcome("user-2"),
    });
    expect(result).toEqual({ status: "skipped", reason: "suppressed" });
    expect(await EmailOutbox.countDocuments({})).toBe(0);
  });

  it("skips invalid recipients without writing a row", async () => {
    const result = await enqueue({
      type: "welcome",
      to: "not-an-email",
      payload: {},
      dedupeKey: "welcome:x",
    });
    expect(result).toEqual({ status: "skipped", reason: "invalid_recipient" });
  });

  it("keeps applicant confirmations on by default but flaggable off", async () => {
    const on = await enqueue({
      type: "application-submitted",
      to: "ada@example.com",
      payload: { applicantName: "Ada", jobTitle: "Frontend Engineer", companyName: "Acme" },
      dedupeKey: "app-submitted:flag-1",
    });
    expect(on.status).toBe("queued");

    setEmailEnv({ EMAIL_DRY_RUN: "true", EMAIL_DEV_ALLOWLIST: "", EMAIL_FLAG_APPLICATION_SUBMITTED: "false" });
    const off = await enqueue({
      type: "application-submitted",
      to: "ada@example.com",
      payload: { applicantName: "Ada", jobTitle: "Frontend Engineer", companyName: "Acme" },
      dedupeKey: "app-submitted:flag-2",
    });
    expect(off).toEqual({ status: "skipped", reason: "flag_disabled" });
    expect(await EmailOutbox.countDocuments({ type: "application-submitted" })).toBe(1);
  });

  it("dedupes status mail per application and status", async () => {
    const payload = {
      applicantName: "Ada",
      jobTitle: "Frontend Engineer",
      companyName: "Acme",
      status: "shortlisted",
    };
    const first = await enqueue({
      type: "application-status-changed",
      to: "ada@example.com",
      payload,
      dedupeKey: dedupeKeys.applicationStatusChanged("app-1", "shortlisted"),
    });
    expect(first.status).toBe("queued");

    const repeat = await enqueue({
      type: "application-status-changed",
      to: "ada@example.com",
      payload,
      dedupeKey: dedupeKeys.applicationStatusChanged("app-1", "shortlisted"),
    });
    expect(repeat.status).toBe("duplicate");

    const nextStage = await enqueue({
      type: "application-status-changed",
      to: "ada@example.com",
      payload: { ...payload, status: "interviewing" },
      dedupeKey: dedupeKeys.applicationStatusChanged("app-1", "interviewing"),
    });
    expect(nextStage.status).toBe("queued");
    expect(dedupeKeys.applicationStatusChanged("app-1", "shortlisted")).toBe(
      "app-status:app-1:shortlisted"
    );
  });

  it("keeps the flagged reminder off by default", async () => {
    const off = await enqueue({
      type: "application-reminder",
      to: "ada@example.com",
      payload: {},
      dedupeKey: "app-reminder:d:1",
    });
    expect(off).toEqual({ status: "skipped", reason: "flag_disabled" });

    setEmailEnv({ EMAIL_DRY_RUN: "true", EMAIL_DEV_ALLOWLIST: "", EMAIL_FLAG_APPLICATION_REMINDER: "true" });
    const on = await enqueue({
      type: "application-reminder",
      to: "ada@example.com",
      payload: {},
      dedupeKey: "app-reminder:d:1",
    });
    expect(on.status).toBe("queued");
  });

  it("requires opt-in for job alerts", async () => {
    setEmailEnv({ EMAIL_DRY_RUN: "true", EMAIL_DEV_ALLOWLIST: "", EMAIL_FLAG_JOB_ALERTS: "true" });
    const user = await User.create({
      name: "Jo",
      email: "jo@example.com",
      authProviders: ["credentials"],
      oauthAccounts: [],
    });
    const out = await enqueue({
      type: "job-alert",
      to: "jo@example.com",
      userId: user._id,
      payload: {},
      dedupeKey: "job-alert:jo:2026-40",
    });
    expect(out).toEqual({ status: "skipped", reason: "opted_out" });

    await User.updateOne({ _id: user._id }, { $set: { "emailPreferences.jobAlerts": true } });
    const welcomed = await enqueue({
      type: "job-alert",
      to: "jo@example.com",
      userId: user._id,
      payload: {},
      dedupeKey: "job-alert:jo:2026-40",
    });
    expect(welcomed.status).toBe("queued");
  });

  it("blocks non-allowlisted addresses outside production", async () => {
    setEmailEnv({ EMAIL_DRY_RUN: "false", EMAIL_DEV_ALLOWLIST: "friend@example.com" });
    const blocked = await enqueue({
      type: "welcome",
      to: "stranger@example.com",
      payload: {},
      dedupeKey: "welcome:stranger",
    });
    expect(blocked).toEqual({ status: "skipped", reason: "not_allowlisted" });

    const allowed = await enqueue({
      type: "welcome",
      to: "friend@example.com",
      payload: {},
      dedupeKey: "welcome:friend",
    });
    expect(allowed.status).toBe("queued");
  });
});
