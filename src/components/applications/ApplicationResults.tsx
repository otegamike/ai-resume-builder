"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  ArrowRight,
  Edit,
} from "lucide-react";
import ScoreCircle from "@/components/ui/score-circle/ScoreCircle";
import ResumeIframe from "@/components/resume/ResumeIframe";
import CoverLetterCard from "@/components/applications/CoverLetterCard";
import { buildTemplateSrcDoc } from "@/lib/templateRenderer";
import type { TemplateDefinition } from "@/lib/templateCatalog";
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
  const [renderedTemplate, setRenderedTemplate] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      if (!report) return;

      setLoadingPreview(true);

      try {
        const res = await fetch("/api/templates");
        if (!res.ok) return;
        const templates = (await res.json()) as TemplateDefinition[];

        if (cancelled) return;

        const templateDef = templates.find((t) => t.id === selectedTemplateId) || templates[0];
        if (templateDef?.html && report.tailoredResume) {
          const html = buildTemplateSrcDoc(templateDef.html, report.tailoredResume);
          if (!cancelled) setRenderedTemplate(html);
        }
      } catch {
        // preview silently fails
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    }

    loadPreview();

    return () => {
      cancelled = true;
    };
  }, [report]);

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
              {renderedTemplate && savedResumeId && (
                <Link
                  href={`/editor/${savedResumeId}`}
                  className={styles.previewEditButton}
                  title="Edit in Editor"
                >
                  <Edit className={styles.previewEditIcon} /> Edit
                </Link>
              )}
              {loadingPreview ? (
                <div className={styles.loadingRow}>
                  <Loader2 className={styles.loadingIcon} />
                </div>
              ) : renderedTemplate ? (
                <ResumeIframe renderedTemplate={renderedTemplate} type="preview" />
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
