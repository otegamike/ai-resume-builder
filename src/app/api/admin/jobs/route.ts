import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import JobAd from "@/models/JobAd";
import Company from "@/models/Company";
import User from "@/models/User";

void JobAd;
void Company;
void User;

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "";
    const query: any = {};

    if (status) {
      query.status = status;
    }

    const jobs = await JobAd.find(query)
      .sort({ createdAt: -1 })
      .populate("companyId", "name logo website location isVerified")
      .populate("postedBy", "name email");

    const counts = {
      pending_review: await JobAd.countDocuments({ status: "pending_review" }),
      active: await JobAd.countDocuments({ status: "active" }),
      rejected: await JobAd.countDocuments({ status: "rejected" }),
      total: await JobAd.countDocuments({}),
    };

    return NextResponse.json({ jobs, counts });
  } catch (error: any) {
    console.error("Error fetching admin jobs:", error);
    return NextResponse.json({ error: "Failed to fetch admin jobs" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    await dbConnect();

    const { jobId, action, rejectionReason, isFeatured, isPinned, isVerifiedCompany } = await req.json();

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    const job = await JobAd.findById(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job ad not found" }, { status: 404 });
    }

    if (action === "approve") {
      job.status = "active";
      job.rejectionReason = "";
    } else if (action === "reject") {
      job.status = "rejected";
      job.rejectionReason = rejectionReason || "Violates community job ad standards or potential scam alert.";
    }

    if (isFeatured !== undefined) job.isFeatured = isFeatured;
    if (isPinned !== undefined) job.isPinned = isPinned;

    await job.save();

    if (isVerifiedCompany !== undefined && job.companyId) {
      await Company.updateOne({ _id: job.companyId }, { isVerified: isVerifiedCompany });
    }

    return NextResponse.json({
      success: true,
      job,
      message: `Job ad ${action === "approve" ? "approved & published" : action === "reject" ? "rejected" : "updated"} successfully.`,
    });
  } catch (error: any) {
    console.error("Error moderating job ad:", error);
    return NextResponse.json({ error: "Failed to moderate job ad" }, { status: 500 });
  }
}
