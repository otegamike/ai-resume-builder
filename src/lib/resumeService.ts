import "server-only";

import { Types } from "mongoose";
import dbConnect from "@/lib/db";
import Resume from "@/models/Resume";
import type { IResume } from "@/models/Resume";
import { templateDefinitions } from "@/lib/templateCatalog";
import { getRandomTemplateId } from "@/utils/templateUtils";
import { emptyResumeContent, parseResumeContent } from "@/lib/ai";
import type { ResumeContent } from "@/types/ResumeData";

void Resume;

export type AuthUserShape = {
  userObjectId: Types.ObjectId;
  legacyUserId: string;
};

export interface CreateResumeParams {
  authUser: AuthUserShape;
  title: string;
  content: ResumeContent;
  template?: string;
}

export async function createResume(params: CreateResumeParams): Promise<IResume & { _id: Types.ObjectId }> {
  const { authUser, title, content, template } = params;

  await dbConnect();

  const resolvedTemplate = template ?? getRandomTemplateId(templateDefinitions);

  const resume = new Resume({
    userId: authUser.legacyUserId || String(authUser.userObjectId),
    user: authUser.userObjectId,
    title,
    template: resolvedTemplate,
    content,
  });

  const saved = await resume.save();
  return saved as unknown as IResume & { _id: Types.ObjectId };
}

export interface CreateResumeFromExtractedTextParams {
  authUser: AuthUserShape;
  extractedText: string;
  title?: string;
  template?: string;
}

export async function createResumeFromExtractedText(
  params: CreateResumeFromExtractedTextParams
): Promise<IResume & { _id: Types.ObjectId }> {
  const { authUser, extractedText, title, template } = params;

  let parsedContent: ResumeContent | null = null;
  try {
    parsedContent = await parseResumeContent(extractedText);
  } catch {
    parsedContent = null;
  }

  const resolvedTitle = title ?? `Imported Resume - ${new Date().toLocaleDateString()}`;
  const resolvedContent = parsedContent ?? { ...emptyResumeContent };

  return createResume({
    authUser,
    title: resolvedTitle,
    content: resolvedContent,
    template,
  });
}
