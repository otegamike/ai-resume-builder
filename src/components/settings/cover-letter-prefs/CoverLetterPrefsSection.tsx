"use client";

import { useEffect, useState } from "react";
import { MailPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useUserStore } from "@/store/useUserStore";
import styles from "./CoverLetterPrefsSection.module.css";

export default function CoverLetterPrefsSection() {
  const intro = useUserStore((s) => s.coverLetterIntro);
  const outro = useUserStore((s) => s.coverLetterOutro);
  const prefsLoading = useUserStore((s) => s.prefsLoading);
  const prefsError = useUserStore((s) => s.prefsError);
  const ensurePrefs = useUserStore((s) => s.ensureCoverLetterPrefs);
  const savePrefs = useUserStore((s) => s.saveCoverLetterPrefs);

  const [draftIntro, setDraftIntro] = useState(intro);
  const [draftOutro, setDraftOutro] = useState(outro);
  const [saving, setSaving] = useState(false);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    ensurePrefs();
  }, [ensurePrefs]);

  useEffect(() => {
    if (!synced) {
      setDraftIntro(intro);
      setDraftOutro(outro);
      if (!prefsLoading) setSynced(true);
    }
  }, [intro, outro, prefsLoading, synced]);

  const dirty =
    draftIntro.trim() !== intro.trim() || draftOutro.trim() !== outro.trim();

  async function handleSave() {
    setSaving(true);
    try {
      await savePrefs(draftIntro, draftOutro);
    } catch {
      // Alert is handled inside the store.
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardHeaderTitle}>
          <div className={styles.cardHeaderTop}>
            <MailPlus className={styles.cardHeaderIcon} />
            Cover Letter Defaults
          </div>
        </h2>
        <p className={styles.cardHeaderDescription}>
          Set an intro and outro added to every cover letter when you copy or email it.
          Use the outro for portfolio links, footnotes, or your sign-off.
        </p>
      </div>
      <div className={styles.cardContent}>
        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="cover-letter-intro">
            Intro
          </label>
          <textarea
            id="cover-letter-intro"
            className={styles.textarea}
            rows={2}
            value={draftIntro}
            onChange={(e) => setDraftIntro(e.target.value)}
            placeholder="Dear Hiring Manager,"
            disabled={prefsLoading}
          />
          <p className={styles.inputHelper}>
            Placed before the letter body. Defaults to Dear Hiring Manager.
          </p>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="cover-letter-outro">
            Outro
          </label>
          <textarea
            id="cover-letter-outro"
            className={styles.textarea}
            rows={4}
            value={draftOutro}
            onChange={(e) => setDraftOutro(e.target.value)}
            placeholder={"Sincerely,\nJane Doe\nPortfolio: https://example.com"}
            disabled={prefsLoading}
          />
          <p className={styles.inputHelper}>
            Placed after the letter body. Add links to your portfolio or footnotes here.
          </p>
        </div>
        {prefsError && (
          <p className={styles.error} role="alert">
            {prefsError}
          </p>
        )}
        <div className={styles.actions}>
          <Button onClick={handleSave} disabled={!dirty || saving || prefsLoading}>
            {saving ? "Saving..." : "Save Intro & Outro"}
          </Button>
        </div>
      </div>
    </div>
  );
}
