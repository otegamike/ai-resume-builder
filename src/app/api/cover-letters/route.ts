import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import dbConnect from "@/lib/db";
import CoverLetter from "@/models/CoverLetter";
import { getAuthenticatedUser } from "@/lib/authUser";
import { recordActivity } from "@/lib/activityService";
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
      const coverLetters = await CoverLetter.find({
        user: authUser.userObjectId,
      }).sort({ updatedAt: -1 });

      return NextResponse.json(coverLetters);
    } catch (error) {
      return handleApiError(error, { route: "/api/cover-letters", flow: "cover-letters" });
    }
  },
  { route: "/api/cover-letters", flow: "cover-letters" }
);

export const POST = withApiHandler(
  async (request: NextRequest) => {
    try {
      const authUser = await getAuthenticatedUser();
      if (!authUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      const { title, targetCompany, targetRole, content, resumeId, jobDescription, status } = body;

      if (!title) {
        return NextResponse.json({ error: "Title is required" }, { status: 400 });
      }

      await dbConnect();
      const coverLetter = new CoverLetter({
        user: authUser.userObjectId,
        title,
        targetCompany: targetCompany || "",
        targetRole: targetRole || "",
        content: content || "",
        resumeId: resumeId || undefined,
        jobDescription: jobDescription || "",
        status: status || "draft",
      });

      const saved = await coverLetter.save();

      recordActivity({
        actorId: authUser.userObjectId,
        actorEmail: authUser.user.email || "",
        actorName: authUser.user.name || "",
        type: "cover_letter_created",
        title: `Created cover letter "${title}"`,
        detail: `Created cover letter "${title}"`,
        entityType: "coverLetter",
        entityId: saved._id as Types.ObjectId,
        metadata: { title, targetCompany, targetRole },
      }).catch((err) => console.error("Failed to record cover_letter_created:", err));

      return NextResponse.json(saved, { status: 201 });
    } catch (error) {
      return handleApiError(error, { route: "/api/cover-letters", flow: "cover-letters" });
    }
  },
  { route: "/api/cover-letters", flow: "cover-letters" }
);
