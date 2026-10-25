export const MAX_PDF_BYTES = 10 * 1024 * 1024;

export const MAX_PDF_MB = MAX_PDF_BYTES / (1024 * 1024);

// Hard ceiling for every plan. Per-plan limits below cannot exceed it.
export const MAX_PDF_PAGES = 3;

export const MAX_PDF_PAGES_PER_PLAN: Record<string, number> = {
  free: 2,
  pro: 3,
  proPlus: 3,
};

export function maxPdfPagesForPlan(plan: string | null | undefined): number {
  const planLimit = MAX_PDF_PAGES_PER_PLAN[plan ?? "free"] ?? MAX_PDF_PAGES_PER_PLAN.free;
  return Math.min(planLimit, MAX_PDF_PAGES);
}

export const STALE_EXTRACTION_MS = 5 * 60 * 1000;

export const FILE_HASH_PATTERN = /^[a-f0-9]{64}$/;

// Bump this version string whenever AI prompt, model, or parsing schema changes.
// Lives here (not in server-only ai/client) so the browser can compare it too.
export const EXTRACTION_VERSION = "v1";
