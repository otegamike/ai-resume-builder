"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AtsIssue, AtsReport } from "@/types/AtsReport";
import styles from "./page.module.css";
import ScoreCircle from "@/components/ui/score-circle/ScoreCircle";
import { CircleCheck } from "lucide-react";
import ResumeSelector, { ResumeSelection } from "@/components/resume/ResumeSelector";
import scrollToId from "@/utils/scrollIntoview";

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

export default function ImproveResumePage() {
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
            const blob = await new Promise<Blob | null>((resolve) =>
              canvas.toBlob((b) => resolve(b), "image/png")
            );
            if (blob) {
              formData.append("file", blob, "page.png");
            }
          }
        } else {
          throw new Error("Choose a PDF or image resume first.");
        }

        response = await fetch("/api/resume-improver/upload", {
          method: "POST",
          body: formData,
        });
      } else {
        if (!selection.selectedResumeId) throw new Error("Choose a saved resume first.");
        setProgress("analyzing");
        response = await fetch(`/api/resume-improver/resume/${selection.selectedResumeId}`, {
          method: "POST",
        });
      }

      setProgress("analyzing");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze resume");
      }

      setProgress("improving");
      setReport(data as AtsReport);
      setProgress("ready");
      scrollToId("resultPanel");
    } catch (err) {
      setProgress("idle");
      setError(err instanceof Error ? err.message : "Failed to analyze resume");
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
          template: sourceResume?.template || "template1",
          improvedResume: report.improvedResume,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create improved CV");
      }

      router.push(`/editor/${String(data.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create improved CV");
    } finally {
      setCreating(false);
    }
  }

  const isBusy = progress !== "idle" && progress !== "ready";
  const highIssues = report?.issues.filter((issue) => issue.severity === "high").length ?? 0;
  const canSubmit = !!selection && !isBusy;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Improve ATS compliance an existing resume</h1>
          <p className={styles.subtitle}>
            Upload a CV or review one already created here. We will flag ATS
            issues and prepare an improved editable version.
          </p>
        </div>
      </header>

      <section className={styles.panel}>
        <form className={styles.form} onSubmit={runAnalysis}>
          <ResumeSelector onSelectionChange={setSelection} />

          <div className={styles.actions}>
            <div className={styles.progress}>
              {isBusy ? (
                <Loader2 className={styles.spinner} />
              ) : (
                <CheckCircle2 className={styles.readyIcon} />
              )}
              <span>{progressCopy[progress]}</span>
            </div>
            <Button disabled={!canSubmit} type="submit">
              Run ATS review
            </Button>
          </div>
        </form>

        {error && (
          <div className={styles.error} role="alert">
            <AlertTriangle className={styles.errorIcon} />
            {error}
          </div>
        )}
      </section>

      <div id="resultPanel">
        {report && (
          <section className={styles.reportGrid}>
            <article className={styles.scorePanel}>
              <ScoreCircle score={report.score} />
              <div>
                <h2 className={styles.sectionTitle}>ATS rating</h2>
                <p className={styles.verdict}>{report.verdict}</p>
                <p className={styles.issueCount}>
                  {highIssues} high-priority issue{highIssues === 1 ? "" : "s"} found
                </p>
              </div>
            </article>

            <article className={styles.card}>
              <h2 className={styles.sectionTitle}>Strengths</h2>
              <ul className={styles.cleanList}>
                {report.strengths.map((strength, index) => (
                  <li key={`${strength}-${index}`}>
                    <CircleCheck size={25} className={styles.checkIcon} />
                    {strength}
                  </li>
                ))}
              </ul>
            </article>

            <article className={styles.card}>
              <h2 className={styles.sectionTitle}>Recommended keywords</h2>
              <div className={styles.keywordList}>
                {report.recommendedKeywords.map((keyword, index) => (
                  <span key={`${keyword}-${index}`} className={styles.keyword}>
                    {keyword}
                  </span>
                ))}
              </div>
            </article>

            <article className={styles.wideCard}>
              <h2 className={styles.sectionTitle}>Flagged ATS issues</h2>
              <div className={styles.issueList}>
                {report.issues.map((issue, index) => (
                  <div
                    key={`${issue.title}-${index}`}
                    className={`${styles.issue} ${issue.severity === "high" ? styles.highIssue : issue.severity === "medium" ? styles.mediumIssue : styles.lowIssue}`}
                  >
                    <div className={styles.issueHeader}>
                      <h3>{issue.title}</h3>
                      <span className={`${styles.severity} ${severityClass(issue)}`}>
                        {issue.severity}
                      </span>
                    </div>
                    <p>{issue.detail}</p>
                    <strong>{issue.suggestion}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className={styles.card}>
              <h2 className={styles.sectionTitle}>Improved CV preview</h2>
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
          </section>
        )}
      </div>
    </div>
  );
}
