import { describe, expect, it } from "vitest";
import { utcDayKey, utcMonthKey } from "../quota";

describe("quota UTC day/month keys", () => {
  it("uses the UTC calendar day, not local time", () => {
    // 23:30 in UTC-5 is already the next day in UTC.
    expect(utcDayKey(new Date("2026-01-01T23:30:00-05:00"))).toBe("day:2026-01-02");
    expect(utcDayKey(new Date("2026-01-02T00:30:00Z"))).toBe("day:2026-01-02");
  });

  it("keys months in UTC too", () => {
    expect(utcMonthKey(new Date("2026-01-31T23:30:00-05:00"))).toBe("month:2026-02");
    expect(utcMonthKey(new Date("2026-10-08T12:00:00Z"))).toBe("month:2026-10");
  });
});
