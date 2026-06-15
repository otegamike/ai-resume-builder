"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  Sparkles,
  Save,
  FileText,
  Upload,
  AlignLeft,
  X,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import ResumeSelector, { ResumeSelection } from "@/components/resume/ResumeSelector";
import { CoverLetterItem } from "@/types/CoverLetterData";
import styles from "./page.module.css";

type JobInputMode = "text" | "image";

interface SavedResume {
  _id: string;
  title: string;
}

export default function WriterPage() {
  const router = useRouter();
  const { status: authStatus } = useSession();

  const [coverLetters, setCoverLetters] = useState<CoverLetterItem[]>([]);
  const [clLoading, setClLoading] = useState(true);
  const [showClForm, setShowClForm] = useState(false);
  const [editingClId, setEditingClId] = useState<string | null>(null);

  const [clTitle, setClTitle] = useState("");
  const [clCompany, setClCompany] = useState("");
  const [clRole, setClRole] = useState("");
  const [clContent, setClContent] = useState("");
  const [clStatus, setClStatus] = useState<"draft" | "final">("draft");
  const [resumeSelection, setResumeSelection] = useState<ResumeSelection | null>(null);
  const [clJobMode, setClJobMode] = useState<JobInputMode>("text");
  const [clJobText, setClJobText] = useState("");
  const [clJobImage, setClJobImage] = useState<File | null>(null);
  const [clJobImageUrl, setClJobImageUrl] = useState<string | null>(null);
  const [clGenerating, setClGenerating] = useState(false);
  const [clSaving, setClSaving] = useState(false);
  const [clError, setClError] = useState("");
  const [resumes, setResumes] = useState<SavedResume[]>([]);
  const clJobFileRef = useRef<HTMLInputElement>(null);

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

  const fetchResumes = useCallback(async () => {
    try {
      const res = await fetch("/api/resumes");
      if (res.ok) {
        const data = await res.json();
        setResumes(data.map((r: SavedResume & { _id: string; title: string }) => ({ _id: r._id, title: r.title })));
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (authStatus !== "authenticated") {
      router.push("/");
      return;
    }
    fetchCoverLetters();
    fetchResumes();
  }, [authStatus, router, fetchCoverLetters, fetchResumes]);

  function resetClForm() {
    setClTitle("");
    setClCompany("");
    setClRole("");
    setClContent("");
    setClStatus("draft");
    setResumeSelection(null);
    setClJobMode("text");
    setClJobText("");
    setClJobImage(null);
    setClJobImageUrl(null);
    setClError("");
    setEditingClId(null);
  }

  function openClForm(letter?: CoverLetterItem) {
    if (letter) {
      setClTitle(letter.title);
      setClCompany(letter.targetCompany);
      setClRole(letter.targetRole);
      setClContent(letter.content);
      setClStatus(letter.status);
      setEditingClId(letter._id);
    } else {
      resetClForm();
    }
    setShowClForm(true);
  }

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

  async function generateCoverLetter() {
    if (!clCompany.trim() && !clRole.trim()) {
      setClError("Please enter at least a target company or role.");
      return;
    }
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
      if (!res.ok) throw new Error(data.error || "Generation failed");

      setClContent(data.content);
      if (!clTitle) {
        setClTitle(data.title || `Cover Letter — ${clRole} at ${clCompany}`);
      }
    } catch (err) {
      setClError(err instanceof Error ? err.message : "Failed to generate cover letter");
    } finally {
      setClGenerating(false);
    }
  }

  async function saveCoverLetter() {
    if (!clContent.trim()) {
      setClError("Cover letter content is empty.");
      return;
    }
    setClSaving(true);
    setClError("");

    try {
      const title = clTitle.trim() || `Cover Letter — ${clRole} at ${clCompany}`;
      const body = {
        title,
        targetCompany: clCompany,
        targetRole: clRole,
        content: clContent,
        status: clStatus,
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
        throw new Error(data.error || "Failed to save");
      }

      setShowClForm(false);
      resetClForm();
      fetchCoverLetters();
    } catch (err) {
      setClError(err instanceof Error ? err.message : "Failed to save cover letter");
    } finally {
      setClSaving(false);
    }
  }

  async function deleteCoverLetter(id: string) {
    if (!confirm("Delete this cover letter?")) return;
    try {
      const res = await fetch(`/api/cover-letters/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCoverLetters((prev) => prev.filter((c) => c._id !== id));
      }
    } catch { /* ignore */ }
  }

  if (authStatus === "loading") {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className={styles.loadingIcon} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Writer Studio</h1>
          <p className={styles.subtitle}>Create cover letters and application letters from your resumes.</p>
        </div>
      </header>

      {showClForm ? (
        <div className={styles.formPanel}>
          <div className={styles.formPanelHeader}>
            <h2 className={styles.formTitle}>
              {editingClId ? "Edit Letter" : "Create New Letter"}
            </h2>
            <button
              className={styles.closeButton}
              onClick={() => { setShowClForm(false); resetClForm(); }}
            >
              <X />
            </button>
          </div>

          <div className={styles.formBody}>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>Target Company</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Google"
                  value={clCompany}
                  onChange={(e) => setClCompany(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Target Role</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Software Engineer"
                  value={clRole}
                  onChange={(e) => setClRole(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Select Resume</label>
              <ResumeSelector onSelectionChange={setResumeSelection} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Job Description</label>
              <div className={styles.inputTabs}>
                <button
                  type="button"
                  className={`${styles.inputTab} ${clJobMode === "text" ? styles.activeInputTab : ""}`}
                  onClick={() => setClJobMode("text")}
                >
                  <AlignLeft className={styles.tabIconSmall} />
                  Paste Text
                </button>
                <button
                  type="button"
                  className={`${styles.inputTab} ${clJobMode === "image" ? styles.activeInputTab : ""}`}
                  onClick={() => setClJobMode("image")}
                >
                  <Upload className={styles.tabIconSmall} />
                  Upload Image
                </button>
              </div>
              {clJobMode === "text" ? (
                <textarea
                  className={styles.textarea}
                  placeholder="Paste job description here..."
                  value={clJobText}
                  onChange={(e) => setClJobText(e.target.value)}
                  rows={6}
                />
              ) : (
                <div className={styles.uploadArea}>
                  {clJobImageUrl ? (
                    <div className={styles.uploadPreview}>
                      <img src={clJobImageUrl} alt="Job description" className={styles.uploadImage} />
                      <button type="button" className={styles.uploadChangeBtn} onClick={clearClJobImage}>
                        Change
                      </button>
                    </div>
                  ) : (
                    <label className={styles.uploadLabel}>
                      <input
                        ref={clJobFileRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className={styles.fileInput}
                        onChange={handleClJobImageChange}
                      />
                      <Upload className={styles.uploadIcon} />
                      <span>Upload job posting screenshot</span>
                    </label>
                  )}
                </div>
              )}
            </div>

            <Button
              onClick={generateCoverLetter}
              disabled={clGenerating}
              className={styles.generateBtn}
            >
              {clGenerating ? (
                <><Loader2 className={styles.btnIcon} /> Generating...</>
              ) : (
                <><Sparkles className={styles.btnIcon} /> Generate with AI</>
              )}
            </Button>

            <div className={styles.field}>
              <label className={styles.label}>Letter Content</label>
              <textarea
                className={styles.textarea}
                placeholder="Generated letter will appear here. You can edit it manually."
                value={clContent}
                onChange={(e) => setClContent(e.target.value)}
                rows={12}
              />
            </div>

            <div className={styles.formFooter}>
              <div className={styles.statusToggle}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="clStatus"
                    value="draft"
                    checked={clStatus === "draft"}
                    onChange={() => setClStatus("draft")}
                  />
                  Draft
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="clStatus"
                    value="final"
                    checked={clStatus === "final"}
                    onChange={() => setClStatus("final")}
                  />
                  Final
                </label>
              </div>
              <div className={styles.formActions}>
                <Button variant="ghost" onClick={() => { setShowClForm(false); resetClForm(); }}>
                  Cancel
                </Button>
                <Button onClick={saveCoverLetter} disabled={clSaving}>
                  {clSaving ? (
                    <><Loader2 className={styles.btnIcon} /> Saving...</>
                  ) : (
                    <><Save className={styles.btnIcon} /> Save</>
                  )}
                </Button>
              </div>
            </div>

            {clError && (
              <div className={styles.error} role="alert">
                <AlertTriangle className={styles.errorIcon} />
                {clError}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Your Letters</h2>
            <Button onClick={() => openClForm()}>
              <Plus className={styles.btnIcon} />
              Create New Letter
            </Button>
          </div>

          {clLoading ? (
            <div className={styles.loadingRow}>
              <Loader2 className={styles.loadingIcon} />
            </div>
          ) : coverLetters.length === 0 ? (
            <div className={styles.emptyState}>
              <FileText className={styles.emptyIcon} />
              <p>No letters yet. Create your first cover letter or application letter!</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {coverLetters.map((letter) => (
                <div key={letter._id} className={styles.card}>
                  <div className={styles.cardBody}>
                    <h3 className={styles.cardTitle}>{letter.title}</h3>
                    <div className={styles.cardMeta}>
                      {letter.targetCompany && <span>{letter.targetCompany}</span>}
                      {letter.targetRole && <span>{letter.targetRole}</span>}
                    </div>
                    <span className={`${styles.statusBadge} ${letter.status === "final" ? styles.finalBadge : styles.draftBadge}`}>
                      {letter.status}
                    </span>
                  </div>
                  <div className={styles.cardFooter}>
                    <span className={styles.cardDate}>
                      {new Date(letter.updatedAt).toLocaleDateString()}
                    </span>
                    <div className={styles.cardActions}>
                      <button className={styles.iconBtn} onClick={() => openClForm(letter)} title="Edit">
                        <Edit />
                      </button>
                      <button className={`${styles.iconBtn} ${styles.deleteBtn}`} onClick={() => deleteCoverLetter(letter._id)} title="Delete">
                        <Trash2 />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
