import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authUser";
import dbConnect from "@/lib/db";
import JobApplication from "@/models/JobApplication";

void JobApplication;

export async function GET(req: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");

    await dbConnect();

    const query: any = { applicantId: authUser.userObjectId };
    if (jobId) query.jobId = jobId;

    const apps = await JobApplication.find(query)
      .sort({ createdAt: -1 })
      .populate("jobId", "title slug location category jobType workplaceType companyId status createdAt")
      .populate("companyId", "name logo location")
      .lean();

    return NextResponse.json({ applications: apps });
  } catch (error: any) {
    console.error("Error fetching my job applications:", error);
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
  }
}
