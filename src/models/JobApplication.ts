import mongoose, { Schema, Document, Types } from "mongoose";

export type JobApplicationStatus =
  | "submitted"
  | "under_review"
  | "shortlisted"
  | "interviewing"
  | "offered"
  | "rejected"
  | "withdrawn";

export interface IJobApplication extends Document {
  _id: Types.ObjectId;
  jobId: Types.ObjectId;
  applicantId: Types.ObjectId;
  companyId: Types.ObjectId;
  resumeId?: Types.ObjectId;
  coverLetterId?: Types.ObjectId;
  customResumeUrl?: string;
  coverLetterText?: string;
  status: JobApplicationStatus;
  aiMatchScore?: number;
  aiMatchAnalysis?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JobApplicationSchema: Schema = new Schema<IJobApplication>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "JobAd", required: true, index: true },
    applicantId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    resumeId: { type: Schema.Types.ObjectId, ref: "Resume" },
    coverLetterId: { type: Schema.Types.ObjectId, ref: "CoverLetter" },
    customResumeUrl: { type: String, default: "" },
    coverLetterText: { type: String, default: "" },
    status: {
      type: String,
      enum: ["submitted", "under_review", "shortlisted", "interviewing", "offered", "rejected", "withdrawn"],
      default: "submitted",
      index: true,
    },
    aiMatchScore: { type: Number },
    aiMatchAnalysis: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.JobApplication ||
  mongoose.model<IJobApplication>("JobApplication", JobApplicationSchema);
