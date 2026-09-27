import "server-only";

import type { CoverLetterResult } from "@/types/CoverLetterData";
import type { ResumeContent } from "@/types/ResumeData";
import type { AiRequestContext } from "./context";
import {
  COVER_LETTER_SYSTEM_INSTRUCTION,
  GENERATION_MODEL,
  LONG_CONTEXT_MODEL,
  assertApiKey,
} from "./client";
import { callGroqJson } from "./groqCalls";
import { parseJsonObject } from "./json";

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

1. **Opening**: Do NOT start with generic filler like "I'm excited to apply," "I saw your job posting," or "Your opportunity caught my eye." Do NOT paraphrase the company's stated mission, tagline, or "what we do" description back to them — restating their own pitch in different words is not an observation, it's a mirror. Instead, name a specific challenge or tension the role realistically involves day-to-day (something implied by the responsibilities, not just the company's marketing language), and briefly note why that's the kind of problem the candidate finds engaging. Never use the phrase "aligns with my passion" or similar stock enthusiasm phrasing.

2. **Experience narrative**: Synthesize the candidate's overall professional experience into a flowing narrative, IN YOUR OWN WORDS. Do NOT copy or closely paraphrase resume bullet points line by line. Describe the shape and scope of their work (what kinds of problems they solve, how they operate, what they're known for) rather than listing what they did. Do not include metrics or numbers.

3. **Project highlight**: Reference only ONE or TWO specific named projects from the resume, briefly, and explain what building them reinforced or taught the candidate. Do not list every project. Do not re-describe the projects in detail, just enough to be recognizable.

4. **Technical fit**: Weave 4-6 relevant technical skills into 2-3 sentences that connect to the job description's requirements, showing range across the stack.
   - Use high-ownership, architectural verbs: architect, engineer, craft, scale, enforce, drive, build out — never "leverage," "utilize," "routinely build," or "I use."
   - Frame the stack as how the candidate operates, not what they've touched: e.g. "core stack centers on X and Y for Z" or "I architect end-to-end apps, building A with X, enforcing B with Y."
   - Absolutely no comma-separated tool inventories and no "I routinely build / use / leverage" constructions.

5. **Closing**: Reaffirm enthusiasm for contributing to this specific company/team. End with a concrete next step (e.g. offering to walk through relevant work), never a stock line like "I look forward to hearing from you." Keep to one or two sentences.

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
  ctx: AiRequestContext,
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

  const { parsed } = await callGroqJson<Partial<CoverLetterResult>>(prompt, {
    model: GENERATION_MODEL,
    systemInstruction: COVER_LETTER_SYSTEM_INSTRUCTION,
    temperature: 0.3,
    maxTokens: 3072,
    feature: "cover_letter",
    parse: (raw) => parseJsonObject<Partial<CoverLetterResult>>(raw),
    retryMaxTokens: 6000,
    retryModel: LONG_CONTEXT_MODEL,
    ctx,
  });

  return {
    content: parsed.content || "",
    inferredRole: parsed.inferredRole || "",
    inferredCompany: parsed.inferredCompany || "",
  };
}
