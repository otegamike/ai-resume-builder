/**
 * Builds a mailto: link for off-platform email applications.
 * Subject is "job title - applicant name" (falls back to job title alone).
 * Body holds only the cover letter. Long bodies are shortened so the
 * link stays usable in mail clients.
 */
export function buildJobApplyMailto(args: {
  email: string;
  jobTitle: string;
  applicantName: string;
  coverLetter?: string;
}): string {
  const email = args.email.trim();
  const jobTitle = args.jobTitle.trim();
  const applicantName = args.applicantName.trim();
  const subject = applicantName ? `${jobTitle} - ${applicantName}` : jobTitle;
  const coverLetter = (args.coverLetter || "").trim();

  const href = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
  if (!coverLetter) return href;

  const maxHrefLength = 1800;
  let body = coverLetter;
  let fullHref = `${href}&body=${encodeURIComponent(body)}`;
  if (fullHref.length > maxHrefLength) {
    const overflow = fullHref.length - maxHrefLength;
    const bodyBudget = Math.max(0, body.length - overflow - 32);
    body = `${body.slice(0, bodyBudget).trimEnd()}... [continued in portal]`;
    fullHref = `${href}&body=${encodeURIComponent(body)}`;
  }
  return fullHref;
}
