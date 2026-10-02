import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import Resume from '@/models/Resume';
import UploadedResume from '@/models/UploadedResume';
import { getAuthenticatedUser, buildResumeOwnerQuery } from '@/lib/authUser';
import { templateDefinitions } from "@/lib/templateCatalog";
import { getRandomTemplateId } from "@/utils/templateUtils";
import { recordActivity } from "@/lib/activityService";
import { toUploadedResumeListItem } from '@/lib/extractionService';

void UploadedResume;

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const listType = request.nextUrl.searchParams.get('type');
    const wantSaved = listType !== 'uploaded';
    const wantUploaded = listType !== 'saved';

    await dbConnect();
    const ownerQuery = buildResumeOwnerQuery(authUser.userObjectId, authUser.legacyUserId);
    const resumes = wantSaved ? await Resume.find(ownerQuery).sort({ updatedAt: -1 }) : [];
    if (wantSaved) {
      await Resume.updateMany({ ...ownerQuery, user: { $exists: false } }, { $set: { user: authUser.userObjectId } });
    }

    let uploadedResumes: ReturnType<typeof toUploadedResumeListItem>[] = [];
    if (wantUploaded) {
      const docs = (await UploadedResume.find({ userId: authUser.userObjectId })
        .sort({ updatedAt: -1 })
        .populate('resumeId', 'title')
        .lean()) as unknown as {
        _id: unknown;
        title?: unknown;
        pages?: unknown;
        userId?: unknown;
        fileHash?: unknown;
        extractionVersion?: unknown;
        status?: unknown;
        pageCount?: unknown;
        resumeId?: { title?: unknown } | null;
      }[];
      uploadedResumes = docs.map((doc) =>
        toUploadedResumeListItem({
          _id: doc._id as Types.ObjectId,
          title: typeof doc.title === 'string' ? doc.title : '',
          pages: Array.isArray(doc.pages) ? doc.pages as string[] : [],
          userId: doc.userId as Types.ObjectId | undefined,
          fileHash: typeof doc.fileHash === 'string' ? doc.fileHash : undefined,
          extractionVersion: typeof doc.extractionVersion === 'string' ? doc.extractionVersion : undefined,
          status: typeof doc.status === 'string' ? doc.status : undefined,
          pageCount: typeof doc.pageCount === 'number' ? doc.pageCount : undefined,
          resumeTitle: typeof doc.resumeId?.title === 'string' ? doc.resumeId.title : undefined,
        })
      );
    }

    const payload = { resumes, uploadedResumes };

    const eTag = crypto.createHash('md5').update(JSON.stringify(payload)).digest('hex');
    const clientETag = request.headers.get('if-none-match');

    if (clientETag === `"${eTag}"`) {
      return new NextResponse(null, { status: 304 });
    }

    return NextResponse.json(payload, {
      headers: {
        'ETag': `"${eTag}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error fetching resumes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, template } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    await dbConnect();
    const resume = new Resume({
      userId: authUser.legacyUserId || String(authUser.userObjectId),
      user: authUser.userObjectId,
      title,
      template: template || getRandomTemplateId(templateDefinitions),
      content,
    });

    const savedResume = await resume.save();

    recordActivity({
      actorId: authUser.userObjectId,
      actorEmail: authUser.user.email || "",
      actorName: authUser.user.name || "",
      type: "resume_created",
      title: `Created resume "${title}"`,
      detail: `Created resume "${title}"`,
      entityType: "resume",
      entityId: savedResume._id as any,
      metadata: { title },
    }).catch((err) => console.error("Failed to record resume_created:", err));

    const savedResumeObj = savedResume.toObject();
    return NextResponse.json(savedResumeObj, { status: 201 });
  } catch (error) {
    console.error('Error creating resume:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}