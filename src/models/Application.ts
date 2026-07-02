import mongoose, { Schema, Document, Types } from "mongoose";

export type ApplicationStatus =
  | "saved"
  | "applied"
  | "interviewing"
  | "offered"
  | "rejected"
  | "withdrawn";

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
}

const ApplicationSchema: Schema = new Schema<IApplication>(
  {
    userId: { type: String, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", index: true },
    company: { type: String, required: true },
    role: { type: String, required: true },
    status: {
      type: String,
      default: "saved",
      enum: ["saved", "applied", "interviewing", "offered", "rejected", "withdrawn"],
    },
    appliedDate: { type: Date },
    notes: { type: String, default: "" },
    resumeId: { type: Schema.Types.ObjectId, ref: "Resume" },
    coverLetterId: { type: Schema.Types.ObjectId, ref: "CoverLetter" },
    jobUrl: { type: String, default: "" },
    optimizations: [{ type: String }],
    matchScoreBefore: { type: Number },
    matchScoreAfter: { type: Number },
    explanation: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.Application ||
  mongoose.model<IApplication>("Application", ApplicationSchema);
