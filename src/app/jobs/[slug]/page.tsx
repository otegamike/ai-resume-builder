import type { Metadata } from "next";
import dbConnect from "@/lib/db";
import JobAd from "@/models/JobAd";
import JobDetailClient from "./JobDetailClient";

void JobAd;

const BASE_URL = "https://agenticapp.cv";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    await dbConnect();
    const idOrSlug = slug;
    const job: any = await JobAd.findOne({
      $or: [{ _id: idOrSlug.match(/^[0-9a-fA-F]{24}$/) ? idOrSlug : null }, { slug: idOrSlug }],
    })
      .populate("companyId", "name")
      .lean();

    if (!job) {
      return { title: "Job Not Found" };
    }

    const title = job.title as string;
    const rawDesc: string = typeof job.summary === "string" && job.summary.trim() ? job.summary.trim() : "";
    const fallbackDesc = typeof job.description === "string" ? job.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160) : "";
    const description = rawDesc || fallbackDesc || `View ${title} on AgenticApp.cv`;
    const shortUrl = `${BASE_URL}/jobs/${String(job._id)}`;
    const canonicalUrl = shortUrl;

    return {
      title,
      description,
      alternates: { canonical: canonicalUrl },
      openGraph: {
        type: "article",
        title,
        description,
        url: shortUrl,
        images: [{ url: "/og-default.png", width: 1200, height: 630 }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ["/og-default.png"],
      },
    };
  } catch {
    return { title: "Job" };
  }
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <JobDetailClient params={params} />;
}
