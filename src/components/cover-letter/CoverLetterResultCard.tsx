"use client";

import { useState } from "react";
import { Copy, Check, Edit, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import styles from "./CoverLetterResultCard.module.css";

interface SenderInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
}

interface CoverLetterResultCardProps {
  coverLetter: string;
  senderInfo: SenderInfo;
  targetRole: string;
  inferredRole?: string;
  onCopy: () => void;
  copied: boolean;
  onEditChange?: (newContent: string) => void;
}

export default function CoverLetterResultCard({
  coverLetter,
  senderInfo,
  targetRole,
  inferredRole = "",
  onCopy,
  copied,
  onEditChange,
}: CoverLetterResultCardProps) {
  const [editMode, setEditMode] = useState(false);
  const [draftContent, setDraftContent] = useState(coverLetter);

  const { name, email, phone, location } = senderInfo;
  const generatedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  function handleEditToggle() {
    if (editMode) {
      onEditChange?.(draftContent);
    }
    setEditMode(!editMode);
  }

  const paragraphs = coverLetter
    .split("\n")
    .filter((p) => p.trim().length > 0);

  const salutation = paragraphs[0] || "";
  const signature = paragraphs[paragraphs.length - 1] || "";
  const bodyParagraphs = paragraphs.slice(1, -1);

  const roleDisplay = targetRole || inferredRole || "the Position";

  return (
    <div className={styles.letterCard}>
      <div className={styles.letterhead}>
        <div className={styles.senderInfo}>
          <span className={styles.senderName}>{name}</span>
          {email && <span className={styles.senderDetail}>{email}</span>}
          {phone && <span className={styles.senderDetail}>{phone}</span>}
          {location && <span className={styles.senderDetail}>{location}</span>}
        </div>
        <span className={styles.dateSide}>{generatedDate}</span>
      </div>

      <hr className={styles.hairline} />

      <div className={styles.subjectBlock}>
        Re: <strong>{roleDisplay}</strong> &mdash; {name}
      </div>

      {editMode ? (
        <textarea
          className={styles.editTextarea}
          value={draftContent}
          onChange={(e) => setDraftContent(e.target.value)}
          rows={14}
        />
      ) : (
        <div className={styles.letterBody}>
          {salutation && <p className={styles.salutation}>{salutation}</p>}
          {bodyParagraphs.map((p, i) => (
            <p key={i} className={styles.paragraph}>{p}</p>
          ))}
          <div className={styles.signatureBlock}>
            <hr className={styles.signatureHairline} />
            {signature && <p className={styles.signature}>{signature}</p>}
          </div>
        </div>
      )}

      <div className={styles.actionsRow}>
        <Button variant="outline" onClick={onCopy} disabled={!coverLetter || editMode}>
          {copied ? (
            <><Check className={styles.btnIcon} /> Copied</>
          ) : (
            <><Copy className={styles.btnIcon} /> Copy</>
          )}
        </Button>
        <Button variant="outline" onClick={handleEditToggle}>
          {editMode ? (
            <><Save className={styles.btnIcon} /> Done Editing</>
          ) : (
            <><Edit className={styles.btnIcon} /> Edit</>
          )}
        </Button>
      </div>
    </div>
  );
}
