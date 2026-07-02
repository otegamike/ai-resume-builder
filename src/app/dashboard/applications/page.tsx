"use client";

import { useState, useEffect, useCallback } from "react";
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
  Sparkles,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ResumeSelection } from "@/components/resume/ResumeSelector";
import { ApplicationItem, ApplicationStatus } from "@/types/ApplicationData";
import { TailorReport } from "@/types/TailorReport";
import scrollToId from "@/utils/scrollIntoview";
import CreateApplicationForm from "@/components/applications/CreateApplicationForm";
import ApplicationResults from "@/components/applications/ApplicationResults";
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
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

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
      setApplicationId(data.applicationId);
      setSelectedTemplateId(data.templateId || "");
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
    if (!report || !applicationId) return;
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

      const res = await fetch(`/api/applications/${applicationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save application");
      }

      fetchApplications();
      setReport(null);
      setCoverLetter("");
      setProgress("idle");
      setApplicationId(null);
      setSavedResumeId(null);
      setSelectedTemplateId("");
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
      setApplicationId(data._id);
      setSelectedTemplateId(data.templateId || "");
      setProgress("ready");
      setActiveTab("create");
      scrollToId("applicationResults");
    } catch {
      setError("Failed to load application details.");
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
        progress === "ready" && report ? (
          <ApplicationResults
            report={report}
            coverLetter={coverLetter}
            onCopy={handleCopy}
            copied={copied}
            onOpenInEditor={openInEditor}
            savedResumeId={savedResumeId}
            selectedTemplateId={selectedTemplateId}
            onSave={saveApplication}
            saving={saving}
          />
        ) : (
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
        )
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
                              <button className={styles.iconBtn} onClick={() => viewApplication(app._id)} title="View">
                                <Eye />
                              </button>
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
