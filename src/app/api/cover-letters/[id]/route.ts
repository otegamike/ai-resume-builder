import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CoverLetter from "@/models/CoverLetter";
import { getAuthenticatedUser } from "@/lib/authUser";
import { handleApiError } from "@/lib/api/handleApiError";
import { withApiHandler } from "@/lib/api/withApiHandler";

export const GET = withApiHandler(
  async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    try {
      const authUser = await getAuthenticatedUser();
      if (!authUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      await dbConnect();
      const coverLetter = await CoverLetter.findOne({
        _id: id,
        user: authUser.userObjectId,
      });

      if (!coverLetter) {
        return NextResponse.json({ error: "Cover letter not found" }, { status: 404 });
      }

      return NextResponse.json(coverLetter);
    } catch (error) {
      return handleApiError(error, { route: "/api/cover-letters/[id]", flow: "cover-letters" });
    }
  },
  { route: "/api/cover-letters/[id]", flow: "cover-letters" }
);

export const PUT = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    try {
      const authUser = await getAuthenticatedUser();
      if (!authUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      const { title, targetCompany, targetRole, content, resumeId, jobDescription, status } = body;

      await dbConnect();
      const coverLetter = await CoverLetter.findOneAndUpdate(
        { _id: id, user: authUser.userObjectId },
        {
          ...(title !== undefined && { title }),
          ...(targetCompany !== undefined && { targetCompany }),
          ...(targetRole !== undefined && { targetRole }),
          ...(content !== undefined && { content }),
          ...(resumeId !== undefined && { resumeId: resumeId || undefined }),
          ...(jobDescription !== undefined && { jobDescription }),
          ...(status !== undefined && { status }),
          updatedAt: new Date(),
        },
        { returnDocument: "after" }
      );

      if (!coverLetter) {
        return NextResponse.json({ error: "Cover letter not found" }, { status: 404 });
      }

      return NextResponse.json(coverLetter);
    } catch (error) {
      return handleApiError(error, { route: "/api/cover-letters/[id]", flow: "cover-letters" });
    }
  },
  { route: "/api/cover-letters/[id]", flow: "cover-letters" }
);

export const DELETE = withApiHandler(
  async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    try {
      const authUser = await getAuthenticatedUser();
      if (!authUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      await dbConnect();
      const coverLetter = await CoverLetter.findOneAndDelete({
        _id: id,
        user: authUser.userObjectId,
      });

      if (!coverLetter) {
        return NextResponse.json({ error: "Cover letter not found" }, { status: 404 });
      }

      return NextResponse.json({ message: "Cover letter deleted successfully" });
    } catch (error) {
      return handleApiError(error, { route: "/api/cover-letters/[id]", flow: "cover-letters" });
    }
  },
  { route: "/api/cover-letters/[id]", flow: "cover-letters" }
);
