import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { Types } from "mongoose";
import dbConnect from "@/lib/db";
import JobAd from "@/models/JobAd";
import JobApplication from "@/models/JobApplication";
import Company from "@/models/Company";
import Resume from "@/models/Resume";
import UploadedResume from "@/models/UploadedResume";
import { getAuthenticatedUser } from "@/lib/authUser";
import { extractResumeTextFromImages, parseResumeContent } from "@/lib/ai";
import { createResume } from "@/lib/resumeService";
import { fileToDataUrl } from "@/lib/resumeImprover";

void JobAd;
void JobApplication;
void Company;
void Resume;
void UploadedResume;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function getStringField(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw === "string") return raw;
  return null;
}

function parseJsonField<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: "Please log in to apply for this position" }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const job = await JobAd.findById(id).populate("companyId", "name");
    if (!job || job.status !== "active") {
      return NextResponse.json({ error: "This job listing is no longer active" }, { status: 404 });
    }

    const existing = await JobApplication.findOne({
      jobId: job._id,
      applicantId: authUser.userObjectId,
    });

    if (existing) {
      return NextResponse.json(
        { error: "You have already submitted an application for this position" },
        { status: 400 }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    let resumeType: "platform" | "uploaded" = "platform";
    let resumeId: string | null = null;
    let jobMatchAnalysisRaw: string | null = null;
    let screeningAnswersRaw: string | null = null;
    let coverLetterText = "";
    let source: "platform" | "off_platform" = "platform";
    let uploadedFiles: File[] = [];

    if (contentType.includes("application/json")) {
      const body = await req.json();
      resumeType = body.resumeType === "uploaded" ? "uploaded" : "platform";
      resumeId = body.resumeId || body.tailoredResumeId || null;
      jobMatchAnalysisRaw = body.jobMatchAnalysis ? JSON.stringify(body.jobMatchAnalysis) : body.analysisReport ? JSON.stringify(body.analysisReport) : null;
      screeningAnswersRaw = body.screeningAnswers ? JSON.stringify(body.screeningAnswers) : null;
      coverLetterText = body.coverLetterText || "";
      source = body.source === "off_platform" ? "off_platform" : "platform";
    } else {
      const formData = await req.formData();
      resumeType = getStringField(formData, "resumeType") === "uploaded" ? "uploaded" : "platform";
      resumeId = getStringField(formData, "resumeId");
      jobMatchAnalysisRaw = getStringField(formData, "jobMatchAnalysis");
      if (!jobMatchAnalysisRaw) {
        const alt = getStringField(formData, "analysisReport");
        jobMatchAnalysisRaw = alt;
      }
      screeningAnswersRaw = getStringField(formData, "screeningAnswers");
      coverLetterText = getStringField(formData, "coverLetterText") || "";
      const sourceRaw = getStringField(formData, "source");
      source = sourceRaw === "off_platform" ? "off_platform" : "platform";
      uploadedFiles = formData.getAll("resumeFile").filter((f): f is File => f instanceof File);
      if (uploadedFiles.length === 0) {
        const single = formData.get("resumeFile");
        if (single instanceof File) uploadedFiles = [single];
      }
    }

    const jobMatchAnalysis = parseJsonField<{
      score: number;
      missingKeywords: string[];
      missingSkills: string[];
      strengths: string[];
      weaknesses: string[];
      gaps: string[];
      suggestions: string[];
      verdict: string;
    } | null>(jobMatchAnalysisRaw, null);

    if (!jobMatchAnalysis || typeof jobMatchAnalysis.score !== "number") {
      return NextResponse.json({ error: "Missing job match analysis" }, { status: 400 });
    }

    const normalizedJobMatchAnalysis = {
      score: Math.max(0, Math.min(100, Math.round(Number(jobMatchAnalysis.score) || 0))),
      missingKeywords: Array.isArray(jobMatchAnalysis.missingKeywords) ? jobMatchAnalysis.missingKeywords.map(String) : [],
      missingSkills: Array.isArray(jobMatchAnalysis.missingSkills) ? jobMatchAnalysis.missingSkills.map(String) : [],
      strengths: Array.isArray(jobMatchAnalysis.strengths) ? jobMatchAnalysis.strengths.map(String) : [],
      weaknesses: Array.isArray(jobMatchAnalysis.weaknesses) ? jobMatchAnalysis.weaknesses.map(String) : [],
      gaps: Array.isArray(jobMatchAnalysis.gaps) ? jobMatchAnalysis.gaps.map(String) : [],
      suggestions: Array.isArray(jobMatchAnalysis.suggestions) ? jobMatchAnalysis.suggestions.map(String) : [],
      verdict: typeof jobMatchAnalysis.verdict === "string" ? jobMatchAnalysis.verdict : "",
    };

    const screeningAnswers = parseJsonField<{ questionId: string; question: string; answer: string }[]>(
      screeningAnswersRaw,
      []
    );

    const normalizedScreeningAnswers = Array.isArray(screeningAnswers)
      ? screeningAnswers.map((answer) => ({
          questionId: String(answer.questionId || ""),
          question: String(answer.question || ""),
          answer: String(answer.answer || ""),
        }))
      : [];

    if (source === "platform") {
      const missingRequiredQuestion = (job.screeningQuestions || []).find((question: { required: boolean; id: string; question: string }) => {
        if (!question.required) return false;
        const matchingAnswer = normalizedScreeningAnswers.find(
          (answer) => answer.questionId === question.id
        );
        return !matchingAnswer?.answer.trim();
      });

      if (missingRequiredQuestion) {
        return NextResponse.json(
          { error: `Please answer: ${missingRequiredQuestion.question}` },
          { status: 400 }
        );
      }
    }

    let resumeDoc: { _id: Types.ObjectId; title: string; template: string; content: unknown; updatedAt: string } | null = null;
    let uploadedResumeDoc: { _id: Types.ObjectId; resumeId: Types.ObjectId; pages: string[] } | null = null;

    if (resumeType === "uploaded") {
      if (uploadedFiles.length === 0) {
        return NextResponse.json({ error: "No resume file uploaded" }, { status: 400 });
      }

      const pages: string[] = [];
      for (const file of uploadedFiles) {
        const dataUrl = await fileToDataUrl(file);
        const result = await cloudinary.uploader.upload(dataUrl, {
          folder: `applications/${String(authUser.userObjectId)}/${String(job._id)}`,
        });
        pages.push(result.secure_url);
      }

      const dataUrls = await Promise.all(uploadedFiles.map(fileToDataUrl));
      const extractedText = await extractResumeTextFromImages(dataUrls);
      const parsedContent = await parseResumeContent(extractedText || "");

      const newResume = await createResume({
        authUser,
        title: `Uploaded Resume - ${job.title} - ${new Date().toLocaleDateString()}`,
        content: parsedContent,
      });

      const uploadedResume = await UploadedResume.create({
        resumeId: newResume._id,
        pages,
      });

      resumeDoc = {
        _id: newResume._id,
        title: newResume.title,
        template: newResume.template,
        content: newResume.content,
        updatedAt: new Date().toISOString(),
      };

      uploadedResumeDoc = {
        _id: uploadedResume._id,
        resumeId: newResume._id,
        pages,
      };
    } else {
      if (!resumeId) {
        return NextResponse.json({ error: "No resume selected" }, { status: 400 });
      }
      const resume = await Resume.findOne({
        _id: resumeId,
        $or: [
          { user: authUser.userObjectId },
          { userId: authUser.legacyUserId },
          { userId: String(authUser.userObjectId) },
        ],
      });
      if (!resume) {
        return NextResponse.json({ error: "Resume not found" }, { status: 404 });
      }
      resumeDoc = {
        _id: resume._id,
        title: resume.title,
        template: resume.template,
        content: resume.content,
        updatedAt: resume.updatedAt ? new Date(resume.updatedAt).toISOString() : new Date().toISOString(),
      };
    }

    const companyId = (job.companyId as unknown as { _id: Types.ObjectId })?._id || job.companyId;

    const doc: Record<string, unknown> = {
      jobId: job._id,
      applicantId: authUser.userObjectId,
      companyId,
      status: "submitted",
      resumeType,
      resume: resumeDoc,
      jobMatchAnalysis: normalizedJobMatchAnalysis,
      coverLetterText: coverLetterText || "",
      screeningAnswers: normalizedScreeningAnswers,
      source,
    };

    if (uploadedResumeDoc) {
      doc.uploadedResume = uploadedResumeDoc;
    }

    const newApplication = await JobApplication.create(doc);

    await JobAd.updateOne({ _id: job._id }, { $inc: { applicationsCount: 1 } });

    return NextResponse.json(
      {
        success: true,
        application: newApplication,
        message: "Application submitted successfully!",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    if (err?.code === 11000) {
      return NextResponse.json({ error: "You have already submitted an application for this position" }, { status: 400 });
    }
    console.error("Error submitting job application:", error);
    const message = err?.message || "Failed to submit application";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
