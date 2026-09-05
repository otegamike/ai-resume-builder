"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Sparkles, FileText, Mail, MapPin, Calendar, CheckCircle, Loader2, Users } from "lucide-react";
import styles from "./applicants.module.css";

interface ApplicantItem {
  _id: string;
  applicantId: {
    _id: string;
    name: string;
    email: string;
    image?: string;
    location?: string;
    jobTitle?: string;
  };
  resumeId?: {
    _id: string;
    title: string;
    targetRole?: string;
  };
  customResumeUrl?: string;
  coverLetterText?: string;
  status: string;
  aiMatchScore?: number;
  aiMatchAnalysis?: string;
  createdAt: string;
}

export default function JobApplicantsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.id;
  const router = useRouter();
  const { data: session, status } = useSession();

  const [jobTitle, setJobTitle] = useState("");
  const [applicants, setApplicants] = useState<ApplicantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/auth/login?callbackUrl=/employer/jobs/${jobId}/applicants`);
      return;
    }

    const fetchApplicants = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/applicants`);
        const data = await res.json();
        if (data.job) {
          setJobTitle(data.job.title);
        }
        if (data.applicants) {
          setApplicants(data.applicants);
        }
      } catch (err) {
        console.error("Error fetching applicants:", err);
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchApplicants();
    }
  }, [status, jobId, router]);

  const handleStatusChange = async (appId: string, newStatus: string) => {
    setUpdatingId(appId);
    try {
      const res = await fetch(`/api/jobs/applications/${appId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setApplicants((prev) =>
          prev.map((a) => (a._id === appId ? { ...a, status: newStatus } : a))
        );
      }
    } catch (err) {
      console.error("Error updating application status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className={styles.container} style={{ textAlign: "center", paddingTop: "5rem" }}>
        <Loader2 className="loading_icon" size={36} style={{ margin: "0 auto 1rem" }} />
        <p>Loading candidate applications...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <button onClick={() => router.push("/employer/dashboard")} className={styles.backBtn}>
          <ArrowLeft size={16} /> Back to Employer Dashboard
        </button>

        <div className={styles.header}>
          <h1 className={styles.jobTitle}>{jobTitle || "Job Applicants"}</h1>
          <p className={styles.jobSub}>
            {applicants.length} candidate application{applicants.length === 1 ? "" : "s"} received
          </p>
        </div>

        {applicants.length === 0 ? (
          <div className={styles.emptyState}>
            <Users size={48} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
            <h3>No Applicants Yet</h3>
            <p style={{ marginTop: "0.5rem" }}>
              Applications submitted by candidates using 1-Click Apply will appear here.
            </p>
          </div>
        ) : (
          <div className={styles.applicantsList}>
            {applicants.map((app) => {
              const candidate = app.applicantId;
              const name = candidate?.name || "Anonymous Candidate";
              const email = candidate?.email || "N/A";
              const image = candidate?.image;

              return (
                <div key={app._id} className={styles.applicantCard}>
                  <div className={styles.cardHeader}>
                    <div className={styles.candidateMeta}>
                      {image ? (
                        <img src={image} alt={name} className={styles.avatar} />
                      ) : (
                        <div className={styles.avatar}>{name.charAt(0).toUpperCase()}</div>
                      )}

                      <div>
                        <h3 className={styles.candidateName}>{name}</h3>
                        <div className={styles.candidateSub}>
                          <span><Mail size={13} style={{ display: "inline" }} /> {email}</span>
                          {candidate?.location && <span><MapPin size={13} style={{ display: "inline" }} /> {candidate.location}</span>}
                        </div>
                      </div>
                    </div>

                    {app.aiMatchScore !== undefined && (
                      <span className={styles.matchBadge}>
                        <Sparkles size={14} /> AI Match: {app.aiMatchScore}%
                      </span>
                    )}
                  </div>

                  {app.coverLetterText && (
                    <div className={styles.coverLetterBox}>
                      <strong style={{ color: "#a5b4fc", display: "block", marginBottom: "0.25rem" }}>
                        Cover Letter / Message:
                      </strong>
                      {app.coverLetterText}
                    </div>
                  )}

                  <div className={styles.cardFooter}>
                    <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                      Applied {new Date(app.createdAt).toLocaleDateString()}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      {app.resumeId?._id ? (
                        <Link
                          href={`/editor/${app.resumeId._id}`}
                          target="_blank"
                          className={styles.resumeBtn}
                        >
                          <FileText size={15} /> View Resume ({app.resumeId.title || "Resume"})
                        </Link>
                      ) : app.customResumeUrl ? (
                        <a
                          href={app.customResumeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.resumeBtn}
                        >
                          <FileText size={15} /> View Uploaded Resume
                        </a>
                      ) : (
                        <span style={{ fontSize: "0.85rem", color: "#64748b" }}>No Resume Attached</span>
                      )}

                      <select
                        className={styles.statusSelect}
                        value={app.status}
                        onChange={(e) => handleStatusChange(app._id, e.target.value)}
                        disabled={updatingId === app._id}
                        id={`change-status-${app._id}`}
                      >
                        <option value="submitted">Submitted</option>
                        <option value="under_review">Under Review</option>
                        <option value="shortlisted">Shortlisted</option>
                        <option value="interviewing">Interviewing</option>
                        <option value="offered">Offered</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
