"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Loader2,
  Clock,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ResumeSelection } from "@/components/resume/ResumeSelector";
import { ApplicationItem, ApplicationStatus } from "@/types/ApplicationData";
import { TailorReport } from "@/types/TailorReport";
import { useAiCreditStore } from "@/store/useAiCreditStore";
import { useAlertStore } from "@/store/useAlertStore";
import scrollToId from "@/utils/scrollIntoview";
import CreateApplicationForm from "@/components/applications/CreateApplicationForm";
import ApplicationResults from "@/components/applications/ApplicationResults";
import HistoryView from "@/components/applications/HistoryView";
import styles from "./page.module.css";

type JobInputMode = "text" | "image";
type ProgressState = "idle" | "extracting" | "generating" | "ready";
type PageView = "form" | "result" | "history";

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

export default function ApplicationsPage() {
  const router = useRouter();
  const { status: authStatus } = useSession();

  // ── View state ──
  const [pageView, setPageView] = useState<PageView>("form");

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
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [inferredRole, setInferredRole] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // ── History State ──
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [appStatus, setAppStatus] = useState<ApplicationStatus>("saved");
  const [appDate, setAppDate] = useState("");
  const [notes, setNotes] = useState("");
  const [jobUrl, setJobUrl] = useState("");

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

      if (response.status === 402) {
        useAlertStore.getState().addAlert("error", data.error);
        setProgress("idle");
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate application");
      }

      if (typeof data.newAiCredits === "number") {
        useAiCreditStore.getState().setCredits(data.newAiCredits);
      }

      setReport(data.report as TailorReport);
      setCoverLetter(data.coverLetter);
      setSavedResumeId(data.resumeId);
      setSelectedTemplateId(data.templateId || "");
      setInferredRole(data.inferredRole || "");
      setProgress("ready");
      setPageView("result");
      scrollToId("applicationResults");
    } catch (err) {
      setProgress("idle");
      useAlertStore.getState().addAlert("error", err instanceof Error ? err.message : "An unexpected error occurred.");
    }
  }

  // ── Copy Cover Letter ──
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(coverLetter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      useAlertStore.getState().addAlert("error", "Failed to copy to clipboard.");
    }
  }

  function resetAllFormState() {
    setReport(null);
    setCoverLetter("");
    setProgress("idle");
    setSavedResumeId(null);
    setSelectedTemplateId("");
    setInferredRole("");
    setJobText("");
    setJobImage(null);
    setJobImageUrl(null);
    setTargetCompany("");
    setTargetRole("");
    setSelection(null);
    setPageView("form");
  }

  // ── View transitions ──
  function goToHistory() {
    fetchApplications();
    setPageView("history");
  }

  function goToForm() {
    setPageView("form");
  }

  function handleNewApplication() {
    resetAllFormState();
  }

  // ── History: Fetch ──
  const fetchApplications = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const appRes = await fetch("/api/applications");
      if (appRes.ok) {
        const data = await appRes.json();
        setApplications(data);
      }
    } catch { /* ignore */ } finally {
      setLoadingHistory(false);
    }
  }, []);


  async function deleteApplication(id: string) {
    const confirmed = await useAlertStore.getState().showConfirmDialog("Delete this application? The associated resume and cover letter will also be deleted.");
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
      if (res.ok) {
        setApplications((prev) => prev.filter((a) => a._id !== id));
      } else {
        const data = await res.json();
        useAlertStore.getState().addAlert("error", data.error || "Failed to delete application");
      }
    } catch {
      useAlertStore.getState().addAlert("error", "Failed to delete application");
    }
  }

  // ── History: View Full Application ──
  async function viewApplication(id: string) {
    try {
      const res = await fetch(`/api/applications/${id}`);
      if (!res.ok) return;
      const data = await res.json();

      setReport({
        matchScoreBefore: data.matchScoreBefore ?? 0,
        matchScoreAfter: data.matchScoreAfter ?? 0,
        explanation: data.explanation ?? "",
        keyChanges: data.optimizations ?? [],
        tailoredResume: data.tailoredResume,
      });
      setCoverLetter(data.coverLetter ?? "");
      setSavedResumeId(data.resumeId ?? null);
      setSelectedTemplateId(data.templateId || "");
      setProgress("ready");
      setPageView("result");
      scrollToId("applicationResults");
    } catch {
      useAlertStore.getState().addAlert("error", "Failed to load application details.");
    }
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
      {/* ── Contextual Header ── */}
      {pageView === "form" && (
        <header className={styles.header}>
          <div className={styles.headerRow}>
            <div>
              <h1 className={styles.title}>Applications</h1>
            </div>
            <Button variant="ghost" onClick={goToHistory}>
              <Clock className={styles.btnIcon} />
              History
            </Button>
          </div>
          <p className={styles.subtitle}>
            Create tailored resumes and cover letters for your job applications in one go.
          </p>
        </header>
      )}

      {pageView === "result" && (
        <header className={styles.header}>
          <div className={styles.headerRow}>
            <button className={styles.backButton} onClick={goToForm}>
              <ArrowLeft className={styles.backIcon} />
              Back to form
            </button>
            <Button variant="ghost" onClick={handleNewApplication}>
              <Plus className={styles.btnIcon} />
              New application
            </Button>
          </div>
        </header>
      )}

      {pageView === "history" && (
        <header className={styles.header}>
          <div className={styles.headerRow}>
            <div>
              <h1 className={styles.title}>Applications</h1>
            </div>
            <Button variant="ghost" onClick={goToForm}>
              <Plus className={styles.btnIcon} />
              New application
            </Button>
          </div>
          <p className={styles.subtitle}>
            Create tailored resumes and cover letters for your job applications in one go.
          </p>
        </header>
      )}

      {/* ── View: Form ── */}
      {pageView === "form" && (
        <CreateApplicationForm
          selection={selection}
          onSelectionChange={setSelection}
          jobMode={jobMode}
          onJobModeChange={handleJobModeChange}
          jobText={jobText}
          onJobTextChange={setJobText}
          jobImage={jobImage}
          jobImageUrl={jobImageUrl}
          onJobImageChange={handleJobImageChange}
          onClearJobImage={clearJobImage}
          targetCompany={targetCompany}
          onTargetCompanyChange={setTargetCompany}
          targetRole={targetRole}
          onTargetRoleChange={setTargetRole}
          showAdditional={showAdditional}
          onShowAdditionalChange={setShowAdditional}
          isBusy={isBusy}
          progress={progress}
          canGenerate={canGenerate}
          onGenerate={handleGenerate}
          error={error}
        />
      )}

      {/* ── View: Result ── */}
      {pageView === "result" && report && (
        <ApplicationResults
          report={report}
          coverLetter={coverLetter}
          onCopy={handleCopy}
          copied={copied}
          savedResumeId={savedResumeId}
          selectedTemplateId={selectedTemplateId}
          onEditChange={setCoverLetter}
          targetRole={targetRole}
          inferredRole={inferredRole}
        />
      )}

      {/* ── View: History ── */}
      {pageView === "history" && (
        <HistoryView
          applications={applications}
          loading={loadingHistory}
          STATUS_COLORS={STATUS_COLORS}
          onNew={goToForm}
          onView={viewApplication}
          onDelete={deleteApplication}
        />
      )}

    </div>
  );
}
