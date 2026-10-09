import { describe, expect, it } from "vitest";
import { signTestPayload, verifySvixSignature, type SvixHeaders } from "../webhook";

const SECRET = `whsec_${Buffer.from("test-secret-key-1234567890abcdef").toString("base64")}`;

function headersFor(nowMs: number): SvixHeaders {
  return {
    svixId: "msg_test_123",
    svixTimestamp: String(Math.floor(nowMs / 1000)),
    svixSignature: "",
  };
}

describe("resend webhook signature", () => {
  it("accepts a correctly signed payload", () => {
    const now = Date.now();
    const raw = JSON.stringify({ type: "email.delivered", data: { email_id: "abc" } });
    const headers = headersFor(now);
    headers.svixSignature = signTestPayload(raw, headers, SECRET);
    expect(verifySvixSignature(raw, headers, SECRET, now)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const now = Date.now();
    const raw = JSON.stringify({ type: "email.delivered", data: { email_id: "abc" } });
    const headers = headersFor(now);
    headers.svixSignature = signTestPayload(raw, headers, SECRET);
    expect(verifySvixSignature(`${raw} `, headers, SECRET, now)).toBe(false);
  });

  it("rejects the wrong secret", () => {
    const now = Date.now();
    const raw = JSON.stringify({ type: "email.delivered" });
    const headers = headersFor(now);
    headers.svixSignature = signTestPayload(raw, headers, SECRET);
    const other = `whsec_${Buffer.from("another-secret-0000000000000000").toString("base64")}`;
    expect(verifySvixSignature(raw, headers, other, now)).toBe(false);
  });

  it("rejects stale timestamps (replay bound)", () => {
    const now = Date.now();
    const raw = JSON.stringify({ type: "email.delivered" });
    const headers = headersFor(now - 10 * 60_000);
    headers.svixSignature = signTestPayload(raw, headers, SECRET);
    expect(verifySvixSignature(raw, headers, SECRET, now)).toBe(false);
  });

  it("rejects missing headers", () => {
    expect(
      verifySvixSignature("{}", { svixId: "", svixTimestamp: "", svixSignature: "" }, SECRET)
    ).toBe(false);
  });
});
