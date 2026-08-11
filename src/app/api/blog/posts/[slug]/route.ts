import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";
import dbConnect from "@/lib/db";
import Post from "@/models/Post";

void Post;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await dbConnect();

    const post = await Post.findOne({ slug, published: true }).lean();
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Error fetching blog post:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
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
    console.error("Error updating blog post:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
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
        await cloudinary.uploader.destroy(post.coverImagePublicId);
      } catch (cloudError) {
        console.error("Failed to delete cover image from Cloudinary:", cloudError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting blog post:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
