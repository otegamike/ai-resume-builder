"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import styles from "./ApplicationDetailModal.module.css";
import JobApplicationDetails from "@/components/jobs/job-application/JobApplicationDetails";

interface Props {
  application: any | null;
  open: boolean;
  onClose: () => void;
  onWithdraw?: (id: string) => void;
  withdrawing?: boolean;
}

export default function ApplicationDetailModal({ application, open, onClose, onWithdraw, withdrawing }: Props) {
  if (!open || !application) return null;
  const job = application.jobId || application.job;
  const slug = job?.slug || job?._id || "";

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Application Details</h2>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Close">&times;</button>
        </div>
        <div className={styles.body}>
          <JobApplicationDetails application={application} />
        </div>
        <div className={styles.footer}>
          {application.status !== "withdrawn" && onWithdraw && (
            <button className={styles.secondaryBtn} onClick={() => onWithdraw(application._id)} disabled={withdrawing}>
              {withdrawing ? "Withdrawing..." : "Withdraw application"}
            </button>
          )}
          <div style={{ flex: 1 }} />
          {slug && (
            <Link href={`/jobs/${slug}`} className={styles.primaryBtn} target="_blank">
              View job ad <ExternalLink size={14} />
            </Link>
          )}
          <button className={styles.secondaryBtn} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
