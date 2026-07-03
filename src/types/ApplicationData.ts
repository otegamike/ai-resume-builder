import { TemplateId } from "@/lib/templateCatalog";
import { ResumeContent } from "./ResumeData";

export type ResumeDoc = {
  content: ResumeContent;
  template: TemplateId;
}

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
  resumeDoc?: ResumeDoc;
  coverLetterId?: string;
  jobUrl?: string;
  optimizations?: string[];
  matchScoreBefore?: number;
  matchScoreAfter?: number;
  explanation?: string;
  coverLetterContent?: string;
  renderedResumeSrcDoc?: string;
  createdAt: string;
  updatedAt: string;
}
