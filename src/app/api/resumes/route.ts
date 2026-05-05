import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/db';
import Resume from '@/models/Resume';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const resumes = await Resume.find({ userId }).sort({ updatedAt: -1 });
    return NextResponse.json(resumes);
  } catch (error) {
    console.error('Error fetching resumes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, template } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    await dbConnect();
    const resume = new Resume({
      userId,
      title,
      template: template || 'template1',
      content,
    });

    const savedResume = await resume.save();
    return NextResponse.json({id: savedResume._id, content: savedResume.content, status: 201 });
  } catch (error) {
    console.error('Error creating resume:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}