"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Loader2,
  Save,
  Upload,
  AlignLeft,
  FileImage,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ArrowLeft,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AiButton } from "@/components/ui/AiButton";
import ResumeSelector, { ResumeSelection } from "@/components/resume/ResumeSelector";
import CoverLetterResultCard from "@/components/cover-letter/CoverLetterResultCard";
import CoverLetterHistory from "@/components/cover-letter/CoverLetterHistory";
import { CoverLetterItem } from "@/types/CoverLetterData";
import { CREDIT_COST } from "@/lib/creditCosts";
import { useAiCreditStore } from "@/store/useAiCreditStore";
import { useAlertStore } from "@/store/useAlertStore";
import { useResumeStore } from "@/store/useResumeStore";
import styles from "./page.module.css";

type JobInputMode = "text" | "image";
type PageView = "form" | "result" | "history";

function buildTitle(role: string, company: string) {
  if (role && company) return `Cover Letter — ${role} at ${company}`;
  if (role) return `Cover Letter — ${role}`;
  if (company) return `Cover Letter — ${company}`;
  return "Cover Letter";
}

export default function WriterPage() {
  const router = useRouter();
  const { status: authStatus } = useSession();

  // ── View state ──
  const [pageView, setPageView] = useState<PageView>("form");

  // ── Letter list state ──
  const [coverLetters, setCoverLetters] = useState<CoverLetterItem[]>([]);
  const [clLoading, setClLoading] = useState(true);

  // ── Form state ──
  const [editingClId, setEditingClId] = useState<string | null>(null);
  const [clTitle, setClTitle] = useState("");
  const [clCompany, setClCompany] = useState("");
  const [clRole, setClRole] = useState("");
  const [clContent, setClContent] = useState("");
  const [resumeSelection, setResumeSelection] = useState<ResumeSelection | null>(null);
  const [clJobMode, setClJobMode] = useState<JobInputMode>("text");
  const [clJobText, setClJobText] = useState("");
  const [clJobImage, setClJobImage] = useState<File | null>(null);
  const [clJobImageUrl, setClJobImageUrl] = useState<string | null>(null);
  const [clGenerating, setClGenerating] = useState(false);
  const [clSaving, setClSaving] = useState(false);
  const [clError, setClError] = useState("");
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);
  const storeFetchResumes = useResumeStore((state) => state.fetchResumes);
  const getResumeById = useResumeStore((state) => state.getResumeById);
  const clJobFileRef = useRef<HTMLInputElement>(null);

  // ── Result view state ──
  const [inferredRole, setInferredRole] = useState("");
  const [copied, setCopied] = useState(false);
  const [senderInfo, setSenderInfo] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
  });

  // ── Data fetching ──
  const fetchCoverLetters = useCallback(async () => {
    setClLoading(true);
    try {
      const res = await fetch("/api/cover-letters");
      if (res.ok) {
        const data = await res.json();
        setCoverLetters(data);
      }
    } catch { /* ignore */ } finally {
      setClLoading(false);
    }
  }, []);


  useEffect(() => {
    return () => {
      if (clJobImageUrl) URL.revokeObjectURL(clJobImageUrl);
    };
  }, [clJobImageUrl]);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (authStatus !== "authenticated") {
      router.push("/");
      return;
    }
    fetchCoverLetters();
  }, [authStatus, router, fetchCoverLetters]);

  // ── Helper: populate sender info from resume ──
  const populateSenderInfo = useCallback((resumeId?: string) => {
    if (!resumeId) {
      setSenderInfo({ name: "", email: "", phone: "", location: "" });
      return;
    }
    const resume = getResumeById(resumeId);
    if (resume?.content?.personalInfo) {
      const pi = resume.content.personalInfo;
      setSenderInfo({
        name: pi.name || "",
        email: pi.email || "",
        phone: pi.phone || "",
        location: pi.location || "",
      });
    }
  }, [getResumeById]);

  // ── Form reset ──
  function resetClForm() {
    setClTitle("");
    setClCompany("");
    setClRole("");
    setClContent("");
    setResumeSelection(null);
    setClJobMode("text");
    setClJobText("");
    setClJobImage(null);
    setClJobImageUrl(null);
    setClError("");
    setEditingClId(null);
    setInferredRole("");
    setCopied(false);
    setSenderInfo({ name: "", email: "", phone: "", location: "" });
  }

  // ── Navigate to result view from history ──
  function viewLetter(letter: CoverLetterItem) {
    setClTitle(letter.title);
    setClCompany(letter.targetCompany);
    setClRole(letter.targetRole);
    setClContent(letter.content);
    setEditingClId(letter._id);
    populateSenderInfo(letter.resumeId);
    setInferredRole("");
    setCopied(false);
    setPageView("result");
  }

  // ── Job image handlers ──
  function handleClJobImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (clJobImageUrl) URL.revokeObjectURL(clJobImageUrl);
    if (file) {
      setClJobImage(file);
      setClJobImageUrl(URL.createObjectURL(file));
    } else {
      setClJobImage(null);
      setClJobImageUrl(null);
    }
  }

  function clearClJobImage() {
    setClJobImage(null);
    if (clJobImageUrl) URL.revokeObjectURL(clJobImageUrl);
    setClJobImageUrl(null);
    if (clJobFileRef.current) clJobFileRef.current.value = "";
  }

  // ── Generate cover letter ──
  async function generateCoverLetter() {
    if (!resumeSelection) {
      setClError("Please select a resume.");
      return;
    }
    const hasJobText = clJobMode === "text" ? !!clJobText.trim() : !!clJobImage;
    if (!hasJobText && clJobMode === "text") {
      setClError("Please paste a job description.");
      return;
    }
    if (!hasJobText && clJobMode === "image") {
      setClError("Please upload a job description image.");
      return;
    }

    setClGenerating(true);
    setClError("");

    try {
      const formData = new FormData();
      formData.append("resumeMode", resumeSelection.mode);
      formData.append("jobMode", clJobMode);
      formData.append("targetCompany", clCompany);
      formData.append("targetRole", clRole);

      if (resumeSelection.mode === "saved") {
        formData.append("resumeId", resumeSelection.selectedResumeId);
      } else {
        if (resumeSelection.selectedFile && resumeSelection.selectedFile.type.startsWith("image/")) {
          formData.append("resumeFile", resumeSelection.selectedFile);
        } else if (resumeSelection.pdfCanvasRefs.length > 0) {
          for (const canvas of resumeSelection.pdfCanvasRefs) {
            const blob = await new Promise<Blob | null>((resolve) =>
              canvas.toBlob((b) => resolve(b), "image/png")
            );
            if (blob) {
              formData.append("resumeFile", blob, "page.png");
            }
          }
        } else {
          throw new Error("Invalid uploaded resume.");
        }
      }

      if (clJobMode === "text") {
        formData.append("jobText", clJobText);
      } else {
        if (!clJobImage) throw new Error("No job image selected.");
        formData.append("jobImage", clJobImage);
      }

      const res = await fetch("/api/cover-letters/generate", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.status === 402) {
        useAlertStore.getState().addAlert("error", data.error);
        setClGenerating(false);
        return;
      }

      if (!res.ok) throw new Error(data.error || "Generation failed");

      if (typeof data.newAiCredits === "number") {
        useAiCreditStore.getState().setCredits(data.newAiCredits);
      }

      setClContent(data.content);
      setEditingClId(data.id);
      setInferredRole(data.inferredRole || "");
      if (!clTitle) {
        setClTitle(data.title || buildTitle(clRole, clCompany));
      }

      if (resumeSelection.mode === "saved") {
        populateSenderInfo(resumeSelection.selectedResumeId);
      }

      setPageView("result");
    } catch (err) {
      useAlertStore.getState().addAlert("error", err instanceof Error ? err.message : "Failed to generate cover letter");
    } finally {
      setClGenerating(false);
    }
  }

  // ── Copy handler ──
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(clContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      useAlertStore.getState().addAlert("error", "Failed to copy to clipboard.");
    }
  }

  // ── Save cover letter ──
  async function saveCoverLetter() {
    if (!clContent.trim()) {
      setClError("Cover letter content is empty.");
      return;
    }
    setClSaving(true);
    setClError("");

    try {
      const title = clTitle.trim() || buildTitle(clRole, clCompany);
      const body = {
        title,
        targetCompany: clCompany,
        targetRole: clRole,
        content: clContent,
        resumeId: resumeSelection?.selectedResumeId || undefined,
        jobDescription: clJobText,
      };

      let res: Response;
      if (editingClId) {
        res = await fetch(`/api/cover-letters/${editingClId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch("/api/cover-letters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        useAlertStore.getState().addAlert("error", data.error || "Failed to save");
      } else {
        fetchCoverLetters();
      }
    } catch (err) {
      useAlertStore.getState().addAlert("error", err instanceof Error ? err.message : "Failed to save cover letter");
    } finally {
      setClSaving(false);
    }
  }

  // ── Delete ──
  async function deleteCoverLetter(id: string) {
    const confirmed = await useAlertStore.getState().showConfirmDialog("Delete this cover letter?");
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/cover-letters/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCoverLetters((prev) => prev.filter((c) => c._id !== id));
      } else {
        const data = await res.json();
        useAlertStore.getState().addAlert("error", data.error || "Failed to delete cover letter");
      }
    } catch {
      useAlertStore.getState().addAlert("error", "Failed to delete cover letter");
    }
  }

  // ── View transitions ──
  function goToHistory() {
    fetchCoverLetters();
    setPageView("history");
  }

  function goToForm() {
    setPageView("form");
  }

  function handleNewLetter() {
    resetClForm();
    setPageView("form");
  }

  // ── Auth loading ──
  if (authStatus === "loading") {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className={styles.loadingIcon} />
      </div>
    );
  }

  // Update sender info when resume selection changes
  const handleResumeChange = useCallback((selection: ResumeSelection | null) => {
    setResumeSelection(selection);
    if (selection?.mode === "saved" && selection.selectedResumeId) {
      populateSenderInfo(selection.selectedResumeId);
    }
  }, [populateSenderInfo]);

  const canGenerate = !!resumeSelection && (clJobMode === "text" ? !!clJobText.trim() : !!clJobImage) && !clGenerating;

  return (
    <div className={styles.container}>
      {/* ── Contextual Header ── */}
      {pageView === "form" && (
        <header className={styles.header}>
          <div className={styles.headerRow}>
            <div>
              <h1 className={styles.title}>Writer Studio</h1>
            </div>
            <Button variant="ghost" onClick={goToHistory}>
              <Clock className={styles.btnIcon} />
              History
            </Button>
          </div>
          <p className={styles.subtitle}>Create cover letters and application letters from your resumes.</p>
        </header>
      )}

      {pageView === "result" && (
        <header className={styles.header}>
          <div className={styles.headerRow}>
            <button className={styles.backButton} onClick={goToForm}>
              <ArrowLeft className={styles.backIcon} />
              Back to form
            </button>
            <Button variant="ghost" onClick={handleNewLetter}>
              <Plus className={styles.btnIcon} />
              New letter
            </Button>
          </div>
        </header>
      )}

      {pageView === "history" && (
        <header className={styles.header}>
          <div className={styles.headerRow}>
            <div>
              <h1 className={styles.title}>Your Letters</h1>
            </div>
            <Button variant="ghost" onClick={handleNewLetter}>
              <Plus className={styles.btnIcon} />
              New letter
            </Button>
          </div>
          <p className={styles.subtitle}>View and manage your generated cover letters.</p>
        </header>
      )}

      {/* ── View: Form ── */}
      {pageView === "form" && (
        <div className={styles.tabContent}>
          <section className={styles.panel}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.formSectionTitle}>Select your base resume</h2>
            </div>
            <ResumeSelector onSelectionChange={handleResumeChange} />

            <hr className={styles.divider} />

            <div className={styles.sectionHeader}>
              <h2 className={styles.formSectionTitle}>Job Description</h2>
            </div>

            <div className={styles.tabsContainer}>
              <div className={styles.inputTabs}>
                <button
                  type="button"
                  className={`${styles.inputTab} ${clJobMode === "text" ? styles.activeInputTab : ""}`}
                  onClick={() => setClJobMode("text")}
                >
                  <AlignLeft className={styles.tabIconSmall} />
                  Paste Description Text
                </button>
                <button
                  type="button"
                  className={`${styles.inputTab} ${clJobMode === "image" ? styles.activeInputTab : ""}`}
                  onClick={() => setClJobMode("image")}
                >
                  <FileImage className={styles.tabIconSmall} />
                  Upload Post Image
                </button>
              </div>
            </div>

            <div className={styles.inputBody}>
              {clJobMode === "text" ? (
                <div className={styles.field}>
                  <textarea
                    placeholder="Paste the responsibilities, requirements, and keywords from the job posting..."
                    value={clJobText}
                    onChange={(e) => setClJobText(e.target.value)}
                    className={styles.textarea}
                    rows={8}
                  />
                </div>
              ) : (
                <div className={styles.uploadContainer}>
                  {clJobImageUrl ? (
                    <div className={styles.jobImagePreviewBox}>
                      <img src={clJobImageUrl} alt="Job posting preview" className={styles.jobImagePreview} />
                      <button type="button" onClick={clearClJobImage} className={styles.removeImageBtn}>
                        Change Image
                      </button>
                    </div>
                  ) : (
                    <label className={styles.jobImageUploadLabel}>
                      <input
                        ref={clJobFileRef}
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        onChange={handleClJobImageChange}
                        className={styles.fileInput}
                      />
                      <Upload className={styles.uploadIcon} />
                      <span className={styles.uploadTitle}>Choose a job post screenshot</span>
                      <span className={styles.uploadHint}>Supports PNG, JPG, JPEG, WEBP files</span>
                    </label>
                  )}
                </div>
              )}
            </div>

            <div className={styles.collapsibleSection}>
              <button
                type="button"
                className={styles.collapsibleToggle}
                onClick={() => setShowAdditionalInfo(!showAdditionalInfo)}
              >
                <span>Additional Information</span>
                {showAdditionalInfo ? (
                  <ChevronUp className={styles.chevronIcon} />
                ) : (
                  <ChevronDown className={styles.chevronIcon} />
                )}
              </button>
              {showAdditionalInfo && (
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
                        value={clCompany}
                        onChange={(e) => setClCompany(e.target.value)}
                        className={styles.input}
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
                        value={clRole}
                        onChange={(e) => setClRole(e.target.value)}
                        className={styles.input}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.actions}>
              <div className={styles.progress}>
                {clGenerating && <Loader2 className={styles.spinner} />}
                <span>
                  {clGenerating
                    ? "Generating cover letter..."
                    : "Select a resume and enter job details to begin."}
                </span>
              </div>
              <AiButton fullWidth variant="primary" disabled={!canGenerate} onClick={generateCoverLetter} cost={CREDIT_COST.coverLetterGenerate}>
                Generate Cover Letter
              </AiButton>
            </div>
          </section>

          {clError && (
            <div className={styles.error} role="alert">
              <AlertTriangle className={styles.errorIcon} />
              {clError}
            </div>
          )}
        </div>
      )}

      {/* ── View: Result ── */}
      {pageView === "result" && (
        <div className={styles.tabContent}>
          <div className={styles.resultsSection}>
            <CoverLetterResultCard
              key={editingClId || "new"}
              coverLetter={clContent}
              senderInfo={senderInfo}
              targetRole={clRole}
              inferredRole={inferredRole}
              onCopy={handleCopy}
              copied={copied}
              onEditChange={setClContent}
            />

            <div className={styles.saveRow}>
              <Button onClick={saveCoverLetter} disabled={clSaving}>
                {clSaving ? (
                  <><Loader2 className={styles.btnIcon} /> Saving...</>
                ) : (
                  <><Save className={styles.btnIcon} /> Save</>
                )}
              </Button>
            </div>

            {clError && (
              <div className={styles.error} role="alert">
                <AlertTriangle className={styles.errorIcon} />
                {clError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── View: History ── */}
      {pageView === "history" && (
        <CoverLetterHistory
          letters={coverLetters}
          loading={clLoading}
          onNew={handleNewLetter}
          onView={viewLetter}
          onDelete={deleteCoverLetter}
        />
      )}
    </div>
  );
}
