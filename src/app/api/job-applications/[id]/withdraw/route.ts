import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authUser";
import dbConnect from "@/lib/db";
import JobApplication from "@/models/JobApplication";
import JobAd from "@/models/JobAd";
import { recordActivity } from "@/lib/activityService";

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

    const jobForWithdraw = await JobAd.findById(app.jobId).select("postedBy title slug").catch(() => null);
    const employerIdWithdraw = jobForWithdraw?.postedBy as any;

    recordActivity({
      actorId: authUser.userObjectId,
      actorEmail: authUser.user.email || "",
      actorName: authUser.user.name || "",
      type: "application_withdrawn",
      title: `Withdrew application for ${jobForWithdraw?.title || "a job"}`,
      detail: `Withdrew application for ${jobForWithdraw?.title || "a job"}`,
      entityType: "jobApplication",
      entityId: app._id as any,
      metadata: { jobId: String(app.jobId), applicationId: String(app._id), jobTitle: jobForWithdraw?.title || "" },
      notifyRecipientIds: employerIdWithdraw ? [employerIdWithdraw] : [],
      notificationType: "application_withdrawn",
      notificationBody: `${authUser.user.name || authUser.user.email || "An applicant"} withdrew from ${jobForWithdraw?.title || "a job"}`,
      notificationLink: jobForWithdraw?.slug ? `/jobs/${jobForWithdraw.slug}` : "",
    }).catch((err) => console.error("Failed to record application_withdrawn:", err));

    return NextResponse.json({ success: true, application: app });
  } catch (error: any) {
    console.error("Withdraw error:", error);
    return NextResponse.json({ error: error.message || "Failed to withdraw" }, { status: 500 });
  }
}
