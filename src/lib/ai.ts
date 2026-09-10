import Groq from "groq-sdk";
import { AtsReport } from "@/types/AtsReport";
import { ResumeContent } from "@/types/ResumeData";
import { TailorReport } from "@/types/TailorReport";
import type { JobMatchAnalysis } from "@/types/JobApplicationData";
import { logAiUsage } from "@/lib/logAiUsage";

export type MatchAnalysis = JobMatchAnalysis;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Use a capable model for structured JSON output
const ATS_MODEL = "openai/gpt-oss-120b"; // good for structured JSON output
const VISION_MODEL = "qwen/qwen3.6-27b";
const GENERATION_MODEL = "openai/gpt-oss-20b"; // fine for simple text gen
const LONG_CONTEXT_MODEL = "groq/compound"; // for long cover letters, etc.


const ATS_SYSTEM_INSTRUCTION =
  "You are an expert ATS resume analyst. You ONLY output raw valid JSON. Never use markdown code fences. Never add explanations before or after the JSON object. Your entire response must be parseable by JSON.parse().";

const WRITER_SYSTEM_INSTRUCTION =
  "You are a professional resume writer. Write concise, impactful content that is ATS-friendly and highlights achievements. Use action verbs and quantify results when possible.";

const COVER_LETTER_SYSTEM_INSTRUCTION =
  "You are a professional cover letter writer. You ONLY output raw valid JSON. Never use markdown code fences. Never add explanations before or after the JSON object. Your entire response must be parseable by JSON.parse().";

const TAILOR_SYSTEM_INSTRUCTION =
  "You are an expert recruiter and resume writer. You ONLY output raw valid JSON. Never use markdown code fences. Never add explanations before or after the JSON object. Your entire response must be parseable by JSON.parse().";

const PARSER_SYSTEM_INSTRUCTION =
  "You are a precise resume parser. You ONLY output raw valid JSON. Never use markdown code fences. Never add explanations before or after the JSON object. Your entire response must be parseable by JSON.parse().";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CoverLetterResult {
  content: string;
  inferredRole: string;
  inferredCompany: string;
}

export const emptyResumeContent: ResumeContent = {
  personalInfo: {
    name: "",
    fullname: { firstName: "", otherNames: "" },
    jobTitle: "",
    email: "",
    phone: "",
    location: "",
    website: "",
  },
  summary: "",
  experience: [],
  education: [],
  projects: [],
  skills: [],
  skillCategories: [],
  skillCategorized: false,
};

// ─── JSON Utilities ───────────────────────────────────────────────────────────

function stripJsonFence(value: string): string {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function parseJsonObject<T>(value: string): T {
  const cleaned = stripJsonFence(value);

  // Attempt 1: direct parse
  try {
    return JSON.parse(cleaned) as T;
  } catch {}

  // Attempt 2: extract outermost { }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    } catch {}
  }

  throw new Error(`AI returned unparseable JSON. Raw: ${value.slice(0, 300)}`);
}

function parseJsonArray<T>(value: string): T[] {
  const cleaned = stripJsonFence(value);

  // Attempt 1: direct parse
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed as T[];
  } catch {}

  // Attempt 2: extract outermost [ ]
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as T[];
    } catch {}
  }

  throw new Error(`AI returned unparseable JSON array. Raw: ${value.slice(0, 300)}`);
}

// ─── Normalizers ──────────────────────────────────────────────────────────────

function stringifyListItem(item: unknown): string {
  if (typeof item === "string") return item.trim();
  if (typeof item === "number" || typeof item === "boolean") return String(item);
  if (item && typeof item === "object") {
    const record = item as Record<string, unknown>;
    const primary = ["description", "detail", "title", "field", "name", "keyword"]
      .map((key) => record[key])
      .find((v) => typeof v === "string" && (v as string).trim());
    if (typeof primary === "string") {
      const field = typeof record.field === "string" ? record.field.trim() : "";
      const text = primary.trim();
      return field && field !== text ? `${field}: ${text}` : text;
    }
    return JSON.stringify(item);
  }
  return "";
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(stringifyListItem).filter(Boolean);
}

function normalizeResumeContent(content: Partial<ResumeContent> | undefined): ResumeContent {
  return {
    personalInfo: {
      ...emptyResumeContent.personalInfo,
      ...(content?.personalInfo ?? {}),
      fullname: {
        ...emptyResumeContent.personalInfo.fullname,
        ...(content?.personalInfo?.fullname ?? {}),
      },
    },
    summary: content?.summary ?? "",
    experience: Array.isArray(content?.experience) ? content.experience : [],
    education: Array.isArray(content?.education) ? content.education : [],
    projects: Array.isArray(content?.projects) ? content.projects : [],
    skills: normalizeStringList(content?.skills),
    skillCategories: Array.isArray(content?.skillCategories)
      ? content.skillCategories.map((cat) => ({
          id: cat.id ?? "",
          category: cat.category ?? "",
          skills: Array.isArray(cat.skills) ? cat.skills : [],
        }))
      : [],
    skillCategorized: content?.skillCategorized ?? false,
  };
}

function normalizeAtsReport(report: Partial<AtsReport>, extractedText: string): AtsReport {
  return {
    score: Math.max(0, Math.min(100, Number(report.score) || 0)),
    verdict: report.verdict || "ATS review completed.",
    strengths: normalizeStringList(report.strengths),
    issues: Array.isArray(report.issues) ? report.issues : [],
    recommendedKeywords: normalizeStringList(report.recommendedKeywords),
    extractedText: report.extractedText || extractedText,
    parsedResume: normalizeResumeContent(report.parsedResume),
    improvedResume: normalizeResumeContent(report.improvedResume),
  };
}

function normalizeTailorReport(report: Partial<TailorReport>): TailorReport {
  return {
    explanation: report.explanation || "CV tailored for the job.",
    keyChanges: normalizeStringList(report.keyChanges),
    tailoredResume: normalizeResumeContent(report.tailoredResume),
    matchAnalysis: normalizeMatchAnalysis(report.matchAnalysis || {}),
  };
}

// ─── Core API Calls ───────────────────────────────────────────────────────────

function assertApiKey() {
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === "your-groq-api-key-here") {
    throw new Error("Groq API key not configured");
  }
}

async function callGroq(
  prompt: string,
  options: {
    model?: string;
    systemInstruction?: string;
    temperature?: number;
    maxTokens?: number;
    feature?: string;
  } = {}
): Promise<{ content: string; truncated: boolean }> {
  const {
    model = GENERATION_MODEL,
    systemInstruction = WRITER_SYSTEM_INSTRUCTION,
    temperature = 0.3,
    maxTokens = 1024,
    feature = "unspecified",
  } = options;

  const start = Date.now();
  const completion = await groq.chat.completions.create({
    model,
    temperature,
    max_completion_tokens: maxTokens,
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: prompt },
    ],
  });
  const latencyMs = Date.now() - start;

  const choice = completion.choices[0];
  const truncated = choice?.finish_reason === "length";
  if (truncated) console.warn("Groq response truncated by max_completion_tokens");

  logAiUsage({
    feature,
    model,
    promptTokens: completion.usage?.prompt_tokens ?? 0,
    completionTokens: completion.usage?.completion_tokens ?? 0,
    totalTokens: completion.usage?.total_tokens ?? 0,
    queueTimeMs: completion.usage?.queue_time ? Math.round(completion.usage.queue_time * 1000) : undefined,
    latencyMs,
    truncated,
    finishReason: choice?.finish_reason ?? "unknown",
  });

  return { content: choice?.message?.content?.trim() || "", truncated };
}

async function callGroqVision(
  prompt: string,
  dataUrl: string,
  feature: string
): Promise<string> {
  const start = Date.now();
  const completion = await groq.chat.completions.create({
    model: VISION_MODEL,
    temperature: 0.1,
    max_completion_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  });
  const latencyMs = Date.now() - start;

  const choice = completion.choices[0];

  logAiUsage({
    feature,
    model: VISION_MODEL,
    promptTokens: completion.usage?.prompt_tokens ?? 0,
    completionTokens: completion.usage?.completion_tokens ?? 0,
    totalTokens: completion.usage?.total_tokens ?? 0,
    queueTimeMs: completion.usage?.queue_time ? Math.round(completion.usage.queue_time * 1000) : undefined,
    latencyMs,
    truncated: choice?.finish_reason === "length",
    finishReason: choice?.finish_reason ?? "unknown",
  });

  return choice?.message?.content?.trim() || "";
}

// ─── ATS Analysis ─────────────────────────────────────────────────────────────

const ATS_PROMPT = (extractedText: string, knownResumeBlock: string) => `
Analyze the resume below and return a single JSON object matching the exact schema provided.

## SCORING RUBRIC (score: integer 0–100)
- Contact info completeness (name, email, phone, location, website): 10 pts
- Summary quality and keyword density: 15 pts  
- Experience: quantified achievements, strong action verbs, relevance: 30 pts
- Skills: present, specific, ATS-friendly: 20 pts
- Education: complete and present: 10 pts
- Overall ATS keyword optimization: 15 pts
Deduct for: missing sections, vague bullets, no metrics, missing skills.

## VERDICT
1–2 honest sentences on ATS readiness and the single biggest improvement opportunity.

## ISSUE SEVERITY
- high: missing skills section, no quantified achievements, gaps > 6 months, job title mismatch
- medium: weak action verbs, low keyword density, missing summary, vague descriptions
- low: inconsistent date formats, missing phone/website

## IMPROVEMENT RULES
- Extract ALL skills mentioned anywhere in the resume text into skills[] or skillCategories[]
- Preserve projects as-is unless factual improvements are clear
- Strengthen bullets with stronger action verbs and inferable metrics
- Do NOT invent companies, schools, degrees, dates, or credentials
- Keep all facts truthful — only improve clarity, impact, and keyword alignment

## SKILL FORMAT RULES
- If the resume has flat skills[], use skills[] in the output (set skillCategorized to false)
- If the resume has categorized skills (skillCategories[]), use skillCategories[] in the output (set skillCategorized to true)
- skills[] and skillCategories[] are mutually exclusive — only populate one

## REQUIRED JSON SCHEMA
{
  "score": 72,
  "verdict": "string",
  "strengths": ["string"],
  "issues": [
    {
      "severity": "high | medium | low",
      "section": "personalInfo | summary | experience | education | skills | general",
      "title": "string",
      "detail": "string",
      "suggestion": "string"
    }
  ],
  "recommendedKeywords": ["string"],
  "parsedResume": {
    "personalInfo": {
      "name": "string",
      "fullname": { "firstName": "string", "otherNames": "string" },
      "jobTitle": "string",
      "email": "string",
      "phone": "string",
      "location": "string",
      "website": "string"
    },
    "summary": "string",
    "experience": [
      { "id": "1", "company": "string", "role": "string", "startDate": "string", "endDate": "string", "description": ["string"] }
    ],
    "education": [
      { "id": "1", "school": "string", "degree": "string", "startDate": "string", "endDate": "string" }
    ],
    "projects": [
      { "id": "1", "name": "string", "description": ["string"] }
    ],
    "skills": ["string"],
    "skillCategories": [ { "category": "string", "skills": ["string"] } ],
    "skillCategorized": false
  },
  "improvedResume": {
    "personalInfo": {
      "name": "string",
      "fullname": { "firstName": "string", "otherNames": "string" },
      "jobTitle": "string",
      "email": "string",
      "phone": "string",
      "location": "string",
      "website": "string"
    },
    "summary": "string",
    "experience": [
      { "id": "1", "company": "string", "role": "string", "startDate": "string", "endDate": "string", "description": ["string"] }
    ],
    "education": [
      { "id": "1", "school": "string", "degree": "string", "startDate": "string", "endDate": "string" }
    ],
    "projects": [
      { "id": "1", "name": "string", "description": ["string"] }
    ],
    "skills": ["string"],
    "skillCategories": [ { "category": "string", "skills": ["string"] } ],
    "skillCategorized": false
  }
}

Resume:
${extractedText}
${knownResumeBlock}`;

export async function analyzeResumeForAts(
  extractedText: string,
  existingResume?: ResumeContent
): Promise<AtsReport> {
  assertApiKey();

  const knownResumeBlock = existingResume
    ? `\nExisting structured resume JSON:\n${JSON.stringify(existingResume, null, 2)}`
    : "";

  const prompt = ATS_PROMPT(extractedText, knownResumeBlock);

  let { content: raw, truncated } = await callGroq(prompt, {
    model: ATS_MODEL,
    systemInstruction: ATS_SYSTEM_INSTRUCTION,
    temperature: 0.1,
    maxTokens: 4096,
    feature: "ats_analysis",
  });

  let parsed: Partial<AtsReport>;
  try {
    parsed = parseJsonObject<Partial<AtsReport>>(raw);
  } catch {
    if (truncated) {
      console.warn("First ATS response truncated, retrying with larger budget...");
      ({ content: raw } = await callGroq(prompt, {
        model: ATS_MODEL,
        systemInstruction: ATS_SYSTEM_INSTRUCTION,
        temperature: 0,
        maxTokens: 8000,
        feature: "ats_analysis",
      }));
    } else {
      console.warn("First ATS parse failed, retrying with stern nudge...");
      ({ content: raw } = await callGroq(
        `Your previous response was not valid JSON. Return ONLY the raw JSON object, no markdown, no explanation.\n\n${prompt}`,
        {
          model: ATS_MODEL,
          systemInstruction: ATS_SYSTEM_INSTRUCTION,
          temperature: 0,
          maxTokens: 4096,
          feature: "ats_analysis",
        }
      ));
    }
    parsed = parseJsonObject<Partial<AtsReport>>(raw);
  }

  return normalizeAtsReport(parsed, extractedText);
}

// ─── Image Extraction ─────────────────────────────────────────────────────────

export async function extractTextFromSingleImage(dataUrl: string): Promise<string> {
  assertApiKey();
  return callGroqVision(
    "Extract all readable resume/CV text from this image. Preserve section headings, dates, contact details, skills, and bullet points. Return only the extracted text.",
    dataUrl,
    "vision_extract_resume"
  );
}

export async function extractResumeTextFromImages(dataUrls: string[]): Promise<string> {
  assertApiKey();
  if (dataUrls.length === 0) return "";

  // Process images 2 at a time — the vision model extracts best from ≤2 images per call
  const chunkSize = 2;
  const results: string[] = [];

  for (let i = 0; i < dataUrls.length; i += chunkSize) {
    const chunk = dataUrls.slice(i, i + chunkSize);
    const texts = await Promise.all(chunk.map(extractTextFromSingleImage));
    results.push(...texts);
  }

  return results.filter(Boolean).join("\n\n");
}

export async function extractResumeTextFromImage(dataUrl: string): Promise<string> {
  return extractTextFromSingleImage(dataUrl);
}

export async function extractTextFromJobImage(dataUrl: string): Promise<string> {
  assertApiKey();
  return callGroqVision(
    "Extract all readable text from this job description / job posting image. Preserve job title, responsibilities, requirements, and keywords. Return only the extracted text.",
    dataUrl,
    "vision_extract_job"
  );
}

// ─── AI Tailoring ─────────────────────────────────────────────────────────────

const TAILOR_PROMPT = (
  resumeText: string,
  knownResumeBlock: string,
  jobDescription: string,
  targetTitle?: string,
  targetCompany?: string
) => `
You are an expert recruiter and professional resume writer. Your task is to tailor the candidate's resume/CV to perfectly align with the provided job description and requirements.

Analyze the resume/CV against the job description. Then, perform the tailoring and optimize the resume content for the job.

Target job information (optional):
- Target Job Title: ${targetTitle || "Not specified"}
- Target Company: ${targetCompany || "Not specified"}

## TAILORING RULES:
1. **Be Truthful**: Do NOT invent new job roles, companies, dates, schools, degrees, or certifications. Only optimize and highlight existing facts.
2. **Optimize Job Title**: If the candidate's job title or desired title can be aligned closer to the target job title without lying, update it (e.g. "Software Developer" to "Full-Stack Engineer" if the job is for a Full-Stack Engineer and the candidate has experience in both frontend and backend).
3. **Tailor Professional Summary**: Rewrite the summary to highlight key accomplishments, technologies, and alignment with the target job's primary goals. Keep it to 2-3 impactful sentences.
4. **Tailor Experience Bullets**: Rewrite and restructure the candidate's experience description bullet points to emphasize relevant projects, results, and skills. Inject relevant keywords and action verbs. Keep the bullet points concise.
5. **Tailor Skills**: Re-organize and filter the skills (whether flat or categorized) to prioritize key terms and technologies mentioned in the job description that the candidate actually possesses or can be inferred to possess from their experience. You can also add new skills if they are relevant to the job description and can be inferred from the candidate's experience or are closely related to existing skills. Preserve the original skill format — if the resume has categorized skills, return categorized skills; if flat, return flat.
6. **Tailor Projects**: Highlight the most relevant projects that align with the target role. Update project descriptions to emphasize relevant technologies and outcomes.

## SKILL FORMAT RULES
- If the resume has flat skills[], use skills[] in the output (set skillCategorized to false)
- If the resume has categorized skills (skillCategories[]), use skillCategories[] in the output (set skillCategorized to true)
- skills[] and skillCategories[] are mutually exclusive — only populate one

## REQUIRED JSON SCHEMA
{
  "explanation": "Brief paragraph summarizing why this resume is a strong fit for the role after tailoring, and where the candidate's strengths align best.",
  "keyChanges": [
    "Rewrote summary to emphasize React and GraphQL experience requested in the job post.",
    "Refactored experience bullets at Company X to highlight system design and AWS cloud infrastructure.",
    "Prioritized TypeScript and Next.js in the skills list and removed legacy tools."
  ],
  "tailoredResume": {
    "personalInfo": {
      "name": "string",
      "fullname": { "firstName": "string", "otherNames": "string" },
      "jobTitle": "string",
      "email": "string",
      "phone": "string",
      "location": "string",
      "website": "string"
    },
    "summary": "string",
    "experience": [
      { "id": "1", "company": "string", "role": "string", "startDate": "string", "endDate": "string", "description": ["string"] }
    ],
    "education": [
      { "id": "1", "school": "string", "degree": "string", "startDate": "string", "endDate": "string" }
    ],
    "projects": [
      { "id": "1", "name": "string", "description": ["string"] }
    ],
    "skills": ["string"],
    "skillCategories": [ { "category": "string", "skills": ["string"] } ],
    "skillCategorized": false
  },
  "matchAnalysis": {
    "score": 85,
    "missingKeywords": ["string"],
    "missingSkills": ["string"],
    "strengths": ["string"],
    "weaknesses": ["string"],
    "gaps": ["string"],
    "suggestions": ["string"],
    "verdict": "string"
  }
}

Job Description:
${jobDescription}

Resume/CV Text:
${resumeText}
${knownResumeBlock}`;

export async function tailorResume(
  resumeText: string,
  jobDescription: string,
  targetTitle?: string,
  targetCompany?: string,
  existingResume?: ResumeContent
): Promise<TailorReport> {
  assertApiKey();

  const knownResumeBlock = existingResume
    ? `\nExisting structured resume JSON:\n${JSON.stringify(existingResume, null, 2)}`
    : "";

  const prompt = TAILOR_PROMPT(
    resumeText,
    knownResumeBlock,
    jobDescription,
    targetTitle,
    targetCompany
  );

  let { content: raw, truncated } = await callGroq(prompt, {
    model: ATS_MODEL,
    systemInstruction: TAILOR_SYSTEM_INSTRUCTION,
    temperature: 0.1,
    maxTokens: 4096,
    feature: "tailor",
  });

  let parsed: Partial<TailorReport>;
  try {
    parsed = parseJsonObject<Partial<TailorReport>>(raw);
  } catch {
    if (truncated) {
      console.warn("First tailor response truncated, retrying with larger budget...");
      ({ content: raw } = await callGroq(prompt, {
        model: ATS_MODEL,
        systemInstruction: TAILOR_SYSTEM_INSTRUCTION,
        temperature: 0,
        maxTokens: 8000,
        feature: "tailor",
      }));
    } else {
      console.warn("First tailor parse failed, retrying with stern nudge...");
      ({ content: raw } = await callGroq(
        `Your previous response was not valid JSON. Return ONLY the raw JSON object, no markdown, no explanation.\n\n${prompt}`,
        {
          model: ATS_MODEL,
          systemInstruction: TAILOR_SYSTEM_INSTRUCTION,
          temperature: 0,
          maxTokens: 4096,
          feature: "tailor",
        }
      ));
    }
    parsed = parseJsonObject<Partial<TailorReport>>(raw);
  }

  return normalizeTailorReport(parsed);
}

const GROUNDED_TAILOR_PROMPT = (
  resumeText: string,
  knownResumeBlock: string,
  jobDescription: string,
  analysis: MatchAnalysis
) => `
You are an expert recruiter tailoring a resume. Use the prior match analysis to guide improvements.

Prior match analysis score: ${analysis.score}
Missing keywords: ${analysis.missingKeywords.join(", ") || "none"}
Missing skills: ${analysis.missingSkills.join(", ") || "none"}
Gaps: ${analysis.gaps.join("; ") || "none"}
How to improve: ${analysis.suggestions.join("; ") || "none"}
Strengths: ${analysis.strengths.join("; ") || "none"}
Weaknesses: ${analysis.weaknesses.join("; ") || "none"}
Verdict: ${analysis.verdict}

STRICT GROUNDED RULES — do not hallucinate:
- Do NOT invent job roles, companies, dates (startDate/endDate), schools, degrees, certifications, or years of experience. Keep all dates and employers exactly as in the source.
- Do NOT add skills, tools, or technologies that are not already in the resume text or directly inferable from the experience/project descriptions. If a missing skill is not evidenced in the resume's experience, do not add it to skills; instead surface transferable phrasing.
- Skills in tailoredResume.skills or skillCategories must be a subset/filter/reorder of the original skills, plus only missing keywords/skills where the resume's experience semantically covers them verbatim.
- Experience bullets may be reworded to foreground verifiable achievements and the missing keywords that are actually evidenced. Do not fabricate metrics.
- Preserve id values stable. Preserve skillCategorized flag and shape (flat vs categorized).
- Tailor summary to 2-3 sentences foregrounding strengths that align to the job, using only truthful claims.
- After tailoring, re-analyze the tailored resume against the job description and produce matchAnalysis (score 0-100 plus missingKeywords/missingSkills/strengths/weaknesses/gaps/suggestions/verdict) for the TAILORED version.

${TAILOR_PROMPT(resumeText, knownResumeBlock, jobDescription).replace("You are an expert recruiter and professional resume writer.", "Follow the grounded rules above while tailoring.")}
`;

export async function tailorResumeGrounded(
  resumeText: string,
  jobDescription: string,
  analysis: MatchAnalysis,
  existingResume?: ResumeContent
): Promise<TailorReport> {
  assertApiKey();
  const knownResumeBlock = existingResume ? `\nExisting structured resume JSON:\n${JSON.stringify(existingResume, null, 2)}` : "";
  const prompt = GROUNDED_TAILOR_PROMPT(resumeText, knownResumeBlock, jobDescription, analysis);
  let { content: raw, truncated } = await callGroq(prompt, {
    model: ATS_MODEL,
    systemInstruction: TAILOR_SYSTEM_INSTRUCTION,
    temperature: 0.1,
    maxTokens: 4096,
    feature: "tailor_grounded",
  });
  let parsed: Partial<TailorReport>;
  try {
    parsed = parseJsonObject<Partial<TailorReport>>(raw);
  } catch {
    if (truncated) {
      ({ content: raw } = await callGroq(prompt, {
        model: ATS_MODEL,
        systemInstruction: TAILOR_SYSTEM_INSTRUCTION,
        temperature: 0,
        maxTokens: 8000,
        feature: "tailor_grounded",
      }));
    } else {
      ({ content: raw } = await callGroq(
        `Your previous response was not valid JSON. Return ONLY the raw JSON object, no markdown, no explanation.\n\n${prompt}`,
        { model: ATS_MODEL, systemInstruction: TAILOR_SYSTEM_INSTRUCTION, temperature: 0, maxTokens: 4096, feature: "tailor_grounded" }
      ));
    }
    parsed = parseJsonObject<Partial<TailorReport>>(raw);
  }
  return normalizeTailorReport(parsed);
}

// ─── Resume Writing Helpers ───────────────────────────────────────────────────

export async function generateWithAI(prompt: string): Promise<string> {
  assertApiKey();
  const { content } = await callGroq(prompt, { feature: "generate_with_ai" });
  return content;
}

export async function generateSummary(
  jobTitle: string,
  experience: string,
  skills: string[],
  achievements: string[]
): Promise<string> {
  const { content } = await callGroq(
    `Write a one-sentence professional summary for a ${jobTitle} with ${experience} years of experience. Skills: ${skills.join(", ")}. Key achievements:\n- ${achievements.join("\n- ")}\n\nReturn only the summary sentence.`,
    { feature: "generate_summary" }
  );
  return content;
}

export async function generateExperienceBulletPoints(
  company: string,
  role: string,
  description: string
): Promise<string[]> {
  const { content } = await callGroq(
    `Transform this job description into 3 impactful ATS-friendly bullet points.\nCompany: ${company}\nRole: ${role}\nDescription: ${description}\n\nUse action verbs and quantify achievements. Return only the 3 bullet points, one per line, no dashes or bullets prefix.`,
    { feature: "generate_bullet_points" }
  );
  return content
    .split("\n")
    .map((s) => s.trim().replace(/^[-•–—*]\s*/, ""))
    .filter((s) => s.length > 0)
    .slice(0, 3);
}

export async function improveSummary(existingSummary: string): Promise<string> {
  const { content } = await callGroq(
    `Improve this professional summary to be more impactful and ATS-friendly. Keep it one sentence.\n\n${existingSummary}\n\nReturn only the improved summary.`,
    { feature: "improve_summary" }
  );
  return content;
}

export async function generateSkillsSuggestions(jobTitle: string): Promise<string[]> {
  const { content } = await callGroq(
    `List 8-10 relevant technical and soft skills for a ${jobTitle}. Return only a comma-separated list, no explanations.`,
    { feature: "generate_skills" }
  );
  return content
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export async function generateCategorizedSkills(jobTitle: string): Promise<any[]> {
  const { content } = await callGroq(
    `Generate 3-5 categories of skills for a ${jobTitle} with 3-5 skills each.
     Return ONLY a valid JSON array of objects with keys "category" and "skills" (array of strings).
     No markdown, no explanation.`,
    {
      temperature: 0.1,
      maxTokens: 2048,
      systemInstruction: ATS_SYSTEM_INSTRUCTION,
      feature: "generate_categorized_skills",
    }
  );
  return parseJsonArray<{ category: string; skills: string[] }>(content);
}

export async function categorizeExistingSkills(skills: string[]): Promise<{ category: string; skills: string[] }[]> {
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
  content: string
): Promise<{ title: string; excerpt: string; tags: string[] }> {
  assertApiKey();

  const truncated = content.slice(0, 5000);

  const { content: raw } = await callGroq(BLOG_META_PROMPT(truncated), {
    temperature: 0.4,
    maxTokens: 1024,
    systemInstruction: BLOG_META_SYSTEM_INSTRUCTION,
    feature: "blog_meta",
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

const COVER_LETTER_PROMPT = (
  resumeText: string,
  jobDescription: string,
  targetCompany: string,
  targetRole: string,
  knownResumeBlock: string
) => `
You are generating a cover letter and inferring job details. Return ONLY a valid JSON object with this exact schema — no markdown, no explanation:

{
  "content": "The full cover letter text as a single string with \\n newlines...",
  "inferredRole": "Job title inferred from the job description",
  "inferredCompany": "Company name inferred from the job description"
}

## COVER LETTER INSTRUCTIONS
Write exactly 4-5 paragraphs with these distinct roles:

1. **Opening**: Express genuine interest in the specific role and company. Connect the role's core purpose to the candidate's motivation in one or two sentences. Do not summarize the whole job description here.

2. **Experience narrative**: Synthesize the candidate's overall professional experience into a flowing narrative, IN YOUR OWN WORDS. Do NOT copy or closely paraphrase resume bullet points line by line. Describe the shape and scope of their work (what kinds of problems they solve, how they operate, what they're known for) rather than listing what they did. Do not include metrics or numbers.

3. **Project highlight**: Reference only ONE or TWO specific named projects from the resume, briefly, and explain what building them reinforced or taught the candidate. Do not list every project. Do not re-describe the projects in detail, just enough to be recognizable.

4. **Technical fit**: Weave 4-6 relevant technical skills into 2-3 sentences that connect to the job description's requirements, showing range across the stack.
   - Use high-ownership, architectural verbs: architect, engineer, craft, scale, enforce, drive, build out — never "leverage," "utilize," "routinely build," or "I use."
   - Frame the stack as how the candidate operates, not what they've touched: e.g. "core stack centers on X and Y for Z" or "I architect end-to-end apps, building A with X, enforcing B with Y."
   - Absolutely no comma-separated tool inventories and no "I routinely build / use / leverage" constructions.

5. **Closing**: Reaffirm enthusiasm for contributing to this specific company/team and invite next steps. Keep to one or two sentences.

## STYLE RULES
- Never copy resume phrasing or bullet structure verbatim — always rewrite in new sentence structures
- Do not restate the candidate's job title/company history as a chronology; that's already on the resume
- No metrics or invented numbers
- Do not invent qualifications, tools, or projects not present in the resume
- No em dashes, emojis, or special characters — standard punctuation only
- Reference the target company and role by name if given in the job description; otherwise use "the role" / "the company"
- Address to the hiring manager ("Dear Hiring Manager" if no name given)
- The coverLetter field should contain ONLY the letter body — no subject line, no "Dear..." salutation line, no sign-off/signature

## INFERENCE RULES FOR inferredRole AND inferredCompany
- Carefully read the job description and extract the job title and company name if present
- inferredRole: the most specific job title mentioned (e.g. "Senior Frontend Engineer", not just "Engineer")
- inferredCompany: the company name if mentioned, otherwise an empty string ""
- If the target role/company above is provided by the user, use those; otherwise infer from job description
- Do NOT guess if unclear — use empty string for uncertain fields

## TARGET
Role: ${targetRole || "Not specified by user, infer from job description"}
Company: ${targetCompany || "Not specified by user, infer from job description"}

## JOB DESCRIPTION
${jobDescription}

## RESUME
${resumeText}
${knownResumeBlock}`;

export async function generateCoverLetter(
  resumeText: string,
  jobDescription: string,
  targetCompany = "",
  targetRole = "",
  existingResume?: ResumeContent
): Promise<CoverLetterResult> {
  assertApiKey();

  const knownResumeBlock = existingResume
    ? `\nExisting structured resume JSON:\n${JSON.stringify(existingResume, null, 2)}`
    : "";

  const prompt = COVER_LETTER_PROMPT(
    resumeText,
    jobDescription,
    targetCompany,
    targetRole,
    knownResumeBlock
  );

  let { content: raw, truncated } = await callGroq(prompt, {
    model: GENERATION_MODEL,
    systemInstruction: COVER_LETTER_SYSTEM_INSTRUCTION,
    temperature: 0.3,
    maxTokens: 3072,
    feature: "cover_letter",
  });

  console.log("raw cover letter", raw);

  let parsed: Partial<CoverLetterResult>;
  try {
    parsed = parseJsonObject<Partial<CoverLetterResult>>(raw);
  } catch {
    if (truncated) {
      console.warn("First cover letter response truncated, retrying with larger budget...");
      ({ content: raw } = await callGroq(prompt, {
        model: LONG_CONTEXT_MODEL,
        systemInstruction: COVER_LETTER_SYSTEM_INSTRUCTION,
        temperature: 0,
        maxTokens: 6000,
        feature: "cover_letter",
      }));
    } else {
      console.warn("First cover letter parse failed, retrying with stern nudge...");
      ({ content: raw } = await callGroq(
        `Your previous response was not valid JSON. Return ONLY the raw JSON object, no markdown, no explanation.\n\n${prompt}`,
        {
          model: GENERATION_MODEL,
          systemInstruction: COVER_LETTER_SYSTEM_INSTRUCTION,
          temperature: 0,
          maxTokens: 3072,
          feature: "cover_letter",
        }
      ));
    }
    console.log("raw cover letter", raw);
    parsed = parseJsonObject<Partial<CoverLetterResult>>(raw);
  }

  return {
    content: parsed.content || "",
    inferredRole: parsed.inferredRole || "",
    inferredCompany: parsed.inferredCompany || "",
  };
}

// ─── Resume Parsing (for onboarding upload) ──────────────────────────────────

const RESUME_PARSE_PROMPT = (text: string) => `
Parse this resume text into a structured JSON object matching the schema below.

Rules:
- Extract all available information from the text.
- For the name field, put the full name as a single string (e.g. "John Doe").
- For fullname, split firstName (first word) and otherNames (everything after the first word).
- jobTitle should be the person's current or most recent role title.
- Extract email, phone, location, and website if present.
- For summary, capture any professional summary or objective statement.
- For experience, extract each job entry with company, role, startDate, endDate (use readable date strings like "Jan 2020"), and description as an array of bullet points.
- For education, extract each entry with school, degree, startDate, endDate.
- For projects, extract any projects mentioned with name and description.
- For skills, extract as a flat array of strings.
- Do NOT invent or hallucinate information not present in the text.
- If a section is empty or missing, use an empty array or empty string.
- Set skillCategorized to false.
- skillCategories should be an empty array.

Required JSON schema:
{
  "personalInfo": {
    "name": "string",
    "fullname": { "firstName": "string", "otherNames": "string" },
    "jobTitle": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "website": "string"
  },
  "summary": "string",
  "experience": [
    { "id": "1", "company": "string", "role": "string", "startDate": "string", "endDate": "string", "description": ["string"] }
  ],
  "education": [
    { "id": "1", "school": "string", "degree": "string", "startDate": "string", "endDate": "string" }
  ],
  "projects": [
    { "id": "1", "name": "string", "description": ["string"] }
  ],
  "skills": ["string"],
  "skillCategories": [],
  "skillCategorized": false
}

Resume text to parse:
${text}`;

export interface ParsedJobAd {
  title: string;
  category: string;
  jobType: string;
  workplaceType: string;
  location: string;
  experienceLevel: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  salaryPeriod: string;
  description: string;
  requirements: string[];
  benefits: string[];
  skillsRequired: string[];
  companyName: string;
  companyWebsite: string;
  companyLogo: string;
  companyLocation: string;
  companyIndustry: string;
  companyDescription: string;
  applicationType: string;
  externalUrl: string;
  contactEmail: string;
}

const JOB_PARSE_PROMPT = (text: string) => `
You are a precise job-ad extractor. You ONLY output raw valid JSON. Never use markdown code fences. Never add explanations before or after the JSON object. Your entire response must be parseable by JSON.parse().

CRITICAL RULES — preserve wording:
- Extract fields VERBATIM from the source text. Do NOT reword, summarize, paraphrase, or invent.
- Do NOT add information that is not explicitly present in the source. If a field is not in the source, return "" for strings, [] for arrays, or null for salary numbers.
 - For description, requirements, benefits, skillsRequired: copy the original phrasing exactly as it appears, only splitting into array items where needed. Do not add buzzwords or extra duties.
- Preserve original sentence structure and wording for description. Convert plain text description to simple HTML paragraphs: wrap each paragraph in <p>...</p>, keep line breaks. Do not invent HTML you did not see.
- For enums, map to the closest allowed value but still base it on source text: category must be one of ["Engineering","Design","Product","Marketing","Sales","HR","Finance","Other"] (default "Other"), jobType one of ["full-time","part-time","contract","freelance","internship"] (default "full-time"), workplaceType one of ["remote","hybrid","on-site"] (default "remote"), experienceLevel one of ["entry","mid","senior","lead","executive"] (default "mid"), applicationType one of ["on_platform","external_link","email"] (default "on_platform").
- For applicationType: set to "external_link" ONLY if source contains a verbatim apply URL (e.g. "Apply at https://..." ), "email" ONLY if it contains a verbatim apply email (e.g. "send CV to jobs@..."), otherwise "on_platform". Copy URL/email verbatim when present; never invent. If neither URL nor email is present, return "" for both externalUrl and contactEmail.
- For salary: recognize patterns like "$90K - $120K", "$90,000", "₦2,000,000", "£35k per annum", "€45/hr", "NGN 500k–800k", "2,000 USD per month". Extract salaryMin as first number, salaryMax as second number or null if single value, salaryCurrency from symbol ($→USD, £→GBP, €→EUR, ₦→NGN, ₹→INR) or code (USD, NGN, GBP, EUR) normalized to uppercase 3-letter code, salaryPeriod from keywords "per year|annum|yearly→yearly, per month|monthly→monthly, per hour|hourly|/hr→hourly". If text says "Competitive" or "Negotiable" return nulls and leave currency as "USD".

Return ONLY a JSON object with this exact schema — no markdown, no explanation:
{
  "title": "string — job title verbatim",
  "category": "Engineering | Design | Product | Marketing | Sales | HR | Finance | Other",
  "jobType": "full-time | part-time | contract | freelance | internship",
  "workplaceType": "remote | hybrid | on-site",
  "location": "string — location verbatim or Remote if not stated",
  "experienceLevel": "entry | mid | senior | lead | executive",
  "salaryMin": 90000 | null,
  "salaryMax": 140000 | null,
  "salaryCurrency": "USD",
  "salaryPeriod": "yearly | monthly | hourly",
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

function normalizeParsedJobAd(raw: Partial<ParsedJobAd>): ParsedJobAd {
  const validCategories = ["Engineering", "Design", "Product", "Marketing", "Sales", "HR", "Finance", "Other"];
  const validJobTypes = ["full-time", "part-time", "contract", "freelance", "internship"];
  const validWorkplace = ["remote", "hybrid", "on-site"];
  const validExp = ["entry", "mid", "senior", "lead", "executive"];
  const validPeriods = ["yearly", "monthly", "hourly"];
  const validAppTypes = ["on_platform", "external_link", "email"];
  let applicationType = validAppTypes.includes(raw.applicationType as string) ? (raw.applicationType as string) : "on_platform";
  let externalUrl = typeof raw.externalUrl === "string" ? raw.externalUrl.trim() : "";
  let contactEmail = typeof raw.contactEmail === "string" ? raw.contactEmail.trim() : "";
  if (applicationType === "external_link" && !externalUrl) applicationType = "on_platform";
  if (applicationType === "email" && !contactEmail) applicationType = "on_platform";
  if (externalUrl && !/^https?:\/\//i.test(externalUrl) && !externalUrl.includes(".")) externalUrl = "";
  if (externalUrl && applicationType !== "external_link") externalUrl = "";
  if (contactEmail && !contactEmail.includes("@")) contactEmail = "";
  if (contactEmail && applicationType !== "email") contactEmail = "";

  let salaryMin = typeof raw.salaryMin === "number" && !isNaN(raw.salaryMin) ? raw.salaryMin : null;
  let salaryMax = typeof raw.salaryMax === "number" && !isNaN(raw.salaryMax) ? raw.salaryMax : null;
  let salaryCurrencyRaw = typeof raw.salaryCurrency === "string" ? raw.salaryCurrency.trim() : "";
  const symbolToCode: Record<string, string> = { "$": "USD", "£": "GBP", "€": "EUR", "₦": "NGN", "₹": "INR" };
  if (symbolToCode[salaryCurrencyRaw]) salaryCurrencyRaw = symbolToCode[salaryCurrencyRaw];
  if (salaryCurrencyRaw.length === 1 && symbolToCode[salaryCurrencyRaw]) salaryCurrencyRaw = symbolToCode[salaryCurrencyRaw];
  let salaryCurrency = salaryCurrencyRaw ? salaryCurrencyRaw.toUpperCase().slice(0, 3) : "USD";
  let salaryPeriodRaw = typeof raw.salaryPeriod === "string" ? raw.salaryPeriod.trim().toLowerCase() : "";
  const periodMap: Record<string, string> = { "per annum": "yearly", annum: "yearly", annual: "yearly", "per year": "yearly", yearly: "yearly", "per month": "monthly", monthly: "monthly", "per hour": "hourly", hourly: "hourly", "/hr": "hourly", "per hr": "hourly" };
  let salaryPeriod = periodMap[salaryPeriodRaw] ?? (validPeriods.includes(salaryPeriodRaw) ? salaryPeriodRaw : "yearly");
  if (salaryMin === null && salaryMax !== null) { salaryMin = salaryMax; salaryMax = null; }
  return {
    title: typeof raw.title === "string" ? raw.title.trim() : "",
    category: validCategories.includes(raw.category as string) ? raw.category as string : "Other",
    jobType: validJobTypes.includes(raw.jobType as string) ? raw.jobType as string : "full-time",
    workplaceType: validWorkplace.includes(raw.workplaceType as string) ? raw.workplaceType as string : "remote",
    location: typeof raw.location === "string" && raw.location.trim() ? raw.location.trim() : "Remote",
    experienceLevel: validExp.includes(raw.experienceLevel as string) ? raw.experienceLevel as string : "mid",
    salaryMin,
    salaryMax,
    salaryCurrency,
    salaryPeriod,
    description: typeof raw.description === "string" ? raw.description.trim() : "",
    requirements: normalizeStringList(raw.requirements),
    benefits: normalizeStringList(raw.benefits),
    skillsRequired: normalizeStringList(raw.skillsRequired),
    companyName: typeof raw.companyName === "string" ? raw.companyName.trim() : "",
    companyWebsite: typeof raw.companyWebsite === "string" ? raw.companyWebsite.trim() : "",
    companyLogo: typeof raw.companyLogo === "string" ? raw.companyLogo.trim() : "",
    companyLocation: typeof raw.companyLocation === "string" ? raw.companyLocation.trim() : "",
    companyIndustry: typeof raw.companyIndustry === "string" ? raw.companyIndustry.trim() : "",
    companyDescription: typeof raw.companyDescription === "string" ? raw.companyDescription.trim() : "",
    applicationType,
    externalUrl,
    contactEmail,
  };
}

export async function parseJobAdFromText(extractedText: string): Promise<ParsedJobAd> {
  assertApiKey();
  if (!extractedText.trim()) {
    return normalizeParsedJobAd({});
  }
  let { content: raw, truncated } = await callGroq(JOB_PARSE_PROMPT(extractedText), {
    model: LONG_CONTEXT_MODEL,
    systemInstruction: PARSER_SYSTEM_INSTRUCTION,
    temperature: 0,
    maxTokens: 4096,
    feature: "job_parse",
  });
  let parsed: Partial<ParsedJobAd>;
  try {
    parsed = parseJsonObject<Partial<ParsedJobAd>>(raw);
  } catch {
    if (truncated) {
      ({ content: raw } = await callGroq(JOB_PARSE_PROMPT(extractedText), {
        model: ATS_MODEL,
        systemInstruction: PARSER_SYSTEM_INSTRUCTION,
        temperature: 0,
        maxTokens: 8000,
        feature: "job_parse",
      }));
    } else {
      ({ content: raw } = await callGroq(
        `Your previous response was not valid JSON. Return ONLY the raw JSON object, no markdown, no explanation.\n\n${JOB_PARSE_PROMPT(extractedText)}`,
        {
          model: ATS_MODEL,
          systemInstruction: PARSER_SYSTEM_INSTRUCTION,
          temperature: 0,
          maxTokens: 4096,
          feature: "job_parse",
        }
      ));
    }
    parsed = parseJsonObject<Partial<ParsedJobAd>>(raw);
  }
  return normalizeParsedJobAd(parsed);
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

function normalizeMatchAnalysis(raw: Partial<MatchAnalysis>): MatchAnalysis {
  return {
    score: Math.max(0, Math.min(100, Math.round(Number(raw.score) || 0))),
    missingKeywords: normalizeStringList(raw.missingKeywords),
    missingSkills: normalizeStringList(raw.missingSkills),
    strengths: normalizeStringList(raw.strengths),
    weaknesses: normalizeStringList(raw.weaknesses),
    gaps: normalizeStringList(raw.gaps),
    suggestions: normalizeStringList(raw.suggestions),
    verdict: typeof raw.verdict === "string" ? raw.verdict.trim() : "",
  };
}

export async function analyzeResumeJobMatch(resumeText: string, jobAdText: string): Promise<MatchAnalysis> {
  assertApiKey();
  if (!resumeText.trim() || !jobAdText.trim()) {
    return normalizeMatchAnalysis({ score: 0, verdict: "Provide both resume and job ad to analyze." });
  }
  let { content: raw, truncated } = await callGroq(RESUME_JOB_MATCH_PROMPT(resumeText, jobAdText), {
    model: ATS_MODEL,
    systemInstruction: PARSER_SYSTEM_INSTRUCTION,
    temperature: 0,
    maxTokens: 2048,
    feature: "job_match_analysis",
  });
  let parsed: Partial<MatchAnalysis>;
  try {
    parsed = parseJsonObject<Partial<MatchAnalysis>>(raw);
  } catch {
    if (truncated) {
      ({ content: raw } = await callGroq(RESUME_JOB_MATCH_PROMPT(resumeText, jobAdText), {
        model: ATS_MODEL,
        systemInstruction: PARSER_SYSTEM_INSTRUCTION,
        temperature: 0,
        maxTokens: 4096,
        feature: "job_match_analysis",
      }));
    } else {
      ({ content: raw } = await callGroq(
        `Your previous response was not valid JSON. Return ONLY the raw JSON object, no markdown, no explanation.\n\n${RESUME_JOB_MATCH_PROMPT(resumeText, jobAdText)}`,
        { model: ATS_MODEL, systemInstruction: PARSER_SYSTEM_INSTRUCTION, temperature: 0, maxTokens: 2048, feature: "job_match_analysis" }
      ));
    }
    parsed = parseJsonObject<Partial<MatchAnalysis>>(raw);
  }
  return normalizeMatchAnalysis(parsed);
}

export async function parseResumeContent(extractedText: string): Promise<ResumeContent> {
  assertApiKey();
  if (!extractedText.trim()) return { ...emptyResumeContent };

  let { content: raw, truncated } = await callGroq(RESUME_PARSE_PROMPT(extractedText), {
    model: ATS_MODEL,
    systemInstruction: PARSER_SYSTEM_INSTRUCTION,
    temperature: 0.1,
    maxTokens: 4096,
    feature: "resume_parse",
  });

  let parsed: Partial<ResumeContent>;
  try {
    parsed = parseJsonObject<Partial<ResumeContent>>(raw);
  } catch {
    if (truncated) {
      console.warn("First parse response truncated, retrying with larger budget...");
      ({ content: raw } = await callGroq(RESUME_PARSE_PROMPT(extractedText), {
        model: ATS_MODEL,
        systemInstruction: PARSER_SYSTEM_INSTRUCTION,
        temperature: 0,
        maxTokens: 8000,
        feature: "resume_parse",
      }));
    } else {
      console.warn("First parseResumeContent attempt failed, retrying...");
      ({ content: raw } = await callGroq(
        `Your previous response was not valid JSON. Return ONLY the raw JSON object, no markdown, no explanation.\n\n${RESUME_PARSE_PROMPT(extractedText)}`,
        {
          model: ATS_MODEL,
          systemInstruction: PARSER_SYSTEM_INSTRUCTION,
          temperature: 0,
          maxTokens: 4096,
          feature: "resume_parse",
        }
      ));
    }
    parsed = parseJsonObject<Partial<ResumeContent>>(raw);
  }

  return normalizeResumeContent(parsed);
}