"use client";

import { ChangeEvent, useState } from "react";
import {
  getMissingBrowserFeatures,
  OLD_BROWSER_MESSAGE,
  OLD_BROWSER_TITLE,
} from "@/lib/errors/unsupportedBrowser";
import styles from "./OldBrowserUpload.module.css";

export default function OldBrowserUploadHarness() {
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === "application/pdf";
    const missingFeatures = getMissingBrowserFeatures({ requireCanvas: isPdf });

    if (missingFeatures.length > 0) {
      setMessage(`${OLD_BROWSER_TITLE}. ${OLD_BROWSER_MESSAGE}`);
      setIsError(true);
      return;
    }

    setMessage(`File looks usable (${file.name}).`);
    setIsError(false);
  }

  return (
    <section className={styles.card}>
      <label className={styles.label} htmlFor="old-browser-file">
        Choose a PDF
      </label>
      <input
        id="old-browser-file"
        data-testid="old-browser-file"
        className={styles.input}
        type="file"
        accept="application/pdf,image/*"
        onChange={handleFileChange}
      />
      {message && (
        <p
          data-testid="old-browser-message"
          className={isError ? styles.error : styles.success}
          role="alert"
        >
          {message}
        </p>
      )}
    </section>
  );
}
