import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Resume from "@/models/Resume";
import CoverLetter from "@/models/CoverLetter";
import Application from "@/models/Application";
import { getAuthenticatedUser } from "@/lib/authUser";

export async function GET() {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const userId = authUser.userObjectId;

    const [
      resumeCount,
      coverLetterCount,
      applicationsByStatus,
      recentResumes,
      recentCoverLetters,
      recentApplications,
    ] = await Promise.all([
      Resume.countDocuments({ user: userId }),
      CoverLetter.countDocuments({ user: userId }),
      Application.aggregate([
        { $match: { user: userId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Resume.find({ user: userId })
        .sort({ updatedAt: -1 })
        .limit(3)
        .select("title updatedAt template"),
      CoverLetter.find({ user: userId })
        .sort({ updatedAt: -1 })
        .limit(3)
        .select("title targetCompany targetRole updatedAt status"),
      Application.find({ user: userId })
        .sort({ updatedAt: -1 })
        .limit(3)
        .select("company role status updatedAt"),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const entry of applicationsByStatus) {
      statusCounts[entry._id] = entry.count;
    }

    const totalApplications = Object.values(statusCounts).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      counts: {
        resumes: resumeCount,
        coverLetters: coverLetterCount,
        applications: totalApplications,
        applicationsByStatus: statusCounts,
      },
      recent: {
        resumes: recentResumes,
        coverLetters: recentCoverLetters,
        applications: recentApplications,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
