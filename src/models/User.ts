import mongoose, { Schema, Document, Types } from "mongoose";

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  image?: string;
  passwordHash?: string;
  authProviders: string[];
  oauthAccounts: Array<{
    provider: string;
    providerAccountId: string;
  }>;
  isAdmin: boolean;
  subscriptionPlan: "free"|"pro"|"proPlus";
  subscriptionStatus: "active"|"inactive";
  subscriptionId: string;
  AiCredits: number;
  AiCreditRateLimit: number;
}

const UserSchema: Schema = new Schema<IUser>(
  {
    name: { type: String, default: "" },
    email: { type: String, required: true, unique: true, index: true },
    image: { type: String, default: "" },
    passwordHash: { type: String },
    authProviders: [{ type: String, required: true }],
    oauthAccounts: [
      {
        provider: { type: String, required: true },
        providerAccountId: { type: String, required: true },
      },
    ],
    isAdmin: { type: Boolean, default: false },
    subscriptionPlan: { type: String, default: "free" },
    subscriptionStatus: { type: String, default: "inactive" },
    subscriptionId: { type: String, default: "" },
    AiCredits: { type: Number, default: 1000 },
    AiCreditRateLimit: { type: Number, default: 10 },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);