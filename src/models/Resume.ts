import mongoose, { Schema, Document } from "mongoose";

export interface IResume extends Document {
  userId: string;
  title: string;
  template: string;
  content: {
    personalInfo: {
      name: string;
      jobTitle: string;
      email: string;
      phone: string;
      location: string;
      website: string;
      photo?: string;
    };
    summary: string;
    experience: Array<{
      id: string;
      company: string;
      role: string;
      startDate: string;
      endDate: string;
      description: string;
    }>;
    education: Array<{
      id: string;
      school: string;
      degree: string;
      startDate: string;
      endDate: string;
    }>;
    skills: string[];
  };
}

const ResumeSchema: Schema = new Schema(
  {
    userId: { type: String, required: true },
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
          description: { type: String },
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
      skills: [{ type: String }],
    },
  },
  { timestamps: true }
);

export default mongoose.models.Resume || mongoose.model<IResume>("Resume", ResumeSchema);
