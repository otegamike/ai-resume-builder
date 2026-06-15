import { NextResponse } from "next/server";
import { getAuthenticatedUser, buildResumeOwnerQuery } from "@/lib/authUser";
import { generateCoverLetter, extractTextFromJobImage, extractResumeTextFromImages } from "@/lib/ai";
import { resumeContentToText, fileToDataUrl, isPdfUpload, extractTextFromPdf, assertSupportedUpload } from "@/lib/resumeImprover";
import dbConnect from "@/lib/db";
import Resume from "@/models/Resume";
import CoverLetter from "@/models/CoverLetter";
import { ResumeContent } from "@/types/ResumeData";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const resumeMode = formData.get("resumeMode") as string;
    const jobMode = formData.get("jobMode") as string;
    const targetCompany = (formData.get("targetCompany") as string) || "";
    const targetRole = (formData.get("targetRole") as string) || "";

    // 1. Extract resume text
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
      return NextResponse.json({ error: "Invalid resume mode" }, { status: 400 });
    }

    if (!resumeText.trim()) {
      return NextResponse.json(
        { error: "Could not extract readable text from the resume." },
        { status: 422 }
      );
    }

    // 2. Extract job description text
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
      return NextResponse.json({ error: "Invalid job context mode" }, { status: 400 });
    }

    if (!jobDescriptionText.trim()) {
      return NextResponse.json(
        { error: "Job description is empty or could not be read." },
        { status: 400 }
      );
    }

    // 3. Generate cover letter via AI
    const coverLetterContent = await generateCoverLetter(
      resumeText,
      jobDescriptionText,
      targetCompany,
      targetRole,
      existingResume
    );

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
    });
  } catch (error) {
    console.error("Cover letter generation error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate cover letter";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
