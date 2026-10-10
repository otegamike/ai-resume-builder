import { NextResponse } from "next/server";
import { Types } from "mongoose";
import dbConnect from "@/lib/db";
import JobApplication from "@/models/JobApplication";
import JobAd from "@/models/JobAd";
import User from "@/models/User";
import Company from "@/models/Company";
import { getAuthenticatedUser } from "@/lib/authUser";
import {
  aiContextFromAuthUser,
  generateCandidateMessage,
  GroqCallError,
  toAiErrorResponse,
} from "@/lib/ai";
import { canComposeMessages } from "@/lib/email/permissions";

void JobApplication;
void JobAd;
void User;
void Company;

/**
 * Draft a candidate message with AI. Admin-only, free (no credit deduction).
 * Body carries the application id only; everything else loads server-side.
 */
export async function POST(req: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canComposeMessages(authUser.session?.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: unknown = await req.json().catch(() => null);
    const applicationId =
      body && typeof body === "object" && "applicationId" in body
        ? String((body as { applicationId: unknown }).applicationId ?? "")
        : "";
    if (!applicationId || !Types.ObjectId.isValid(applicationId)) {
      return NextResponse.json({ error: "Valid applicationId is required" }, { status: 400 });
    }

    await dbConnect();
    const application = await JobApplication.findById(applicationId);
    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const [candidate, job] = await Promise.all([
      User.findById(application.applicantId).select("name email").lean(),
      JobAd.findById(application.jobId)
        .select("title description companyId postedBy")
        .populate("companyId", "name")
        .lean(),
    ]);
    const jobDoc = job as unknown as {
      title?: string;
      description?: string;
      postedBy?: unknown;
      companyId?: { name?: string } | null;
    } | null;
    const companyName =
      jobDoc?.companyId && typeof jobDoc.companyId === "object"
        ? jobDoc.companyId.name || "a company"
        : "a company";

    const ctx = aiContextFromAuthUser(authUser);
    const draft = await generateCandidateMessage(
      candidate?.name || "there",
      jobDoc?.title || "an open role",
      companyName,
      String(application.status || "under_review").replace(/_/g, " "),
      jobDoc?.description || "",
      ctx
    );

    if (!draft.subject || !draft.body) {
      return NextResponse.json({ error: "The AI draft came back empty. Try again." }, { status: 502 });
    }

    // Powers the "use job poster's email" chip; display-only hint for admins.
    let posterEmail = "";
    try {
      if (jobDoc?.postedBy) {
        const poster = await User.findById(jobDoc.postedBy).select("email").lean();
        posterEmail = String(poster?.email || "").trim();
      }
    } catch {
      posterEmail = "";
    }
    return NextResponse.json({ subject: draft.subject, body: draft.body, posterEmail });
  } catch (error: unknown) {
    if (error instanceof GroqCallError) {
      const { status, error: message } = toAiErrorResponse(error, "Failed to draft message");
      return NextResponse.json({ error: message }, { status });
    }
    console.error("Error generating candidate message:", error);
    return NextResponse.json({ error: "Failed to draft message" }, { status: 500 });
  }
}
