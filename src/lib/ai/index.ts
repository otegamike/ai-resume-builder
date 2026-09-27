import "server-only";

import type { JobMatchAnalysis } from "@/types/JobApplicationData";

export type MatchAnalysis = JobMatchAnalysis;

export type { AiRequestContext } from "./context";
export { aiContextFromAuthUser } from "./context";

export {
  GroqCallError,
  assertApiKey,
} from "./client";
export type { GroqFailureKind } from "./client";

export { toAiErrorResponse } from "./errors";

export { emptyResumeContent } from "./normalize";

export { analyzeResumeForAts } from "./ats";

export {
  extractTextFromSingleImage,
  extractResumeTextFromImages,
  extractResumeTextFromImage,
  extractTextFromJobImage,
} from "./vision";

export { tailorResume, tailorResumeGrounded } from "./tailor";

export {
  generateWithAI,
  generateSummary,
  generateExperienceBulletPoints,
  improveSummary,
  generateSkillsSuggestions,
  generateCategorizedSkills,
  categorizeExistingSkills,
} from "./writer";

export { generateBlogMeta } from "./blog";

export { generateCoverLetter } from "./coverLetter";

export { parseResumeContent } from "./resumeParse";

export {
  parseJobAdFromText,
  generateJobShareSummary,
  analyzeResumeJobMatch,
} from "./jobs";

// Canonical result shapes live in src/types. Re-exported here so existing
// `@/lib/ai` imports keep working while consumers migrate.
export type { CoverLetterResult } from "@/types/CoverLetterData";
export type { ParsedJobAd } from "@/types/JobAdData";
