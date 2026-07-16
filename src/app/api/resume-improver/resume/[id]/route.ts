import { NextRequest, NextResponse } from "next/server";
import { analyzeResumeForAts } from "@/lib/ai";
import { buildResumeOwnerQuery, getAuthenticatedUser } from "@/lib/authUser";
import dbConnect from "@/lib/db";
import { resumeContentToText } from "@/lib/resumeImprover";
import Resume from "@/models/Resume";
import { deductCredits, InsufficientCreditsError } from "@/lib/creditUtils";

export const runtime = "nodejs";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const newAiCredits = await deductCredits(String(authUser.userObjectId), "atsAnalysisSaved");

    await dbConnect();
    const ownerQuery = buildResumeOwnerQuery(authUser.userObjectId, authUser.legacyUserId);
    const resume = await Resume.findOne({ _id: id, ...ownerQuery });

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const extractedText = resumeContentToText(resume.content);
    if (!extractedText) {
      return NextResponse.json(
        { error: "This resume does not have enough content to review." },
        { status: 422 }
      );
    }

    const report = await analyzeResumeForAts(extractedText, resume.content);
    return NextResponse.json({ ...report, newAiCredits });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: error.message, creditsRemaining: error.creditsRemaining, cost: error.cost },
        { status: 402 }
      );
    }
    console.error("Saved resume ATS analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze resume" },
      { status: 500 }
    );
  }
}
