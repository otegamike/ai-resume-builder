import mongoose, { Schema, Document, Types } from "mongoose";

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

export interface IApplication extends Document {
  _id: Types.ObjectId;
  userId: string;
  user: Types.ObjectId;
  company: string;
  role: string;
  status: ApplicationStatus;
  appliedDate?: Date;
  notes: string;
  resumeId?: Types.ObjectId;
  coverLetterId?: Types.ObjectId;
  jobUrl?: string;
  optimizations?: string[];
  matchScoreBefore?: number;
  matchScoreAfter?: number;
  explanation?: string;

  // Job Board & Employer additions
  jobId?: Types.ObjectId;
  companyId?: Types.ObjectId;
  coverLetterText?: string;
  customResumeUrl?: string;
  aiMatchScore?: number;
  aiMatchAnalysis?: string;
  screeningAnswers?: { questionId: string; question: string; answer: string }[];
  source: ApplicationSource;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema: Schema = new Schema<IApplication>(
  {
    userId: { type: String, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", index: true },
    company: { type: String, required: true },
    role: { type: String, required: true },
    status: {
      type: String,
      default: "applied",
      enum: ["saved", "applied", "under_review", "shortlisted", "interviewing", "offered", "rejected", "withdrawn"],
    },
    appliedDate: { type: Date, default: Date.now },
    notes: { type: String, default: "" },
    resumeId: { type: Schema.Types.ObjectId, ref: "Resume" },
    coverLetterId: { type: Schema.Types.ObjectId, ref: "CoverLetter" },
    jobUrl: { type: String, default: "" },
    optimizations: [{ type: String }],
    matchScoreBefore: { type: Number },
    matchScoreAfter: { type: Number },
    explanation: { type: String, default: "" },

    // Job Board additions
    jobId: { type: Schema.Types.ObjectId, ref: "JobAd", index: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
    coverLetterText: { type: String, default: "" },
    customResumeUrl: { type: String, default: "" },
    aiMatchScore: { type: Number },
    aiMatchAnalysis: { type: String, default: "" },
    screeningAnswers: {
      type: [
        {
          questionId: { type: String, required: true },
          question: { type: String, required: true },
          answer: { type: String, default: "" },
        },
      ],
      default: [],
    },
    source: { type: String, enum: ["platform", "off_platform"], default: "off_platform", index: true },
  },
  { timestamps: true }
);

export default mongoose.models.Application ||
  mongoose.model<IApplication>("Application", ApplicationSchema);
