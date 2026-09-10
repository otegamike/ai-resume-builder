import { ResumeContent, ResumeDocument, UploadedResume } from "./ResumeData";

export type JobApplicationStatus =
  | "submitted"
  | "under_review"
  | "shortlisted"
  | "interviewing"
  | "offered"
  | "rejected"
  | "withdrawn";

export interface JobMatchAnalysis {
  score: number;
  missingKeywords: string[];
  missingSkills: string[];
  strengths: string[];
  weaknesses: string[];
  gaps: string[];
  suggestions: string[];
  verdict: string;
}

export interface TailorSnapshot {
  matchScoreBefore: number;
  matchScoreAfter: number;
  explanation: string;
  keyChanges: string[];
  tailoredResume: ResumeContent;
}

export interface JobApplication  {
  _id: string;
  jobId: string;
  applicantId: string;
  companyId: string;
  status: JobApplicationStatus;
  resumeType: 'platform' | 'uploaded';
  resume: ResumeDocument;
  uploadedResume?: UploadedResume;
  matchScore: number;
  analysisForEmployer: JobMatchAnalysis;
  coverLetterText?: string;
  screeningAnswers: { questionId: string; question: string; answer: string }[];
  source: "platform" | "off_platform";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
