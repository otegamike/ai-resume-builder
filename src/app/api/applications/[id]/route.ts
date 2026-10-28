import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import CoverLetter from "@/models/CoverLetter";
import Resume from "@/models/Resume";
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
      const application = await Application.findOne({
        _id: id,
        user: authUser.userObjectId,
      });

      if (!application) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }

      const appJson = application.toObject();

      let coverLetterContent = "";
      let tailoredResume = null;
      let resumeTemplateId = "";

      if (application.coverLetterId) {
        const coverLetterDoc = await CoverLetter.findById(application.coverLetterId);
        if (coverLetterDoc) {
          coverLetterContent = coverLetterDoc.content || "";
        }
      }

      if (application.resumeId) {
        const resumeDoc = await Resume.findById(application.resumeId);
        if (resumeDoc) {
          tailoredResume = resumeDoc.content;
          resumeTemplateId = resumeDoc.template || "";
        }
      }

      return NextResponse.json({
        ...appJson,
        coverLetter: coverLetterContent,
        tailoredResume,
        templateId: resumeTemplateId,
      });
    } catch (error) {
      return handleApiError(error, { route: "/api/applications/[id]", flow: "applications" });
    }
  },
  { route: "/api/applications/[id]", flow: "applications" }
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
      const { company, role, status, appliedDate, notes, resumeId, coverLetterId, jobUrl, optimizations, explanation } = body;

      await dbConnect();
      const application = await Application.findOneAndUpdate(
        { _id: id, user: authUser.userObjectId },
        {
          ...(company !== undefined && { company }),
          ...(role !== undefined && { role }),
          ...(status !== undefined && { status }),
          ...(appliedDate !== undefined && { appliedDate: appliedDate ? new Date(appliedDate) : undefined }),
          ...(notes !== undefined && { notes }),
          ...(resumeId !== undefined && { resumeId: resumeId || undefined }),
          ...(coverLetterId !== undefined && { coverLetterId: coverLetterId || undefined }),
          ...(jobUrl !== undefined && { jobUrl }),
          ...(optimizations !== undefined && { optimizations }),
          ...(explanation !== undefined && { explanation }),
          updatedAt: new Date(),
        },
        { returnDocument: "after" }
      );

      if (!application) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }

      return NextResponse.json(application);
    } catch (error) {
      return handleApiError(error, { route: "/api/applications/[id]", flow: "applications" });
    }
  },
  { route: "/api/applications/[id]", flow: "applications" }
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
      const application = await Application.findOneAndDelete({
        _id: id,
        user: authUser.userObjectId,
      });

      if (!application) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }

      if (application.resumeId) {
        Resume.findByIdAndDelete(application.resumeId).catch(() => {});
      }
      if (application.coverLetterId) {
        CoverLetter.findByIdAndDelete(application.coverLetterId).catch(() => {});
      }

      return NextResponse.json({ message: "Application deleted successfully" });
    } catch (error) {
      return handleApiError(error, { route: "/api/applications/[id]", flow: "applications" });
    }
  },
  { route: "/api/applications/[id]", flow: "applications" }
);
