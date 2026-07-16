import React from "react";
import { Button } from "@/components/ui/Button";
import { Loader2, Sparkles, Zap } from "lucide-react";
import { CREDIT_COST } from "@/lib/creditCosts";
import styles from "../page.module.css";

interface SummaryTabProps {
  summary: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  generateAISummary: () => void;
  improveSummary: () => void;
  aiGenerating: boolean;
  aiGeneratingFor: string | null;
}

export default function SummaryTab({
  summary,
  onChange,
  generateAISummary,
  improveSummary,
  aiGenerating,
  aiGeneratingFor,
}: SummaryTabProps) {
  return (
    <div className={styles.formSection}>
      <div className={styles.formSectionHeader}>
        <h2 className={styles.formSectionTitle}>About Me</h2>
        <div className={styles.aiButtons}>
          <Button
            variant="ai"
            size="sm"
            onClick={generateAISummary}
            disabled={aiGenerating}
            className={styles.aiButton}
          >
            {aiGeneratingFor === "summary" ? (
              <Loader2 className={`${styles.aiButtonIcon} ${styles.loadingIcon}`} />
            ) : (
              <></>
            )}
            {aiGeneratingFor === "summary" ? "Generating..." : "Generate "}
            <Zap size={12} />{CREDIT_COST.generateSummary}
          </Button>
          {summary && (
            <Button
              variant="ai"
              size="sm"
              onClick={improveSummary}
              disabled={aiGenerating}
              className={styles.aiButton}
            >
              {aiGeneratingFor === "improveSummary" ? (
                <Loader2 className={`${styles.aiButtonIcon} ${styles.loadingIcon}`} />
              ) : (
                <></>
              )}
              {aiGeneratingFor === "improveSummary" ? "Improving..." : "Improve"}
              <Zap size={12} />{CREDIT_COST.improveSummary}
            </Button>
          )}
        </div>
      </div>
      <textarea
        className={styles.textarea}
        value={summary}
        onChange={onChange}
        placeholder="Write a brief summary about your professional background, or click 'Generate with AI' to let AI write it for you..."
      />
    </div>
  );
}
