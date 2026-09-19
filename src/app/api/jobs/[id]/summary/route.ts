import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import JobAd from "@/models/JobAd";
import Company from "@/models/Company";
import User from "@/models/User";
import { generateJobShareSummary } from "@/lib/ai";

void JobAd;
void Company;
void User;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const currentUser = await User.findById(session.user.id).select("isAdmin");
    if (!currentUser?.isAdmin) {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
    }

    const { id } = await params;
    const job: any = await JobAd.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { slug: id }],
    }).populate("companyId", "name location");

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const existing = typeof job.summary === "string" ? job.summary.trim() : "";
    if (existing) {
      return NextResponse.json({ summary: existing.slice(0, 280) });
    }

    const companyName = (job.companyId as any)?.name || "";
    const plainDesc = typeof job.description === "string" ? job.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2000) : "";
    const parts: string[] = [];
    if (job.title) parts.push(`Title: ${job.title}`);
    if (companyName) parts.push(`Company: ${companyName}`);
    if (job.location) parts.push(`Location: ${job.location} (${job.workplaceType || "remote"})`);
    if (job.jobType) parts.push(`Type: ${job.jobType}`);
    if (job.category) parts.push(`Category: ${job.category}`);
    if (job.skillsRequired?.length) parts.push(`Skills: ${job.skillsRequired.join(", ")}`);
    if (job.benefits?.length) parts.push(`Benefits: ${job.benefits.join("; ")}`);
    if (job.requirements?.length) parts.push(`Requirements: ${job.requirements.join("; ")}`);
    if (plainDesc) parts.push(`Description: ${plainDesc}`);
    if (!plainDesc && !job.requirements?.length && !job.benefits?.length) {
      parts.push("No description provided — generate a generic hiring blurb for this role.");
    }

    const jobText = parts.join("\n");
    const summary = await generateJobShareSummary(jobText);

    if (summary) {
      // Persist so next share is instant and job has a summary going forward
      await JobAd.updateOne({ _id: job._id }, { $set: { summary: summary.slice(0, 280) } });
    }

    return NextResponse.json({ summary: (summary || "").slice(0, 280) });
  } catch (error: any) {
    console.error("summary generation error:", error);
    return NextResponse.json({ error: error?.message || "Failed to generate summary" }, { status: 500 });
  }
}
