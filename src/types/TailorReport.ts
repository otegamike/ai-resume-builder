import { ResumeContent } from "./ResumeData";

export interface TailorReport {
  matchScoreBefore: number;
  matchScoreAfter: number;
  explanation: string;
  keyChanges: string[];
  tailoredResume: ResumeContent;
}
