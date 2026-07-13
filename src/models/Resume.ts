import mongoose, { Schema, Document } from "mongoose";
import { TemplateData } from "@/lib/templateCatalog";

export interface IResume {
  userId?: string;
  user?: mongoose.Types.ObjectId;
  title: string;
  template: string;
  content: TemplateData;
}

const ResumeSchema: Schema = new Schema<IResume>(
  {
    userId: { type: String, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", index: true },
    title: { type: String, required: true },
    template: { type: String, default: 'modern' },
    content: {
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
  },
  { timestamps: true }
);

export default mongoose.models.Resume || mongoose.model<IResume>("Resume", ResumeSchema);
