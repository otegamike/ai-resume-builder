"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Loader2, ArrowLeft } from "lucide-react";
import styles from "./page.module.css";

interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  published: boolean;
  publishedAt: string | null;
  updatedAt: string;
}

export default function BlogAdminPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch("/api/blog/posts?includeDrafts=1");
        if (!res.ok) {
          throw new Error("Failed to load posts");
        }
        const data = await res.json();
        setPosts(data.posts ?? []);
      } catch {
        setError("Failed to load blog posts.");
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  const handleDelete = async (slug: string) => {
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    setDeleting(slug);
    try {
      const res = await fetch(`/api/blog/posts/${slug}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Delete failed");
      }
      setPosts((prev) => prev.filter((p) => p.slug !== slug));
    } catch {
      alert("Failed to delete post.");
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className={styles.container}>
      <Link href="/blog" className={styles.backLink}>
        <ArrowLeft size={16} />
        Back to blog
      </Link>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Blog Posts</h1>
          <p className={styles.subtitle}>Manage your blog posts and drafts.</p>
        </div>
        <Link href="/blog/admin/new" className={styles.newPostButton}>
          <Plus size={18} />
          New Post
        </Link>
      </div>

      {loading && (
        <div className={styles.cardGrid} aria-hidden="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className={`${styles.card} ${styles.skeletonCard}`}>
              <div className={styles.cardTop}>
                <span className={styles.skeletonBadge} />
                <div className={styles.actions}>
                  <span className={styles.skeletonButton} />
                  <span className={styles.skeletonButton} />
                </div>
              </div>
              <span className={styles.skeletonLine} />
              <span className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
              <span className={`${styles.skeletonLine} ${styles.skeletonLineTiny}`} />
            </div>
          ))}
        </div>
      )}

      {!loading && error && <p className={styles.errorText}>{error}</p>}

      {!loading && !error && posts.length === 0 && (
        <div className={styles.emptyState}>
          <p>No blog posts yet.</p>
          <Link href="/blog/admin/new" className={styles.emptyLink}>
            Create your first post
          </Link>
        </div>
      )}

      {!loading && !error && posts.length > 0 && (
        <div className={styles.cardGrid}>
          {posts.map((post) => (
            <article key={post._id} className={styles.card}>
              <div className={styles.cardTop}>
                <span
                  className={`${styles.statusBadge} ${
                    post.published
                      ? styles.statusPublished
                      : styles.statusDraft
                  }`}
                >
                  {post.published ? "Published" : "Draft"}
                </span>
                <div className={styles.actions}>
                  <Link
                    href={`/blog/admin/edit/${post.slug}`}
                    className={styles.iconButton}
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </Link>
                  <button
                    onClick={() => handleDelete(post.slug)}
                    disabled={deleting === post.slug}
                    className={`${styles.iconButton} ${styles.deleteButton}`}
                    title="Delete"
                  >
                    {deleting === post.slug ? (
                      <Loader2 size={16} className={styles.spinner} />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              </div>

              <Link href={`/blog/${post.slug}`} className={styles.postTitle}>
                <h3 className={styles.cardTitle}>{post.title}</h3>
              </Link>
              <span className={styles.postSlug}>/{post.slug}</span>

              <div className={styles.cardMeta}>
                <span>Published {formatDate(post.publishedAt)}</span>
                <span>Updated {formatDate(post.updatedAt)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
