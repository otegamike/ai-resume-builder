import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import TagPill from "./TagPill";
import type { BlogPostSummary } from "./FeaturedPostCard";
import { formatDate } from "./blogHelpers";
import styles from "./PostCard.module.css";

export default function PostCard({ post }: { post: BlogPostSummary }) {
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
            {post.tags.slice(0, 2).map((tag) => (
              <TagPill key={tag} tag={tag} />
            ))}
          </div>
        )}
        <Link href={href} className={styles.titleLink}>
          <h3 className={styles.title}>{post.title}</h3>
        </Link>
        {post.excerpt && <p className={styles.excerpt}>{post.excerpt}</p>}
        <div className={styles.footer}>
          <span className={styles.date}>{date}</span>
          <ArrowUpRight size={16} className={styles.arrow} />
        </div>
      </div>
    </article>
  );
}
