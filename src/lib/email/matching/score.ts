/**
 * Phase 2 (design only, never called in production): related-jobs scoring.
 * Pure function, no DB access, so it is cheap to unit test.
 *
 * Score = weighted sum of skill overlap (Jaccard), title similarity to jobs
 * the user previously applied to, category match, and recency. Jobs already
 * applied to, the user's own postings, and hidden jobs are excluded.
 */

export interface MatchCandidate {
  jobId: string;
  title: string;
  category: string;
  skills: string[];
  postedAt: Date | string;
  ownJob?: boolean;
  hidden?: boolean;
}

export interface MatchProfile {
  skills: string[];
  appliedJobIds: string[];
  appliedTitles: string[];
  appliedCategories: string[];
}

export interface ScoredJob {
  jobId: string;
  score: number;
}

export interface MatchOptions {
  topN?: number;
  minScore?: number;
  now?: Date;
}

const WEIGHTS = { skills: 0.5, title: 0.25, category: 0.15, recency: 0.1 } as const;
const RECENCY_WINDOW_DAYS = 30;

function normalizeTokens(values: string[]): Set<string> {
  const tokens = new Set<string>();
  for (const value of values) {
    for (const part of value.toLowerCase().split(/[^a-z0-9+#]+/)) {
      const token = part.trim();
      if (token.length >= 2) tokens.add(token);
    }
  }
  return tokens;
}

function jaccard(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) return 0;
  let overlap = 0;
  for (const token of left) {
    if (right.has(token)) overlap += 1;
  }
  const union = left.size + right.size - overlap;
  return union === 0 ? 0 : overlap / union;
}

function recencyScore(postedAt: Date | string, now: Date): number {
  const posted = postedAt instanceof Date ? postedAt : new Date(postedAt);
  if (Number.isNaN(posted.getTime()) || posted.getTime() > now.getTime()) return 0;
  const ageDays = (now.getTime() - posted.getTime()) / (24 * 3_600_000);
  return Math.max(0, 1 - ageDays / RECENCY_WINDOW_DAYS);
}

export function scoreRelatedJobs(
  profile: MatchProfile,
  candidates: MatchCandidate[],
  options?: MatchOptions
): ScoredJob[] {
  const topN = options?.topN ?? 5;
  const minScore = options?.minScore ?? 0.3;
  const now = options?.now ?? new Date();

  const applied = new Set(profile.appliedJobIds.map(String));
  const userSkills = normalizeTokens(profile.skills);
  const appliedTitleTokens = normalizeTokens(profile.appliedTitles);
  const appliedCategories = new Set(profile.appliedCategories.map((entry) => entry.toLowerCase()));

  const scored: ScoredJob[] = [];
  for (const candidate of candidates) {
    if (applied.has(String(candidate.jobId))) continue;
    if (candidate.ownJob || candidate.hidden) continue;
    const skills = jaccard(userSkills, normalizeTokens(candidate.skills));
    const title = jaccard(appliedTitleTokens, normalizeTokens([candidate.title]));
    const category = appliedCategories.has(candidate.category.toLowerCase()) ? 1 : 0;
    const recency = recencyScore(candidate.postedAt, now);
    const score =
      WEIGHTS.skills * skills + WEIGHTS.title * title + WEIGHTS.category * category + WEIGHTS.recency * recency;
    if (score >= minScore) scored.push({ jobId: String(candidate.jobId), score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN);
}

/**
 * Stagger digest recipients into daily cohorts so sends spread across days.
 * Deterministic per user id; changing `buckets` reshuffles, so keep it fixed.
 */
export function digestCohort(userId: string, buckets = 7): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < userId.length; i += 1) {
    hash ^= userId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return Math.abs(hash) % buckets;
}
