import { NextResponse } from "next/server";
import { aiContextFromAuthUser, tailorResume, tailorResumeGrounded } from "@/lib/ai";
import type { JobMatchAnalysis as MatchAnalysis } from "@/types/JobApplicationData";
import { getAuthenticatedUser } from "@/lib/authUser";
import {
  resolveJobInput,
  resolveResumeInput,
} from "@/lib/inputExtraction";
import { deductCredits } from "@/lib/creditUtils";
import { handleApiError } from "@/lib/api/handleApiError";
import { withApiHandler } from "@/lib/api/withApiHandler";

export const runtime = "nodejs";

export const POST = withApiHandler(
  async (request: Request) => {
    try {
      const authUser = await getAuthenticatedUser();
      if (!authUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const newAiCredits = await deductCredits(String(authUser.userObjectId), "resumeTailor");
      const ctx = aiContextFromAuthUser(authUser);

      const formData = await request.formData();
      const targetTitle = (formData.get("targetTitle") as string) || "";
      const targetCompany = (formData.get("targetCompany") as string) || "";

      const { resumeText, existingResume } = await resolveResumeInput(formData, authUser, ctx);
      const jobDescriptionText = await resolveJobInput(formData, ctx);

      // 3. Perform AI Tailoring
      let report;
      const analysisRaw = formData.get("analysis") as string | null;
      if (analysisRaw) {
        try {
          const analysis = JSON.parse(analysisRaw) as MatchAnalysis;
          report = await tailorResumeGrounded(resumeText, jobDescriptionText, analysis, ctx, existingResume);
        } catch {
          report = await tailorResume(resumeText, jobDescriptionText, ctx, targetTitle, targetCompany, existingResume);
        }
      } else {
        report = await tailorResume(resumeText, jobDescriptionText, ctx, targetTitle, targetCompany, existingResume);
      }

      return NextResponse.json({ ...report, newAiCredits });
    } catch (error) {
      return handleApiError(error, { route: "/api/resume-tailor", flow: "resume-tailor" });
    }
  },
  { route: "/api/resume-tailor", flow: "resume-tailor" }
);
