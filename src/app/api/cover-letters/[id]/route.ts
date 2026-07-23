import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CoverLetter from "@/models/CoverLetter";
import { getAuthenticatedUser } from "@/lib/authUser";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    console.error("Error fetching cover letter:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    console.error("Error updating cover letter:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    console.error("Error deleting cover letter:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
