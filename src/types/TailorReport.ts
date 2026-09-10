import { ResumeContent } from "./ResumeData";
import type { JobMatchAnalysis } from "./JobApplicationData";

export interface TailorReport {
  explanation: string;
  keyChanges: string[];
  tailoredResume: ResumeContent;
  matchAnalysis: JobMatchAnalysis;
}
