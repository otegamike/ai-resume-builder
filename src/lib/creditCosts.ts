export const CREDIT_COST = {
  generateSummary: 100,
  improveSummary: 100,
  generateBulletPoints: 100,
  generateSkills: 100,
  generateCategorizedSkills: 100,
  categorizeExistingSkills: 100,
  atsAnalysisUpload: 300,
  atsAnalysisSaved: 200,
  resumeTailor: 300,
  coverLetterGenerate: 200,
  quickApply: 500,
} as const;

export const UNLIMITED_CREDITS = 999999;

export const MAX_CREDITS_PER_PLAN = {
  free: 1000,
  pro: 10000,
  proPlus: UNLIMITED_CREDITS,
};

export const MAX_PDF_PAGES_PER_PLAN: Record<string, number> = {
  free: 3,
  pro: 4,
  proPlus: 4,
};

export type AiFeature = keyof typeof CREDIT_COST;

export function formatPlan(plan: string | null | undefined): string {
  switch (plan) {
    case "proPlus": return "Pro+";
    case "pro": return "Pro";
    case "free": return "Free";
    default: return "Free";
  }
}
