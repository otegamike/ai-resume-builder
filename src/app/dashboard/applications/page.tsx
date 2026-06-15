"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ApplicationItem, ApplicationStatus } from "@/types/ApplicationData";
import styles from "./page.module.css";

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
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [appStatus, setAppStatus] = useState<ApplicationStatus>("saved");
  const [appDate, setAppDate] = useState("");
  const [notes, setNotes] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authStatus === "loading") return;
    if (authStatus !== "authenticated") {
      router.push("/");
      return;
    }
    fetchApplications();
  }, [authStatus, router]);

  async function fetchApplications() {
    setLoading(true);
    try {
      const res = await fetch("/api/applications");
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setCompany("");
    setRole("");
    setAppStatus("saved");
    setAppDate("");
    setNotes("");
    setJobUrl("");
    setError("");
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

  async function saveApplication() {
    if (!company.trim() || !role.trim()) {
      setError("Company and role are required.");
      return;
    }
    setSaving(true);
    setError("");

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
      setError(err instanceof Error ? err.message : "Failed to save application");
    } finally {
      setSaving(false);
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
          <h1 className={styles.title}>Applications</h1>
          <p className={styles.subtitle}>Track your job applications across companies and roles.</p>
        </div>
      </header>

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
                <Button onClick={saveApplication} disabled={saving}>
                  {saving ? (
                    <><Loader2 className={styles.btnIcon} /> Saving...</>
                  ) : (
                    <><Save className={styles.btnIcon} /> Save</>
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <div className={styles.error} role="alert">
                <AlertTriangle className={styles.errorIcon} />
                {error}
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

          {loading ? (
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
  );
}
