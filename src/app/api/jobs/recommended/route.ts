import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import JobAd from "@/models/JobAd";
import Company from "@/models/Company";
import User from "@/models/User";
import { getAuthenticatedUser } from "@/lib/authUser";

void Company;
void User;

export const runtime = "nodejs";

export async function GET() {
  try {
    await dbConnect();
    const authUser = await getAuthenticatedUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const me = await User.findById(authUser.userObjectId).select("industry targetRole targetField location");
    if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const industry = (me.industry || "").trim();
    const targetRole = (me.targetRole || me.targetField || "").trim();
    const location = (me.location || "").trim();

    const orConditions: Record<string, unknown>[] = [];

    if (industry) {
      orConditions.push({ category: new RegExp(`^${escapeRegex(industry)}$`, "i") });
    }
    if (targetRole) {
      const terms = targetRole.split(/\s+/).filter((t: string) => t.length > 1);
      const regex = new RegExp(terms.map(escapeRegex).join("|"), "i");
      orConditions.push({ title: regex });
      orConditions.push({ skillsRequired: regex });
      orConditions.push({ description: regex });
    }

    let query: Record<string, unknown> = { status: "active" };
    if (orConditions.length > 0) {
      query = { status: "active", $or: orConditions };
    }

    let jobs = await JobAd.find(query)
      .sort({ isPinned: -1, isFeatured: -1, createdAt: -1 })
      .limit(10)
      .populate("companyId", "name logo isVerified slug")
      .lean();

    if (industry && jobs.length < 5) {
      const ids = new Set(jobs.map((j: { _id: unknown }) => String(j._id)));
      const fallback = await JobAd.find({ status: "active", category: new RegExp(`^${escapeRegex(industry)}$`, "i"), _id: { $nin: [...ids] } } as Record<string, unknown>)
        .sort({ createdAt: -1 })
        .limit(10 - jobs.length)
        .populate("companyId", "name logo isVerified slug")
        .lean();
      jobs = [...jobs, ...fallback];
    }

    if (jobs.length < 5) {
      const ids = new Set(jobs.map((j: { _id: unknown }) => String(j._id)));
      const latest = await JobAd.find({ status: "active", _id: { $nin: [...ids] } } as Record<string, unknown>)
        .sort({ createdAt: -1 })
        .limit(10 - jobs.length)
        .populate("companyId", "name logo isVerified slug")
        .lean();
      jobs = [...jobs, ...latest];
    }

    if (location && jobs.length > 1) {
      const locLower = location.toLowerCase();
      jobs.sort((a: { location?: string; category?: string }, b: { location?: string; category?: string }) => {
        const aCat = industry ? String(a.category || "").toLowerCase() === industry.toLowerCase() : false;
        const bCat = industry ? String(b.category || "").toLowerCase() === industry.toLowerCase() : false;
        if (aCat !== bCat) return aCat ? -1 : 1;
        const aLoc = String(a.location || "").toLowerCase().includes(locLower);
        const bLoc = String(b.location || "").toLowerCase().includes(locLower);
        if (aLoc !== bLoc) return aLoc ? -1 : 1;
        return 0;
      });
    } else if (industry) {
      jobs.sort((a: { category?: string }, b: { category?: string }) => {
        const aCat = String(a.category || "").toLowerCase() === industry.toLowerCase() ? 0 : 1;
        const bCat = String(b.category || "").toLowerCase() === industry.toLowerCase() ? 0 : 1;
        return aCat - bCat;
      });
    }

    return NextResponse.json({ jobs: jobs.slice(0, 10) });
  } catch (error) {
    console.error("Recommended jobs error:", error);
    return NextResponse.json({ error: "Failed to fetch recommended jobs" }, { status: 500 });
  }
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
