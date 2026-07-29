import crypto from "crypto";
import { describe, it, expect } from "vitest";

function verifySignature(rawBody: string, signature: string, secret: string) {
  const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  return hash === signature;
}

describe("Paystack webhook signature verification", () => {
  const secret = "sk_test_dummy";
  const rawBody = JSON.stringify({ event: "charge.success", data: { id: 123 } });
  const validSig = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");

  it("accepts a correctly signed payload", () => {
    expect(verifySignature(rawBody, validSig, secret)).toBe(true);
  });

  it("rejects a tampered payload", () => {
    const tampered = rawBody.replace("123", "999");
    expect(verifySignature(tampered, validSig, secret)).toBe(false);
  });

  it("rejects a wrong secret", () => {
    expect(verifySignature(rawBody, validSig, "wrong_secret")).toBe(false);
  });
});
