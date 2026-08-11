import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import TagPill from "./TagPill";
import { formatDate } from "./blogHelpers";
import styles from "./FeaturedPostCard.module.css";

export interface BlogPostSummary {
  slug: string;
  title: string;
  excerpt?: string;
  coverImageUrl?: string;
  tags?: string[];
  publishedAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

export default function FeaturedPostCard({ post }: { post: BlogPostSummary }) {
  const href = `/blog/${post.slug}`;
  const date = formatDate(post.publishedAt ?? post.updatedAt);

  return (
    <article className={styles.card}>
      {post.coverImageUrl && (
        <Link
          href={href}
          className={styles.imageLink}
          tabIndex={-1}
          aria-hidden="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.coverImageUrl}
            alt={post.title}
            className={styles.image}
          />
        </Link>
      )}
      <div className={styles.body}>
        {post.tags && post.tags.length > 0 && (
          <div className={styles.tags}>
            {post.tags.slice(0, 3).map((tag) => (
              <TagPill key={tag} tag={tag} />
            ))}
          </div>
        )}
        <Link href={href} className={styles.titleLink}>
          <h2 className={styles.title}>{post.title}</h2>
        </Link>
        {post.excerpt && <p className={styles.excerpt}>{post.excerpt}</p>}
        <div className={styles.footer}>
          <span className={styles.date}>{date}</span>
          <Link href={href} className={styles.readMore}>
            Read post
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}
