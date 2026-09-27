import "server-only";

import type { AiRequestContext } from "./context";
import { assertApiKey } from "./client";
import { callGroqVision } from "./groqCalls";

export async function extractTextFromSingleImage(
  dataUrl: string,
  ctx: AiRequestContext
): Promise<string> {
  assertApiKey();
  return callGroqVision(
    "Extract all readable resume/CV text from this image. Preserve section headings, dates, contact details, skills, and bullet points. Return only the extracted text.",
    dataUrl,
    "vision_extract_resume",
    ctx
  );
}

export async function extractResumeTextFromImages(
  dataUrls: string[],
  ctx: AiRequestContext
): Promise<string> {
  assertApiKey();
  if (dataUrls.length === 0) return "";

  // Process images 2 at a time — the vision model extracts best from ≤2 images per call
  const chunkSize = 2;
  const results: string[] = [];

  for (let i = 0; i < dataUrls.length; i += chunkSize) {
    const chunk = dataUrls.slice(i, i + chunkSize);
    const texts = await Promise.all(chunk.map((dataUrl) => extractTextFromSingleImage(dataUrl, ctx)));
    results.push(...texts);
  }

  return results.filter(Boolean).join("\n\n");
}

export async function extractResumeTextFromImage(
  dataUrl: string,
  ctx: AiRequestContext
): Promise<string> {
  return extractTextFromSingleImage(dataUrl, ctx);
}

export async function extractTextFromJobImage(
  dataUrl: string,
  ctx: AiRequestContext
): Promise<string> {
  assertApiKey();
  return callGroqVision(
    "Extract all readable text from this job description / job posting image. Preserve job title, responsibilities, requirements, and keywords. Return only the extracted text.",
    dataUrl,
    "vision_extract_job",
    ctx
  );
}
