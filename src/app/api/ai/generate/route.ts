import { NextRequest, NextResponse } from 'next/server';
import { aiContextFromAuthUser, generateSummary, generateExperienceBulletPoints, improveSummary, generateSkillsSuggestions, generateCategorizedSkills, categorizeExistingSkills, generateBlogMeta } from '@/lib/ai';
import { getAuthenticatedUser } from '@/lib/authUser';
import { deductCredits } from '@/lib/creditUtils';
import type { AiFeature } from '@/lib/creditCosts';
import { handleApiError } from "@/lib/api/handleApiError";
import { withApiHandler } from "@/lib/api/withApiHandler";

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
    content?: string;
  };
}

const FEATURE_MAP: Record<string, AiFeature> = {
  generateSummary: 'generateSummary',
  generateBulletPoints: 'generateBulletPoints',
  improveSummary: 'improveSummary',
  generateSkills: 'generateSkills',
  generateCategorizedSkills: 'generateCategorizedSkills',
  categorizeExistingSkills: 'categorizeExistingSkills',
  generateBlogMeta: 'generateBlogMeta',
};

export const POST = withApiHandler(
  async (request: NextRequest) => {
    try {
      const authUser = await getAuthenticatedUser();
      if (!authUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const body: GenerateBody = await request.json();
      const { type, data } = body;

      const feature = FEATURE_MAP[type];
      if (!feature) {
        return NextResponse.json({ error: 'Invalid generation type' }, { status: 400 });
      }

      const newAiCredits = await deductCredits(String(authUser.userObjectId), feature);
      const ctx = aiContextFromAuthUser(authUser);

      let result: any;

      switch (type) {
        case 'generateSummary':
          result = await generateSummary(data.jobTitle || '', data.experience || '3', data.skills || [], data.achivements || [], ctx);
          break;
        case 'generateBulletPoints':
          result = await generateExperienceBulletPoints(data.company || '', data.role || '', data.description || '', ctx);
          break;
        case 'improveSummary':
          result = await improveSummary(data.summary || '', ctx);
          break;
        case 'generateSkills':
          result = await generateSkillsSuggestions(data.jobTitle || '', ctx);
          break;
        case 'generateCategorizedSkills':
          result = await generateCategorizedSkills(data.jobTitle || '', ctx);
          break;
        case 'categorizeExistingSkills':
          result = await categorizeExistingSkills(data.skills || [], ctx);
          break;
        case 'generateBlogMeta':
          if (!authUser.session?.user?.isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
          }
          result = await generateBlogMeta(data.content || '', ctx);
          break;
      }

      if (result==="error") {
        return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });
      }
    
      return NextResponse.json({ result, newAiCredits });
    } catch (error) {
      return handleApiError(error, { route: "/api/ai/generate", flow: "ai" });
    }
  },
  { route: "/api/ai/generate", flow: "ai" }
);
