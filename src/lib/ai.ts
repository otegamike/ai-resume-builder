import Groq from "groq-sdk";
import { AtsReport } from "@/types/AtsReport";
import { ResumeContent } from "@/types/ResumeData";
import { TailorReport } from "@/types/TailorReport";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Use a capable model for structured JSON output
const ATS_MODEL = "llama-3.3-70b-versatile";
const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const GENERATION_MODEL = "openai/gpt-oss-20b"; // fine for simple text gen


const ATS_SYSTEM_INSTRUCTION =
  "You are an expert ATS resume analyst. You ONLY output raw valid JSON. Never use markdown code fences. Never add explanations before or after the JSON object. Your entire response must be parseable by JSON.parse().";

const WRITER_SYSTEM_INSTRUCTION =
  "You are a professional resume writer. Write concise, impactful content that is ATS-friendly and highlights achievements. Use action verbs and quantify results when possible.";

const COVER_LETTER_SYSTEM_INSTRUCTION =
  "You are a professional cover letter writer. You ONLY output raw valid JSON. Never use markdown code fences. Never add explanations before or after the JSON object. Your entire response must be parseable by JSON.parse().";

const TAILOR_SYSTEM_INSTRUCTION =
  "You are an expert recruiter and resume writer. You ONLY output raw valid JSON. Never use markdown code fences. Never add explanations before or after the JSON object. Your entire response must be parseable by JSON.parse().";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CoverLetterResult {
  content: string;
  inferredRole: string;
  inferredCompany: string;
}

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
    matchScoreBefore: Math.max(0, Math.min(100, Number(report.matchScoreBefore) || 0)),
    matchScoreAfter: Math.max(0, Math.min(100, Number(report.matchScoreAfter) || 0)),
    explanation: report.explanation || "CV tailored for the job.",
    keyChanges: normalizeStringList(report.keyChanges),
    tailoredResume: normalizeResumeContent(report.tailoredResume),
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

export async function extractTextFromJobImage(dataUrl: string): Promise<string> {
  assertApiKey();
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
            text: "Extract all readable text from this job description / job posting image. Preserve job title, responsibilities, requirements, and keywords. Return only the extracted text.",
          },
          {
            type: "image_url" as const,
            image_url: { url: dataUrl },
          },
        ],
      },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() || "";
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

Analyze the resume/CV against the job description. First, evaluate how well the current resume matches the job description and calculate a 'before' compatibility score (0-100).
Then, perform the tailoring and optimize the resume content for the job, calculating an 'after' compatibility score (0-100) representing how well the tailored resume matches the job description.

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
7. **Assign Compatibility Scores**: 
   - 'matchScoreBefore': compatibility score (0-100) of the original resume.
   - 'matchScoreAfter': compatibility score (0-100) of the tailored resume.

## SKILL FORMAT RULES
- If the resume has flat skills[], use skills[] in the output (set skillCategorized to false)
- If the resume has categorized skills (skillCategories[]), use skillCategories[] in the output (set skillCategorized to true)
- skills[] and skillCategories[] are mutually exclusive — only populate one

## REQUIRED JSON SCHEMA
{
  "matchScoreBefore": 45,
  "matchScoreAfter": 85,
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

  // Attempt 1
  let raw = await callGroq(prompt, {
    model: ATS_MODEL,
    systemInstruction: TAILOR_SYSTEM_INSTRUCTION,
    temperature: 0.1,
    maxTokens: 4096,
  });

  let parsed: Partial<TailorReport>;
  try {
    parsed = parseJsonObject<Partial<TailorReport>>(raw);
  } catch {
    console.warn("First tailor parse failed, retrying...");
    raw = await callGroq(
      `Your previous response was not valid JSON. Return ONLY the raw JSON object, no markdown, no explanation.\n\n${prompt}`,
      {
        model: ATS_MODEL,
        systemInstruction: TAILOR_SYSTEM_INSTRUCTION,
        temperature: 0,
        maxTokens: 4096,
      }
    );
    parsed = parseJsonObject<Partial<TailorReport>>(raw);
  }

  return normalizeTailorReport(parsed);
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

export async function generateCategorizedSkills(jobTitle: string): Promise<any[]> {
  const result = await callGroq(
    `Generate 3-5 categories of skills for a ${jobTitle} with 3-5 skills each.
     Return ONLY a valid JSON array of objects with keys "category" and "skills" (array of strings).
     No markdown, no explanation.`,
    {
      temperature: 0.1,
      maxTokens: 2048,
      systemInstruction: ATS_SYSTEM_INSTRUCTION,
    }
  );
  return parseJsonArray<{ category: string; skills: string[] }>(result);
}

export async function categorizeExistingSkills(skills: string[]): Promise<{ category: string; skills: string[] }[]> {
  if (skills.length === 0) return [];

  const result = await callGroq(
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
    }
  );

  const parsed = parseJsonArray<{ category: string; skills: string[] }>(result);

  const allCategorized = parsed.flatMap(c => c.skills);
  const missing = skills.filter(s => !allCategorized.includes(s));
  if (missing.length > 0) {
    parsed.push({ category: "Other", skills: missing });
  }

  return parsed;
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

4. **Technical fit**: Weave 4-6 relevant technical skills into natural sentences that connect to the job description's requirements, showing range across the stack. Avoid comma-separated tool lists; skills should read as part of what the candidate does, not an inventory.

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

  let raw = await callGroq(prompt, {
    model: GENERATION_MODEL,
    systemInstruction: COVER_LETTER_SYSTEM_INSTRUCTION,
    temperature: 0.3,
    maxTokens: 2048,
  });

  console.log("raw cover letter", raw);

  let parsed: Partial<CoverLetterResult>;
  try {
    parsed = parseJsonObject<Partial<CoverLetterResult>>(raw);
  } catch {
    console.warn("First cover letter parse failed, retrying...");
    raw = await callGroq(
      `Your previous response was not valid JSON. Return ONLY the raw JSON object, no markdown, no explanation.\n\n${prompt}`,
      {
        model: GENERATION_MODEL,
        systemInstruction: COVER_LETTER_SYSTEM_INSTRUCTION,
        temperature: 0,
        maxTokens: 2048,
      }
    );
    console.log("raw cover letter", raw);
    parsed = parseJsonObject<Partial<CoverLetterResult>>(raw);
  }

  return {
    content: parsed.content || "",
    inferredRole: parsed.inferredRole || "",
    inferredCompany: parsed.inferredCompany || "",
  };
}