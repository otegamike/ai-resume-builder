"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AlertTriangle, CheckCircle2, Loader2, WandSparkles, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AiButton } from "@/components/ui/AiButton";
import { AtsIssue, AtsReport } from "@/types/AtsReport";
import { CREDIT_COST } from "@/lib/creditCosts";
import { useAiCreditStore } from "@/store/useAiCreditStore";
import { useAlertStore } from "@/store/useAlertStore";
import ScoreCircle from "@/components/ui/score-circle/ScoreCircle";
import ResumeSelector, { ResumeSelection } from "@/components/resume/ResumeSelector";
import scrollToId from "@/utils/scrollIntoview";
import styles from "./ImproveTab.module.css";

type ProgressState = "idle" | "extracting" | "analyzing" | "improving" | "ready";

const progressCopy: Record<ProgressState, string> = {
  idle: "Choose a resume to begin.",
  extracting: "Extracting resume text...",
  analyzing: "Running ATS checks...",
  improving: "Preparing improved CV content...",
  ready: "ATS report is ready.",
};

function severityClass(issue: AtsIssue) {
  if (issue.severity === "high") return styles.highSeverity;
  if (issue.severity === "medium") return styles.mediumSeverity;
  return styles.lowSeverity;
}

export default function ImproveTab() {
  const router = useRouter();
  const { status } = useSession();
  const [selection, setSelection] = useState<ResumeSelection | null>(null);
  const [report, setReport] = useState<AtsReport | null>(null);
  const [progress, setProgress] = useState<ProgressState>("idle");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      window.location.href = "/";
    }
  }, [status]);

  async function runAnalysis(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selection) return;
    setError("");
    setReport(null);
    setProgress("extracting");
    try {
      let response: Response;
      if (selection.mode === "upload") {
        const formData = new FormData();
        if (selection.selectedFile && selection.selectedFile.type.startsWith("image/")) {
          formData.append("file", selection.selectedFile);
        } else if (selection.pdfCanvasRefs.length > 0) {
          for (const canvas of selection.pdfCanvasRefs) {
            const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
            if (blob) formData.append("file", blob, "page.png");
          }
        } else {
          throw new Error("Choose a PDF or image resume first.");
        }
        response = await fetch("/api/resume-improver/upload", { method: "POST", body: formData });
      } else {
        if (!selection.selectedResumeId) throw new Error("Choose a saved resume first.");
        setProgress("analyzing");
        response = await fetch(`/api/resume-improver/resume/${selection.selectedResumeId}`, { method: "POST" });
      }
      setProgress("analyzing");
      const data = await response.json();
      if (response.status === 402) {
        useAlertStore.getState().addAlert("error", data.error);
        setProgress("idle");
        return;
      }
      if (!response.ok) throw new Error(data.error || "Failed to analyze resume");
      if (typeof data.newAiCredits === "number") useAiCreditStore.getState().setCredits(data.newAiCredits);
      setProgress("improving");
      setReport(data as AtsReport);
      setProgress("ready");
    } catch (err) {
      setProgress("idle");
      useAlertStore.getState().addAlert("error", err instanceof Error ? err.message : "Failed to analyze resume");
    } finally {
      scrollToId("improveResultPanel");
    }
  }

  async function createImprovedResume() {
    if (!report || !selection) return;
    setCreating(true);
    setError("");
    try {
      const sourceResume = selection.selectedSavedResume;
      const response = await fetch("/api/resume-improver/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${sourceResume?.title || report.improvedResume.personalInfo.name || "Resume"} - Improved`,
          template: sourceResume?.template,
          improvedResume: report.improvedResume,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create improved CV");
      router.push(`/editor/${String(data.id)}`);
    } catch (err) {
      useAlertStore.getState().addAlert("error", err instanceof Error ? err.message : "Failed to create improved CV");
    } finally {
      setCreating(false);
    }
  }

  const isBusy = progress !== "idle" && progress !== "ready";
  const highIssues = report?.issues.filter((issue) => issue.severity === "high").length ?? 0;
  const canSubmit = !!selection && !isBusy;

  return (
    <>
      <section className={styles.guideCard}>
        <h2 className={styles.guideTitle}>How it works</h2>
        <div className={styles.guideSteps}>
          <div className={styles.step}>
            <span className={styles.stepNumber}>1</span>
            <div>
              <h3>Choose Resume</h3>
              <p>Pick a saved CV or upload a PDF/image to analyze.</p>
            </div>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNumber}>2</span>
            <div>
              <h3>Run ATS Check</h3>
              <p>We scan formatting, keywords, and structure for ATS compliance.</p>
            </div>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNumber}>3</span>
            <div>
              <h3>Create Improved CV</h3>
              <p>Save an optimized version ready to edit and submit.</p>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.splitGrid}>
        <section className={styles.panel}>
          <form onSubmit={runAnalysis}>
            <ResumeSelector onSelectionChange={setSelection} animatedLoader showLoader={isBusy} />
            <div className={styles.actions}>
              <div className={styles.progress}>
                {isBusy ? <Loader2 className={styles.spinner} /> : <CheckCircle2 className={styles.readyIcon} />}
                <span>{progressCopy[progress]}</span>
              </div>
              <AiButton fullWidth variant="primary" disabled={!canSubmit} type="submit" cost={selection?.mode === "upload" ? CREDIT_COST.atsAnalysisUpload : CREDIT_COST.atsAnalysisSaved}>
                Run ATS review
              </AiButton>
            </div>
          </form>
          {error && (
            <div className={styles.error} role="alert">
              <AlertTriangle className={styles.errorIcon} />
              {error}
            </div>
          )}
        </section>

        <section className={styles.resultsPanel} id="improveResultPanel">
          {report ? (
            <div className={styles.reportGrid}>
              <article className={styles.scoreComparisonPanel}>
                <div className={styles.scoreComparisonContainer}>
                  <div className={styles.scoreBox}>
                    <span className={styles.scoreLabel}>ATS Score</span>
                    <ScoreCircle score={report.score} />
                  </div>
                </div>
                <div className={styles.verdictSection}>
                  <h3 className={styles.resultSectionTitle}>ATS Rating</h3>
                  <p className={styles.verdict}>{report.verdict}</p>
                  <p className={styles.issueCount}>
                    {highIssues} high-priority issue{highIssues === 1 ? "" : "s"} found
                  </p>
                </div>
              </article>

              <article className={styles.card}>
                <h3 className={styles.resultSectionTitle}>Strengths</h3>
                <ul className={styles.cleanList}>
                  {report.strengths.map((strength, index) => (
                    <li key={`${strength}-${index}`}>
                      <CircleCheck size={16} className={styles.checkIcon} />
                      {strength}
                    </li>
                  ))}
                </ul>
              </article>

              <article className={styles.card}>
                <h3 className={styles.resultSectionTitle}>Recommended keywords</h3>
                <div className={styles.keywordList}>
                  {report.recommendedKeywords.map((keyword, index) => (
                    <span key={`${keyword}-${index}`} className={styles.keyword}>
                      {keyword}
                    </span>
                  ))}
                </div>
              </article>

              <article className={styles.card}>
                <h3 className={styles.resultSectionTitle}>Flagged ATS issues</h3>
                <div className={styles.issueList}>
                  {report.issues.map((issue, index) => (
                    <div key={`${issue.title}-${index}`} className={`${styles.issue} ${issue.severity === "high" ? styles.highIssue : issue.severity === "medium" ? styles.mediumIssue : styles.lowIssue}`}>
                      <div className={styles.issueHeader}>
                        <h3>{issue.title}</h3>
                        <span className={`${styles.severity} ${severityClass(issue)}`}>{issue.severity}</span>
                      </div>
                      <p>{issue.detail}</p>
                      <strong>{issue.suggestion}</strong>
                    </div>
                  ))}
                </div>
              </article>

              <article className={styles.card}>
                <h3 className={styles.resultSectionTitle}>Improved CV preview</h3>
                <div className={styles.previewBlock}>
                  <h3>{report.improvedResume.personalInfo.name || "Unnamed candidate"}</h3>
                  <p>{report.improvedResume.personalInfo.jobTitle}</p>
                  <p>{report.improvedResume.summary}</p>
                  <div className={styles.keywordList}>
                    {report.improvedResume.skills.slice(0, 10).map((skill, index) => (
                      <span key={`${skill}-${index}`} className={styles.keyword}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <Button disabled={creating} onClick={createImprovedResume} fullWidth>
                  {creating ? "Creating improved CV..." : "Create improved CV"}
                </Button>
              </article>

              <article className={styles.card}>
                <details className={styles.details}>
                  <summary>Extracted text</summary>
                  <pre>{report.extractedText}</pre>
                </details>
              </article>
            </div>
          ) : (
            <div className={styles.resultPlaceholder}>
              <WandSparkles className={styles.placeholderIcon} />
              <h3>ATS Report</h3>
              <p>Your score, flagged issues, and improved CV will appear here after analysis.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
