import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Application from "@/models/Application";
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
    const application = await Application.findOne({
      _id: id,
      user: authUser.userObjectId,
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    return NextResponse.json(application);
  } catch (error) {
    console.error("Error fetching application:", error);
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
    const { company, role, status, appliedDate, notes, resumeId, coverLetterId, jobUrl } = body;

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
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    return NextResponse.json(application);
  } catch (error) {
    console.error("Error updating application:", error);
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
    const application = await Application.findOneAndDelete({
      _id: id,
      user: authUser.userObjectId,
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Application deleted successfully" });
  } catch (error) {
    console.error("Error deleting application:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
