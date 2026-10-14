/**
 * Joins an optional intro, the AI-generated letter body, and an optional
 * outro into the full text that gets copied or emailed. Empty parts are
 * skipped so a missing outro leaves no trailing blank lines.
 */
export function composeCoverLetterBody(args: {
  body: string;
  intro?: string;
  outro?: string;
}): string {
  const intro = (args.intro || "").trim();
  const body = (args.body || "").trim();
  const outro = (args.outro || "").trim();
  return [intro, body, outro].filter(Boolean).join("\n\n");
}
