import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import JobApplication from "@/models/JobApplication";
import JobAd from "@/models/JobAd";
import Company from "@/models/Company";

void JobApplication;
void JobAd;
void Company;

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const applications = await JobApplication.find({ applicantId: session.user.id })
      .sort({ createdAt: -1 })
      .populate({
        path: "jobId",
        select: "title slug location jobType workplaceType salaryMin salaryMax salaryCurrency hideSalary status",
      })
      .populate({
        path: "companyId",
        select: "name logo website location isVerified",
      });

    return NextResponse.json({ applications });
  } catch (error: any) {
    console.error("Error fetching candidate job applications:", error);
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
  }
}
