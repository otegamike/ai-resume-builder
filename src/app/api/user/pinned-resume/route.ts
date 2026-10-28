import "server-only";

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getAuthenticatedUser, buildResumeOwnerQuery } from "@/lib/authUser";
import User from "@/models/User";
import Resume from "@/models/Resume";
import { handleApiError } from "@/lib/api/handleApiError";
import { withApiHandler } from "@/lib/api/withApiHandler";

void User;
void Resume;

export const GET = withApiHandler(
  async () => {
    try {
      const authUser = await getAuthenticatedUser();
      if (!authUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      await dbConnect();
      const user = await User.findById(authUser.userObjectId).select("pinnedResume");
      return NextResponse.json({ pinnedResume: user?.pinnedResume || null });
    } catch (error) {
      return handleApiError(error, { route: "/api/user/pinned-resume", flow: "user" });
    }
  },
  { route: "/api/user/pinned-resume", flow: "user" }
);

export const PATCH = withApiHandler(
  async (request: NextRequest) => {
    try {
      const authUser = await getAuthenticatedUser();
      if (!authUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = (await request.json()) as { resumeId?: string | null };
      const resumeId = body.resumeId ? String(body.resumeId) : null;

      await dbConnect();

      if (resumeId) {
        const ownerQuery = buildResumeOwnerQuery(authUser.userObjectId);
        const resume = await Resume.findOne({ _id: resumeId, ...ownerQuery });
        if (!resume) {
          return NextResponse.json({ error: "Resume not found" }, { status: 404 });
        }
      }

      const updated = await User.findByIdAndUpdate(
        authUser.userObjectId,
        { $set: { pinnedResume: resumeId || "" } },
        { returnDocument: "after" }
      ).select("pinnedResume");

      return NextResponse.json({ pinnedResume: updated?.pinnedResume || null });
    } catch (error) {
      return handleApiError(error, { route: "/api/user/pinned-resume", flow: "user" });
    }
  },
  { route: "/api/user/pinned-resume", flow: "user" }
);
