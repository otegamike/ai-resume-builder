import styles from "./TagPill.module.css";

interface TagPillProps {
  tag: string;
}

export default function TagPill({ tag }: TagPillProps) {
  return <span className={styles.pill}>{tag}</span>;
}
