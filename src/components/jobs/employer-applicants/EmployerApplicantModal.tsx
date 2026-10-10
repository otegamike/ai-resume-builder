"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import styles from "./EmployerApplicantModal.module.css";
import JobApplicationDetails from "@/components/jobs/job-application/JobApplicationDetails";
import DropDown from "@/components/ui/dropdown/Dropdown";
import { Button } from "@/components/ui/Button";
import { useAlertStore } from "@/store/useAlertStore";

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
            <DropDown defaultOption={currentStatus} options={STATUS_OPTIONS} selectedOption={pendingStatus} updateSelectedOption={(v) => setSelectedStatus(v as JobApplicationStatus)} position="top" fullwidth />
          </div>
          <MessageCandidate
            applicationId={String(application._id)}
            candidateName={application.applicantInformation?.name || "Candidate"}
          />
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

type ReplyMode = "hiring" | "custom" | "dontreply";

function MessageCandidate({ applicationId, candidateName }: { applicationId: string; candidateName: string }) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin ?? false;
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [replyMode, setReplyMode] = useState<ReplyMode>("hiring");
  const [replyTo, setReplyTo] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [posterEmail, setPosterEmail] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isAdmin) return null;

  const notify = (kind: "success" | "error", message: string) =>
    useAlertStore.getState().addAlert(kind, message);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/employer/messages/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to draft message");
      setSubject(String(data.subject || ""));
      setBodyText(String(data.body || ""));
      setPosterEmail(String(data.posterEmail || ""));
      setSent(false);
    } catch (e: unknown) {
      notify("error", e instanceof Error ? e.message : "Failed to draft message");
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/employer/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, subject, body: bodyText, replyMode, replyTo, contactEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send message");
      setSent(true);
      notify("success", "Message sent to candidate");
    } catch (e: unknown) {
      notify("error", e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.messageSection}>
      <span className={styles.messageTitle}>Message candidate</span>
      <span className={styles.messageHint}>To: {candidateName} · admin only</span>
      <div className={styles.messageRow}>
        <Button onClick={handleGenerate} disabled={generating || sending}>
          {generating ? "Drafting..." : "Generate draft"}
        </Button>
        {posterEmail ? (
          <button
            type="button"
            className={styles.messageChip}
            onClick={() => {
              setReplyMode("custom");
              setReplyTo(posterEmail);
            }}
          >
            Use poster email
          </button>
        ) : null}
      </div>
      <label className={styles.messageLabel}>Subject</label>
      <input
        className={styles.messageInput}
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        maxLength={120}
        placeholder="Message subject"
      />
      <label className={styles.messageLabel}>Replies go to</label>
      <select
        className={styles.messageInput}
        value={replyMode}
        onChange={(e) => setReplyMode(e.target.value as ReplyMode)}
      >
        <option value="hiring">Hiring inbox</option>
        <option value="custom">Custom address</option>
        <option value="dontreply">Do not reply + contact in body</option>
      </select>
      {replyMode === "custom" ? (
        <input
          className={styles.messageInput}
          value={replyTo}
          onChange={(e) => setReplyTo(e.target.value)}
          placeholder="reply-to@example.com"
          inputMode="email"
        />
      ) : null}
      {replyMode === "dontreply" ? (
        <input
          className={styles.messageInput}
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder="contact@example.com"
          inputMode="email"
        />
      ) : null}
      <label className={styles.messageLabel}>Message</label>
      <textarea
        className={styles.messageTextarea}
        value={bodyText}
        onChange={(e) => setBodyText(e.target.value)}
        rows={6}
        placeholder="Write the message or generate a draft..."
      />
      <div className={styles.messageRow}>
        <Button onClick={handleSend} disabled={sending || generating || !subject.trim() || !bodyText.trim()}>
          {sending ? "Sending..." : "Send message"}
        </Button>
        {sent ? <span className={styles.messageSent}>Sent</span> : null}
      </div>
    </div>
  );
}
