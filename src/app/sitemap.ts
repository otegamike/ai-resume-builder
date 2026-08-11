import type { MetadataRoute } from "next";
import dbConnect from "@/lib/db";
import Post from "@/models/Post";

void Post;

const BASE_URL = "https://agenticapp.cv";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/templates`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];

  let blogRoutes: MetadataRoute.Sitemap = [];
  try {
    await dbConnect();
    const posts = await Post.find({ published: true })
      .select("slug updatedAt")
      .lean();

    blogRoutes = posts.map((post) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "monthly",
      priority: 0.6,
    }));
  } catch (error) {
    console.error("Error generating blog sitemap entries:", error);
  }

  return [...staticRoutes, ...blogRoutes];
}
