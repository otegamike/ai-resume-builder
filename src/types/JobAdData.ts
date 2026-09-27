export type JobType = "full-time" | "part-time" | "contract" | "freelance" | "internship";
export type WorkplaceType = "on-site" | "remote" | "hybrid";
export type ExperienceLevel = "entry" | "mid" | "senior" | "lead" | "executive";
export type JobAdStatus = "draft" | "pending_review" | "active" | "rejected" | "paused" | "closed" | "expired";
export type ApplicationType = "on_platform" | "external_link" | "email";
export type ScreeningQuestionType = "text" | "textarea" | "dropdown" | "checkbox";

export interface ScreeningQuestion {
  id: string;
  question: string;
  type: ScreeningQuestionType;
  options?: string[];
  required: boolean;
}

export interface JobAd {
  _id: string;
  title: string;
  slug: string;
  companyId: string;
  postedBy: string;
  isFeatured: boolean;
  isPinned: boolean;
  jobType: JobType;
  workplaceType: WorkplaceType;
  location: string;
  category: string;
  experienceLevel: ExperienceLevel;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
  salaryPeriod: "yearly" | "monthly" | "hourly";
  hideSalary: boolean;
  summary?: string;
  description: string;
  requirements: string[];
  benefits: string[];
  skillsRequired: string[];
  screeningQuestions: ScreeningQuestion[];
  status: JobAdStatus;
  rejectionReason?: string;
  applicationType: ApplicationType;
  externalUrl?: string;
  contactEmail?: string;
  viewsCount: number;
  applicationsCount: number;
  expiresAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ParsedJobAd {
  title: string;
  category: string;
  jobType: string;
  workplaceType: string;
  location: string;
  experienceLevel: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  salaryPeriod: string;
  summary: string;
  description: string;
  requirements: string[];
  benefits: string[];
  skillsRequired: string[];
  companyName: string;
  companyWebsite: string;
  companyLogo: string;
  companyLocation: string;
  companyIndustry: string;
  companyDescription: string;
  applicationType: string;
  externalUrl: string;
  contactEmail: string;
}
