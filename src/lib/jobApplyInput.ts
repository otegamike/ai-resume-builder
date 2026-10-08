import "server-only";

import { InputExtractionError } from "@/lib/inputExtraction";
import type {
  ApplyResumeRef,
  JobApplyPayload,
  ScreeningAnswerInput,
} from "@/types/JobApplyInput";
import type { JobMatchAnalysis } from "@/types/JobApplicationData";

const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

const BODY_KEYS = ["resume", "jobMatchAnalysis", "screeningAnswers", "coverLetterText", "source"] as const;
const ANALYSIS_KEYS = [
  "score",
  "missingKeywords",
  "missingSkills",
  "strengths",
  "weaknesses",
  "gaps",
  "suggestions",
  "verdict",
] as const;
const ANSWER_KEYS = ["questionId", "question", "answer"] as const;

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

function readString(value: unknown, what: string): string {
  if (typeof value !== "string") {
    throw new InputExtractionError(`Invalid ${what}: expected a string`, 400);
  }
  return value;
}

function readObjectId(value: unknown, what: string): string {
  const id = readString(value, what);
  if (!OBJECT_ID_PATTERN.test(id)) {
    throw new InputExtractionError(`Invalid ${what}: expected a resume id`, 400);
  }
  return id;
}

function readStringList(value: unknown, what: string): string[] {
  if (!Array.isArray(value) || !value.every((item): item is string => typeof item === "string")) {
    throw new InputExtractionError(`Invalid ${what}: expected a list of strings`, 400);
  }
  return value;
}

export function parseResumeRef(value: unknown): ApplyResumeRef {
  if (!isRecord(value)) {
    throw new InputExtractionError("Invalid resume: expected an object", 400);
  }
  const resumeType = value.resumeType;
  if (resumeType === "platform") {
    rejectUnknownKeys(value, ["resumeType", "resumeId"], "resume");
    if (!("resumeId" in value)) {
      throw new InputExtractionError("Invalid resume: resumeId is required", 400);
    }
    return { resumeType: "platform", resumeId: readObjectId(value.resumeId, "resume.resumeId") };
  }
  if (resumeType === "uploaded") {
    rejectUnknownKeys(value, ["resumeType", "uploadedResumeId"], "resume");
    if (!("uploadedResumeId" in value)) {
      throw new InputExtractionError("Invalid resume: uploadedResumeId is required", 400);
    }
    return { resumeType: "uploaded", uploadedResumeId: readObjectId(value.uploadedResumeId, "resume.uploadedResumeId") };
  }
  throw new InputExtractionError('Invalid resume: resumeType must be "platform" or "uploaded"', 400);
}

export function parseAnalysis(value: unknown): JobMatchAnalysis {
  if (!isRecord(value)) {
    throw new InputExtractionError("Invalid jobMatchAnalysis: expected an object", 400);
  }
  rejectUnknownKeys(value, ANALYSIS_KEYS, "jobMatchAnalysis");
  for (const key of ANALYSIS_KEYS) {
    if (!(key in value)) {
      throw new InputExtractionError(`Invalid jobMatchAnalysis: ${key} is required`, 400);
    }
  }
  const score = value.score;
  if (typeof score !== "number" || !Number.isFinite(score)) {
    throw new InputExtractionError("Invalid jobMatchAnalysis: score must be a number", 400);
  }
  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    missingKeywords: readStringList(value.missingKeywords, "jobMatchAnalysis.missingKeywords"),
    missingSkills: readStringList(value.missingSkills, "jobMatchAnalysis.missingSkills"),
    strengths: readStringList(value.strengths, "jobMatchAnalysis.strengths"),
    weaknesses: readStringList(value.weaknesses, "jobMatchAnalysis.weaknesses"),
    gaps: readStringList(value.gaps, "jobMatchAnalysis.gaps"),
    suggestions: readStringList(value.suggestions, "jobMatchAnalysis.suggestions"),
    verdict: readString(value.verdict, "jobMatchAnalysis.verdict"),
  };
}

export function parseAnswers(value: unknown): ScreeningAnswerInput[] {
  if (!Array.isArray(value)) {
    throw new InputExtractionError("Invalid screeningAnswers: expected a list", 400);
  }
  return value.map((entry) => {
    if (!isRecord(entry)) {
      throw new InputExtractionError("Invalid screeningAnswers: each answer must be an object", 400);
    }
    rejectUnknownKeys(entry, ANSWER_KEYS, "screeningAnswers");
    for (const key of ANSWER_KEYS) {
      if (!(key in entry)) {
        throw new InputExtractionError(`Invalid screeningAnswers: ${key} is required`, 400);
      }
    }
    return {
      questionId: readString(entry.questionId, "screeningAnswers.questionId"),
      question: readString(entry.question, "screeningAnswers.question"),
      answer: readString(entry.answer, "screeningAnswers.answer"),
    };
  });
}

// Parses the JSON body of an apply request into the shared JobApplyPayload.
// Unknown keys and wrong-branch resume keys are rejected so the modal and
// the route cannot drift apart silently.
export function parseJobApplyBody(body: unknown): JobApplyPayload {
  if (!isRecord(body)) {
    throw new InputExtractionError("Invalid request body: expected an object", 400);
  }
  rejectUnknownKeys(body, BODY_KEYS, "body");
  for (const key of ["resume", "jobMatchAnalysis", "screeningAnswers", "source"] as const) {
    if (!(key in body)) {
      throw new InputExtractionError(`Invalid request body: ${key} is required`, 400);
    }
  }
  const source = body.source;
  if (source !== "platform" && source !== "off_platform") {
    throw new InputExtractionError('Invalid source: must be "platform" or "off_platform"', 400);
  }
  return {
    resume: parseResumeRef(body.resume),
    jobMatchAnalysis: parseAnalysis(body.jobMatchAnalysis),
    screeningAnswers: parseAnswers(body.screeningAnswers),
    coverLetterText: body.coverLetterText === undefined ? "" : readString(body.coverLetterText, "coverLetterText"),
    source,
  };
}
