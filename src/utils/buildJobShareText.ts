export interface ShareableJob {
  title: string;
  companyName?: string;
  location?: string;
  jobType?: string;
  workplaceType?: string;
  description?: string;
  requirements?: string[];
  skillsRequired?: string[];
  benefits?: string[];
}

function stripHtmlToText(value: string): string {
  const withoutTags = value.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|ul|ol|h\d)>/gi, "\n").replace(/<[^>]*>/g, "");
  return withoutTags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Builds plain share text for a job ad in the same order as the page:
 * header, description, requirements, skills, benefits, then the short link.
 * Sections that are empty are left out.
 */
export function buildJobShareText(job: ShareableJob, shortUrl: string): string {
  const parts: string[] = [];
  const header = [job.title, job.companyName ? `at ${job.companyName}` : ""].filter(Boolean).join(" ").trim();
  if (header) parts.push(header);

  const meta = [job.location, job.jobType, job.workplaceType].filter(Boolean).join(" | ");
  if (meta) parts.push(meta);

  if (job.description?.trim()) {
    parts.push(`Job Description\n${stripHtmlToText(job.description)}`);
  }
  if (job.requirements?.length) {
    parts.push(`Requirements & Qualifications\n${job.requirements.map((r) => `- ${r.trim()}`).join("\n")}`);
  }
  if (job.skillsRequired?.length) {
    parts.push(`Required Skills\n${job.skillsRequired.map((s) => `- ${s.trim()}`).join("\n")}`);
  }
  if (job.benefits?.length) {
    parts.push(`Perks & Benefits\n${job.benefits.map((b) => `- ${b.trim()}`).join("\n")}`);
  }

  parts.push(`Apply here: ${shortUrl}`);
  return parts.join("\n\n");
}
