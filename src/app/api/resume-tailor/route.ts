import { NextResponse } from "next/server";
import { tailorResume, extractTextFromJobImage, extractResumeTextFromImages } from "@/lib/ai";
import { buildResumeOwnerQuery, getAuthenticatedUser } from "@/lib/authUser";
import dbConnect from "@/lib/db";
import Resume from "@/models/Resume";
import {
  assertSupportedUpload,
  fileToDataUrl,
  resumeContentToText,
} from "@/lib/resumeImprover";
import { ResumeContent } from "@/types/ResumeData";
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
    const resumeMode = formData.get("resumeMode") as string;
    const jobMode = formData.get("jobMode") as string;
    const targetTitle = (formData.get("targetTitle") as string) || "";
    const targetCompany = (formData.get("targetCompany") as string) || "";

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
      const resumeFiles = formData.getAll("resumeFile").filter((f): f is File => f instanceof File);
      if (resumeFiles.length === 0) {
        return NextResponse.json({ error: "No resume file uploaded" }, { status: 400 });
      }
      for (const f of resumeFiles) {
        assertSupportedUpload(f);
      }

      const dataUrls = await Promise.all(resumeFiles.map(fileToDataUrl));
      resumeText = await extractResumeTextFromImages(dataUrls);
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
      // Assert it's an image
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
        { error: "Job description context is empty or could not be read." },
        { status: 400 }
      );
    }

    // 3. Perform AI Tailoring
    const report = await tailorResume(
      resumeText,
      jobDescriptionText,
      targetTitle,
      targetCompany,
      existingResume
    );

    return NextResponse.json({ ...report, newAiCredits });
  } catch (error) {
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
