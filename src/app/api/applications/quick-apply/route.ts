import { NextResponse } from "next/server";
import { getAuthenticatedUser, buildResumeOwnerQuery } from "@/lib/authUser";
import {
  tailorResume,
  generateCoverLetter,
  extractTextFromJobImage,
  extractResumeTextFromImages,
} from "@/lib/ai";
import {
  resumeContentToText,
  fileToDataUrl,
  isPdfUpload,
  extractTextFromPdf,
  assertSupportedUpload,
} from "@/lib/resumeImprover";
import dbConnect from "@/lib/db";
import Resume from "@/models/Resume";
import CoverLetter from "@/models/CoverLetter";
import Application from "@/models/Application";
import { ResumeContent } from "@/types/ResumeData";
import { templateDefinitions } from "@/lib/templateCatalog";
import { getRandomTemplateId } from "@/utils/templateUtils";
import { deductCredits, InsufficientCreditsError } from "@/lib/creditUtils";

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
    const jobMode = formData.get("jobMode") as string;
    const targetCompany = (formData.get("targetCompany") as string) || "";
    const targetRole = (formData.get("targetRole") as string) || "";

    // 1. Extract Resume Text
    let resumeText = "";
    let existingResume: ResumeContent | undefined = undefined;

    if (resumeMode === "saved") {
      const resumeId = formData.get("resumeId") as string;
      if (!resumeId) {
        return NextResponse.json({ error: "No saved resume ID provided" }, { status: 400 });
      }

      await dbConnect();
      const ownerQuery = buildResumeOwnerQuery(authUser.userObjectId, authUser.legacyUserId);
      const resume = await Resume.findOne({ _id: resumeId, ...ownerQuery });

      if (!resume) {
        return NextResponse.json({ error: "Resume not found" }, { status: 404 });
      }

      existingResume = resume.content;
      resumeText = resumeContentToText(resume.content);
    } else if (resumeMode === "upload") {
      const resumeFile = formData.get("resumeFile") as File | null;
      if (!resumeFile) {
        return NextResponse.json({ error: "No resume file uploaded" }, { status: 400 });
      }
      assertSupportedUpload(resumeFile);

      if (isPdfUpload(resumeFile)) {
        const pdfExtraction = await extractTextFromPdf(resumeFile);
        resumeText = pdfExtraction.text;
      } else {
        const dataUrl = await fileToDataUrl(resumeFile);
        resumeText = await extractResumeTextFromImages([dataUrl]);
      }
    } else {
      return NextResponse.json({ error: "Invalid resume mode specified" }, { status: 400 });
    }

    if (!resumeText.trim()) {
      return NextResponse.json(
        { error: "Could not extract readable text from the resume." },
        { status: 422 }
      );
    }

    // 2. Extract Job Description Text
    let jobDescriptionText = "";

    if (jobMode === "text") {
      jobDescriptionText = (formData.get("jobText") as string) || "";
    } else if (jobMode === "image") {
      const jobImageFile = formData.get("jobImage") as File | null;
      if (!jobImageFile) {
        return NextResponse.json({ error: "No job description image uploaded" }, { status: 400 });
      }
      if (!jobImageFile.type.startsWith("image/")) {
        return NextResponse.json({ error: "Job description file must be an image" }, { status: 400 });
      }
      const dataUrl = await fileToDataUrl(jobImageFile);
      jobDescriptionText = await extractTextFromJobImage(dataUrl);
    } else {
      return NextResponse.json({ error: "Invalid job context mode specified" }, { status: 400 });
    }

    if (!jobDescriptionText.trim()) {
      return NextResponse.json(
        { error: "Job description is empty or could not be read." },
        { status: 400 }
      );
    }

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
