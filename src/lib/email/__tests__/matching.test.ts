import { describe, expect, it } from "vitest";
import { digestCohort, scoreRelatedJobs, type MatchProfile } from "../matching/score";

const profile: MatchProfile = {
  skills: ["react", "typescript", "node"],
  appliedJobIds: ["job-applied"],
  appliedTitles: ["Frontend Engineer"],
  appliedCategories: ["engineering"],
};

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    jobId: "job-1",
    title: "Frontend Engineer",
    category: "engineering",
    skills: ["react", "typescript"],
    postedAt: new Date("2026-10-01T00:00:00Z"),
    ...overrides,
  };
}

describe("related-jobs scorer", () => {
  it("ranks the strongest skill overlap first", () => {
    const ranked = scoreRelatedJobs(
      profile,
      [
        candidate({ jobId: "weak", skills: ["excel"] }),
        candidate({ jobId: "strong", skills: ["react", "typescript", "node"] }),
      ],
      { now: new Date("2026-10-08T00:00:00Z"), minScore: 0 }
    );
    expect(ranked[0]?.jobId).toBe("strong");
  });

  it("excludes applied, own, and hidden jobs", () => {
    const ranked = scoreRelatedJobs(
      profile,
      [
        candidate({ jobId: "job-applied" }),
        candidate({ jobId: "own", ownJob: true }),
        candidate({ jobId: "hidden", hidden: true }),
        candidate({ jobId: "ok" }),
      ],
      { now: new Date("2026-10-08T00:00:00Z"), minScore: 0 }
    );
    expect(ranked.map((entry) => entry.jobId)).toEqual(["ok"]);
  });

  it("returns nothing when nothing clears the threshold", () => {
    const ranked = scoreRelatedJobs(profile, [candidate({ jobId: "far", title: "Truck Driver", category: "logistics", skills: ["driving"] })], {
      now: new Date("2026-10-08T00:00:00Z"),
    });
    expect(ranked).toEqual([]);
  });

  it("caps results at five", () => {
    const many = Array.from({ length: 8 }, (_, index) => candidate({ jobId: `job-${index}` }));
    const ranked = scoreRelatedJobs(profile, many, {
      now: new Date("2026-10-08T00:00:00Z"),
      minScore: 0,
    });
    expect(ranked).toHaveLength(5);
  });

  it("prefers recent postings when everything else ties", () => {
    const ranked = scoreRelatedJobs(
      profile,
      [
        candidate({ jobId: "old", postedAt: new Date("2026-08-01T00:00:00Z") }),
        candidate({ jobId: "new", postedAt: new Date("2026-10-07T00:00:00Z") }),
      ],
      { now: new Date("2026-10-08T00:00:00Z"), minScore: 0 }
    );
    expect(ranked[0]?.jobId).toBe("new");
  });
});

describe("digest cohorts", () => {
  it("is deterministic and bounded", () => {
    expect(digestCohort("user-123")).toBe(digestCohort("user-123"));
    for (const id of ["a", "b", "user-xyz", "507f1f77bcf86cd799439011"]) {
      const bucket = digestCohort(id);
      expect(bucket).toBeGreaterThanOrEqual(0);
      expect(bucket).toBeLessThan(7);
    }
  });
});
