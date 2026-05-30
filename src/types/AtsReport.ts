import { ResumeContent } from "./ResumeData";

export type AtsIssueSeverity = "high" | "medium" | "low";

export type AtsIssueSection =
  | "contact"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "formatting"
  | "keywords";

export interface AtsIssue {
  severity: AtsIssueSeverity;
  section: AtsIssueSection;
  title: string;
  detail: string;
  suggestion: string;
}

export interface AtsReport {
  score: number;
  verdict: string;
  strengths: string[];
  issues: AtsIssue[];
  recommendedKeywords: string[];
  extractedText: string;
  parsedResume: ResumeContent;
  improvedResume: ResumeContent;
}
