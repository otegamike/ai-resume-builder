import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formatDate } from "./blogHelpers";
import styles from "./RecentPostList.module.css";

interface RecentPostListProps {
  posts: {
    slug: string;
    title: string;
    publishedAt?: Date | string | null;
    updatedAt?: Date | string | null;
  }[];
  offset?: number;
}

export default function RecentPostList({
  posts,
  offset = 0,
}: RecentPostListProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Latest posts</h2>
      <ul className={styles.list}>
        {posts.map((post, index) => {
          const number = String(offset + index + 1).padStart(2, "0");
          const date = formatDate(post.publishedAt ?? post.updatedAt);
          return (
            <li key={post.slug}>
              <Link href={`/blog/${post.slug}`} className={styles.item}>
                <span className={styles.number}>{number}</span>
                <span className={styles.itemBody}>
                  <span className={styles.itemTitle}>{post.title}</span>
                  <span className={styles.itemDate}>{date}</span>
                </span>
                <ArrowUpRight size={18} className={styles.arrow} />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
