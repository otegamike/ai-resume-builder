import { describe, expect, it } from "vitest";
import { buildPdfRenderModel } from "@/lib/pdf/renderModel";
import { initialResume } from "@/constants/ResumeConstants";

describe("buildPdfRenderModel visibility flags", () => {
  it("marks optional sections as absent when data is empty", () => {
    const resume = {
      ...initialResume,
      summary: "  ",
      skills: [],
      experience: [],
      education: [],
    };

    const model = buildPdfRenderModel(resume);
    expect(model.hasSummary).toBe(false);
    expect(model.hasSkills).toBe(false);
    expect(model.hasExperience).toBe(false);
    expect(model.hasEducation).toBe(false);
  });

  it("filters empty bullet lines from experience entries", () => {
    const resume = {
      ...initialResume,
      experience: [
        {
          id: "1",
          company: "Test Co",
          role: "Engineer",
          startDate: "Jan 2024",
          endDate: "Present",
          description: ["Shipped feature", "   ", ""],
        },
      ],
    };

    const model = buildPdfRenderModel(resume);
    expect(model.experience[0]?.description).toEqual(["Shipped feature"]);
  });
});

