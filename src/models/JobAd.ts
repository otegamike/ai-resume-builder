import mongoose, { Schema, Document, Types } from "mongoose";

export type JobType = "full-time" | "part-time" | "contract" | "freelance" | "internship";
export type WorkplaceType = "on-site" | "remote" | "hybrid";
export type ExperienceLevel = "entry" | "mid" | "senior" | "lead" | "executive";
export type JobAdStatus = "draft" | "pending_review" | "active" | "rejected" | "paused" | "closed" | "expired";
export type ApplicationType = "on_platform" | "external_link" | "email";
export type ScreeningQuestionType = "text" | "textarea" | "dropdown" | "checkbox";

export interface IScreeningQuestion {
  id: string;
  question: string;
  type: ScreeningQuestionType;
  options?: string[];
  required: boolean;
}

export interface IJobAd extends Document {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  companyId: Types.ObjectId;
  postedBy: Types.ObjectId;
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
  description: string;
  requirements: string[];
  benefits: string[];
  skillsRequired: string[];
  screeningQuestions: IScreeningQuestion[];
  status: JobAdStatus;
  rejectionReason?: string;
  applicationType: ApplicationType;
  externalUrl?: string;
  contactEmail?: string;
  viewsCount: number;
  applicationsCount: number;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ScreeningQuestionSchema = new Schema(
  {
    id: { type: String, required: true },
    question: { type: String, required: true },
    type: {
      type: String,
      enum: ["text", "textarea", "dropdown", "checkbox"],
      default: "text",
    },
    options: [{ type: String }],
    required: { type: Boolean, default: false },
  },
  { _id: false }
);

const JobAdSchema: Schema = new Schema<IJobAd>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    postedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    isFeatured: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
    jobType: {
      type: String,
      enum: ["full-time", "part-time", "contract", "freelance", "internship"],
      default: "full-time",
    },
    workplaceType: {
      type: String,
      enum: ["on-site", "remote", "hybrid"],
      default: "remote",
    },
    location: { type: String, default: "Remote" },
    category: { type: String, default: "General", index: true },
    experienceLevel: {
      type: String,
      enum: ["entry", "mid", "senior", "lead", "executive"],
      default: "mid",
    },
    salaryMin: { type: Number },
    salaryMax: { type: Number },
    salaryCurrency: { type: String, default: "USD" },
    salaryPeriod: { type: String, enum: ["yearly", "monthly", "hourly"], default: "yearly" },
    hideSalary: { type: Boolean, default: false },
    description: { type: String, required: true },
    requirements: [{ type: String }],
    benefits: [{ type: String }],
    skillsRequired: [{ type: String }],
    screeningQuestions: { type: [ScreeningQuestionSchema], default: [] },
    status: {
      type: String,
      enum: ["draft", "pending_review", "active", "rejected", "paused", "closed", "expired"],
      default: "pending_review",
      index: true,
    },
    rejectionReason: { type: String, default: "" },
    applicationType: {
      type: String,
      enum: ["on_platform", "external_link", "email"],
      default: "on_platform",
    },
    externalUrl: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
    viewsCount: { type: Number, default: 0 },
    applicationsCount: { type: Number, default: 0 },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.JobAd || mongoose.model<IJobAd>("JobAd", JobAdSchema);
