import mongoose, { Schema, Document, Types } from "mongoose";

export interface IAiUsageEvent {
  _id: Types.ObjectId;
  feature: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  queueTimeMs?: number;
  latencyMs: number;
  truncated: boolean;
  finishReason: string;
  userId?: Types.ObjectId;
  createdAt: Date;
}

const AiUsageEventSchema: Schema = new Schema<IAiUsageEvent>(
  {
    feature: { type: String, required: true, index: true },
    model: { type: String, required: true, index: true },
    promptTokens: { type: Number, required: true },
    completionTokens: { type: Number, required: true },
    totalTokens: { type: Number, required: true },
    queueTimeMs: { type: Number },
    latencyMs: { type: Number, required: true },
    truncated: { type: Boolean, default: false },
    finishReason: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AiUsageEventSchema.index({ model: 1, createdAt: -1 });

export default mongoose.models.AiUsageEvent ||
  mongoose.model<IAiUsageEvent>("AiUsageEvent", AiUsageEventSchema);
