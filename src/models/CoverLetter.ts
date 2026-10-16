import mongoose, { Schema, Types } from "mongoose";

export interface ICoverLetter {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  title: string;
  targetCompany: string;
  targetRole: string;
  content: string;
  resumeId?: Types.ObjectId;
  jobDescription: string;
  status: "draft" | "final";
}

const CoverLetterSchema: Schema = new Schema<ICoverLetter>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    targetCompany: { type: String, default: "" },
    targetRole: { type: String, default: "" },
    content: { type: String, default: "" },
    resumeId: { type: Schema.Types.ObjectId, ref: "Resume" },
    jobDescription: { type: String, default: "" },
    status: { type: String, default: "draft", enum: ["draft", "final"] },
  },
  { timestamps: true }
);

export default mongoose.models.CoverLetter ||
  mongoose.model<ICoverLetter>("CoverLetter", CoverLetterSchema);
