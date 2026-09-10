import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authUser";
import { tailorResume, generateCoverLetter } from "@/lib/ai";
import dbConnect from "@/lib/db";
import Resume from "@/models/Resume";
import CoverLetter from "@/models/CoverLetter";
import Application from "@/models/Application";
import { templateDefinitions } from "@/lib/templateCatalog";
import { getRandomTemplateId } from "@/utils/templateUtils";
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

    const newAiCredits = await deductCredits(String(authUser.userObjectId), "quickApply");

    const formData = await request.formData();
    const resumeMode = formData.get("resumeMode") as string;
    const targetCompany = (formData.get("targetCompany") as string) || "";
    const targetRole = (formData.get("targetRole") as string) || "";

    const { resumeText, existingResume } = await resolveResumeInput(formData, authUser);
    const jobDescriptionText = await resolveJobInput(formData);

    // 3. Run AI calls in parallel
    const [report, coverLetterResult] = await Promise.all([
      tailorResume(resumeText, jobDescriptionText, targetRole, targetCompany, existingResume),
      generateCoverLetter(resumeText, jobDescriptionText, targetCompany, targetRole, existingResume),
    ]);

    console.log("coverLetterResult", coverLetterResult);
    
    const { content: coverLetterContent, inferredRole, inferredCompany } = coverLetterResult;

    const effectiveRole = targetRole || inferredRole || "Unknown Role";
    const effectiveCompany = targetCompany || inferredCompany || "Unknown Company";

    // 4. Save to database
    await dbConnect();

    const title = effectiveRole && effectiveCompany
      ? `Cover Letter — ${effectiveRole} at ${effectiveCompany}`
      : effectiveRole
        ? `Cover Letter — ${effectiveRole}`
        : "Cover Letter";

    const coverLetter = new CoverLetter({
      userId: authUser.legacyUserId || String(authUser.userObjectId),
      user: authUser.userObjectId,
      title,
      targetCompany: effectiveCompany,
      targetRole: effectiveRole,
      content: coverLetterContent,
      jobDescription: jobDescriptionText,
      resumeId: resumeMode === "saved" ? (formData.get("resumeId") as string) : undefined,
      status: "draft",
    });

    const savedCoverLetter = await coverLetter.save();

    const jobIdentifier = effectiveRole || report.tailoredResume.personalInfo.jobTitle || "Job";
    const titleSuffix = effectiveCompany
      ? ` - Tailored for ${jobIdentifier} at ${effectiveCompany}`
      : ` - Tailored for ${jobIdentifier}`;

    const selectedTemplateId = getRandomTemplateId(templateDefinitions);

    const tailoredResumeDoc = new Resume({
      userId: authUser.legacyUserId || String(authUser.userObjectId),
      user: authUser.userObjectId,
      title: `${
        existingResume?.personalInfo?.name || report.tailoredResume.personalInfo.name || "Resume"
      }${titleSuffix}`,
      template: selectedTemplateId,
      content: report.tailoredResume,
    });

    const savedResume = await tailoredResumeDoc.save();

    const application = new Application({
      userId: authUser.legacyUserId || String(authUser.userObjectId),
      user: authUser.userObjectId,
      company: effectiveCompany,
      role: effectiveRole,
      status: "saved",
      notes: "",
      resumeId: savedResume._id,
      coverLetterId: savedCoverLetter._id,
      optimizations: report.keyChanges,
      matchScoreBefore: report.matchScoreBefore,
      matchScoreAfter: report.matchScoreAfter,
      explanation: report.explanation,
    });

    const savedApplication = await application.save();

    return NextResponse.json({
      report,
      coverLetter: coverLetterContent,
      applicationId: savedApplication._id,
      resumeId: savedResume._id,
      coverLetterId: savedCoverLetter._id,
      resumeTitle: tailoredResumeDoc.title,
      templateId: selectedTemplateId,
      inferredRole,
      inferredCompany,
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
    console.error("Quick apply error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate application";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
