import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICoverLetter extends Document {
  _id: Types.ObjectId;
  userId: string;
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
    userId: { type: String, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", index: true },
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
