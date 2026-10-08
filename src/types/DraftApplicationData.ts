import type { JobMatchAnalysis } from "./JobApplicationData";
import type { ApplyResumeRef, ScreeningAnswerInput } from "./JobApplyInput";

// Shape of an unfinished job application. The cover letter is intentionally
// not stored here; it travels with the final apply request only.
export interface DraftApplicationData {
  _id: string;
  jobId: string;
  applicantId: string;
  companyId: string;
  resume: ApplyResumeRef;
  jobMatchAnalysis: JobMatchAnalysis;
  screeningAnswers: ScreeningAnswerInput[];
  tailoredResumeId?: string | null;
  currentStep: number;
  createdAt: string;
  updatedAt: string;
}
