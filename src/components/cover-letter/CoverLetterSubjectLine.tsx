"use client";

import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { useAlertStore } from "@/store/useAlertStore";
import styles from "./CoverLetterSubjectLine.module.css";

interface CoverLetterSubjectLineProps {
  role: string;
  name: string;
}

/**
 * Subject line shown above the letter body. Tapping copies the usable
 * subject (role and name) without the "Re:" prefix.
 */
export default function CoverLetterSubjectLine({ role, name }: CoverLetterSubjectLineProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const subject = name ? `${role} \u2014 ${name}` : role;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(subject);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      useAlertStore.getState().addAlert("error", "Failed to copy subject.");
    }
  }

  return (
    <button
      type="button"
      className={styles.subjectButton}
      onClick={handleCopy}
      title="Tap to copy subject"
      aria-label={`Copy subject: ${subject}`}
    >
      <span className={styles.subjectText}>
        Re: <strong>{role}</strong>
        {name ? ` \u2014 ${name}` : ""}
      </span>
      <span className={styles.copiedHint} aria-hidden={!copied}>
        {copied ? (
          <>
            <Check className={styles.copiedIcon} /> Copied
          </>
        ) : (
          "Tap to copy"
        )}
      </span>
    </button>
  );
}
