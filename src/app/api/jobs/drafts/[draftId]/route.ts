import { NextResponse } from "next/server";
import { Types } from "mongoose";
import dbConnect from "@/lib/db";
import JobAd from "@/models/JobAd";
import DraftJobApplication from "@/models/DraftJobApplication";
import { getAuthenticatedUser } from "@/lib/authUser";
import { InputExtractionError } from "@/lib/inputExtraction";
import { parseDraftUpdateBody } from "@/lib/draftApplicationInput";
import { recordActivity } from "@/lib/activityService";

void JobAd;
void DraftJobApplication;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ draftId: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: "Please log in to continue" }, { status: 401 });
    }

    const { draftId } = await params;
    if (!Types.ObjectId.isValid(draftId)) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    await dbConnect();

    const draft = await DraftJobApplication.findOne({
      _id: new Types.ObjectId(draftId),
      applicantId: authUser.userObjectId,
    });

    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    let input;
    try {
      const body: unknown = await req.json();
      input = parseDraftUpdateBody(body);
    } catch (error) {
      if (error instanceof InputExtractionError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    let jobTitle = "a job";
    if (input.screeningAnswers !== undefined) {
      const job = await JobAd.findById(draft.jobId).select("screeningQuestions title");
      if (job) {
        const knownIds = new Set(
          ((job.screeningQuestions || []) as { id: string }[]).map((q) => String(q.id))
        );
        const unknown = input.screeningAnswers.find((a) => !knownIds.has(a.questionId));
        if (unknown) {
          return NextResponse.json({ error: `Unknown question: ${unknown.question}` }, { status: 400 });
        }
        if (job.title) jobTitle = job.title;
      }
      draft.screeningAnswers = input.screeningAnswers;
    }

    if (input.tailoredResumeId !== undefined) {
      draft.tailoredResumeId = input.tailoredResumeId;
    }

    draft.currentStep = input.currentStep ?? 2;
    await draft.save();

    if (input.screeningAnswers !== undefined) {
      recordActivity({
        actorId: authUser.userObjectId,
        actorEmail: authUser.user.email || "",
        actorName: authUser.user.name || "",
        type: "application_started",
        title: `Completed step 2 of ${jobTitle} application`,
        detail: `Answered screening questions for ${jobTitle}`,
        entityType: "jobAd",
        entityId: draft.jobId as Types.ObjectId,
        metadata: {
          jobId: String(draft.jobId),
          jobTitle,
          draftId: String(draft._id),
          step: 2,
        },
      }).catch((err) => console.error("Failed to record application_started:", err));
    }

    return NextResponse.json({
      success: true,
      draft: {
        _id: String(draft._id),
        currentStep: draft.currentStep,
      },
    });
  } catch (error: unknown) {
    if (error instanceof InputExtractionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error updating draft application:", error);
    return NextResponse.json({ error: "Failed to save draft" }, { status: 500 });
  }
}
