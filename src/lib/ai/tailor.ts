import "server-only";

import type { TailorReport } from "@/types/TailorReport";
import type { ResumeContent } from "@/types/ResumeData";
import type { JobMatchAnalysis } from "@/types/JobApplicationData";
import type { AiRequestContext } from "./context";
import { ATS_MODEL, TAILOR_SYSTEM_INSTRUCTION, assertApiKey } from "./client";
import { callGroqJson } from "./groqCalls";
import { parseJsonObject } from "./json";
import { normalizeTailorReport } from "./normalize";

export type MatchAnalysis = JobMatchAnalysis;

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
  ctx: AiRequestContext,
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

  const { parsed } = await callGroqJson<Partial<TailorReport>>(prompt, {
    model: ATS_MODEL,
    systemInstruction: TAILOR_SYSTEM_INSTRUCTION,
    temperature: 0.1,
    maxTokens: 4096,
    feature: "tailor",
    parse: (raw) => parseJsonObject<Partial<TailorReport>>(raw),
    ctx,
  });

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
  ctx: AiRequestContext,
  existingResume?: ResumeContent
): Promise<TailorReport> {
  assertApiKey();
  const knownResumeBlock = existingResume ? `\nExisting structured resume JSON:\n${JSON.stringify(existingResume, null, 2)}` : "";
  const prompt = GROUNDED_TAILOR_PROMPT(resumeText, knownResumeBlock, jobDescription, analysis);
  const { parsed } = await callGroqJson<Partial<TailorReport>>(prompt, {
    model: ATS_MODEL,
    systemInstruction: TAILOR_SYSTEM_INSTRUCTION,
    temperature: 0.1,
    maxTokens: 4096,
    feature: "tailor_grounded",
    parse: (raw) => parseJsonObject<Partial<TailorReport>>(raw),
    ctx,
  });
  return normalizeTailorReport(parsed);
}
