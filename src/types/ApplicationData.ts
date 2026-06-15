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
  createdAt: string;
  updatedAt: string;
}
