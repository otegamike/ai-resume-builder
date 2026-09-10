import "server-only";

import { Types } from "mongoose";
import { buildResumeOwnerQuery } from "@/lib/authUser";
import { extractResumeTextFromImages, extractTextFromJobImage } from "@/lib/ai";
import dbConnect from "@/lib/db";
import {
  assertSupportedUpload,
  fileToDataUrl,
  resumeContentToText,
} from "@/lib/resumeImprover";
import Resume from "@/models/Resume";
import type { ResumeContent } from "@/types/ResumeData";

void Resume;

export class InputExtractionError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "InputExtractionError";
    this.status = status;
  }
}

export type AuthUserShape = {
  userObjectId: Types.ObjectId;
  legacyUserId: string;
};

export type ResumeMode = "saved" | "upload";

export interface ResolveResumeInputResult {
  resumeText: string;
  existingResume?: ResumeContent;
  resumeId?: string;
  upload?: boolean;
}

const RESUME_FILE_FIELD = "resumeFile" as const;
const RESUME_ID_FIELD = "resumeId" as const;
const RESUME_MODE_FIELD = "resumeMode" as const;

const JOB_MODE_FIELD = "jobMode" as const;
const JOB_TEXT_FIELD = "jobText" as const;
const JOB_IMAGE_FIELD = "jobImage" as const;

function getStringField(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw === "string") return raw;
  return null;
}

function getFileField(formData: FormData, key: string): File | null {
  const raw = formData.get(key);
  return raw instanceof File ? raw : null;
}

function getFileArray(formData: FormData, key: string): File[] {
  return formData.getAll(key).filter((f): f is File => f instanceof File);
}

async function extractUploadedResumeText(files: File[]): Promise<string> {
  if (files.length === 0) {
    throw new InputExtractionError("No resume file uploaded", 400);
  }
  for (const file of files) {
    assertSupportedUpload(file);
  }
  const dataUrls = await Promise.all(files.map(fileToDataUrl));
  return extractResumeTextFromImages(dataUrls);
}

function assertNonEmptyTrimmed(value: string, errorMessage: string, status: number): void {
  if (!value.trim()) {
    throw new InputExtractionError(errorMessage, status);
  }
}

export async function resolveResumeInput(
  formData: FormData,
  authUser: AuthUserShape
): Promise<ResolveResumeInputResult> {
  const resumeMode = getStringField(formData, RESUME_MODE_FIELD);

  if (resumeMode === "saved") {
    const resumeId = getStringField(formData, RESUME_ID_FIELD);
    if (!resumeId) {
      throw new InputExtractionError("No saved resume ID provided", 400);
    }

    await dbConnect();
    const ownerQuery = buildResumeOwnerQuery(authUser.userObjectId, authUser.legacyUserId);
    const resume = await Resume.findOne({ _id: resumeId, ...ownerQuery });

    if (!resume) {
      throw new InputExtractionError("Resume not found", 404);
    }

    const content = resume.content as ResumeContent;
    const resumeText = resumeContentToText(content);
    assertNonEmptyTrimmed(resumeText, "Could not extract readable text from the resume.", 422);

    return {
      resumeText,
      existingResume: content,
      resumeId,
    };
  }

  if (resumeMode === "upload") {
    const files = getFileArray(formData, RESUME_FILE_FIELD);
    const resumeText = await extractUploadedResumeText(files);
    assertNonEmptyTrimmed(resumeText, "Could not extract readable text from the resume.", 422);
    return { resumeText, upload: true };
  }

  throw new InputExtractionError("Invalid resume mode", 400);
}

export async function resolveUploadOnlyResumeInput(
  formData: FormData,
  fieldName: string = "file"
): Promise<string> {
  const files = getFileArray(formData, fieldName);
  if (files.length === 0) {
    throw new InputExtractionError("No resume file provided", 400);
  }
  const extractedText = await extractUploadedResumeText(files);
  assertNonEmptyTrimmed(extractedText, "Could not extract readable text from this resume.", 422);
  return extractedText;
}

export type JobInputMode = "text" | "image";

export async function resolveJobInput(formData: FormData): Promise<string> {
  const jobMode = getStringField(formData, JOB_MODE_FIELD);

  if (jobMode === "text") {
    const jobText = getStringField(formData, JOB_TEXT_FIELD) ?? "";
    assertNonEmptyTrimmed(jobText, "Job description is empty or could not be read.", 400);
    return jobText;
  }

  if (jobMode === "image") {
    const jobImageFile = getFileField(formData, JOB_IMAGE_FIELD);
    if (!jobImageFile) {
      throw new InputExtractionError("No job description image uploaded", 400);
    }
    if (!jobImageFile.type.startsWith("image/")) {
      throw new InputExtractionError("Job description file must be an image", 400);
    }
    const dataUrl = await fileToDataUrl(jobImageFile);
    const jobText = await extractTextFromJobImage(dataUrl);
    assertNonEmptyTrimmed(jobText, "Job description is empty or could not be read.", 400);
    return jobText;
  }

  throw new InputExtractionError("Invalid job context mode", 400);
}

export async function resolveJobParseInput(formData: FormData): Promise<string> {
  const jobMode = getStringField(formData, JOB_MODE_FIELD);

  if (jobMode === "text") {
    const raw = getStringField(formData, JOB_TEXT_FIELD) ?? "";
    const jobText = raw.trim();
    assertNonEmptyTrimmed(jobText, "Job description text is empty", 400);
    return jobText;
  }

  if (jobMode === "image") {
    const jobImageFile = getFileField(formData, JOB_IMAGE_FIELD);
    if (!jobImageFile) {
      throw new InputExtractionError("No job image uploaded", 400);
    }
    if (!jobImageFile.type.startsWith("image/")) {
      throw new InputExtractionError("Job file must be an image", 400);
    }
    const dataUrl = await fileToDataUrl(jobImageFile);
    const jobText = await extractTextFromJobImage(dataUrl);
    assertNonEmptyTrimmed(jobText, "Could not extract text from image", 422);
    return jobText;
  }

  throw new InputExtractionError("Invalid jobMode", 400);
}
