import { describe, expect, it } from "vitest";
import { renderEmail } from "../render";
import { STATUS_CHANGE_STATUSES } from "../templates/application-status-changed";

describe("status-change copy", () => {
  it("covers every supported status", () => {
    expect(STATUS_CHANGE_STATUSES).toEqual([
      "under_review",
      "shortlisted",
      "interviewing",
      "offered",
      "rejected",
    ]);
  });

  it("writes a distinct subject and body per status", async () => {
    const subjects = new Map<string, string>();
    for (const status of STATUS_CHANGE_STATUSES) {
      const rendered = await renderEmail("application-status-changed", {
        applicantName: "Ada",
        jobTitle: "Frontend Engineer",
        companyName: "Acme",
        status,
      });
      expect(rendered.html.length).toBeGreaterThan(100);
      expect(rendered.text).toContain("Ada");
      expect(rendered.text).toContain("Frontend Engineer");
      subjects.set(status, rendered.subject);
    }
    expect(new Set(subjects.values()).size).toBe(STATUS_CHANGE_STATUSES.length);
    expect(subjects.get("shortlisted")).toContain("shortlisted");
    expect(subjects.get("rejected")).toContain("Update");
  });

  it("rejects unknown statuses and missing names", async () => {
    await expect(
      renderEmail("application-status-changed", {
        applicantName: "Ada",
        jobTitle: "Frontend Engineer",
        status: "withdrawn",
      })
    ).rejects.toThrow("missing_email_prop:status");
    await expect(
      renderEmail("application-status-changed", {
        jobTitle: "Frontend Engineer",
        status: "shortlisted",
      })
    ).rejects.toThrow("missing_email_prop:applicantName");
  });
});
