import { describe, expect, it } from "vitest";
import { classifyResendError } from "../drain";

describe("resend error classification", () => {
  it("retries rate limits, 5xx, and network failures", () => {
    expect(classifyResendError({ statusCode: 429, message: "slow down" })).toEqual({
      kind: "retryable",
      message: "slow down",
    });
    expect(classifyResendError({ statusCode: 503 })).toMatchObject({ kind: "retryable" });
    expect(classifyResendError(new Error("socket hang up"))).toMatchObject({ kind: "retryable" });
  });

  it("pauses draining on Resend-side quota errors", () => {
    expect(classifyResendError({ name: "daily_quota_exceeded", message: "cap" })).toEqual({
      kind: "quota",
      message: "cap",
    });
    expect(classifyResendError({ name: "monthly_quota_exceeded", message: "cap" })).toMatchObject({
      kind: "quota",
    });
  });

  it("fails validation errors without retrying", () => {
    expect(classifyResendError({ statusCode: 400, message: "bad from" })).toMatchObject({
      kind: "failed",
    });
  });
});
