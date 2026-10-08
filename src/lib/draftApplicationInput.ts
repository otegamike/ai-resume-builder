import "server-only";

import { Types } from "mongoose";
import { InputExtractionError } from "@/lib/inputExtraction";
import { parseAnalysis, parseAnswers, parseResumeRef } from "@/lib/jobApplyInput";
import type { ApplyResumeRef, ScreeningAnswerInput } from "@/types/JobApplyInput";
import type { JobMatchAnalysis } from "@/types/JobApplicationData";

const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

export interface DraftCreateInput {
  resume: ApplyResumeRef;
  jobMatchAnalysis: JobMatchAnalysis;
  tailoredResumeId?: string | null;
  currentStep?: number;
}

export interface DraftUpdateInput {
  screeningAnswers?: ScreeningAnswerInput[];
  tailoredResumeId?: string | null;
  currentStep?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rejectUnknownKeys(value: Record<string, unknown>, allowed: readonly string[], what: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new InputExtractionError(`Unknown field: ${what}.${key}`, 400);
    }
  }
}

function readOptionalObjectId(value: unknown, what: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || !OBJECT_ID_PATTERN.test(value)) {
    throw new InputExtractionError(`Invalid ${what}: expected a resume id`, 400);
  }
  return value;
}

function readStep(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 2) {
    throw new InputExtractionError("Invalid currentStep: expected 0, 1, or 2", 400);
  }
  return value;
}

// Serializes a draft document for the client. Matches DraftApplicationData.
export function toClientDraftApplication(draft: {
  _id: Types.ObjectId;
  jobId: Types.ObjectId;
  resume: unknown;
  jobMatchAnalysis: unknown;
  screeningAnswers: unknown;
  tailoredResumeId?: string | null;
  currentStep: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    _id: String(draft._id),
    jobId: String(draft.jobId),
    resume: draft.resume,
    jobMatchAnalysis: draft.jobMatchAnalysis,
    screeningAnswers: draft.screeningAnswers,
    tailoredResumeId: draft.tailoredResumeId ?? null,
    currentStep: draft.currentStep,
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
  };
}
// Only the resume reference and match analysis are required; everything
// else can arrive later via update.
export function parseDraftCreateBody(body: unknown): DraftCreateInput {
  if (!isRecord(body)) {
    throw new InputExtractionError("Invalid request body: expected an object", 400);
  }
  rejectUnknownKeys(body, ["resume", "jobMatchAnalysis", "tailoredResumeId", "currentStep"], "body");
  if (!("resume" in body)) {
    throw new InputExtractionError("Invalid request body: resume is required", 400);
  }
  if (!("jobMatchAnalysis" in body)) {
    throw new InputExtractionError("Invalid request body: jobMatchAnalysis is required", 400);
  }
  return {
    resume: parseResumeRef(body.resume),
    jobMatchAnalysis: parseAnalysis(body.jobMatchAnalysis),
    tailoredResumeId: readOptionalObjectId(body.tailoredResumeId, "tailoredResumeId"),
    currentStep: readStep(body.currentStep),
  };
}

// Parses the body of a draft-update request (step 2 of the apply modal).
// At least one updatable field must be present.
export function parseDraftUpdateBody(body: unknown): DraftUpdateInput {
  if (!isRecord(body)) {
    throw new InputExtractionError("Invalid request body: expected an object", 400);
  }
  rejectUnknownKeys(body, ["screeningAnswers", "tailoredResumeId", "currentStep"], "body");
  const result: DraftUpdateInput = {};
  if ("screeningAnswers" in body) {
    result.screeningAnswers = parseAnswers(body.screeningAnswers);
  }
  if ("tailoredResumeId" in body) {
    result.tailoredResumeId = readOptionalObjectId(body.tailoredResumeId, "tailoredResumeId");
  }
  const step = readStep(body.currentStep);
  if (step !== undefined) result.currentStep = step;
  if (
    result.screeningAnswers === undefined &&
    result.tailoredResumeId === undefined &&
    result.currentStep === undefined
  ) {
    throw new InputExtractionError("Invalid request body: nothing to update", 400);
  }
  return result;
}
