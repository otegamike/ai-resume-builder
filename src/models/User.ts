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
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
