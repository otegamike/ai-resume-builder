import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import Resume from '@/models/Resume';
import { getAuthenticatedUser, buildResumeOwnerQuery } from '@/lib/authUser';
import { templateDefinitions } from "@/lib/templateCatalog";
import { getRandomTemplateId } from "@/utils/templateUtils";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const ownerQuery = buildResumeOwnerQuery(authUser.userObjectId, authUser.legacyUserId);
    const resumes = await Resume.find(ownerQuery).sort({ updatedAt: -1 });
    await Resume.updateMany({ ...ownerQuery, user: { $exists: false } }, { $set: { user: authUser.userObjectId } });

    const eTag = crypto.createHash('md5').update(JSON.stringify(resumes)).digest('hex');
    const clientETag = request.headers.get('if-none-match');

    if (clientETag === `"${eTag}"`) {
      return new NextResponse(null, { status: 304 });
    }

    return NextResponse.json(resumes, {
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
    const savedResumeObj = savedResume.toObject();
    return NextResponse.json(savedResumeObj, { status: 201 });
  } catch (error) {
    console.error('Error creating resume:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}