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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();

    // Support querying by ID or by slug
    let job = await JobAd.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { slug: id }],
    }).populate("companyId", "name logo website industry location description isVerified slug");

    if (!job) {
      return NextResponse.json({ error: "Job ad not found" }, { status: 404 });
    }

    // Increment views count silently
    await JobAd.updateOne({ _id: job._id }, { $inc: { viewsCount: 1 } });

    return NextResponse.json({ job });
  } catch (error: any) {
    console.error("Error fetching single job:", error);
    return NextResponse.json({ error: "Failed to fetch job details" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const currentUser = await User.findById(session.user.id);
    const job = await JobAd.findById(id);

    if (!job) {
      return NextResponse.json({ error: "Job ad not found" }, { status: 404 });
    }

    // Check authorization: Must be Admin OR owner of company
    const isOwner =
      currentUser?.organizationId &&
      String(job.companyId) === String(currentUser.organizationId);

    if (!currentUser?.isAdmin && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    // Allowed updates
    if (body.title) job.title = body.title.trim();
    if (body.jobType) job.jobType = body.jobType;
    if (body.workplaceType) job.workplaceType = body.workplaceType;
    if (body.location !== undefined) job.location = body.location;
    if (body.category) job.category = body.category;
    if (body.experienceLevel) job.experienceLevel = body.experienceLevel;
    if (body.salaryMin !== undefined) job.salaryMin = body.salaryMin;
    if (body.salaryMax !== undefined) job.salaryMax = body.salaryMax;
    if (body.salaryCurrency) job.salaryCurrency = body.salaryCurrency;
    if (body.salaryPeriod) job.salaryPeriod = body.salaryPeriod;
    if (body.hideSalary !== undefined) job.hideSalary = body.hideSalary;
    if (body.description) job.description = body.description;
    if (Array.isArray(body.requirements)) job.requirements = body.requirements;
    if (Array.isArray(body.benefits)) job.benefits = body.benefits;
    if (Array.isArray(body.skillsRequired)) job.skillsRequired = body.skillsRequired;
    if (Array.isArray(body.screeningQuestions)) job.screeningQuestions = body.screeningQuestions;
    if (body.applicationType) job.applicationType = body.applicationType;
    if (body.externalUrl !== undefined) job.externalUrl = body.externalUrl;
    if (body.contactEmail !== undefined) job.contactEmail = body.contactEmail;

    // Admin-only fields
    if (currentUser?.isAdmin) {
      if (body.status) job.status = body.status;
      if (body.isFeatured !== undefined) job.isFeatured = body.isFeatured;
      if (body.isPinned !== undefined) job.isPinned = body.isPinned;
    }

    await job.save();

    return NextResponse.json({ success: true, job });
  } catch (error: any) {
    console.error("Error updating job ad:", error);
    return NextResponse.json({ error: "Failed to update job ad" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const currentUser = await User.findById(session.user.id);
    const job = await JobAd.findById(id);

    if (!job) {
      return NextResponse.json({ error: "Job ad not found" }, { status: 404 });
    }

    const isOwner =
      currentUser?.organizationId &&
      String(job.companyId) === String(currentUser.organizationId);

    if (!currentUser?.isAdmin && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft delete by setting status to closed or removing
    job.status = "closed";
    await job.save();

    return NextResponse.json({ success: true, message: "Job ad closed successfully" });
  } catch (error: any) {
    console.error("Error deleting job ad:", error);
    return NextResponse.json({ error: "Failed to delete job ad" }, { status: 500 });
  }
}
