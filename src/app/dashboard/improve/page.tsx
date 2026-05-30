"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertTriangle,
  CheckCircle2,
  FileUp,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AtsIssue, AtsReport } from "@/types/AtsReport";
import { ResumeContent } from "@/types/ResumeData";
import styles from "./page.module.css";

interface SavedResume {
  _id: string;
  title: string;
  template: string;
  content: ResumeContent;
}

type Mode = "upload" | "saved";
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
  const [mode, setMode] = useState<Mode>("upload");
  const [resumes, setResumes] = useState<SavedResume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [report, setReport] = useState<AtsReport | null>(null);
  const [progress, setProgress] = useState<ProgressState>("idle");
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "loading") return;

    if (status !== "authenticated") {
      window.location.href = "/";
      return;
    }

    const fetchResumes = async () => {
      try {
        const response = await fetch("/api/resumes");
        if (!response.ok) throw new Error("Failed to load resumes");
        const data = (await response.json()) as SavedResume[];
        setResumes(data);
        setSelectedResumeId(data[0]?._id ?? "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load resumes");
      } finally {
        setLoadingResumes(false);
      }
    };

    fetchResumes();
  }, [status]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] ?? null);
    setReport(null);
    setError("");
    setProgress("idle");
  }

  async function runAnalysis(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setReport(null);
    setProgress("extracting");

    try {
      let response: Response;
      if (mode === "upload") {
        if (!selectedFile) throw new Error("Choose a PDF or image resume first.");

        const formData = new FormData();
        formData.append("file", selectedFile);
        response = await fetch("/api/resume-improver/upload", {
          method: "POST",
          body: formData,
        });
      } else {
        if (!selectedResumeId) throw new Error("Choose a saved resume first.");

        setProgress("analyzing");
        response = await fetch(`/api/resume-improver/resume/${selectedResumeId}`, {
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
    } catch (err) {
      setProgress("idle");
      setError(err instanceof Error ? err.message : "Failed to analyze resume");
    }
  }

  async function createImprovedResume() {
    if (!report) return;

    setCreating(true);
    setError("");

    try {
      const sourceResume = resumes.find((resume) => resume._id === selectedResumeId);
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

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>ATS improver</p>
          <h1 className={styles.title}>Improve an existing resume</h1>
          <p className={styles.subtitle}>
            Upload a CV or review one already created here. We will flag ATS issues and prepare an improved editable version.
          </p>
        </div>
      </header>

      <section className={styles.panel}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${mode === "upload" ? styles.activeTab : ""}`}
            onClick={() => {
              setMode("upload");
              setReport(null);
              setError("");
            }}
            type="button"
          >
            <FileUp className={styles.tabIcon} />
            Upload resume
          </button>
          <button
            className={`${styles.tab} ${mode === "saved" ? styles.activeTab : ""}`}
            onClick={() => {
              setMode("saved");
              setReport(null);
              setError("");
            }}
            type="button"
          >
            <Sparkles className={styles.tabIcon} />
            Use my resumes
          </button>
        </div>

        <form className={styles.form} onSubmit={runAnalysis}>
          {mode === "upload" ? (
            <label className={styles.uploadBox}>
              <input
                accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                className={styles.fileInput}
                onChange={handleFileChange}
                type="file"
              />
              <FileUp className={styles.uploadIcon} />
              <span className={styles.uploadTitle}>
                {selectedFile ? selectedFile.name : "Choose a PDF or image resume"}
              </span>
              <span className={styles.uploadHint}>
                PDFs are extracted locally. Images are read with Groq vision.
              </span>
            </label>
          ) : (
            <label className={styles.field}>
              <span className={styles.label}>Saved resume</span>
              <select
                className={styles.select}
                disabled={loadingResumes || resumes.length === 0}
                onChange={(event) => setSelectedResumeId(event.target.value)}
                value={selectedResumeId}
              >
                {resumes.map((resume) => (
                  <option key={resume._id} value={resume._id}>
                    {resume.title}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className={styles.actions}>
            <div className={styles.progress}>
              {isBusy ? <Loader2 className={styles.spinner} /> : <CheckCircle2 className={styles.readyIcon} />}
              <span>{progressCopy[progress]}</span>
            </div>
            <Button disabled={isBusy || (mode === "saved" && !selectedResumeId)} type="submit">
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

      {report && (
        <section className={styles.reportGrid}>
          <article className={styles.scorePanel}>
            <div className={styles.scoreCircle}>
              <span>{report.score}</span>
              <small>/100</small>
            </div>
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
                <li key={`${strength}-${index}`}>{strength}</li>
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
                <div key={`${issue.title}-${index}`} className={styles.issue}>
                  <span className={`${styles.severity} ${severityClass(issue)}`}>
                    {issue.severity}
                  </span>
                  <div>
                    <h3>{issue.title}</h3>
                    <p>{issue.detail}</p>
                    <strong>{issue.suggestion}</strong>
                  </div>
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
  );
}
