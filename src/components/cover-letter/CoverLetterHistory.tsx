"use client";

import { Plus, Edit, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { CoverLetterItem } from "@/types/CoverLetterData";
import styles from "./CoverLetterHistory.module.css";

interface CoverLetterHistoryProps {
  letters: CoverLetterItem[];
  loading: boolean;
  onNew: () => void;
  onView: (letter: CoverLetterItem) => void;
  onDelete: (id: string) => void;
}

function truncateWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "...";
}

export default function CoverLetterHistory({
  letters,
  loading,
  onNew,
  onView,
  onDelete,
}: CoverLetterHistoryProps) {
  return (
    <div className={styles.container}>
      {loading ? (
        <HistoryCardSkeleton />
      ) : letters.length === 0 ? (
        <div className={styles.emptyState}>
          <FileText className={styles.emptyIcon} />
          <p>No cover letters yet. Create your first one!</p>
          <Button onClick={onNew}>
            <Plus className={styles.btnIcon} />
            Create Your First Letter
          </Button>
        </div>
      ) : (
        <div className={styles.cardList}>
          {letters.map((letter) => (
            <div key={letter._id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderInfo}>
                  <h3 className={styles.cardTitle}>{letter.title}</h3>
                  {(letter.targetCompany || letter.targetRole) && (
                    <p className={styles.cardMeta}>
                      {letter.targetCompany && <span>{letter.targetCompany}</span>}
                      {letter.targetRole && <span>{letter.targetRole}</span>}
                    </p>
                  )}
                </div>
              </div>

              <div className={styles.cardBody}>
                <p className={styles.letterSnippet}>
                  {letter.content
                    ? truncateWords(letter.content, 300)
                    : "No content available."}
                </p>
              </div>

              <div className={styles.cardFooter}>
                <small className={styles.dateText}>
                  {new Date(letter.updatedAt).toLocaleDateString()}
                </small>
                <div className={styles.actionButtons}>
                  <button className={styles.iconBtn} onClick={() => onView(letter)} title="Edit">
                    <Edit />
                  </button>
                  <button className={`${styles.iconBtn} ${styles.deleteBtn}`} onClick={() => onDelete(letter._id)} title="Delete">
                    <Trash2 />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryCardSkeleton() {
  return (
    <div className={styles.skeletonList}>
      {[1, 2, 3].map((i) => (
        <div key={i} className={styles.skeletonCard}>
          <div className={styles.skeletonHeader}>
            <div className={styles.skeletonHeaderLeft}>
              <div className={`${styles.skeletonBar} ${styles.skeletonBarWide}`} />
              <div className={`${styles.skeletonBar} ${styles.skeletonBarNarrow}`} />
            </div>
          </div>
          <div className={styles.skeletonBody}>
            <div className={styles.skeletonTextBlock} />
          </div>
          <div className={styles.skeletonFooter}>
            <div className={styles.skeletonDate} />
            <div className={styles.skeletonActions}>
              <div className={styles.skeletonDot} />
              <div className={styles.skeletonDot} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
