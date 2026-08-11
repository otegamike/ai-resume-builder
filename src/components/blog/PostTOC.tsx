import type { HeadingItem } from "./blogHelpers";
import styles from "./PostTOC.module.css";

export default function PostTOC({ headings }: { headings: HeadingItem[] }) {
  if (headings.length < 2) return null;

  return (
    <nav className={styles.toc} aria-label="Table of contents">
      <p className={styles.label}>On this page</p>
      <ul className={styles.list}>
        {headings.map((heading) => (
          <li
            key={heading.id}
            className={heading.level === 3 ? styles.itemSub : styles.item}
          >
            <a href={`#${heading.id}`} className={styles.link}>
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
