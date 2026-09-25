import "server-only";
import type { Metadata } from "next";
import dbConnect from "@/lib/db";
import JobAd from "@/models/JobAd";
import Company from "@/models/Company";

void JobAd;
void Company;

const rawBase = process.env.NEXT_PUBLIC_SITE_URL || "https://www.agenticapp.cv";
const BASE_URL = rawBase.replace(/^https:\/\/agenticapp\.cv/, "https://www.agenticapp.cv");

/**
 * Build the OG / Twitter / SEO metadata for a single job-ad page.
 * Accepts the raw slug (or Mongo ObjectId) from the route params.
 */
export async function buildJobMetadata(slug: string): Promise<Metadata> {
  try {
    await dbConnect();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const job: any = await JobAd.findOne({
      $or: [
        { _id: slug.match(/^[0-9a-fA-F]{24}$/) ? slug : null },
        { slug },
      ],
    })
      .populate("companyId", "name")
      .lean();

    if (!job) {
      return { title: "Job Not Found" };
    }

    const title = job.title as string;

    const rawDesc: string =
      typeof job.summary === "string" && job.summary.trim()
        ? job.summary.trim()
        : "";

    const fallbackDesc =
      typeof job.description === "string"
        ? job.description
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 160)
        : "";

    const description =
      rawDesc || fallbackDesc || `View ${title} on AgenticApp.cv`;

    const url = `${BASE_URL}/jobs/${String(job._id)}`;
    const ogImageUrl = `${BASE_URL}/api/og/job?slug=${encodeURIComponent(slug)}`;

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        type: "article",
        title,
        description,
        url,
        images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImageUrl],
      },
    };
  } catch {
    return { title: "Job" };
  }
}
