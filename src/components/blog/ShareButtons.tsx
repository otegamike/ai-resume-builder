"use client";

import { useState } from "react";
import { X, Link2, Check } from "lucide-react";
import styles from "./ShareButtons.module.css";

export default function ShareButtons() {
  const [copied, setCopied] = useState(false);

  const shareOnX = () => {
    const url = window.location.href;
    window.open(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={styles.row}>
      <button
        type="button"
        aria-label="Share on X"
        className={styles.button}
        onClick={shareOnX}
      >
        <X size={16} />
      </button>
      <button
        type="button"
        aria-label="Copy link"
        className={styles.button}
        onClick={copyLink}
      >
        {copied ? <Check size={16} /> : <Link2 size={16} />}
      </button>
    </div>
  );
}
