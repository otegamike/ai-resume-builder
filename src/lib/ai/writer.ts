import "server-only";

import type { AiRequestContext } from "./context";
import { ATS_SYSTEM_INSTRUCTION, assertApiKey } from "./client";
import { callGroq } from "./groqCalls";
import { parseJsonArray } from "./json";

export async function generateWithAI(prompt: string, ctx: AiRequestContext): Promise<string> {
  assertApiKey();
  const { content } = await callGroq(prompt, { feature: "generate_with_ai", ctx });
  return content;
}

export async function generateSummary(
  jobTitle: string,
  experience: string,
  skills: string[],
  achievements: string[],
  ctx: AiRequestContext
): Promise<string> {
  const { content } = await callGroq(
    `Write a one-sentence professional summary for a ${jobTitle} with ${experience} years of experience. Skills: ${skills.join(", ")}. Key achievements:\n- ${achievements.join("\n- ")}\n\nReturn only the summary sentence.`,
    { feature: "generate_summary", ctx }
  );
  return content;
}

export async function generateExperienceBulletPoints(
  company: string,
  role: string,
  description: string,
  ctx: AiRequestContext
): Promise<string[]> {
  const { content } = await callGroq(
    `Transform this job description into 3 impactful ATS-friendly bullet points.\nCompany: ${company}\nRole: ${role}\nDescription: ${description}\n\nUse action verbs and quantify achievements. Return only the 3 bullet points, one per line, no dashes or bullets prefix.`,
    { feature: "generate_bullet_points", ctx }
  );
  return content
    .split("\n")
    .map((s) => s.trim().replace(/^[-•–—*]\s*/, ""))
    .filter((s) => s.length > 0)
    .slice(0, 3);
}

export async function improveSummary(
  existingSummary: string,
  ctx: AiRequestContext
): Promise<string> {
  const { content } = await callGroq(
    `Improve this professional summary to be more impactful and ATS-friendly. Keep it one sentence.\n\n${existingSummary}\n\nReturn only the improved summary.`,
    { feature: "improve_summary", ctx }
  );
  return content;
}

export async function generateSkillsSuggestions(
  jobTitle: string,
  ctx: AiRequestContext
): Promise<string[]> {
  const { content } = await callGroq(
    `List 8-10 relevant technical and soft skills for a ${jobTitle}. Return only a comma-separated list, no explanations.`,
    { feature: "generate_skills", ctx }
  );
  return content
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export async function generateCategorizedSkills(
  jobTitle: string,
  ctx: AiRequestContext
): Promise<{ category: string; skills: string[] }[]> {
  const { content } = await callGroq(
    `Generate 3-5 categories of skills for a ${jobTitle} with 3-5 skills each.
     Return ONLY a valid JSON array of objects with keys "category" and "skills" (array of strings).
     No markdown, no explanation.`,
    {
      temperature: 0.1,
      maxTokens: 2048,
      systemInstruction: ATS_SYSTEM_INSTRUCTION,
      feature: "generate_categorized_skills",
      ctx,
    }
  );
  return parseJsonArray<{ category: string; skills: string[] }>(content);
}

export async function categorizeExistingSkills(
  skills: string[],
  ctx: AiRequestContext
): Promise<{ category: string; skills: string[] }[]> {
  if (skills.length === 0) return [];

  const { content } = await callGroq(
    `Group these skills into 2-4 logical categories:
     ${skills.join(", ")}

     Rules:
     - Use EVERY skill from the list. Do not leave any out.
     - Do NOT add any new skills not in the list.
     - Each skill must appear in exactly one category.
     - Categories must be meaningful (e.g. "Frontend", "Backend", "DevOps", "Soft Skills", "Languages", etc.).
     - If only 1-2 skills fit a category, that's fine.
     Return ONLY a valid JSON array of objects with keys "category" and "skills" (array of strings).
     No markdown, no explanation.`,
    {
      temperature: 0.1,
      maxTokens: 2048,
      systemInstruction: ATS_SYSTEM_INSTRUCTION,
      feature: "categorize_skills",
      ctx,
    }
  );

  const parsed = parseJsonArray<{ category: string; skills: string[] }>(content);

  const allCategorized = parsed.flatMap(c => c.skills);
  const missing = skills.filter(s => !allCategorized.includes(s));
  if (missing.length > 0) {
    parsed.push({ category: "Other", skills: missing });
  }

  return parsed;
}
