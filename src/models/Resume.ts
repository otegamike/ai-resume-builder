import mongoose, { Schema, Types } from "mongoose";
import { ResumeObj } from "@/types/ResumeData";

export interface IResume extends ResumeObj {
  userId?: string;
  user?: Types.ObjectId;
}


export interface IResumeDocument extends ResumeObj {
  _id: Types.ObjectId;
  updatedAt: string;
}

export const ResumeContentSchema = new Schema(
  {
    personalInfo: {
      name: { type: String, default: "" },
      jobTitle: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
      location: { type: String, default: "" },
      website: { type: String, default: "" },
      photo: { type: String, default: "" },
    },
    summary: { type: String, default: "" },
    experience: [
      {
        id: { type: String },
        company: { type: String },
        role: { type: String },
        startDate: { type: String },
        endDate: { type: String },
        description: [{ type: String }],
      },
    ],
    education: [
      {
        id: { type: String },
        school: { type: String },
        degree: { type: String },
        startDate: { type: String },
        endDate: { type: String },
      },
    ],
    projects: [
      {
        id: { type: String },
        name: { type: String },
        description: [{ type: String }],
      },
    ],
    skills: [{ type: String }],
    skillCategories: [
      {
        id: { type: String },
        category: { type: String },
        skills: [{ type: String }],
      },
    ],
    skillCategorized: { type: Boolean, default: false },
  },
  { _id: false } // Prevents Mongoose from auto-generating an _id for the content sub-object
);


export const ResumeDocumentSchema: Schema = new Schema<IResumeDocument>(
  {
    _id: { type: Schema.Types.ObjectId, ref: "Resume", required: true },
    title: { type: String, default: "" },
    template: { type: String, default: "" },
    content: { type: ResumeContentSchema, default: () => ({}) },
    updatedAt: { type: String, default: "" },
  },
  { _id: false }
);


const ResumeSchema: Schema = new Schema<IResume>(
  {
    userId: { type: String, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", index: true },
    title: { type: String, required: true },
    template: { type: String, default: 'modern' },
    content: { type: ResumeContentSchema, default: () => ({}) },
  },
  { timestamps: true }
);

export default mongoose.models.Resume || mongoose.model<IResume>("Resume", ResumeSchema);
