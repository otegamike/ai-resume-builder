import "server-only";
import type { Metadata } from "next";
import dbConnect from "@/lib/db";
import JobAd from "@/models/JobAd";
import Company from "@/models/Company";

void JobAd;
void Company;

const BASE_URL = "https://agenticapp.cv";

/**
 * Build the OG / Twitter / SEO metadata for a single job-ad page.
 * Accepts the raw slug (or Mongo ObjectId) from the route params.
 */
export async function buildJobMetadata(slug: string): Promise<Metadata> {
  try {
    await dbConnect();

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

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        type: "article",
        title,
        description,
        url,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
    };
  } catch {
    return { title: "Job" };
  }
}
