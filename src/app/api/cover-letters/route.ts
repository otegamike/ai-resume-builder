import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CoverLetter from "@/models/CoverLetter";
import { getAuthenticatedUser } from "@/lib/authUser";

export async function GET() {
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
    console.error("Error fetching cover letters:", error);
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
    const { title, targetCompany, targetRole, content, resumeId, jobDescription, status } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    await dbConnect();
    const coverLetter = new CoverLetter({
      userId: authUser.legacyUserId || String(authUser.userObjectId),
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
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    console.error("Error creating cover letter:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
