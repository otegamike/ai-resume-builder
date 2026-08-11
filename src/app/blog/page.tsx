import Link from "next/link";
import dbConnect from "@/lib/db";
import Post from "@/models/Post";
import AdminLink from "@/components/blog/AdminLink";
import BlogHero from "@/components/blog/BlogHero";
import FeaturedPostCard, {
  type BlogPostSummary,
} from "@/components/blog/FeaturedPostCard";
import PostCard from "@/components/blog/PostCard";
import RecentPostList from "@/components/blog/RecentPostList";
import BlogCTA from "@/components/blog/BlogCTA";
import Footer from "@/components/sections/Footer";
import blogStyles from "@/components/blog/blog.module.css";
import styles from "./page.module.css";

void Post;

export const revalidate = 3600;

export const metadata = {
  title: "Blog",
  description:
    "Expert advice on building ATS-optimized resumes, writing cover letters that get responses, and mastering your job search with AgenticApp.cv.",
  alternates: {
    canonical: "https://agenticapp.cv/blog",
  },
};

const POSTS_PER_PAGE = 12;

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
  const isFirstPage = page === 1;
  const featured: BlogPostSummary | undefined = isFirstPage ? posts[0] : undefined;
  const recent = isFirstPage ? posts.slice(1, 5) : [];
  const grid = isFirstPage ? posts.slice(5) : posts;

  return (
    <div>
      <section className={`${styles.hero} ${blogStyles.fullBleed}`}>
        <div className={blogStyles.inner}>
          <div className={styles.heroTop}>
            <AdminLink />
          </div>
          <BlogHero
            eyebrow="From the blog"
            title="The AgenticApp.cv Blog"
            subtitle="Tips, guides, and strategies for landing more interviews with an ATS-optimized resume."
          />
        </div>
      </section>

      <div className={`${styles.content} ${blogStyles.fullBleed}`}>
        <div className={blogStyles.inner}>
          {posts.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No posts published yet. Check back soon!</p>
            </div>
          ) : (
            <>
              {featured && <FeaturedPostCard post={featured} />}

              {recent.length > 0 && (
                <section className={styles.recentSection}>
                  <div className={styles.recentGrid}>
                    <RecentPostList posts={recent} />
                    <BlogCTA />
                  </div>
                </section>
              )}

              {grid.length > 0 && (
                <section className={styles.gridSection}>
                  <h2 className={styles.sectionHeading}>All posts</h2>
                  <div className={styles.grid}>
                    {grid.map((post) => (
                      <PostCard
                        key={post._id.toString()}
                        post={post as unknown as BlogPostSummary}
                      />
                    ))}
                  </div>
                </section>
              )}

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
      </div>

      <div className={blogStyles.fullBleed}>
        <Footer />
      </div>
    </div>
  );
}
