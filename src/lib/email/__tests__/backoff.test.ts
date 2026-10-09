import { describe, expect, it } from "vitest";
import { MAX_SEND_ATTEMPTS, RETRY_BACKOFF_MS, computeBackoffMs } from "../outbox";

describe("email retry backoff", () => {
  it("follows the 1m, 5m, 30m, 2h, 12h schedule", () => {
    expect(computeBackoffMs(1)).toBe(60_000);
    expect(computeBackoffMs(2)).toBe(5 * 60_000);
    expect(computeBackoffMs(3)).toBe(30 * 60_000);
    expect(computeBackoffMs(4)).toBe(2 * 3_600_000);
    expect(computeBackoffMs(5)).toBe(12 * 3_600_000);
    expect(RETRY_BACKOFF_MS).toHaveLength(5);
  });

  it("clamps attempts beyond the schedule instead of throwing", () => {
    expect(computeBackoffMs(99)).toBe(12 * 3_600_000);
    expect(computeBackoffMs(0)).toBe(60_000);
  });

  it("caps retries at five attempts", () => {
    expect(MAX_SEND_ATTEMPTS).toBe(5);
  });
});
