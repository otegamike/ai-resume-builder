import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import CoverLetter from "@/models/CoverLetter";
import Resume from "@/models/Resume";
import { getAuthenticatedUser } from "@/lib/authUser";
import { handleApiError } from "@/lib/api/handleApiError";
import { withApiHandler } from "@/lib/api/withApiHandler";

// Keep imports — used by .populate() refs in Application schema
void CoverLetter;
void Resume;

export const GET = withApiHandler(
  async () => {
    try {
      const authUser = await getAuthenticatedUser();
      if (!authUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      await dbConnect();
      const applications = await Application.find({
        user: authUser.userObjectId,
      })
        .populate("coverLetterId", "content")
        .populate("resumeId", "content template")
        .sort({ updatedAt: -1 });

      const enriched = applications.map((app) => {
        const doc = app.toObject();
        const resumeDoc = doc.resumeId as unknown as {
          _id?: Types.ObjectId;
          content?: unknown;
          template?: string;
        } | null;
        const coverLetter = doc.coverLetterId as unknown as {
          _id?: Types.ObjectId;
          content?: string;
        } | null;


        return {
          ...doc,
          resumeDoc,
          resumeId: doc.resumeId?._id?.toString() ?? doc.resumeId,
          coverLetterId: doc.coverLetterId?._id?.toString() ?? doc.coverLetterId,
          coverLetterContent: coverLetter?.content ?? "",
        };
      });

      return NextResponse.json(enriched);
    } catch (error) {
      return handleApiError(error, { route: "/api/applications", flow: "applications" });
    }
  },
  { route: "/api/applications", flow: "applications" }
);

export const POST = withApiHandler(
  async (request: NextRequest) => {
    try {
      const authUser = await getAuthenticatedUser();
      if (!authUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      const { company, role, status, appliedDate, notes, resumeId, coverLetterId, jobUrl, optimizations, explanation } = body;

      if (!company || !role) {
        return NextResponse.json({ error: "Company and role are required" }, { status: 400 });
      }

      await dbConnect();
      const application = new Application({
        user: authUser.userObjectId,
        company,
        role,
        status: status || "saved",
        appliedDate: appliedDate ? new Date(appliedDate) : undefined,
        notes: notes || "",
        resumeId: resumeId || undefined,
        coverLetterId: coverLetterId || undefined,
        jobUrl: jobUrl || "",
        optimizations: optimizations || undefined,
        explanation: explanation || undefined,
      });

      const saved = await application.save();
      return NextResponse.json(saved, { status: 201 });
    } catch (error) {
      return handleApiError(error, { route: "/api/applications", flow: "applications" });
    }
  },
  { route: "/api/applications", flow: "applications" }
);
