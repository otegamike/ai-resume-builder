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
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);