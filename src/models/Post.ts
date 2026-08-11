import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPost {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  coverImagePublicId: string;
  authorId: string;
  tags: string[];
  published: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema: Schema = new Schema<IPost>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    excerpt: { type: String, default: "" },
    content: { type: String, default: "" },
    coverImageUrl: { type: String, default: "" },
    coverImagePublicId: { type: String, default: "" },
    authorId: { type: String, required: true },
    tags: [{ type: String }],
    published: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.Post || mongoose.model<IPost>("Post", PostSchema);
