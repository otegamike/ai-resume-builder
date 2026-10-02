import "server-only";

import type { ResumeContent } from "@/types/ResumeData";
import type { AiRequestContext } from "./context";
import { ATS_MODEL, PARSER_SYSTEM_INSTRUCTION, assertApiKey } from "./client";
import { callGroqJson } from "./groqCalls";
import { parseJsonObject } from "./json";
import { emptyResumeContent, normalizeResumeContent } from "./normalize";

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
- Do NOT invent or hallucinate information not present in the text.
- If a section is empty or missing, use an empty array or empty string.

Skills rules:
- ALWAYS populate "skills" with a flat, de-duplicated array of every skill mentioned, regardless of grouping.
- If the resume groups skills under labeled headings (e.g. "Languages: JavaScript, Python", "Frontend: React, Vue", "Tools: Git, Docker"):
  - Set "skillCategorized" to true.
  - Populate "skillCategories" with one entry per heading: { "id": "<1-based index as string>", "category": "<heading text exactly as written>", "skills": ["..."] }.
  - Every skill in skillCategories must also appear in the flat "skills" array.
  - Do NOT create categories the resume doesn't have, and do NOT regroup skills yourself.
- If skills are listed without any grouping, set "skillCategorized" to false and "skillCategories" to [].

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
  "skillCategories": [
    { "id": "1", "category": "string", "skills": ["string"] }
  ],
  "skillCategorized": false
}

Resume text to parse:
${text}`;

export async function parseResumeContent(
  extractedText: string,
  ctx: AiRequestContext
): Promise<ResumeContent> {
  assertApiKey();
  if (!extractedText.trim()) return { ...emptyResumeContent };

  const { parsed } = await callGroqJson<Partial<ResumeContent>>(RESUME_PARSE_PROMPT(extractedText), {
    model: ATS_MODEL,
    systemInstruction: PARSER_SYSTEM_INSTRUCTION,
    temperature: 0.1,
    maxTokens: 4096,
    feature: "resume_parse",
    parse: (raw) => parseJsonObject<Partial<ResumeContent>>(raw),
    ctx,
  });

  return normalizeResumeContent(parsed);
}
