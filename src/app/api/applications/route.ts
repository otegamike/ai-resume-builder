import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import { getAuthenticatedUser } from "@/lib/authUser";

export async function GET() {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const applications = await Application.find({
      user: authUser.userObjectId,
    }).sort({ updatedAt: -1 });

    return NextResponse.json(applications);
  } catch (error) {
    console.error("Error fetching applications:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { company, role, status, appliedDate, notes, resumeId, coverLetterId, jobUrl, optimizations, matchScoreBefore, matchScoreAfter, explanation } = body;

    if (!company || !role) {
      return NextResponse.json({ error: "Company and role are required" }, { status: 400 });
    }

    await dbConnect();
    const application = new Application({
      userId: authUser.legacyUserId || String(authUser.userObjectId),
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
      matchScoreBefore: matchScoreBefore !== undefined ? matchScoreBefore : undefined,
      matchScoreAfter: matchScoreAfter !== undefined ? matchScoreAfter : undefined,
      explanation: explanation || undefined,
    });

    const saved = await application.save();
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    console.error("Error creating application:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
