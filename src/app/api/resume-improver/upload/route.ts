import { NextResponse } from "next/server";
import { analyzeResumeForAts } from "@/lib/ai";
import { getAuthenticatedUser } from "@/lib/authUser";
import { deductCredits, InsufficientCreditsError } from "@/lib/creditUtils";
import {
  InputExtractionError,
  resolveUploadOnlyResumeInput,
} from "@/lib/inputExtraction";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const newAiCredits = await deductCredits(String(authUser.userObjectId), "atsAnalysisUpload");

    const formData = await request.formData();
    const extractedText = await resolveUploadOnlyResumeInput(formData, "file");

    const report = await analyzeResumeForAts(extractedText);

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
    const message =
      error instanceof Error ? error.message : "Failed to analyze uploaded resume";
    const status = message.includes("not supported") || message.includes("Upload")
      ? 400
      : 500;

    console.error("Resume upload analysis error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
