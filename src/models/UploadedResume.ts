import mongoose, { Schema, Document, Types } from "mongoose";
import { UploadedResume } from "@/types/ResumeData";

interface IUploadedResume extends Omit<UploadedResume, 'resumeId'> {
    resumeId: Types.ObjectId;
}

export interface IUploadedResumeDocument extends IUploadedResume {
    _id: Types.ObjectId;
}

export const uploadedResumeDocumentSchema: Schema = new Schema<IUploadedResumeDocument>(
  {
    _id: { type: Schema.Types.ObjectId, required: true, ref: "UploadedResume" },
    resumeId: { type: Schema.Types.ObjectId, ref: "Resume", required: false },
    pages: { type: [String], required: true },
  },
  { _id: false }
);


const uploadedResumeSchema: Schema = new Schema<IUploadedResume>(
  {
    resumeId: { type: Schema.Types.ObjectId, ref: "Resume", required: false },
    title: { type: String, default: "" },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    fileHash: { type: String, match: /^[a-f0-9]{64}$/ },
    extractionVersion: { type: String, default: "v1" },
    status: { type: String, enum: ["pending", "done", "failed"], default: "pending" },
    rawExtractedText: { type: String, default: null },
    parsedResume: { type: Schema.Types.Mixed, default: null },
    pageCount: { type: Number, default: 0 },
    pages: { type: [String], default: [] },
  },
  { timestamps: true }
);

uploadedResumeSchema.index(
  { userId: 1, fileHash: 1, extractionVersion: 1 },
  { unique: true, partialFilterExpression: { fileHash: { $type: "string" } } }
);

export default mongoose.models.UploadedResume || mongoose.model<IUploadedResume>("UploadedResume", uploadedResumeSchema);
