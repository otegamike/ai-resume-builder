import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICompanyMember {
  userId: Types.ObjectId;
  role: "owner" | "admin" | "recruiter";
}

export interface ICompany extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  logo?: string;
  website?: string;
  industry?: string;
  companySize?: string;
  description?: string;
  location?: string;
  ownerId: Types.ObjectId;
  members: ICompanyMember[];
  isVerified: boolean;
  status: "active" | "suspended";
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema: Schema = new Schema<ICompany>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    logo: { type: String, default: "" },
    website: { type: String, default: "" },
    industry: { type: String, default: "" },
    companySize: { type: String, default: "1-10" },
    description: { type: String, default: "" },
    location: { type: String, default: "" },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    members: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        role: { type: String, enum: ["owner", "admin", "recruiter"], default: "owner" },
      },
    ],
    isVerified: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
  },
  { timestamps: true }
);

export default mongoose.models.Company || mongoose.model<ICompany>("Company", CompanySchema);
