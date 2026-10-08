import mongoose, { Schema, Types } from "mongoose";
import { JobMatchAnalysisSchema } from "./JobApplication";
import type { DraftApplicationData } from "@/types/DraftApplicationData";

export interface IDraftJobApplication
  extends Omit<DraftApplicationData, "_id" | "jobId" | "applicantId" | "companyId"> {
  _id: Types.ObjectId;
  jobId: Types.ObjectId;
  applicantId: Types.ObjectId;
  companyId: Types.ObjectId;
}

const DraftResumeRefSchema: Schema = new Schema(
  {
    resumeType: { type: String, enum: ["platform", "uploaded"], required: true },
    resumeId: { type: String, required: false },
    uploadedResumeId: { type: String, required: false },
  },
  { _id: false }
);

const DraftScreeningAnswerSchema: Schema = new Schema(
  {
    questionId: { type: String, required: true },
    question: { type: String, required: true },
    answer: { type: String, default: "" },
  },
  { _id: false }
);

const DraftJobApplicationSchema: Schema = new Schema<IDraftJobApplication>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "JobAd", required: true, index: true },
    applicantId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    resume: { type: DraftResumeRefSchema, required: true },
    jobMatchAnalysis: { type: JobMatchAnalysisSchema, required: true },
    screeningAnswers: { type: [DraftScreeningAnswerSchema], default: [] },
    tailoredResumeId: { type: String, required: false, default: null },
    currentStep: { type: Number, default: 1 },
  },
  { timestamps: true }
);

DraftJobApplicationSchema.index({ jobId: 1, applicantId: 1 }, { unique: true });
DraftJobApplicationSchema.index({ applicantId: 1, updatedAt: -1 });

export default mongoose.models.DraftJobApplication ||
  mongoose.model<IDraftJobApplication>("DraftJobApplication", DraftJobApplicationSchema);
