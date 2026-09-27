import "server-only";

import type { AtsReport } from "@/types/AtsReport";
import type { ResumeContent } from "@/types/ResumeData";
import type { AiRequestContext } from "./context";
import { ATS_MODEL, ATS_SYSTEM_INSTRUCTION, assertApiKey } from "./client";
import { callGroqJson } from "./groqCalls";
import { parseJsonObject } from "./json";
import { normalizeAtsReport } from "./normalize";

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
  ctx: AiRequestContext,
  existingResume?: ResumeContent
): Promise<AtsReport> {
  assertApiKey();

  const knownResumeBlock = existingResume
    ? `\nExisting structured resume JSON:\n${JSON.stringify(existingResume, null, 2)}`
    : "";

  const prompt = ATS_PROMPT(extractedText, knownResumeBlock);

  const { parsed } = await callGroqJson<Partial<AtsReport>>(prompt, {
    model: ATS_MODEL,
    systemInstruction: ATS_SYSTEM_INSTRUCTION,
    temperature: 0.1,
    maxTokens: 4096,
    feature: "ats_analysis",
    parse: (raw) => parseJsonObject<Partial<AtsReport>>(raw),
    ctx,
  });

  return normalizeAtsReport(parsed, extractedText);
}
