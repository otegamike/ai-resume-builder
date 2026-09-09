import mongoose, { Schema, Document, Types } from "mongoose";
import { ResumeContent } from "@/types/ResumeData";

export type JobApplicationStatus =
  | "submitted"
  | "under_review"
  | "shortlisted"
  | "interviewing"
  | "offered"
  | "rejected"
  | "withdrawn";

export interface MatchAnalysisSnapshot {
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

export interface IJobApplication extends Document {
  _id: Types.ObjectId;
  jobId: Types.ObjectId;
  applicantId: Types.ObjectId;
  companyId: Types.ObjectId;
  status: JobApplicationStatus;
  resumeId?: Types.ObjectId;
  tailoredResumeId?: Types.ObjectId;
  resumeSnapshot?: ResumeContent;
  tailoredResumeSnapshot?: ResumeContent;
  matchScore: number;
  tailoredMatchScore?: number;
  analysisReport: MatchAnalysisSnapshot;
  tailorReport?: TailorSnapshot;
  coverLetterText?: string;
  coverLetterGenerated: boolean;
  screeningAnswers: { questionId: string; question: string; answer: string }[];
  customResumeUrl?: string;
  source: "platform" | "off_platform";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JobApplicationSchema: Schema = new Schema<IJobApplication>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "JobAd", required: true, index: true },
    applicantId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    status: {
      type: String,
      enum: ["submitted", "under_review", "shortlisted", "interviewing", "offered", "rejected", "withdrawn"],
      default: "submitted",
      index: true,
    },
    resumeId: { type: Schema.Types.ObjectId, ref: "Resume" },
    tailoredResumeId: { type: Schema.Types.ObjectId, ref: "Resume" },
    resumeSnapshot: { type: Schema.Types.Mixed },
    tailoredResumeSnapshot: { type: Schema.Types.Mixed },
    matchScore: { type: Number, required: true },
    tailoredMatchScore: { type: Number },
    analysisReport: { type: Schema.Types.Mixed, required: true },
    tailorReport: { type: Schema.Types.Mixed },
    coverLetterText: { type: String, default: "" },
    coverLetterGenerated: { type: Boolean, default: false },
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
    customResumeUrl: { type: String, default: "" },
    source: { type: String, enum: ["platform", "off_platform"], default: "platform", index: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

JobApplicationSchema.index({ jobId: 1, applicantId: 1 }, { unique: true });

export default mongoose.models.JobApplication || mongoose.model<IJobApplication>("JobApplication", JobApplicationSchema);
