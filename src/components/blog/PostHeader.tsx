import Link from "next/link";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import TagPill from "./TagPill";
import ShareButtons from "./ShareButtons";
import styles from "./PostHeader.module.css";

interface PostHeaderProps {
  title: string;
  date: string;
  readTime: number;
  tags?: string[];
}

export default function PostHeader({
  title,
  date,
  readTime,
  tags,
}: PostHeaderProps) {
  return (
    <header className={styles.header}>
      <Link href="/blog" className={styles.backLink}>
        <ArrowLeft size={16} />
        Back to blog
      </Link>

      {tags && tags.length > 0 && (
        <div className={styles.tags}>
          {tags.map((tag) => (
            <TagPill key={tag} tag={tag} />
          ))}
        </div>
      )}

      <h1 className={styles.title}>{title}</h1>

      <div className={styles.meta}>
        <span className={styles.metaItem}>
          <Calendar size={15} />
          {date}
        </span>
        <span className={styles.metaItem}>
          <Clock size={15} />
          {readTime} min read
        </span>
        <ShareButtons />
      </div>
    </header>
  );
}
