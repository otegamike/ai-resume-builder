import { TemplateId } from "@/lib/templateCatalog";
import { ResumeContent } from "./ResumeData";

export type ResumeDoc = {
  content: ResumeContent;
  template: TemplateId;
}

export type ApplicationStatus =
  | "saved"
  | "applied"
  | "under_review"
  | "shortlisted"
  | "interviewing"
  | "offered"
  | "rejected"
  | "withdrawn";

export type ApplicationSource = "platform" | "off_platform";

export interface ApplicationItem {
  _id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  appliedDate?: string;
  notes: string;
  resumeId?: string;
  resumeDoc?: ResumeDoc;
  coverLetterId?: string;
  jobUrl?: string;
  optimizations?: string[];
  explanation?: string;
  coverLetterContent?: string;
  renderedResumeSrcDoc?: string;
  jobId?: string;
  companyId?: string;
  aiMatchScore?: number;
  aiMatchAnalysis?: string;
  source?: ApplicationSource;
  createdAt: string;
  updatedAt: string;
}
