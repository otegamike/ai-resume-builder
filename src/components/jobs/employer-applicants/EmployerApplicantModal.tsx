"use client";

import { useState } from "react";
import styles from "./EmployerApplicantModal.module.css";
import JobApplicationDetails from "@/components/jobs/job-application/JobApplicationDetails";
import DropDown from "@/components/ui/dropdown/Dropdown";
import { Button } from "@/components/ui/Button";

import { JobApplicationStatus, JobApplication, ApplicantUser } from "@/types/JobApplicationData";

type EmployerApplication = Omit<JobApplication, "applicantId"> & { applicantInformation: ApplicantUser; applicantId: ApplicantUser | string };

const STATUS_OPTIONS: JobApplicationStatus[] = ["submitted", "under_review", "shortlisted", "interviewing", "offered", "rejected", "withdrawn"];

export default function EmployerApplicantModal({ application, open, onClose, onStatusChange }: { application: EmployerApplication | null; open: boolean; onClose: () => void; onStatusChange?: (id: string, status: JobApplicationStatus) => void }) {
  const [selectedStatus, setSelectedStatus] = useState<JobApplicationStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open || !application) return null;

  const currentStatus: JobApplicationStatus = application.status || "submitted";
  const pendingStatus = selectedStatus ?? currentStatus;

  const handleSubmit = async () => {
    if (!pendingStatus || pendingStatus === currentStatus) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/jobs/applications/${application._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: pendingStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");
      onStatusChange?.(application._id, pendingStatus as JobApplicationStatus);
      setSelectedStatus(null);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Applicant Details</h2>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Close">&times;</button>
        </div>
        <div className={styles.body}>
          <JobApplicationDetails application={application} />
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1rem", borderTop: "1px solid var(--gray-200)", paddingTop: "1rem" }}>
            <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--gray-700)" }}>Update status</label>
            <DropDown defaultOption={currentStatus} options={STATUS_OPTIONS} selectedOption={pendingStatus} updateSelectedOption={(v) => setSelectedStatus(v as JobApplicationStatus)} fullwidth />
          </div>
        </div>
        <div className={styles.footer}>
          <button onClick={onClose} className={styles.secondaryBtn}>Close</button>
          <div style={{ flex: 1 }} />
          <Button onClick={handleSubmit} disabled={submitting || !pendingStatus || pendingStatus === currentStatus}>
            {submitting ? "Saving..." : "Submit"}
          </Button>
        </div>
      </div>
    </div>
  );
}
