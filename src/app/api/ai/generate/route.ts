import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateSummary, generateExperienceBulletPoints, improveSummary, generateSkillsSuggestions } from '@/lib/ai';

interface GenerateBody {
  type: string;
  data: {
    jobTitle?: string;
    experience?: string;
    skills?: string[];
    company?: string;
    role?: string;
    description?: string;
    summary?: string;
    achivements?: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: GenerateBody = await request.json();
    const { type, data } = body;

    let result: string | string[];

    switch (type) {
      case 'generateSummary':
        result = await generateSummary(data.jobTitle || '', data.experience || '3', data.skills || [], data.achivements || []);
        break;
      case 'generateBulletPoints':
        result = await generateExperienceBulletPoints(data.company || '', data.role || '', data.description || '');
        break;
      case 'improveSummary':
        result = await improveSummary(data.summary || '');
        break;
      case 'generateSkills':
        result = await generateSkillsSuggestions(data.jobTitle || '');
        break;
      default:
        return NextResponse.json({ error: 'Invalid generation type' }, { status: 400 });
    }

    if (result==="error") {
      return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });
    }
    
    return NextResponse.json({ result });
  } catch (error) {
    console.error('AI Generation error:', error);
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });
  }
}
