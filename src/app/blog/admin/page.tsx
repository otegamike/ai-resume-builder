"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
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
        <div className={styles.loadingContainer}>
          <Loader2 className={styles.loadingIcon} />
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
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Published</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post._id}>
                  <td>
                    <Link href={`/blog/${post.slug}`} className={styles.postTitle}>
                      {post.title}
                    </Link>
                    <span className={styles.postSlug}>/{post.slug}</span>
                  </td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${
                        post.published ? styles.statusPublished : styles.statusDraft
                      }`}
                    >
                      {post.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className={styles.mutedText}>{formatDate(post.publishedAt)}</td>
                  <td className={styles.mutedText}>{formatDate(post.updatedAt)}</td>
                  <td>
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
