"use client";

import { FormEvent, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FileImage,
  Upload,
  AlignLeft,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import ResumeSelector, { ResumeSelection } from "@/components/resume/ResumeSelector";
import ScoreCircle from "@/components/ui/score-circle/ScoreCircle";
import { TailorReport } from "@/types/TailorReport";
import styles from "./page.module.css";
import scrollToId from "@/utils/scrollIntoview";

type JobInputMode = "text" | "image";
type ProgressState = "idle" | "extracting" | "tailoring" | "finishing" | "ready";

const progressCopy: Record<ProgressState, string> = {
  idle: "Select a resume and enter job context to begin.",
  extracting: "Reading CV and job description...",
  tailoring: "Optimizing skills and aligning achievements...",
  finishing: "Calculating compatibility match scores...",
  ready: "Tailored CV is ready.",
};

export default function TailorResumePage() {
  const router = useRouter();
  const { status } = useSession();

  // Selection states
  const [selection, setSelection] = useState<ResumeSelection | null>(null);
  
  // Job Description states
  const [jobMode, setJobMode] = useState<JobInputMode>("text");
  const [jobText, setJobText] = useState("");
  const [jobImage, setJobImage] = useState<File | null>(null);
  const [jobImageUrl, setJobImageUrl] = useState<string | null>(null);
  const [targetTitle, setTargetTitle] = useState("");
  const [targetCompany, setTargetCompany] = useState("");

  // UI state
  const [progress, setProgress] = useState<ProgressState>("idle");
  const [report, setReport] = useState<TailorReport | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const jobFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      window.location.href = "/";
    }
  }, [status]);

  // Clean up image previews on unmount
  useEffect(() => {
    return () => {
      if (jobImageUrl) {
        URL.revokeObjectURL(jobImageUrl);
      }
    };
  }, [jobImageUrl]);

  function handleJobImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setError("");
    setReport(null);
    setProgress("idle");

    if (jobImageUrl) {
      URL.revokeObjectURL(jobImageUrl);
      setJobImageUrl(null);
    }

    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please upload an image file (PNG, JPG, JPEG, or WEBP).");
        setJobImage(null);
        return;
      }
      setJobImage(file);
      setJobImageUrl(URL.createObjectURL(file));
    } else {
      setJobImage(null);
    }
  }

  function clearJobImage() {
    setJobImage(null);
    if (jobImageUrl) {
      URL.revokeObjectURL(jobImageUrl);
      setJobImageUrl(null);
    }
    if (jobFileInputRef.current) {
      jobFileInputRef.current.value = "";
    }
  }

  function handleJobModeChange(mode: JobInputMode) {
    setJobMode(mode);
    setError("");
    setReport(null);
    setProgress("idle");
  }

  async function handleTailorSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selection) {
      setError("Please choose a resume first.");
      return;
    }

    const hasJobContext = jobMode === "text" ? !!jobText.trim() : !!jobImage;
    if (!hasJobContext) {
      setError("Please provide a job description (either paste text or upload an image).");
      return;
    }

    setError("");
    setReport(null);
    setProgress("extracting");

    try {
      const formData = new FormData();
      formData.append("resumeMode", selection.mode);
      formData.append("jobMode", jobMode);
      formData.append("targetTitle", targetTitle);
      formData.append("targetCompany", targetCompany);

      // Add resume payload
      if (selection.mode === "saved") {
        formData.append("resumeId", selection.selectedResumeId);
      } else {
        if (selection.selectedFile && selection.selectedFile.type.startsWith("image/")) {
          formData.append("resumeFile", selection.selectedFile);
        } else if (selection.pdfCanvasRefs.length > 0) {
          for (const canvas of selection.pdfCanvasRefs) {
            const blob = await new Promise<Blob | null>((resolve) =>
              canvas.toBlob((b) => resolve(b), "image/png")
            );
            if (blob) {
              formData.append("resumeFile", blob, "page.png");
            }
          }
        } else {
          throw new Error("Invalid uploaded resume file selection.");
        }
      }

      // Add job description payload
      if (jobMode === "text") {
        formData.append("jobText", jobText);
      } else {
        if (!jobImage) throw new Error("No job description image selected.");
        formData.append("jobImage", jobImage);
      }

      setProgress("tailoring");
      const response = await fetch("/api/resume-tailor", {
        method: "POST",
        body: formData,
      });

      setProgress("finishing");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to tailor resume");
      }

      setReport(data as TailorReport);
      setProgress("ready");
      scrollToId("resultPanel");
    } catch (err) {
      setProgress("idle");
      setError(err instanceof Error ? err.message : "An unexpected error occurred during tailoring.");
    }
  }

  async function createTailoredResume() {
    if (!report || !selection) return;
    setCreating(true);
    setError("");

    try {
      const sourceResume = selection.selectedSavedResume;
      const jobIdentifier = targetTitle || report.tailoredResume.personalInfo.jobTitle || "Job";
      const titleSuffix = targetCompany ? ` - Tailored for ${jobIdentifier} at ${targetCompany}` : ` - Tailored for ${jobIdentifier}`;

      const response = await fetch("/api/resume-improver/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${sourceResume?.title || report.tailoredResume.personalInfo.name || "Resume"}${titleSuffix}`,
          template: sourceResume?.template || "template1",
          improvedResume: report.tailoredResume,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save tailored resume");
      }

      router.push(`/editor/${String(data.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tailored CV");
    } finally {
      setCreating(false);
    }
  }

  const isBusy = progress !== "idle" && progress !== "ready";
  const canSubmit = !!selection && (jobMode === "text" ? !!jobText.trim() : !!jobImage) && !isBusy;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Tailor CV for a Job</h1>
          <p className={styles.subtitle}>
            Let our AI agent tailor your CV to a specific job role. Select a resume, paste or capture the job specifications, and watch AI restructure and optimize your qualifications to perfectly align with the employer&apos;s requirements.
          </p>
        </div>
      </header>

      {/* Guide section */}
      <section className={styles.guideCard}>
        <h2 className={styles.guideTitle}>How it works</h2>
        <div className={styles.guideSteps}>
          <div className={styles.step}>
            <span className={styles.stepNumber}>1</span>
            <div>
              <h3>Choose Resume</h3>
              <p>Pick a saved CV or upload a PDF/Image of your resume.</p>
            </div>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNumber}>2</span>
            <div>
              <h3>Provide Job Details</h3>
              <p>Paste the job post text or upload a screenshot. Add optional metadata for better context.</p>
            </div>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNumber}>3</span>
            <div>
              <h3>Generate Tailored CV</h3>
              <p>Compare matching scores and save your optimized resume directly to your workspace.</p>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.splitGrid}>
        {/* Input Panel */}
        <section className={styles.panel}>
          <form className={styles.form} onSubmit={handleTailorSubmit}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>Step 1:</span>
              <h2 className={styles.formSectionTitle}>Select your base resume</h2>
            </div>
            
            <ResumeSelector onSelectionChange={setSelection} />

            <hr className={styles.divider} />

            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>Step 2:</span>
              <h2 className={styles.formSectionTitle}>Enter target job description</h2>
            </div>

            {/* Optional Metadata */}
            <div className={styles.metadataRow}>
              <div className={styles.field}>
                <label htmlFor="targetTitle" className={styles.label}>
                  Target Job Title <small className={styles.optionalText}>(optional)</small>
                </label>
                <input
                  id="targetTitle"
                  type="text"
                  placeholder="e.g. Senior Frontend Engineer"
                  value={targetTitle}
                  onChange={(e) => setTargetTitle(e.target.value)}
                  className={styles.input}
                  disabled={isBusy}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="targetCompany" className={styles.label}>
                  Company Name <small className={styles.optionalText}>(optional)</small>
                </label>
                <input
                  id="targetCompany"
                  type="text"
                  placeholder="e.g. Google"
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  className={styles.input}
                  disabled={isBusy}
                />
              </div>
            </div>

            {/* Job Input Tabs */}
            <div className={styles.tabsContainer}>
              <div className={styles.inputTabs}>
                <button
                  type="button"
                  className={`${styles.inputTab} ${jobMode === "text" ? styles.activeInputTab : ""}`}
                  onClick={() => handleJobModeChange("text")}
                  disabled={isBusy}
                >
                  <AlignLeft className={styles.tabIcon} />
                  Paste Description Text
                </button>
                <button
                  type="button"
                  className={`${styles.inputTab} ${jobMode === "image" ? styles.activeInputTab : ""}`}
                  onClick={() => handleJobModeChange("image")}
                  disabled={isBusy}
                >
                  <FileImage className={styles.tabIcon} />
                  Upload Post Image
                </button>
              </div>
            </div>

            <div className={styles.inputBody}>
              {jobMode === "text" ? (
                <div className={styles.field}>
                  <textarea
                    id="jobText"
                    placeholder="Paste the responsibilities, requirements, and keywords from the job posting..."
                    value={jobText}
                    onChange={(e) => setJobText(e.target.value)}
                    className={styles.textarea}
                    disabled={isBusy}
                    rows={8}
                  />
                </div>
              ) : (
                <div className={styles.uploadContainer}>
                  {jobImageUrl ? (
                    <div className={styles.jobImagePreviewBox}>
                      <img src={jobImageUrl} alt="Job posting preview" className={styles.jobImagePreview} />
                      <button type="button" onClick={clearJobImage} className={styles.removeImageBtn} disabled={isBusy}>
                        Change Image
                      </button>
                    </div>
                  ) : (
                    <label className={styles.jobImageUploadLabel}>
                      <input
                        ref={jobFileInputRef}
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        onChange={handleJobImageChange}
                        className={styles.fileInput}
                        disabled={isBusy}
                      />
                      <Upload className={styles.uploadIcon} />
                      <span className={styles.uploadTitle}>Choose a job post screenshot</span>
                      <span className={styles.uploadHint}>Supports PNG, JPG, JPEG, WEBP files</span>
                    </label>
                  )}
                </div>
              )}
            </div>

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
                <Sparkles className={styles.btnIcon} />
                Optimize Resume
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

        {/* Results Panel */}
        <section className={styles.resultsPanel} id='resultPanel'>
          {report ? (
            <div className={styles.reportGrid}>
              {/* Score Panel */}
              <article className={styles.scoreComparisonPanel}>
                <div className={styles.scoreComparisonContainer}>
                  <div className={styles.scoreBox}>
                    <span className={styles.scoreLabel}>Before Match</span>
                    <ScoreCircle score={report.matchScoreBefore} />
                  </div>
                  <div className={styles.scoreArrow}>
                    <ArrowRight className={styles.arrowIcon} />
                    <span className={styles.scoreDiff}>
                      +{report.matchScoreAfter - report.matchScoreBefore}% Improve
                    </span>
                  </div>
                  <div className={styles.scoreBox}>
                    <span className={styles.scoreLabel}>After Tailor</span>
                    <ScoreCircle score={report.matchScoreAfter} />
                  </div>
                </div>
                
                <div className={styles.verdictSection}>
                  <h3 className={styles.resultSectionTitle}>Alignment Analysis</h3>
                  <p className={styles.verdict}>{report.explanation}</p>
                </div>
              </article>

              {/* Key Changes */}
              <article className={styles.card}>
                <h3 className={styles.resultSectionTitle}>Optimizations Performed</h3>
                <ul className={styles.cleanList}>
                  {report.keyChanges.map((change, index) => (
                    <li key={index} className={styles.changeItem}>
                      <span className={styles.bulletDot}>•</span>
                      {change}
                    </li>
                  ))}
                </ul>
              </article>

              {/* Preview CV Details */}
              <article className={styles.card}>
                <h3 className={styles.resultSectionTitle}>Optimized CV Preview</h3>
                <div className={styles.previewBlock}>
                  <h4>{report.tailoredResume.personalInfo.name || "Candidate Name"}</h4>
                  <p className={styles.previewJobTitle}>{report.tailoredResume.personalInfo.jobTitle}</p>
                  <p className={styles.previewSummary}>{report.tailoredResume.summary}</p>
                  
                  <h5 className={styles.skillsHeading}>Tailored Skills</h5>
                  <div className={styles.keywordList}>
                    {report.tailoredResume.skills.slice(0, 12).map((skill, index) => (
                      <span key={index} className={styles.keyword}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <Button disabled={creating} onClick={createTailoredResume} fullWidth>
                  {creating ? "Creating tailored resume..." : "Create Tailored Resume"}
                </Button>
              </article>
            </div>
          ) : (
            <div className={styles.resultPlaceholder}>
              <Sparkles className={styles.placeholderIcon} />
              <h3>Tailoring Report</h3>
              <p>Your optimized CV preview and match metrics will appear here once analysis is complete.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
