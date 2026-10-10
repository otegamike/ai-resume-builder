import "server-only";

import type { AiRequestContext } from "./context";
import {
  GENERATION_MODEL,
  assertApiKey,
} from "./client";
import { callGroqJson } from "./groqCalls";
import { parseJsonObject } from "./json";

export interface CandidateMessageDraft {
  subject: string;
  body: string;
}

const CANDIDATE_MESSAGE_SYSTEM_INSTRUCTION =
  "You draft short, professional hiring emails from an employer to a job candidate. Plain text only, no markdown, no placeholders.";

const CANDIDATE_MESSAGE_PROMPT = (
  candidateName: string,
  jobTitle: string,
  companyName: string,
  status: string,
  jobDescription: string
) => `
You are drafting an email from the hiring team to a job candidate. Return ONLY a valid JSON object with this exact schema — no markdown, no explanation:

{
  "subject": "Short email subject line, max 120 characters",
  "body": "The email body as a single string with \\n newlines, max 5 short paragraphs"
}

## RULES
- Address the candidate by first name only (${candidateName}).
- The email concerns their application for ${jobTitle} at ${companyName}, currently at stage: ${status}.
- Match the tone to the stage: warm and forward-looking for shortlisted/interviewing/offered, neutral for under review, kind and brief for rejected.
- Never invent interview times, offer details, salaries, or next steps more specific than "we will be in touch".
- Do not include a subject line, greeting, or signature inside the body — the template adds those.
- Standard punctuation only, no emojis.

## JOB POSTING (for context on the role)
${jobDescription}
`;

export async function generateCandidateMessage(
  candidateName: string,
  jobTitle: string,
  companyName: string,
  status: string,
  jobDescription: string,
  ctx: AiRequestContext
): Promise<CandidateMessageDraft> {
  assertApiKey();

  const prompt = CANDIDATE_MESSAGE_PROMPT(
    candidateName,
    jobTitle,
    companyName,
    status,
    jobDescription.slice(0, 6000)
  );

  const { parsed } = await callGroqJson<Partial<CandidateMessageDraft>>(prompt, {
    model: GENERATION_MODEL,
    systemInstruction: CANDIDATE_MESSAGE_SYSTEM_INSTRUCTION,
    temperature: 0.4,
    maxTokens: 1024,
    feature: "candidate_message",
    parse: (raw) => parseJsonObject<Partial<CandidateMessageDraft>>(raw),
    ctx,
  });

  return {
    subject: (parsed.subject || "").trim().slice(0, 120),
    body: (parsed.body || "").trim().slice(0, 5000),
  };
}
