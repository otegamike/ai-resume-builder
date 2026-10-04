import type { JobMatchAnalysis } from "./JobApplicationData";

export type ApplySource = "platform" | "off_platform";

export type ApplyResumeRef =
  | { resumeType: "platform"; resumeId: string }
  | { resumeType: "uploaded"; uploadedResumeId: string };

export interface ScreeningAnswerInput {
  questionId: string;
  question: string;
  answer: string;
}

// Exact shape the apply modal sends and the apply route accepts.
// Sent as a JSON body. No files, hashes, or extra keys.
export interface JobApplyPayload {
  resume: ApplyResumeRef;
  jobMatchAnalysis: JobMatchAnalysis;
  screeningAnswers: ScreeningAnswerInput[];
  coverLetterText: string;
  source: ApplySource;
}
