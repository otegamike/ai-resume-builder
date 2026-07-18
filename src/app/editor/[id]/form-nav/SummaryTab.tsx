import React from "react";
import { AiButton } from "@/components/ui/AiButton";
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
          <AiButton
            size="sm"
            onClick={generateAISummary}
            disabled={aiGenerating}
            className={styles.aiButton}
            cost={CREDIT_COST.generateSummary}
            loading={aiGeneratingFor === "summary"}
          >
            Generate
          </AiButton>
          {summary && (
            <AiButton
              size="sm"
              onClick={improveSummary}
              disabled={aiGenerating}
              className={styles.aiButton}
              cost={CREDIT_COST.improveSummary}
              loading={aiGeneratingFor === "improveSummary"}
              loadingText="Improving..."
            >
              Improve
            </AiButton>
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
