import "server-only";

import type { ParsedJobAd } from "@/types/JobAdData";
import type { JobMatchAnalysis } from "@/types/JobApplicationData";
import type { AiRequestContext } from "./context";
import {
  ATS_MODEL,
  GENERATION_MODEL,
  LONG_CONTEXT_MODEL,
  PARSER_SYSTEM_INSTRUCTION,
  assertApiKey,
} from "./client";
import { callGroq, callGroqJson } from "./groqCalls";
import { parseJsonObject, stripJsonFence } from "./json";
import { normalizeMatchAnalysis, normalizeParsedJobAd } from "./normalize";
import { JOB_CATEGORIES } from "@/lib/jobCategories";

const JOB_PARSE_PROMPT = (text: string) => `
You are a precise job-ad extractor. You ONLY output raw valid JSON. Never use markdown code fences. Never add explanations before or after the JSON object. Your entire response must be parseable by JSON.parse().

CRITICAL RULES — preserve wording:
- Extract fields VERBATIM from the source text. Do NOT reword, summarize, paraphrase, or invent. Exception: summary is generated (see below).
- Do NOT add information that is not explicitly present in the source. If a field is not in the source, return "" for strings, [] for arrays, or null for salary numbers.
  - For description, requirements, benefits, skillsRequired: copy the original phrasing exactly as it appears, only splitting into array items where needed. Do not add buzzwords or extra duties.
- Preserve original sentence structure and wording for description. Convert plain text description to simple HTML paragraphs: wrap each paragraph in <p>...</p>, keep line breaks. Do not invent HTML you did not see.
- For enums, map to the closest allowed value but still base it on source text: category must be one of ${JSON.stringify(JOB_CATEGORIES)} (default "Other"), jobType one of ["full-time","part-time","contract","freelance","internship"] (default "full-time"), workplaceType one of ["remote","hybrid","on-site"] (default "remote"), experienceLevel one of ["entry","mid","senior","lead","executive"] (default "mid"), applicationType one of ["on_platform","external_link","email"] (default "on_platform").
- For applicationType: set to "external_link" ONLY if source contains a verbatim apply URL (e.g. "Apply at https://..." ), "email" ONLY if it contains a verbatim apply email (e.g. "send CV to jobs@..."), otherwise "on_platform". Copy URL/email verbatim when present; never invent. If neither URL nor email is present, return "" for both externalUrl and contactEmail.
- For salary: recognize patterns like "$90K - $120K", "$90,000", "₦2,000,000", "£35k per annum", "€45/hr", "NGN 500k–800k", "2,000 USD per month". Extract salaryMin as first number, salaryMax as second number or null if single value, salaryCurrency from symbol ($→USD, £→GBP, €→EUR, ₦→NGN, ₹→INR) or code (USD, NGN, GBP, EUR) normalized to uppercase 3-letter code, salaryPeriod from keywords "per year|annum|yearly→yearly, per month|monthly→monthly, per hour|hourly|/hr→hourly". If text says "Competitive" or "Negotiable" return nulls and leave currency as "USD".
- For summary: generate a concise SOCIAL SHARE summary (max 280 chars, plain text, no HTML) in this rich style when source has enough detail, but ALWAYS cap at 280. Example of the shape (condense to fit 280):
  Hiring: Growth Trainees (Sales & Marketing Track)
  📍 Location: Fully Remote (Open to candidates across Nigeria)
  Brielle Consulting Services (BCS) is accepting applications for its 90-day performance-based trainee cohort! Perfect for ambitious graduates, NYSC corps members, and entry-level talent looking...
  Compensation & Perks: Uncapped earnings NGN 180,000-500,000+…
  Roles Open: 1️⃣ Commercial Sales Trainee… 2️⃣ Growth Marketing Trainee…
  Keep compensation/location verbatim when present, adapt to source, preserve the "Hiring:" + "📍 Location:" header style, and truncate intelligently to stay ≤280 chars. Do NOT use HTML. If source is short, a one-sentence role+location+perk line is fine.

Return ONLY a JSON object with this exact schema — no markdown, no explanation:
{
  "title": "string — job title verbatim",
  "category": "${JOB_CATEGORIES.join(" | ")}",
  "jobType": "full-time | part-time | contract | freelance | internship",
  "workplaceType": "remote | hybrid | on-site",
  "location": "string — location verbatim or Remote if not stated",
  "experienceLevel": "entry | mid | senior | lead | executive",
  "salaryMin": 90000 | null,
  "salaryMax": 140000 | null,
  "salaryCurrency": "USD",
  "salaryPeriod": "yearly | monthly | hourly",
  "summary": "string — tweet-length (max 280 chars) plain-text share summary",
  "description": "<p>verbatim description html</p>",
  "requirements": ["verbatim requirement line 1"],
  "benefits": ["verbatim benefit line 1"],
  "skillsRequired": ["skill1", "skill2"],
  "companyName": "string — employer/company name verbatim or empty",
  "companyWebsite": "string — website URL verbatim or empty",
  "companyLogo": "string — logo image URL if present or empty",
  "companyLocation": "string — company HQ/location verbatim or empty",
  "companyIndustry": "string — industry verbatim or empty",
  "companyDescription": "string — about the company verbatim or empty",
  "applicationType": "on_platform | external_link | email",
  "externalUrl": "string — verbatim apply URL or empty",
  "contactEmail": "string — verbatim apply email or empty"
}

Source job ad text to extract from:
${text}`;

export async function parseJobAdFromText(
  extractedText: string,
  ctx: AiRequestContext
): Promise<ParsedJobAd> {
  assertApiKey();
  if (!extractedText.trim()) {
    return normalizeParsedJobAd({});
  }
  const { parsed } = await callGroqJson<Partial<ParsedJobAd>>(JOB_PARSE_PROMPT(extractedText), {
    model: LONG_CONTEXT_MODEL,
    systemInstruction: PARSER_SYSTEM_INSTRUCTION,
    temperature: 0,
    maxTokens: 4096,
    feature: "job_parse",
    parse: (raw) => parseJsonObject<Partial<ParsedJobAd>>(raw),
    retryMaxTokens: 8000,
    retryModel: ATS_MODEL,
    ctx,
  });
  return normalizeParsedJobAd(parsed);
}

const JOB_SHARE_SUMMARY_PROMPT = (jobText: string) => `
You are a job-ad summarizer for Twitter/X. Generate a concise SOCIAL SHARE blurb for the job below.

Rules:
- Plain text only, no HTML, no markdown code fences. Max 280 characters total — hard cap.
- Use this header style when possible (adapt to source):
  Hiring: {Job Title}
  📍 Location: {location + workplaceType}
  Then 1-2 sentences of pitch + 1 line of top perk/compensation if present.
- Preserve title, company, location, and compensation verbatim when present. Do not invent.
- Keep it catchy and skimmable. Truncate intelligently to stay ≤280.

Job to summarize:
${jobText}
`;

export async function generateJobShareSummary(
  jobText: string,
  ctx: AiRequestContext
): Promise<string> {
  assertApiKey();
  const text = jobText.trim().slice(0, 4000);
  if (!text) return "";
  const { content: raw } = await callGroq(JOB_SHARE_SUMMARY_PROMPT(text), {
    model: GENERATION_MODEL,
    systemInstruction: "You are a helpful assistant. Return only the requested summary text, no JSON, no markdown.",
    temperature: 0.5,
    maxTokens: 512,
    feature: "job_share_summary",
    ctx,
  });
  let summary = stripJsonFence(raw).trim();
  // If model wrapped in quotes/JSON, try to unwrap
  if ((summary.startsWith('"') && summary.endsWith('"')) || (summary.startsWith("'") && summary.endsWith("'"))) {
    summary = summary.slice(1, -1).trim();
  }
  try {
    const obj = JSON.parse(summary) as { summary?: string };
    if (typeof obj.summary === "string" && obj.summary.trim()) summary = obj.summary.trim();
  } catch {}
  return summary.slice(0, 280).trim();
}

const RESUME_JOB_MATCH_PROMPT = (resumeText: string, jobText: string) => `
You are a precise resume-to-job match analyzer. Compare the candidate resume against the job ad.

Rules:
- Be truthful and concise. Score 0-100 based on skill/requirement overlap, quantified achievements, and relevance.
- Do NOT invent facts. Base everything on the provided texts.
- Extract missingKeywords (job keywords not found in resume), missingSkills (skills listed in job but absent in resume).
- strengths: what already aligns well (2-4 items). weaknesses: where the resume falls short (2-4 items). gaps: specific experience/skill gaps. suggestions: 2-4 actionable improvements to raise the score.
- verdict: 1-2 sentences honest summary and the single biggest improvement opportunity.

Return ONLY raw valid JSON, no markdown, no explanation, with this exact schema:
{
  "score": 64,
  "missingKeywords": ["React", "TypeScript"],
  "missingSkills": ["AWS"],
  "strengths": ["3 years frontend experience"],
  "weaknesses": ["No quantified achievements"],
  "gaps": ["No AWS experience mentioned"],
  "suggestions": ["Add AWS project bullet", "Quantify impact with metrics"],
  "verdict": "1-2 sentence summary"
}

Resume:
${resumeText}

Job ad:
${jobText}`;

export async function analyzeResumeJobMatch(
  resumeText: string,
  jobAdText: string,
  ctx: AiRequestContext
): Promise<JobMatchAnalysis> {
  assertApiKey();
  if (!resumeText.trim() || !jobAdText.trim()) {
    return normalizeMatchAnalysis({ score: 0, verdict: "Provide both resume and job ad to analyze." });
  }
  const { parsed } = await callGroqJson<Partial<JobMatchAnalysis>>(RESUME_JOB_MATCH_PROMPT(resumeText, jobAdText), {
    model: ATS_MODEL,
    systemInstruction: PARSER_SYSTEM_INSTRUCTION,
    temperature: 0,
    maxTokens: 2048,
    feature: "job_match_analysis",
    parse: (raw) => parseJsonObject<Partial<JobMatchAnalysis>>(raw),
    retryMaxTokens: 4096,
    ctx,
  });
  return normalizeMatchAnalysis(parsed);
}
