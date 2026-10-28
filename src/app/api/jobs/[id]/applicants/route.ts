import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import JobAd from "@/models/JobAd";
import JobApplication from "@/models/JobApplication";
import User from "@/models/User";
import Resume from "@/models/Resume";
import CoverLetter from "@/models/CoverLetter";
import { handleApiError } from "@/lib/api/handleApiError";
import { withApiHandler } from "@/lib/api/withApiHandler";


void JobAd;
void JobApplication;
void User;
void Resume;
void CoverLetter;



export const GET = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
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

      const applicants = await JobApplication.find({ jobId: job._id, status: { $ne: "withdrawn" } })
        .sort({ createdAt: -1 })
        .populate("applicantId", "name email image location jobTitle phone");

      const mapped = applicants.map((a: any) => { 
        const { applicantId: applicantInformation, ...applicationData } = a.toObject();
        return { applicantInformation, ...applicationData };
      })

      return NextResponse.json({ job, applicants: mapped });
    } catch (error: any) {
      return handleApiError(error, { route: "/api/jobs/[id]/applicants", flow: "jobs" });
    }
  },
  { route: "/api/jobs/[id]/applicants", flow: "jobs" }
);
