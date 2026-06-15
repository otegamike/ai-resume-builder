export interface CoverLetterItem {
  _id: string;
  title: string;
  targetCompany: string;
  targetRole: string;
  content: string;
  resumeId?: string;
  jobDescription: string;
  status: "draft" | "final";
  createdAt: string;
  updatedAt: string;
}
