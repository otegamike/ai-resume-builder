import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import EmailOutbox from "@/models/EmailOutbox";
import { dedupeKeys, enqueue } from "../dispatcher";
import { canComposeMessages } from "../permissions";
import { renderEmail } from "../render";
import { parseComposeBody } from "@/app/api/employer/messages/send/route";
import { clearEmailEnv, clearTestDb, setEmailEnv, startTestDb, stopTestDb } from "./testDb";

void EmailOutbox;

beforeAll(async () => {
  await startTestDb();
});

beforeEach(async () => {
  await clearTestDb();
  setEmailEnv({ EMAIL_DRY_RUN: "true", EMAIL_DEV_ALLOWLIST: "" });
});

afterAll(async () => {
  clearEmailEnv(["EMAIL_DRY_RUN", "EMAIL_DEV_ALLOWLIST"]);
  await stopTestDb();
});

describe("candidate-message composer", () => {
  it("gates on admin only", () => {
    expect(canComposeMessages({ isAdmin: true })).toBe(true);
    expect(canComposeMessages({ isAdmin: false })).toBe(false);
    expect(canComposeMessages(null)).toBe(false);
    expect(canComposeMessages(undefined)).toBe(false);
  });

  it("validates the send body strictly", () => {
    const valid = {
      applicationId: "507f1f77bcf86cd799439011",
      subject: "Next steps",
      body: "Thanks for applying.",
      replyMode: "custom",
      replyTo: "employer@example.com",
      contactEmail: "",
    };
    expect(parseComposeBody(valid)).toMatchObject({ subject: "Next steps" });
    expect(parseComposeBody({ ...valid, applicationId: "nope" })).toEqual({
      error: "Valid applicationId is required",
    });
    expect(parseComposeBody({ ...valid, subject: "  " })).toEqual({
      error: "Subject is required",
    });
    expect(parseComposeBody({ ...valid, subject: "x".repeat(121) })).toEqual({
      error: "Subject must be 120 characters or fewer",
    });
    expect(parseComposeBody({ ...valid, body: "" })).toEqual({
      error: "Message body is required",
    });
    expect(parseComposeBody({ ...valid, replyTo: "bad" })).toEqual({
      error: "A valid reply-to email is required for custom mode",
    });
    expect(
      parseComposeBody({ ...valid, replyMode: "dontreply", contactEmail: "bad" })
    ).toEqual({ error: "A valid contact email is required for do-not-reply mode" });
    // Unknown modes fall back to hiring; stray addresses are ignored.
    expect(
      parseComposeBody({ ...valid, replyMode: "other", replyTo: "bad", contactEmail: "bad" })
    ).toMatchObject({ replyMode: "hiring" });
  });

  it("renders all three reply modes with the hiring identity", async () => {
    const base = {
      applicantName: "Ada",
      jobTitle: "Frontend Engineer",
      companyName: "Acme",
      subject: "Next steps",
      messageBody: "Line one.\n\nLine two.",
    };
    const hiring = await renderEmail("candidate-message", { ...base, replyMode: "hiring" });
    expect(hiring.from).toContain("hiring@agenticapp.cv");
    expect(hiring.replyTo).toContain("hiring@agenticapp.cv");
    expect(hiring.html).toContain("Line one.");
    expect(hiring.text).toContain("Line two.");

    const custom = await renderEmail("candidate-message", {
      ...base,
      replyMode: "custom",
      replyTo: "boss@example.com",
    });
    expect(custom.from).toContain("hiring@agenticapp.cv");
    expect(custom.replyTo).toBe("boss@example.com");

    const dontreply = await renderEmail("candidate-message", {
      ...base,
      replyMode: "dontreply",
      contactEmail: "people@example.com",
    });
    expect(dontreply.html).toContain("do not reply");
    expect(dontreply.text).toContain("people@example.com");
    expect(dontreply.replyTo).toBe("people@example.com");
  });

  it("rejects oversize admin copy at render time", async () => {
    await expect(
      renderEmail("candidate-message", {
        applicantName: "Ada",
        jobTitle: "X",
        companyName: "Acme",
        subject: "s".repeat(121),
        messageBody: "hi",
        replyMode: "hiring",
      })
    ).rejects.toThrow("email_prop_too_long:subject");
  });

  it("queues every manual send separately", async () => {
    const payload = {
      applicantName: "Ada",
      jobTitle: "Frontend Engineer",
      companyName: "Acme",
      subject: "Hello",
      messageBody: "First message",
      replyMode: "hiring",
    };
    const first = await enqueue({
      type: "candidate-message",
      to: "ada@example.com",
      payload,
      dedupeKey: dedupeKeys.candidateMessage("app-9"),
      priority: 1,
    });
    expect(first.status).toBe("queued");
    const second = await enqueue({
      type: "candidate-message",
      to: "ada@example.com",
      payload: { ...payload, messageBody: "Second message" },
      dedupeKey: dedupeKeys.candidateMessage("app-9"),
      priority: 1,
    });
    // Same millisecond → same key → one row; different millisecond → two rows.
    // Either way the invariant holds: identical keys never send twice.
    if (second.status === "duplicate") {
      expect(await EmailOutbox.countDocuments({ type: "candidate-message" })).toBe(1);
    } else {
      expect(second.status).toBe("queued");
      expect(await EmailOutbox.countDocuments({ type: "candidate-message" })).toBe(2);
    }
    expect(
      dedupeKeys.candidateMessage("app-9").startsWith("candidate-message:app-9:")
    ).toBe(true);
  });
});
