export type ApplicationStatus =
  | "saved"
  | "applied"
  | "interviewing"
  | "offered"
  | "rejected"
  | "withdrawn";

export interface ApplicationItem {
  _id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  appliedDate?: string;
  notes: string;
  resumeId?: string;
  coverLetterId?: string;
  jobUrl?: string;
  optimizations?: string[];
  matchScoreBefore?: number;
  matchScoreAfter?: number;
  explanation?: string;
  createdAt: string;
  updatedAt: string;
}
