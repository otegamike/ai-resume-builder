import Groq from "groq-sdk";
import { AtsReport } from "@/types/AtsReport";
import { ResumeContent } from "@/types/ResumeData";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Use a capable model for structured JSON output
const ATS_MODEL = "llama-3.3-70b-versatile";
const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const GENERATION_MODEL = "llama-3.1-8b-instant"; // fine for simple text gen

const ATS_SYSTEM_INSTRUCTION =
  "You are an expert ATS resume analyst. You ONLY output raw valid JSON. Never use markdown code fences. Never add explanations before or after the JSON object. Your entire response must be parseable by JSON.parse().";

const WRITER_SYSTEM_INSTRUCTION =
  "You are a professional resume writer. Write concise, impactful content that is ATS-friendly and highlights achievements. Use action verbs and quantify results when possible.";

// ─── Types ────────────────────────────────────────────────────────────────────

const emptyResumeContent: ResumeContent = {
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
  skills: [],
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
    skills: normalizeStringList(content?.skills),
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
  } = {}
): Promise<string> {
  const {
    model = GENERATION_MODEL,
    systemInstruction = WRITER_SYSTEM_INSTRUCTION,
    temperature = 0.3,
    maxTokens = 1024,
  } = options;

  const completion = await groq.chat.completions.create({
    model,
    temperature,
    max_completion_tokens: maxTokens,
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: prompt },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() || "";
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
- Extract ALL skills mentioned anywhere in the resume text into skills[]
- Strengthen bullets with stronger action verbs and inferable metrics
- Do NOT invent companies, schools, degrees, dates, or credentials
- Keep all facts truthful — only improve clarity, impact, and keyword alignment

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
  "extractedText": "lowercase raw resume text",
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
    "skills": ["string"]
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
    "skills": ["string"]
  }
}

Resume:
${extractedText}
${knownResumeBlock}`.trim();

export async function analyzeResumeForAts(
  extractedText: string,
  existingResume?: ResumeContent
): Promise<AtsReport> {
  assertApiKey();

  const knownResumeBlock = existingResume
    ? `\nExisting structured resume JSON:\n${JSON.stringify(existingResume, null, 2)}`
    : "";

  const prompt = ATS_PROMPT(extractedText, knownResumeBlock);

  // Attempt 1
  let raw = await callGroq(prompt, {
    model: ATS_MODEL,
    systemInstruction: ATS_SYSTEM_INSTRUCTION,
    temperature: 0.1,   // near-deterministic for structured output
    maxTokens: 4096,
  });

  // Retry once on parse failure with a stern nudge
  let parsed: Partial<AtsReport>;
  try {
    parsed = parseJsonObject<Partial<AtsReport>>(raw);
  } catch {
    console.warn("First ATS parse failed, retrying...");
    raw = await callGroq(
      `Your previous response was not valid JSON. Return ONLY the raw JSON object, no markdown, no explanation.\n\n${prompt}`,
      {
        model: ATS_MODEL,
        systemInstruction: ATS_SYSTEM_INSTRUCTION,
        temperature: 0,
        maxTokens: 4096,
      }
    );
    parsed = parseJsonObject<Partial<AtsReport>>(raw);
  }

  return normalizeAtsReport(parsed, extractedText);
}

// ─── Image Extraction ─────────────────────────────────────────────────────────

export async function extractResumeTextFromImages(dataUrls: string[]): Promise<string> {
  assertApiKey();
  if (dataUrls.length === 0) return "";

  const completion = await groq.chat.completions.create({
    model: VISION_MODEL,
    temperature: 0.1,
    max_completion_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract all readable resume/CV text from these image page(s). Preserve section headings, dates, contact details, skills, and bullet points in page order. Return only the extracted text.",
          },
          ...dataUrls.map((url) => ({
            type: "image_url" as const,
            image_url: { url },
          })),
        ],
      },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() || "";
}

export async function extractResumeTextFromImage(dataUrl: string): Promise<string> {
  return extractResumeTextFromImages([dataUrl]);
}

// ─── Resume Writing Helpers ───────────────────────────────────────────────────

export async function generateWithAI(prompt: string): Promise<string> {
  assertApiKey();
  return callGroq(prompt);
}

export async function generateSummary(
  jobTitle: string,
  experience: string,
  skills: string[],
  achievements: string[]
): Promise<string> {
  return callGroq(
    `Write a one-sentence professional summary for a ${jobTitle} with ${experience} years of experience. Skills: ${skills.join(", ")}. Key achievements:\n- ${achievements.join("\n- ")}\n\nReturn only the summary sentence.`
  );
}

export async function generateExperienceBulletPoints(
  company: string,
  role: string,
  description: string
): Promise<string[]> {
  const result = await callGroq(
    `Transform this job description into 3 impactful ATS-friendly bullet points.\nCompany: ${company}\nRole: ${role}\nDescription: ${description}\n\nUse action verbs and quantify achievements. Return only the 3 bullet points, one per line, no dashes or bullets prefix.`
  );
  return result
    .split("\n")
    .map((s) => s.trim().replace(/^[-•–—*]\s*/, ""))
    .filter((s) => s.length > 0)
    .slice(0, 3);
}

export async function improveSummary(existingSummary: string): Promise<string> {
  return callGroq(
    `Improve this professional summary to be more impactful and ATS-friendly. Keep it one sentence.\n\n${existingSummary}\n\nReturn only the improved summary.`
  );
}

export async function generateSkillsSuggestions(jobTitle: string): Promise<string[]> {
  const result = await callGroq(
    `List 8-10 relevant technical and soft skills for a ${jobTitle}. Return only a comma-separated list, no explanations.`
  );
  return result
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}