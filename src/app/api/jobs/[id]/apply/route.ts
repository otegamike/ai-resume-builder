import { NextResponse } from "next/server";
import { after } from "next/server";
import { Types } from "mongoose";
import dbConnect from "@/lib/db";
import JobAd from "@/models/JobAd";
import JobApplication from "@/models/JobApplication";
import DraftJobApplication from "@/models/DraftJobApplication";
import Company from "@/models/Company";
import Resume from "@/models/Resume";
import UploadedResume from "@/models/UploadedResume";
import User from "@/models/User";
import { getAuthenticatedUser } from "@/lib/authUser";
import { InputExtractionError } from "@/lib/inputExtraction";
import { parseJobApplyBody } from "@/lib/jobApplyInput";
import type { JobApplyPayload } from "@/types/JobApplyInput";
import { IUploadedResumeDocument } from "@/models/UploadedResume";
import { recordActivity } from "@/lib/activityService";
import Notification from "@/models/Notification";
import { enqueue, dedupeKeys } from "@/lib/email/dispatcher";
import { drainOutbox } from "@/lib/email/drain";
import { appUrl } from "@/lib/email/site";

void JobAd;
void JobApplication;
void DraftJobApplication;
void Company;
void Resume;
void UploadedResume;
void Notification;
void User;

type ScreeningQuestion = { required: boolean; id: string; question: string };

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

    const existing = await JobApplication.findOne({
      jobId: job._id,
      applicantId: authUser.userObjectId,
    });

    if (existing) {
      return NextResponse.json(
        { error: "You have already submitted an application for this position" },
        { status: 400 }
      );
    }

    let payload: JobApplyPayload;
    try {
      const body: unknown = await req.json();
      payload = parseJobApplyBody(body);
    } catch (error) {
      if (error instanceof InputExtractionError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { resume, jobMatchAnalysis: normalizedJobMatchAnalysis, screeningAnswers: normalizedScreeningAnswers, coverLetterText, source } = payload;
    const questions = (job.screeningQuestions || []) as ScreeningQuestion[];
    const knownQuestionIds = new Set(questions.map((question) => String(question.id)));
    const unknownAnswer = normalizedScreeningAnswers.find((answer) => !knownQuestionIds.has(answer.questionId));
    if (unknownAnswer) {
      return NextResponse.json({ error: `Unknown question: ${unknownAnswer.question}` }, { status: 400 });
    }

    if (source === "platform") {
      const missingRequiredQuestion = questions.find((question) => {
        if (!question.required) return false;
        const matchingAnswer = normalizedScreeningAnswers.find(
          (answer) => answer.questionId === question.id
        );
        return !matchingAnswer?.answer.trim();
      });

      if (missingRequiredQuestion) {
        return NextResponse.json(
          { error: `Please answer: ${missingRequiredQuestion.question}` },
          { status: 400 }
        );
      }
    }

    let resumeDoc: { _id: Types.ObjectId; title: string; template: string; content: unknown; updatedAt: string } | null = null;
    let uploadedResumeDoc: { _id: Types.ObjectId; resumeId: Types.ObjectId; pages: string[] } | null = null;

    if (resume.resumeType === "uploaded") {
      const cachedResume: IUploadedResumeDocument | null = await UploadedResume.findOne({
        _id: resume.uploadedResumeId,
        userId: authUser.userObjectId,
        status: "done",
      });
      if (!cachedResume || !cachedResume.parsedResume || !cachedResume.resumeId) {
        return NextResponse.json({ error: "Selected resume is no longer available. Please select it again." }, { status: 400 });
      }
      const pages = (cachedResume.pages as string[]) ?? [];
      const linkedResume = await Resume.findById(cachedResume.resumeId).select("template");
      if (!linkedResume) {
        return NextResponse.json({ error: "Selected resume is no longer available. Please select it again." }, { status: 400 });
      }

      resumeDoc = {
        _id: cachedResume.resumeId,
        title: cachedResume.title || `uploaded-resume-${cachedResume._id.toString()}`,
        template: linkedResume.template,
        content: cachedResume.parsedResume,
        updatedAt: new Date().toISOString(),
      };

      uploadedResumeDoc = {
        _id: cachedResume._id,
        resumeId: cachedResume.resumeId,
        pages,
      };
    } else {
      const savedResume = await Resume.findOne({
        _id: resume.resumeId,
        $or: [
          { user: authUser.userObjectId },
          { userId: authUser.legacyUserId },
          { userId: String(authUser.userObjectId) },
        ],
      });
      if (!savedResume) {
        return NextResponse.json({ error: "Resume not found" }, { status: 404 });
      }
      resumeDoc = {
        _id: savedResume._id,
        title: savedResume.title,
        template: savedResume.template,
        content: savedResume.content,
        updatedAt: savedResume.updatedAt ? new Date(savedResume.updatedAt).toISOString() : new Date().toISOString(),
      };
    }

    const companyId = (job.companyId as unknown as { _id: Types.ObjectId })?._id || job.companyId;

    const doc: Record<string, unknown> = {
      jobId: job._id,
      applicantId: authUser.userObjectId,
      companyId,
      status: "submitted",
      resumeType: resume.resumeType,
      resume: resumeDoc,
      jobMatchAnalysis: normalizedJobMatchAnalysis,
      coverLetterText,
      screeningAnswers: normalizedScreeningAnswers,
      source,
    };

    if (uploadedResumeDoc) {
      doc.uploadedResume = uploadedResumeDoc;
    }

    const newApplication = await JobApplication.create(doc);

    await JobAd.updateOne({ _id: job._id }, { $inc: { applicationsCount: 1 } });

    // The application is complete, so any unfinished draft for this job is removed.
    // A cleanup failure must never fail the application itself.
    try {
      await DraftJobApplication.deleteOne({
        jobId: job._id,
        applicantId: authUser.userObjectId,
      });
    } catch (err) {
      console.error("Failed to delete draft application:", err);
    }

    const employerId = (job.postedBy as unknown as Types.ObjectId) || null;
    const applicantName = authUser.user.name || authUser.user.email || "Someone";
    const companyName =
      (job.companyId as unknown as { name?: string })?.name || "a company";
    const jobTitle = job.title || "a job";

    const perRecipientNotifications: Array<{
      recipientId: Types.ObjectId;
      type: "application_submitted";
      title: string;
      body: string;
      link: string;
    }> = [];

    if (employerId) {
      perRecipientNotifications.push({
        recipientId: employerId as Types.ObjectId,
        type: "application_submitted",
        title: `${applicantName} applied for ${jobTitle}`,
        body: `${applicantName} applied for ${jobTitle}`,
        link: `/dashboard/employers/job/${String(job._id)}`,
      });
    }

    perRecipientNotifications.push({
      recipientId: authUser.userObjectId,
      type: "application_submitted",
      title: `Application sent for ${jobTitle}`,
      body: `Your job application to ${jobTitle} has been sent and is under review.`,
      link: `/dashboard/jobs?tab=history`,
    });

    let activityId: Types.ObjectId | undefined;
    try {
      const activity = await recordActivity({
        actorId: authUser.userObjectId,
        actorEmail: authUser.user.email || "",
        actorName: authUser.user.name || "",
        type: "application_submitted",
        title: `${applicantName} applied to ${jobTitle}`,
        detail: `${applicantName} applied to ${jobTitle} at ${companyName}`,
        entityType: "jobApplication",
        entityId: newApplication._id as Types.ObjectId,
        metadata: {
          jobId: String(job._id),
          jobTitle,
          companyId: String(companyId),
          companyName,
          applicationId: String(newApplication._id),
          slug: job.slug,
        },
        notificationType: "application_submitted",
        perRecipientNotifications,
      });
      activityId = activity?._id as Types.ObjectId | undefined;
    } catch (err) {
      console.error("Failed to record application_submitted:", err);
    }

    // Transactional application emails. Runs after the response; a failure
    // here must never fail the application itself.
    try {
      const applicationId = String(newApplication._id);
      const base = appUrl();

      await enqueue({
        type: "application-submitted",
        to: authUser.user.email || "",
        userId: authUser.userObjectId,
        payload: {
          applicantName,
          jobTitle,
          companyName,
          historyUrl: `${base}/dashboard/jobs?tab=history`,
        },
        dedupeKey: dedupeKeys.applicationSubmitted(applicationId),
        relatedActivityId: activityId,
      });

      // Employer alerts go out for on-platform applications only.
      // External-link and email-type jobs are completed off the platform.
      if (job.applicationType === "on_platform" && employerId) {
        const contactEmail = String(job.contactEmail || "").trim();
        let employerEmail = contactEmail;
        let employerUserId: Types.ObjectId | undefined;
        if (!employerEmail) {
          const employer = await User.findById(employerId).select("email").lean();
          employerEmail = String(employer?.email || "").trim();
          if (employerEmail) employerUserId = employerId as Types.ObjectId;
        }
        if (employerEmail) {
          await enqueue({
            type: "application-received",
            to: employerEmail,
            userId: employerUserId,
            payload: {
              applicantName,
              jobTitle,
              companyName,
              reviewUrl: `${base}/dashboard/employers/job/${String(job._id)}`,
            },
            dedupeKey: dedupeKeys.applicationReceived(applicationId),
            relatedActivityId: activityId,
          });
        }
      }

      after(() => {
        drainOutbox({ limit: 5 }).catch((err) => console.error("Apply email drain failed:", err));
      });
    } catch (err) {
      console.error("Apply email enqueue failed:", err);
    }

    let unreadCount: number | undefined;
    try {
      unreadCount = await Notification.countDocuments({
        recipientId: authUser.userObjectId,
        isRead: false,
      });
    } catch {}

    return NextResponse.json(
      {
        success: true,
        application: newApplication,
        message: "Application submitted successfully!",
        unreadCount,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    if (err?.code === 11000) {
      return NextResponse.json({ error: "You have already submitted an application for this position" }, { status: 400 });
    }
    if (error instanceof InputExtractionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error submitting job application:", error);
    const message = err?.message || "Failed to submit application";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
