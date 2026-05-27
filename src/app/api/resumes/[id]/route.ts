import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Resume from '@/models/Resume';
import { getAuthenticatedUser, buildResumeOwnerQuery } from '@/lib/authUser';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    if (id === 'new') {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    const ownerQuery = buildResumeOwnerQuery(authUser.userObjectId, authUser.legacyUserId);
    const resume = await Resume.findOne({ _id: id, ...ownerQuery });

    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    if (resume && !resume.user) {
      resume.user = authUser.userObjectId;
      await resume.save();
    }

    return NextResponse.json(resume);
  } catch (error) {
    console.error('Error fetching resume:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, template } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    await dbConnect();
    const ownerQuery = buildResumeOwnerQuery(authUser.userObjectId, authUser.legacyUserId);
    const resume = await Resume.findOneAndUpdate(
      { _id: id, ...ownerQuery },
      {
        title,
        content,
        template: template || "template1",
        user: authUser.userObjectId,
        userId: authUser.legacyUserId || String(authUser.userObjectId),
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    return NextResponse.json(resume);
  } catch (error) {
    console.error('Error updating resume:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const ownerQuery = buildResumeOwnerQuery(authUser.userObjectId, authUser.legacyUserId);
    const resume = await Resume.findOneAndDelete({ _id: id, ...ownerQuery });

    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Resume deleted successfully' });
  } catch (error) {
    console.error('Error deleting resume:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}