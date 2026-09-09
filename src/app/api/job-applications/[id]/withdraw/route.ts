import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authUser";
import dbConnect from "@/lib/db";
import JobApplication from "@/models/JobApplication";
import JobAd from "@/models/JobAd";

void JobApplication;
void JobAd;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const app = await JobApplication.findOne({ _id: id, applicantId: authUser.userObjectId });
    if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    if (app.status === "withdrawn") return NextResponse.json({ success: true, application: app });

    app.status = "withdrawn";
    await app.save();

    await JobAd.updateOne({ _id: app.jobId }, { $inc: { applicationsCount: -1 } }).catch(() => {});

    return NextResponse.json({ success: true, application: app });
  } catch (error: any) {
    console.error("Withdraw error:", error);
    return NextResponse.json({ error: error.message || "Failed to withdraw" }, { status: 500 });
  }
}
