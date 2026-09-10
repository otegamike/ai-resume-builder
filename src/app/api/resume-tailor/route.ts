import { NextResponse } from "next/server";
import { tailorResume, tailorResumeGrounded, type MatchAnalysis } from "@/lib/ai";
import { getAuthenticatedUser } from "@/lib/authUser";
import {
  InputExtractionError,
  resolveJobInput,
  resolveResumeInput,
} from "@/lib/inputExtraction";
import { deductCredits, InsufficientCreditsError } from "@/lib/creditUtils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const newAiCredits = await deductCredits(String(authUser.userObjectId), "resumeTailor");

    const formData = await request.formData();
    const targetTitle = (formData.get("targetTitle") as string) || "";
    const targetCompany = (formData.get("targetCompany") as string) || "";

    const { resumeText, existingResume } = await resolveResumeInput(formData, authUser);
    const jobDescriptionText = await resolveJobInput(formData);

    // 3. Perform AI Tailoring
    let report;
    const analysisRaw = formData.get("analysis") as string | null;
    if (analysisRaw) {
      try {
        const analysis = JSON.parse(analysisRaw) as MatchAnalysis;
        report = await tailorResumeGrounded(resumeText, jobDescriptionText, analysis, existingResume);
      } catch {
        report = await tailorResume(resumeText, jobDescriptionText, targetTitle, targetCompany, existingResume);
      }
    } else {
      report = await tailorResume(resumeText, jobDescriptionText, targetTitle, targetCompany, existingResume);
    }

    return NextResponse.json({ ...report, newAiCredits });
  } catch (error) {
    if (error instanceof InputExtractionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: error.message, creditsRemaining: error.creditsRemaining, cost: error.cost },
        { status: 402 }
      );
    }
    console.error("Resume tailoring error:", error);
    const message = error instanceof Error ? error.message : "Failed to tailor resume";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
