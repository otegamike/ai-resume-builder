"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  Save,
  Briefcase,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  FileImage,
  AlignLeft,
  Upload,
  CheckCircle2,
  Copy,
  Check,
  Eye,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import ResumeSelector, { ResumeSelection } from "@/components/resume/ResumeSelector";
import ScoreCircle from "@/components/ui/score-circle/ScoreCircle";
import { ApplicationItem, ApplicationStatus } from "@/types/ApplicationData";
import { TailorReport } from "@/types/TailorReport";
import scrollToId from "@/utils/scrollIntoview";
import styles from "./page.module.css";

type JobInputMode = "text" | "image";
type ProgressState = "idle" | "extracting" | "generating" | "ready";
type Tab = "create" | "history";

const STATUS_OPTIONS: ApplicationStatus[] = [
  "saved", "applied", "interviewing", "offered", "rejected", "withdrawn",
];

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  saved: "var(--gray-500)",
  applied: "var(--info)",
  interviewing: "var(--warning)",
  offered: "var(--success)",
  rejected: "var(--error)",
  withdrawn: "var(--gray-400)",
};

const progressCopy: Record<ProgressState, string> = {
  idle: "Select a resume and enter job details to begin.",
  extracting: "Reading CV and job description...",
  generating: "Tailoring resume and writing cover letter...",
  ready: "Application materials are ready.",
};

export default function ApplicationsPage() {
  const router = useRouter();
  const { status: authStatus } = useSession();

  // ── Tabs ──
  const [activeTab, setActiveTab] = useState<Tab>("create");

  // ── Create Application State ──
  const [selection, setSelection] = useState<ResumeSelection | null>(null);
  const [jobMode, setJobMode] = useState<JobInputMode>("text");
  const [jobText, setJobText] = useState("");
  const [jobImage, setJobImage] = useState<File | null>(null);
  const [jobImageUrl, setJobImageUrl] = useState<string | null>(null);
  const [targetCompany, setTargetCompany] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [showAdditional, setShowAdditional] = useState(false);
  const [progress, setProgress] = useState<ProgressState>("idle");
  const [report, setReport] = useState<TailorReport | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [savedResumeId, setSavedResumeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const jobFileInputRef = useRef<HTMLInputElement>(null);

  // ── History State ──
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [appStatus, setAppStatus] = useState<ApplicationStatus>("saved");
  const [appDate, setAppDate] = useState("");
  const [notes, setNotes] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [savingHistory, setSavingHistory] = useState(false);
  const [historyError, setHistoryError] = useState("");

  // ── Auth guard ──
  useEffect(() => {
    if (authStatus === "loading") return;
    if (authStatus !== "authenticated") {
      router.push("/");
    }
  }, [authStatus, router]);

  // ── Image cleanup ──
  useEffect(() => {
    return () => {
      if (jobImageUrl) URL.revokeObjectURL(jobImageUrl);
    };
  }, [jobImageUrl]);

  // ── Handlers: Job Image ──
  function handleJobImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setError("");
    setReport(null);
    setCoverLetter("");
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
    setCoverLetter("");
    setProgress("idle");
  }

  // ── Generate Application ──
  async function handleGenerate() {
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
    setCoverLetter("");
    setProgress("extracting");

    try {
      const formData = new FormData();
      formData.append("resumeMode", selection.mode);
      formData.append("jobMode", jobMode);
      formData.append("targetCompany", targetCompany);
      formData.append("targetRole", targetRole);

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

      if (jobMode === "text") {
        formData.append("jobText", jobText);
      } else {
        if (!jobImage) throw new Error("No job description image selected.");
        formData.append("jobImage", jobImage);
      }

      setProgress("generating");
      const response = await fetch("/api/applications/quick-apply", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate application");
      }

      setReport(data.report as TailorReport);
      setCoverLetter(data.coverLetter);
      setSavedResumeId(data.resumeId);
      setProgress("ready");
      scrollToId("applicationResults");
    } catch (err) {
      setProgress("idle");
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    }
  }

  // ── Copy Cover Letter ──
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(coverLetter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Failed to copy to clipboard.");
    }
  }

  // ── Open Resume in Editor ──
  function openInEditor() {
    if (savedResumeId) {
      router.push(`/editor/${savedResumeId}`);
    }
  }

  // ── Save Application ──
  async function saveApplication() {
    if (!report) return;
    setSaving(true);
    setError("");

    try {
      const body = {
        company: targetCompany.trim() || "Unknown Company",
        role: targetRole.trim() || "Unknown Role",
        status: "applied" as ApplicationStatus,
        appliedDate: new Date().toISOString(),
        notes: "",
      };

      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save application");
      }

      setReport(null);
      setCoverLetter("");
      setProgress("idle");
      setJobText("");
      setJobImage(null);
      setJobImageUrl(null);
      setTargetCompany("");
      setTargetRole("");
      setSelection(null);
      scrollToId("pageTop");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save application");
    } finally {
      setSaving(false);
    }
  }

  // ── History: Fetch ──
  const fetchApplications = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/applications");
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
      }
    } catch { /* ignore */ } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (authStatus !== "authenticated") return;
    fetchApplications();
  }, [authStatus, fetchApplications]);

  // ── History: Form ──
  function resetForm() {
    setCompany("");
    setRole("");
    setAppStatus("saved");
    setAppDate("");
    setNotes("");
    setJobUrl("");
    setHistoryError("");
    setEditingId(null);
  }

  function openForm(app?: ApplicationItem) {
    if (app) {
      setCompany(app.company);
      setRole(app.role);
      setAppStatus(app.status);
      setAppDate(app.appliedDate ? new Date(app.appliedDate).toISOString().slice(0, 10) : "");
      setNotes(app.notes);
      setJobUrl(app.jobUrl || "");
      setEditingId(app._id);
    } else {
      resetForm();
    }
    setShowForm(true);
  }

  async function saveHistory() {
    if (!company.trim() || !role.trim()) {
      setHistoryError("Company and role are required.");
      return;
    }
    setSavingHistory(true);
    setHistoryError("");

    try {
      const body = {
        company: company.trim(),
        role: role.trim(),
        status: appStatus,
        appliedDate: appDate || undefined,
        notes,
        jobUrl,
      };

      let res: Response;
      if (editingId) {
        res = await fetch(`/api/applications/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch("/api/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      setShowForm(false);
      resetForm();
      fetchApplications();
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "Failed to save application");
    } finally {
      setSavingHistory(false);
    }
  }

  async function deleteApplication(id: string) {
    if (!confirm("Delete this application?")) return;
    try {
      const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
      if (res.ok) {
        setApplications((prev) => prev.filter((a) => a._id !== id));
      }
    } catch { /* ignore */ }
  }

  async function updateStatus(id: string, status: ApplicationStatus) {
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setApplications((prev) =>
          prev.map((a) => (a._id === id ? { ...a, status } : a))
        );
      }
    } catch { /* ignore */ }
  }

  // ── Auth Loading ──
  if (authStatus === "loading") {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className={styles.loadingIcon} />
      </div>
    );
  }

  const isBusy = progress !== "idle" && progress !== "ready";
  const canGenerate = !!selection && (jobMode === "text" ? !!jobText.trim() : !!jobImage) && !isBusy;

  return (
    <div className={styles.container} id="pageTop">
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Applications</h1>
          <p className={styles.subtitle}>
            Create tailored resumes and cover letters for your job applications in one go.
          </p>
        </div>
      </header>

      {/* ── Tab Bar ── */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${activeTab === "create" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("create")}
        >
          <Sparkles className={styles.tabIcon} />
          Create Application
        </button>
        <button
          className={`${styles.tab} ${activeTab === "history" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("history")}
        >
          <Briefcase className={styles.tabIcon} />
          History
        </button>
      </div>

      {/* ───────────────────────────────────────────── */}
      {/* TAB 1: CREATE APPLICATION                     */}
      {/* ───────────────────────────────────────────── */}
      {activeTab === "create" && (
        <div className={styles.tabContent}>
          {/* Guide Card */}
          <section className={styles.guideCard}>
            <h2 className={styles.guideTitle}>How it works</h2>
            <div className={styles.guideSteps}>
              <div className={styles.step}>
                <span className={styles.stepNumber}>1</span>
                <div>
                  <h3>Select Resume</h3>
                  <p>Pick a saved CV or upload a PDF/Image of your resume.</p>
                </div>
              </div>
              <div className={styles.step}>
                <span className={styles.stepNumber}>2</span>
                <div>
                  <h3>Add Job Details</h3>
                  <p>Paste the job description or upload a screenshot. Add optional metadata.</p>
                </div>
              </div>
              <div className={styles.step}>
                <span className={styles.stepNumber}>3</span>
                <div>
                  <h3>Generate &amp; Apply</h3>
                  <p>Get a tailored resume and cover letter. Copy the letter and export your resume.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Input Panel */}
          <section className={styles.panel}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.formSectionTitle}>Select your base resume</h2>
            </div>
            <ResumeSelector onSelectionChange={setSelection} />

            <hr className={styles.divider} />

            <div className={styles.sectionHeader}>
              <h2 className={styles.formSectionTitle}>Job Description</h2>
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
                  <AlignLeft className={styles.tabIconSmall} />
                  Paste Description Text
                </button>
                <button
                  type="button"
                  className={`${styles.inputTab} ${jobMode === "image" ? styles.activeInputTab : ""}`}
                  onClick={() => handleJobModeChange("image")}
                  disabled={isBusy}
                >
                  <FileImage className={styles.tabIconSmall} />
                  Upload Post Image
                </button>
              </div>
            </div>

            <div className={styles.inputBody}>
              {jobMode === "text" ? (
                <div className={styles.field}>
                  <textarea
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

            {/* Collapsible Additional Information */}
            <div className={styles.collapsibleSection}>
              <button
                type="button"
                className={styles.collapsibleToggle}
                onClick={() => setShowAdditional(!showAdditional)}
                disabled={isBusy}
              >
                <span>Additional Information</span>
                {showAdditional ? (
                  <ChevronUp className={styles.chevronIcon} />
                ) : (
                  <ChevronDown className={styles.chevronIcon} />
                )}
              </button>
              {showAdditional && (
                <div className={styles.collapsibleBody}>
                  <div className={styles.metadataRow}>
                    <div className={styles.field}>
                      <label htmlFor="targetCompany" className={styles.label}>
                        Target Company <span className={styles.optionalText}>(optional)</span>
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
                    <div className={styles.field}>
                      <label htmlFor="targetRole" className={styles.label}>
                        Target Role <span className={styles.optionalText}>(optional)</span>
                      </label>
                      <input
                        id="targetRole"
                        type="text"
                        placeholder="e.g. Software Engineer"
                        value={targetRole}
                        onChange={(e) => setTargetRole(e.target.value)}
                        className={styles.input}
                        disabled={isBusy}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Generate Button + Progress */}
            <div className={styles.actions}>
              <div className={styles.progress}>
                {isBusy ? (
                  <Loader2 className={styles.spinner} />
                ) : progress === "ready" ? (
                  <CheckCircle2 className={styles.readyIcon} />
                ) : null}
                <span>{progressCopy[progress]}</span>
              </div>
              <Button disabled={!canGenerate} onClick={handleGenerate}>
                <Sparkles className={styles.btnIcon} />
                Generate Application
              </Button>
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className={styles.error} role="alert">
              <AlertTriangle className={styles.errorIcon} />
              {error}
            </div>
          )}

          {/* ── Results ── */}
          {(report || progress === "ready") && (
            <div className={styles.resultsSection} id="applicationResults">
              {/* Cover Letter Section (first) */}
              <section className={styles.resultPanel}>
                <div className={styles.resultPanelHeader}>
                  <h2 className={styles.resultPanelTitle}>Cover Letter</h2>
                  <Button
                    variant="outline"
                    onClick={handleCopy}
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
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={14}
                  placeholder="Your cover letter will appear here..."
                />
              </section>

              {/* Tailored Resume Section (second) */}
              {report && (
                <section className={styles.resultPanel}>
                  <div className={styles.resultPanelHeader}>
                    <h2 className={styles.resultPanelTitle}>Tailored Resume</h2>
                    <Button
                      variant="outline"
                      onClick={openInEditor}
                      disabled={!savedResumeId}
                    >
                      <Eye className={styles.btnIcon} />
                      Open in Editor
                    </Button>
                  </div>

                  {/* Score Comparison */}
                  <div className={styles.scoreRow}>
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

                  {/* Key Changes */}
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

                  {/* Resume Preview */}
                  <div className={styles.resultBlock}>
                    <h3 className={styles.resultBlockTitle}>Resume Preview</h3>
                    <div className={styles.previewBlock}>
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
                    </div>
                  </div>

                  <Button onClick={openInEditor} disabled={!savedResumeId} fullWidth>
                    <Eye className={styles.btnIcon} />
                    Open Tailored Resume in Editor
                  </Button>
                </section>
              )}

              {/* Save Application */}
              <div className={styles.saveRow}>
                <Button onClick={saveApplication} disabled={saving || !report} size="lg">
                  {saving ? (
                    <><Loader2 className={styles.btnIcon} /> Saving...</>
                  ) : (
                    <><Save className={styles.btnIcon} /> Save Application</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────── */}
      {/* TAB 2: HISTORY                                */}
      {/* ───────────────────────────────────────────── */}
      {activeTab === "history" && (
        <div className={styles.tabContent}>
          {showForm ? (
            <div className={styles.formPanel}>
              <div className={styles.formPanelHeader}>
                <h2 className={styles.formTitle}>
                  {editingId ? "Edit Application" : "Add Application"}
                </h2>
                <button
                  className={styles.closeButton}
                  onClick={() => { setShowForm(false); resetForm(); }}
                >
                  <X />
                </button>
              </div>

              <div className={styles.formBody}>
                <div className={styles.formRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>Company *</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="e.g. Google"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Role *</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="e.g. Software Engineer"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>Status</label>
                    <select
                      className={styles.select}
                      value={appStatus}
                      onChange={(e) => setAppStatus(e.target.value as ApplicationStatus)}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Applied Date</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={appDate}
                      onChange={(e) => setAppDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Job URL</label>
                  <input
                    type="url"
                    className={styles.input}
                    placeholder="https://..."
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Notes</label>
                  <textarea
                    className={styles.textarea}
                    placeholder="Notes about this application..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className={styles.formFooter}>
                  <div />
                  <div className={styles.formActions}>
                    <Button variant="ghost" onClick={() => { setShowForm(false); resetForm(); }}>
                      Cancel
                    </Button>
                    <Button onClick={saveHistory} disabled={savingHistory}>
                      {savingHistory ? (
                        <><Loader2 className={styles.btnIcon} /> Saving...</>
                      ) : (
                        <><Save className={styles.btnIcon} /> Save</>
                      )}
                    </Button>
                  </div>
                </div>

                {historyError && (
                  <div className={styles.error} role="alert">
                    <AlertTriangle className={styles.errorIcon} />
                    {historyError}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Job Applications</h2>
                <Button onClick={() => openForm()}>
                  <Plus className={styles.btnIcon} />
                  Add Application
                </Button>
              </div>

              {loadingHistory ? (
                <div className={styles.loadingRow}>
                  <Loader2 className={styles.loadingIcon} />
                </div>
              ) : applications.length === 0 ? (
                <div className={styles.emptyState}>
                  <Briefcase className={styles.emptyIcon} />
                  <p>No applications tracked yet. Add your first one!</p>
                </div>
              ) : (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Company</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.map((app) => (
                        <tr key={app._id}>
                          <td className={styles.companyCell}>{app.company}</td>
                          <td>{app.role}</td>
                          <td>
                            <div className={styles.statusSelectWrapper}>
                              <select
                                className={styles.statusSelect}
                                value={app.status}
                                onChange={(e) => updateStatus(app._id, e.target.value as ApplicationStatus)}
                                style={{ borderColor: STATUS_COLORS[app.status], color: STATUS_COLORS[app.status] }}
                              >
                                {STATUS_OPTIONS.map((s) => (
                                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                ))}
                              </select>
                              <ChevronDown className={styles.statusChevron} />
                            </div>
                          </td>
                          <td className={styles.dateCell}>
                            {app.appliedDate ? new Date(app.appliedDate).toLocaleDateString() : "-"}
                          </td>
                          <td>
                            <div className={styles.rowActions}>
                              <button className={styles.iconBtn} onClick={() => openForm(app)} title="Edit">
                                <Edit />
                              </button>
                              <button className={`${styles.iconBtn} ${styles.deleteBtn}`} onClick={() => deleteApplication(app._id)} title="Delete">
                                <Trash2 />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

    </div>
  );
}
