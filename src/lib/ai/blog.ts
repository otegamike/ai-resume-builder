import "server-only";

import type { AiRequestContext } from "./context";
import { assertApiKey } from "./client";
import { callGroq } from "./groqCalls";
import { parseJsonObject } from "./json";

const BLOG_META_SYSTEM_INSTRUCTION =
  "You are an expert content marketer for a resume-building SaaS blog. You ONLY output raw valid JSON. Never use markdown code fences. Never add explanations before or after the JSON object. Your entire response must be parseable by JSON.parse().";

const BLOG_META_PROMPT = (content: string) => `
You are writing SEO metadata for a blog post about AI resume building and job searching.

Given the blog post content below, generate:

- "title": A compelling, SEO-friendly blog title under 60 characters.
- "excerpt": A 1-2 sentence summary under 160 characters, perfect for a meta description.
- "tags": An array of 3-5 relevant, lowercase, comma-separated tags.

Return ONLY a valid JSON object with this exact schema — no markdown, no explanation:

{
  "title": "string",
  "excerpt": "string",
  "tags": ["string"]
}

Blog post content:
${content}`;

export async function generateBlogMeta(
  content: string,
  ctx: AiRequestContext
): Promise<{ title: string; excerpt: string; tags: string[] }> {
  assertApiKey();

  const truncated = content.slice(0, 5000);

  const { content: raw } = await callGroq(BLOG_META_PROMPT(truncated), {
    temperature: 0.4,
    maxTokens: 1024,
    systemInstruction: BLOG_META_SYSTEM_INSTRUCTION,
    feature: "blog_meta",
    ctx,
  });

  const parsed = parseJsonObject<{
    title?: string;
    excerpt?: string;
    tags?: string[];
  }>(raw);

  return {
    title: parsed.title?.trim() || "",
    excerpt: parsed.excerpt?.trim() || "",
    tags: Array.isArray(parsed.tags)
      ? parsed.tags.map((t) => String(t).trim()).filter(Boolean)
      : [],
  };
}
