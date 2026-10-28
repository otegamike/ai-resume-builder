import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authUser";
import dbConnect from "@/lib/db";
import JobApplication from "@/models/JobApplication";
import { handleApiError } from "@/lib/api/handleApiError";
import { withApiHandler } from "@/lib/api/withApiHandler";

void JobApplication;

export const GET = withApiHandler(
  async (req: Request) => {
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
      return handleApiError(error, { route: "/api/job-applications/mine", flow: "job-applications" });
    }
  },
  { route: "/api/job-applications/mine", flow: "job-applications" }
);
