"use client";

import { Plus, Edit, Trash2, Loader2, Save, X, AlertTriangle, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ApplicationItem, ApplicationStatus } from "@/types/ApplicationData";
import { TemplateDefinition } from "@/lib/templateCatalog";
import styles from "./HistoryView.module.css";
import ResumeComponent from "../resume/ResumeComponent";

interface HistoryViewProps {
  applications: ApplicationItem[];
  loading: boolean;
  templates: TemplateDefinition[];
  showForm: boolean;
  editingId: string | null;
  company: string;
  role: string;
  appStatus: ApplicationStatus;
  appDate: string;
  notes: string;
  jobUrl: string;
  savingHistory: boolean;
  historyError: string;
  STATUS_OPTIONS: ApplicationStatus[];
  STATUS_COLORS: Record<ApplicationStatus, string>;
  onNew: () => void;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  onCompanyChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onStatusChangeForm: (value: ApplicationStatus) => void;
  onDateChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onJobUrlChange: (value: string) => void;
  onSaveHistory: () => void;
  onCancelForm: () => void;
}

export default function HistoryView({
  applications,
  loading,
  templates,
  showForm,
  editingId,
  company,
  role,
  appStatus,
  appDate,
  notes,
  jobUrl,
  savingHistory,
  historyError,
  STATUS_OPTIONS,
  STATUS_COLORS,
  onNew,
  onView,
  onDelete,
  onCompanyChange,
  onRoleChange,
  onStatusChangeForm,
  onDateChange,
  onNotesChange,
  onJobUrlChange,
  onSaveHistory,
  onCancelForm,
}: HistoryViewProps) {
  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <h2 className={styles.toolbarTitle}>Job Applications</h2>
      </div>

        {loading ? (
          <HistoryCardSkeleton />
        ) : applications.length === 0 ? (
          <div className={styles.emptyState}>
            <Briefcase className={styles.emptyIcon} />
            <p>You haven&apos;t generated any applications yet.</p>
            <Button onClick={onNew}>
              <Plus className={styles.btnIcon} />
              Create Your First Application
            </Button>
          </div>
        ) : (
          <div className={styles.cardList}>
            {applications.map((app) => (
              <div key={app._id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardHeaderInfo}>
                    <h3 className={styles.cardCompany}>{app.company}</h3>
                    <p className={styles.cardRole}>{app.role}</p>
                  </div>
                  <span
                    className={styles.statusPill}
                    style={{
                      borderColor: STATUS_COLORS[app.status],
                      color: STATUS_COLORS[app.status],
                      backgroundColor: `${STATUS_COLORS[app.status]}14`,
                    }}
                  >
                    {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                  </span>
                </div>

                <div className={styles.cardBody}>
                  <p className={styles.coverLetterSnippet}>
                    {app.coverLetterContent
                      ? app.coverLetterContent.slice(0, 100) + "..."
                      : "No cover letter content available."}
                  </p>
                  <div className={styles.miniResumePreview}>
                    {app.resumeDoc ? (
                      <ResumeComponent
                        resumeContent={app.resumeDoc.content}
                        templateId={app.resumeDoc.template}
                        templateHtml={templates.find((t) => t.id === app.resumeDoc!.template)?.html}
                      />
                    ) : (
                      <div className={styles.miniFallback}>
                        <span className={styles.miniName}>{app.company}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <small className={styles.dateText}>
                    {app.appliedDate ? new Date(app.appliedDate).toLocaleDateString() : "-"}
                  </small>
                  <div className={styles.actionButtons}>
                    <button className={styles.iconBtn} onClick={() => onView(app._id)} title="View application">
                      <Edit />
                    </button>
                    <button className={`${styles.iconBtn} ${styles.deleteBtn}`} onClick={() => onDelete(app._id)} title="Delete">
                      <Trash2 />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}


function HistoryCardSkeleton() {
  return (
     <div className={styles.skeletonList}>
      {[1, 2, 3].map((i) => (
        <div key={i} className={styles.skeletonCard}>
          <div className={styles.skeletonHeader}>
            <div className={styles.skeletonHeaderLeft}>
              <div className={`${styles.skeletonBar} ${styles.skeletonBarWide}`} />
              <div className={`${styles.skeletonBar} ${styles.skeletonBarNarrow}`} />
            </div>
            <div className={styles.skeletonPill} />
          </div>
          <div className={styles.skeletonBody}>
            <div className={styles.skeletonTextBlock} />
            <div className={styles.skeletonSquare} />
          </div>
          <div className={styles.skeletonFooter}>
            <div className={styles.skeletonDate} />
            <div className={styles.skeletonActions}>
              <div className={styles.skeletonDot} />
              <div className={styles.skeletonDot} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
