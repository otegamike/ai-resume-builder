import mongoose, { Schema, Types } from "mongoose";

export interface IEmailQuota {
  _id: Types.ObjectId;
  key: string;
  count: number;
  createdAt: Date;
  updatedAt: Date;
}

const EmailQuotaSchema: Schema = new Schema<IEmailQuota>(
  {
    key: { type: String, required: true, unique: true, index: true },
    count: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.EmailQuota ||
  mongoose.model<IEmailQuota>("EmailQuota", EmailQuotaSchema);
