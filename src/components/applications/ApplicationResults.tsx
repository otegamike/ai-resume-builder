"use client";

import Link from "next/link";
import {
  ArrowRight,
  Edit,
} from "lucide-react";
import ScoreCircle from "@/components/ui/score-circle/ScoreCircle";
import ResumeComponent from "@/components/resume/ResumeComponent";
import CoverLetterCard from "@/components/applications/CoverLetterCard";
import type { TailorReport } from "@/types/TailorReport";
import styles from "@/app/dashboard/applications/page.module.css";

interface ApplicationResultsProps {
  report: TailorReport | null;
  coverLetter: string;
  onCopy: () => void;
  copied: boolean;
  savedResumeId: string | null;
  selectedTemplateId?: string;
  onEditChange?: (newContent: string) => void;
  targetRole?: string;
  inferredRole?: string;
}

export default function ApplicationResults({
  report,
  coverLetter,
  onCopy,
  copied,
  savedResumeId,
  selectedTemplateId = "",
  onEditChange,
  targetRole = "",
  inferredRole = "",
}: ApplicationResultsProps) {
  if (!report) return null;

  return (
    <div className={styles.tabContent}>
      <div className={styles.resultsSection} id="applicationResults">
        <CoverLetterCard
          coverLetter={coverLetter}
          report={report}
          targetRole={targetRole}
          inferredRole={inferredRole}
          onCopy={onCopy}
          copied={copied}
          onEditChange={onEditChange}
        />

        <section className={styles.resultPanel}>
          <div className={styles.resultPanelHeader}>
            <h2 className={styles.resultPanelTitle}>Tailored Resume</h2>
          </div>

          <div className={styles.scoreRowContainer}>
            <div className={styles.scoreRow}>
              <div className={styles.scoreBox}>
                <span className={styles.scoreLabel}>Before Match</span>
                <ScoreCircle score={report.matchScoreBefore} />
              </div>
              <div className={styles.scoreArrow}>
                <ArrowRight className={styles.arrowIcon} />
              </div>
              <div className={styles.scoreBox}>
                <span className={styles.scoreLabel}>After Tailor</span>
                <ScoreCircle score={report.matchScoreAfter} />
              </div>
            </div>

            <span className={styles.scoreDiff}>
                  +{report.matchScoreAfter - report.matchScoreBefore}% Improve
            </span>
          </div>
          <div className={styles.resultBlock}>
            <h3 className={styles.resultBlockTitle}>Optimizations Performed</h3>
            <ul className={styles.changeList}>
              {report.keyChanges.map((change, index) => (
                <li key={index} className={styles.changeItem}>
                  <span className={styles.bulletDot}>•</span>
                  {change}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.resultBlock}>
            <h3 className={styles.resultBlockTitle}>Resume Preview</h3>
            <div className={styles.previewBlock}>
              {savedResumeId && selectedTemplateId && (
                <Link
                  href={`/editor/${savedResumeId}`}
                  className={styles.previewEditButton}
                  title="Edit in Editor"
                >
                  <Edit className={styles.previewEditIcon} /> Edit
                </Link>
              )}
              {selectedTemplateId && report.tailoredResume ? (
                <ResumeComponent
                  resumeContent={report.tailoredResume}
                  templateId={selectedTemplateId as any}
                />
              ) : (
                <>
                  <h4 className={styles.previewName}>
                    {report.tailoredResume.personalInfo.name || "Candidate Name"}
                  </h4>
                  <p className={styles.previewJobTitle}>
                    {report.tailoredResume.personalInfo.jobTitle}
                  </p>
                  <p className={styles.previewSummary}>
                    {report.tailoredResume.summary}
                  </p>
                  <h5 className={styles.skillsHeading}>Tailored Skills</h5>
                  <div className={styles.skillsList}>
                    {report.tailoredResume.skills.slice(0, 12).map((skill, index) => (
                      <span key={index} className={styles.skillTag}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
