import styles from "./SectionDivider.module.css";

interface SectionDividerProps {
  /** When true, renders dark→light gradient instead of light→dark */
  flip?: boolean;
}

export default function SectionDivider({ flip = false }: SectionDividerProps) {
  return (
    <div
      className={`${styles.divider} ${flip ? styles.toLight : styles.toDark}`}
      aria-hidden="true"
    />
  );
}
