"use client";

import { useState } from "react";
import { Sparkles, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { AiButton } from "@/components/ui/AiButton";
import JobDescriptionInput from "@/components/job-description/JobDescriptionInput";
import { useJobDescriptionInput } from "@/hooks/useJobDescriptionInput";
import type { ParsedJobAd } from "@/lib/ai";
import styles from "./JobAutofillSection.module.css";

interface JobAutofillSectionProps {
  onExtracted: (fields: ParsedJobAd) => void;
}

export default function JobAutofillSection({ onExtracted }: JobAutofillSectionProps) {
  const job = useJobDescriptionInput();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleExtract() {
    if (!job.hasJobContext) {
      setError("Paste a job description or upload an image first.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      job.appendToFormData(formData);

      const res = await fetch("/api/jobs/parse", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to extract job fields");
      }

      onExtracted(data as ParsedJobAd);
      setSuccess("Fields extracted — review and edit below before publishing.");
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract job fields");
    } finally {
      setLoading(false);
    }
  }

  function handleJobImageChange(e: React.ChangeEvent<HTMLInputElement>): string | null {
    const err = job.handleJobImageChange(e);
    if (err) setError(err);
    else setError("");
    return err;
  }

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <Sparkles size={18} />
        <h2>AI Autofill </h2>
      </div>
      <p className={styles.hint}>
        Paste a full job ad or upload a screenshot. AI will fill the fields below using the original wording. it will not reword or add info.
      </p>

      <JobDescriptionInput job={{ ...job, handleJobImageChange }} disabled={loading} />

      {error && (
        <div className={styles.error} role="alert">
          <AlertTriangle size={14} /> {error}
        </div>
      )}
      {success && (
        <div className={styles.success} role="status">
          <CheckCircle2 size={14} /> {success}
        </div>
      )}

      <div className={styles.actions}>
        <AiButton variant="primary" onClick={handleExtract} disabled={!job.hasJobContext || loading} cost={0}>
          {loading ? (
            <>
              <Loader2 size={16} className={styles.spinner} /> Extracting...
            </>
          ) : (
            <>
              <Sparkles size={16} /> Extract & Autofill
            </>
          )}
        </AiButton>
      </div>
    </section>
  );
}
