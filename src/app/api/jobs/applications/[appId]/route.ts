import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import User from "@/models/User";

void Application;
void User;

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { appId } = await params;
    await dbConnect();

    const currentUser = await User.findById(session.user.id);
    const application = await Application.findById(appId);

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const isOwner =
      currentUser?.organizationId &&
      application.companyId &&
      String(application.companyId) === String(currentUser.organizationId);

    if (!currentUser?.isAdmin && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { status, notes } = await req.json();

    if (status) {
      application.status = status;
    }

    if (notes !== undefined) {
      application.notes = notes;
    }

    await application.save();

    return NextResponse.json({ success: true, application });
  } catch (error: any) {
    console.error("Error updating application status:", error);
    return NextResponse.json({ error: "Failed to update application status" }, { status: 500 });
  }
}
