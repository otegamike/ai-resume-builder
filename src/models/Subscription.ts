import mongoose, { Schema, Types } from "mongoose";

export interface ISubscription {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  paystackCustomerCode: string;
  paystackCustomerId: number;
  subscriptionCode: string;
  emailToken: string;
  planCode: string;
  interval: "monthly" | "annually";
  status: "pending" | "active" | "non-renewing" | "cancelled" | "past_due";
  currentPeriodEnd?: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    paystackCustomerCode: { type: String, default: "" },
    paystackCustomerId: { type: Number, default: 0 },
    subscriptionCode: { type: String, default: "" },
    emailToken: { type: String, default: "" },
    planCode: { type: String, required: true },
    interval: { type: String, enum: ["monthly", "annually"], required: true },
    status: {
      type: String,
      enum: ["pending", "active", "non-renewing", "cancelled", "past_due"],
      default: "pending",
    },
    currentPeriodEnd: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.Subscription ||
  mongoose.model<ISubscription>("Subscription", SubscriptionSchema);
