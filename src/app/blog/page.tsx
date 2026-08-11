import Link from "next/link";
import dbConnect from "@/lib/db";
import Post from "@/models/Post";
import styles from "./page.module.css";

void Post;

export const revalidate = 3600;

export const metadata = {
  title: "Blog",
  description:
    "Expert advice on building ATS-optimized resumes, writing cover letters that get responses, and mastering your job search with Agentic CV.",
  alternates: {
    canonical: "https://agenticapp.cv/blog",
  },
};

const POSTS_PER_PAGE = 12;

function formatDate(iso: Date | string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const skip = (page - 1) * POSTS_PER_PAGE;

  await dbConnect();
  const [posts, totalPosts] = await Promise.all([
    Post.find({ published: true })
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(POSTS_PER_PAGE)
      .select("title slug excerpt coverImageUrl tags publishedAt")
      .lean(),
    Post.countDocuments({ published: true }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalPosts / POSTS_PER_PAGE));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>The Agentic CV Blog</h1>
        <p className={styles.subtitle}>
          Tips, guides, and strategies for landing more interviews with an
          ATS-optimized resume.
        </p>
      </div>

      {posts.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No posts published yet. Check back soon!</p>
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {posts.map((post) => (
              <Link
                key={post._id.toString()}
                href={`/blog/${post.slug}`}
                className={styles.card}
              >
                {post.coverImageUrl && (
                  <div className={styles.cardImageWrapper}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.coverImageUrl}
                      alt={post.title}
                      className={styles.cardImage}
                    />
                  </div>
                )}
                <div className={styles.cardBody}>
                  {post.tags && post.tags.length > 0 && (
                    <div className={styles.tags}>
                      {(post.tags as string[]).slice(0, 3).map((tag) => (
                        <span key={tag} className={styles.tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <h2 className={styles.cardTitle}>{post.title}</h2>
                  {post.excerpt && (
                    <p className={styles.cardExcerpt}>{post.excerpt}</p>
                  )}
                  <span className={styles.cardDate}>
                    {formatDate(post.publishedAt ?? post.updatedAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <nav className={styles.pagination}>
              {page > 1 && (
                <Link
                  href={`/blog?page=${page - 1}`}
                  className={styles.pageButton}
                >
                  Previous
                </Link>
              )}
              <span className={styles.pageInfo}>
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={`/blog?page=${page + 1}`}
                  className={styles.pageButton}
                >
                  Next
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
