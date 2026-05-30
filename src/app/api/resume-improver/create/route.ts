import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authUser";
import dbConnect from "@/lib/db";
import Resume from "@/models/Resume";
import { ResumeContent } from "@/types/ResumeData";

export const runtime = "nodejs";

interface CreateImprovedResumeBody {
  title?: string;
  template?: string;
  improvedResume?: ResumeContent;
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as CreateImprovedResumeBody;
    if (!body.improvedResume) {
      return NextResponse.json(
        { error: "Improved resume content is required" },
        { status: 400 }
      );
    }

    await dbConnect();
    const resume = new Resume({
      userId: authUser.legacyUserId || String(authUser.userObjectId),
      user: authUser.userObjectId,
      title: body.title || "Improved Resume",
      template: body.template || "template1",
      content: body.improvedResume,
    });

    const savedResume = await resume.save();
    return NextResponse.json(
      { id: savedResume._id, content: savedResume.content },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create improved resume error:", error);
    return NextResponse.json(
      { error: "Failed to create improved resume" },
      { status: 500 }
    );
  }
}
