import { ArrowUp } from "lucide-react";
import styles from "./BulletInput.module.css";

interface BulletInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
}

/**
 * Textarea with an inline circular submit button (bottom-right) for adding
 * a bullet point. Enter still submits; the button exists so mobile users
 * who never press Enter can discover the action.
 */
export default function BulletInput({ value, onChange, onSubmit, placeholder }: BulletInputProps) {
  const canSubmit = value.trim().length > 0;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className={styles.wrapper}>
      <textarea
        placeholder={placeholder}
        className={styles.textarea}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button
        type="button"
        className={styles.submitButton}
        onClick={onSubmit}
        disabled={!canSubmit}
        title="Add bullet point"
        aria-label="Add bullet point"
      >
        <ArrowUp className={styles.submitIcon} />
      </button>
    </div>
  );
}
