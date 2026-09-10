import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authUser";
import { generateCoverLetter } from "@/lib/ai";
import dbConnect from "@/lib/db";
import CoverLetter from "@/models/CoverLetter";
import { deductCredits, InsufficientCreditsError } from "@/lib/creditUtils";
import {
  InputExtractionError,
  resolveJobInput,
  resolveResumeInput,
} from "@/lib/inputExtraction";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const newAiCredits = await deductCredits(String(authUser.userObjectId), "coverLetterGenerate");

    const formData = await request.formData();
    const resumeMode = formData.get("resumeMode") as string;
    const targetCompany = (formData.get("targetCompany") as string) || "";
    const targetRole = (formData.get("targetRole") as string) || "";

    const { resumeText, existingResume } = await resolveResumeInput(formData, authUser);
    const jobDescriptionText = await resolveJobInput(formData);

    // 3. Generate cover letter via AI
    const coverLetterResult = await generateCoverLetter(
      resumeText,
      jobDescriptionText,
      targetCompany,
      targetRole,
      existingResume
    );
    const coverLetterContent = coverLetterResult.content;
    const inferredRole = coverLetterResult.inferredRole;

    // 4. Save to database
    await dbConnect();
    const title = targetRole && targetCompany
      ? `Cover Letter — ${targetRole} at ${targetCompany}`
      : targetRole
        ? `Cover Letter — ${targetRole}`
        : "Cover Letter";

    const coverLetter = new CoverLetter({
      userId: authUser.legacyUserId || String(authUser.userObjectId),
      user: authUser.userObjectId,
      title,
      targetCompany,
      targetRole,
      content: coverLetterContent,
      jobDescription: jobDescriptionText,
      resumeId: resumeMode === "saved" ? (formData.get("resumeId") as string) : undefined,
      status: "draft",
    });

    const saved = await coverLetter.save();

    return NextResponse.json({
      id: saved._id,
      title: saved.title,
      content: coverLetterContent,
      targetCompany,
      targetRole,
      inferredRole,
      newAiCredits,
    });
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
    console.error("Cover letter generation error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate cover letter";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
