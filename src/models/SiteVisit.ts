import mongoose, { Schema, Document, Types } from "mongoose";

export interface ISiteVisit extends Document {
  _id: Types.ObjectId;
  path: string;
  userId?: Types.ObjectId;
  timestamp: Date;
}

const SiteVisitSchema: Schema = new Schema<ISiteVisit>(
  {
    path: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export default mongoose.models.SiteVisit || mongoose.model<ISiteVisit>("SiteVisit", SiteVisitSchema);
