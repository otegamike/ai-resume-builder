import { NextResponse } from "next/server";
import { Types } from "mongoose";
import dbConnect from "@/lib/db";
import JobAd from "@/models/JobAd";
import JobApplication from "@/models/JobApplication";
import DraftJobApplication from "@/models/DraftJobApplication";
import Company from "@/models/Company";
import { getAuthenticatedUser } from "@/lib/authUser";
import { InputExtractionError } from "@/lib/inputExtraction";
import { parseDraftCreateBody, toClientDraftApplication } from "@/lib/draftApplicationInput";
import { recordActivity } from "@/lib/activityService";

void JobAd;
void JobApplication;
void DraftJobApplication;
void Company;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: "Please log in to continue" }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const submitted = await JobApplication.findOne({
      jobId: new Types.ObjectId(id),
      applicantId: authUser.userObjectId,
    }).select("_id");

    if (submitted) {
      return NextResponse.json({ draft: null, alreadyApplied: true });
    }

    const draft = await DraftJobApplication.findOne({
      jobId: new Types.ObjectId(id),
      applicantId: authUser.userObjectId,
    });

    return NextResponse.json({
      draft: draft ? toClientDraftApplication(draft) : null,
      alreadyApplied: false,
    });
  } catch (error: unknown) {
    console.error("Error fetching draft application:", error);
    return NextResponse.json({ error: "Failed to load draft" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: "Please log in to apply for this position" }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const job = await JobAd.findById(id).populate("companyId", "name");
    if (!job || job.status !== "active") {
      return NextResponse.json({ error: "This job listing is no longer active" }, { status: 404 });
    }

    const submitted = await JobApplication.findOne({
      jobId: job._id,
      applicantId: authUser.userObjectId,
    }).select("_id");

    if (submitted) {
      return NextResponse.json(
        { error: "You have already submitted an application for this position" },
        { status: 400 }
      );
    }

    let input;
    try {
      const body: unknown = await req.json();
      input = parseDraftCreateBody(body);
    } catch (error) {
      if (error instanceof InputExtractionError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const companyId = (job.companyId as unknown as { _id: Types.ObjectId })?._id || job.companyId;

    const draft = await DraftJobApplication.findOneAndUpdate(
      { jobId: job._id, applicantId: authUser.userObjectId },
      {
        $set: {
          companyId,
          resume: input.resume,
          jobMatchAnalysis: input.jobMatchAnalysis,
          ...(input.tailoredResumeId ? { tailoredResumeId: input.tailoredResumeId } : {}),
        },
        $setOnInsert: { currentStep: 1 },
      },
      { new: true, upsert: true }
    );

    if (typeof input.currentStep === "number" && input.currentStep > draft.currentStep) {
      draft.currentStep = input.currentStep;
      await draft.save();
    }

    const jobTitle = job.title || "a job";
    recordActivity({
      actorId: authUser.userObjectId,
      actorEmail: authUser.user.email || "",
      actorName: authUser.user.name || "",
      type: "application_started",
      title: `Completed step 1 of ${jobTitle} application`,
      detail: `Started an application for ${jobTitle}`,
      entityType: "jobAd",
      entityId: job._id as Types.ObjectId,
      metadata: {
        jobId: String(job._id),
        jobTitle,
        draftId: String(draft._id),
        step: 1,
      },
    }).catch((err) => console.error("Failed to record application_started:", err));

    return NextResponse.json({ success: true, draft: toClientDraftApplication(draft) }, { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    if (err?.code === 11000) {
      return NextResponse.json(
        { error: "You have already submitted an application for this position" },
        { status: 400 }
      );
    }
    if (error instanceof InputExtractionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error saving draft application:", error);
    return NextResponse.json({ error: "Failed to save draft" }, { status: 500 });
  }
}
