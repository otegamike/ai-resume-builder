import mongoose, { Schema, Document, Types } from "mongoose";
import { ResumeDocumentSchema, type IResumeDocument } from "./Resume";
import { JobApplication, JobMatchAnalysis } from "@/types/JobApplicationData";
import { IUploadedResumeDocument, uploadedResumeDocumentSchema } from "./UploadedResume";


export interface IJobApplication extends Omit<JobApplication, '_id' | 'jobId' | 'applicantId' | 'companyId' | 'resume' | 'uploadedResume'> {
  _id: Types.ObjectId;
  jobId: Types.ObjectId;
  applicantId: Types.ObjectId;
  companyId: Types.ObjectId;
  resume: IResumeDocument;
  uploadedResume?: IUploadedResumeDocument;
}

const JobMatchAnalysisSchema: Schema = new Schema<JobMatchAnalysis>(
  {
    score: { type: Number, required: true },
    missingKeywords: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    gaps: { type: [String], default: [] },
    suggestions: { type: [String], default: [] },
    verdict: { type: String, default: "" },
  },
  { _id: false }
);

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
    resume: { type: ResumeDocumentSchema, default: () => ({}) },
    uploadedResume: { type: uploadedResumeDocumentSchema,  default: () => ({})  },
    matchScore: { type: Number, required: true },
    analysisForEmployer: { type: JobMatchAnalysisSchema, required: true },
    coverLetterText: { type: String, default: "" },
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
    source: { type: String, enum: ["platform", "off_platform"], default: "platform", index: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

JobApplicationSchema.index({ jobId: 1, applicantId: 1 }, { unique: true });

export default mongoose.models.JobApplication || mongoose.model<IJobApplication>("JobApplication", JobApplicationSchema);
