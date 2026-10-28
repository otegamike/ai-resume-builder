import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Resume from "@/models/Resume";
import CoverLetter from "@/models/CoverLetter";
import Application from "@/models/Application";
import { getAuthenticatedUser } from "@/lib/authUser";
import { handleApiError } from "@/lib/api/handleApiError";
import { withApiHandler } from "@/lib/api/withApiHandler";

export const GET = withApiHandler(
  async () => {
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
      return handleApiError(error, { route: "/api/dashboard/stats", flow: "dashboard" });
    }
  },
  { route: "/api/dashboard/stats", flow: "dashboard" }
);
