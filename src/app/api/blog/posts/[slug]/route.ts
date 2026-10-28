import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteImage } from "@/lib/cloudinary";
import dbConnect from "@/lib/db";
import Post from "@/models/Post";
import { handleApiError } from "@/lib/api/handleApiError";
import { withApiHandler } from "@/lib/api/withApiHandler";

void Post;

export const GET = withApiHandler(
  async (_request: Request, { params }: { params: Promise<{ slug: string }> }) => {
    try {
      const { slug } = await params;
      await dbConnect();

      const post = await Post.findOne({ slug, published: true }).lean();
      if (!post) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }

      return NextResponse.json({ post });
    } catch (error) {
      return handleApiError(error, { route: "/api/blog/posts/[slug]", flow: "blog" });
    }
  },
  { route: "/api/blog/posts/[slug]", flow: "blog" }
);

export const PUT = withApiHandler(
  async (request: Request, { params }: { params: Promise<{ slug: string }> }) => {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { slug } = await params;
      const body = await request.json();
      const {
        title,
        excerpt,
        content,
        coverImageUrl,
        coverImagePublicId,
        tags,
        published,
      } = body;

      await dbConnect();

      const existing = await Post.findOne({ slug });
      if (!existing) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }

      const update: Record<string, unknown> = {};
      if (title !== undefined) update.title = title;
      if (excerpt !== undefined) update.excerpt = excerpt;
      if (content !== undefined) update.content = content;
      if (coverImageUrl !== undefined) update.coverImageUrl = coverImageUrl;
      if (coverImagePublicId !== undefined) update.coverImagePublicId = coverImagePublicId;
      if (tags !== undefined) update.tags = Array.isArray(tags) ? tags : [];

      if (published !== undefined) {
        update.published = published;
        if (published && !existing.published) {
          update.publishedAt = new Date();
        }
      }

      const post = await Post.findOneAndUpdate({ slug }, { $set: update }, { new: true }).lean();

      return NextResponse.json({ post });
    } catch (error) {
      return handleApiError(error, { route: "/api/blog/posts/[slug]", flow: "blog" });
    }
  },
  { route: "/api/blog/posts/[slug]", flow: "blog" }
);

export const DELETE = withApiHandler(
  async (_request: Request, { params }: { params: Promise<{ slug: string }> }) => {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { slug } = await params;
      await dbConnect();

      const post = await Post.findOneAndDelete({ slug }).lean();
      if (!post) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }

      if (post.coverImagePublicId) {
        try {
          await deleteImage(post.coverImagePublicId);
        } catch (cloudError) {
          console.error("Failed to delete cover image from Cloudinary:", cloudError);
        }
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      return handleApiError(error, { route: "/api/blog/posts/[slug]", flow: "blog" });
    }
  },
  { route: "/api/blog/posts/[slug]", flow: "blog" }
);
