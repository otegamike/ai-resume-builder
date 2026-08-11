import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Post from "@/models/Post";

void Post;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeDrafts = searchParams.get("includeDrafts") === "1";

    const query: Record<string, unknown> = { published: true };
    if (includeDrafts) {
      const session = await getServerSession(authOptions);
      if (session?.user?.isAdmin) {
        delete query.published;
      }
    }

    await dbConnect();
    const posts = await Post.find(query)
      .sort({ publishedAt: -1, createdAt: -1 })
      .select("title slug excerpt coverImageUrl tags published publishedAt updatedAt")
      .lean();

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      slug,
      excerpt = "",
      content = "",
      coverImageUrl = "",
      coverImagePublicId = "",
      tags = [],
      published = false,
    } = body;

    if (!title || !slug) {
      return NextResponse.json(
        { error: "Title and slug are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const existing = await Post.findOne({ slug });
    if (existing) {
      return NextResponse.json(
        { error: "A post with this slug already exists" },
        { status: 409 }
      );
    }

    const post = await Post.create({
      title,
      slug,
      excerpt,
      content,
      coverImageUrl,
      coverImagePublicId,
      authorId: session.user.id,
      tags: Array.isArray(tags) ? tags : [],
      published,
      publishedAt: published ? new Date() : null,
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("Error creating blog post:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
