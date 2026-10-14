import { composeCoverLetterBody } from "./composeCoverLetterBody";
import { useUserStore, DEFAULT_COVER_LETTER_INTRO } from "@/store/useUserStore";

/**
 * Builds a mailto: link for off-platform email applications.
 * Subject is "job title - applicant name" (falls back to job title alone).
 * Body holds the cover letter wrapped with the user's saved intro/outro.
 * Long bodies are shortened so the link stays usable in mail clients.
 *
 * Intro/outro fall back to the user store when not passed explicitly, so
 * callers can override per letter (e.g. tests or previews) while the
 * default path needs no extra wiring.
 */
export function buildJobApplyMailto(args: {
  email: string;
  jobTitle: string;
  applicantName: string;
  coverLetter?: string;
  intro?: string;
  outro?: string;
}): string {
  const email = args.email.trim();
  const jobTitle = args.jobTitle.trim();
  const applicantName = args.applicantName.trim();
  const subject = applicantName ? `${jobTitle} - ${applicantName}` : jobTitle;

  let intro = args.intro;
  let outro = args.outro;
  if (intro === undefined || outro === undefined) {
    try {
      const prefs = useUserStore.getState();
      if (intro === undefined) intro = prefs.coverLetterIntro || DEFAULT_COVER_LETTER_INTRO;
      if (outro === undefined) outro = prefs.coverLetterOutro || "";
    } catch {
      if (intro === undefined) intro = DEFAULT_COVER_LETTER_INTRO;
      if (outro === undefined) outro = "";
    }
  }

  const href = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
  if (!(args.coverLetter || "").trim()) return href;

  const body = composeCoverLetterBody({
    body: args.coverLetter || "",
    intro,
    outro,
  });
  if (!body) return href;

  const maxHrefLength = 3800;
  let fullHref = `${href}&body=${encodeURIComponent(body)}`;
  if (fullHref.length > maxHrefLength) {
    const overflow = fullHref.length - maxHrefLength;
    const bodyBudget = Math.max(0, body.length - overflow - 32);
    const shortened = `${body.slice(0, bodyBudget).trimEnd()}... [continued in portal]`;
    fullHref = `${href}&body=${encodeURIComponent(shortened)}`;
  }
  return fullHref;
}
