"use client";

import { useEffect, useState } from "react";
import {
  Copy,
  Check,
  Eye,
  Save,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import ScoreCircle from "@/components/ui/score-circle/ScoreCircle";
import ResumeIframe from "@/components/resume/ResumeIframe";
import { buildTemplateSrcDoc, normalizeTemplateId } from "@/lib/templateRenderer";
import type { TemplateDefinition } from "@/lib/templateCatalog";
import type { TailorReport } from "@/types/TailorReport";
import styles from "@/app/dashboard/applications/page.module.css";

type ProgressState = "idle" | "extracting" | "generating" | "ready";

interface ApplicationResultsProps {
  report: TailorReport | null;
  coverLetter: string;
  onCopy: () => void;
  copied: boolean;
  onOpenInEditor: () => void;
  savedResumeId: string | null;
  onSave: () => void;
  saving: boolean;
}

export default function ApplicationResults({
  report,
  coverLetter,
  onCopy,
  copied,
  onOpenInEditor,
  savedResumeId,
  onSave,
  saving,
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

        const templateId = normalizeTemplateId("template1");
        const templateDef = templates.find((t) => t.id === templateId) || templates[0];
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
        <section className={styles.resultPanel}>
          <div className={styles.resultPanelHeader}>
            <h2 className={styles.resultPanelTitle}>Cover Letter</h2>
            <Button
              variant="outline"
              onClick={onCopy}
              disabled={!coverLetter}
            >
              {copied ? (
                <><Check className={styles.btnIcon} /> Copied</>
              ) : (
                <><Copy className={styles.btnIcon} /> Copy to Clipboard</>
              )}
            </Button>
          </div>
          <textarea
            className={styles.coverLetterTextarea}
            value={coverLetter}
            onChange={() => {}}
            rows={14}
            placeholder="Your cover letter will appear here..."
          />
        </section>

        <section className={styles.resultPanel}>
          <div className={styles.resultPanelHeader}>
            <h2 className={styles.resultPanelTitle}>Tailored Resume</h2>
            <Button
              variant="outline"
              onClick={onOpenInEditor}
              disabled={!savedResumeId}
            >
              <Eye className={styles.btnIcon} />
              Open in Editor
            </Button>
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

          <Button onClick={onOpenInEditor} disabled={!savedResumeId} fullWidth>
            <Eye className={styles.btnIcon} />
            Open Tailored Resume in Editor
          </Button>
        </section>

        <div className={styles.saveRow}>
          <Button onClick={onSave} disabled={saving || !report} size="lg">
            {saving ? (
              <><Loader2 className={styles.btnIcon} /> Saving...</>
            ) : (
              <><Save className={styles.btnIcon} /> Save Application</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
