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
    resumeId: { type: Schema.Types.ObjectId, ref: "Resume", required: true },
    pages: { type: [String], required: true },
  },
  { _id: false }
);


const uploadedResumeSchema: Schema = new Schema<IUploadedResume>(
  {
    resumeId: { type: Schema.Types.ObjectId, ref: "Resume", required: true },
    pages: { type: [String], required: true },
  },
  { timestamps: true }
);

export default mongoose.models.UploadedResume || mongoose.model<IUploadedResume>("UploadedResume", uploadedResumeSchema);
