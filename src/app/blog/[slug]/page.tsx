import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import dbConnect from "@/lib/db";
import Post from "@/models/Post";
import PostHeader from "@/components/blog/PostHeader";
import PostTOC from "@/components/blog/PostTOC";
import TagPill from "@/components/blog/TagPill";
import {
  extractHeadings,
  injectHeadingIds,
  formatDate,
} from "@/components/blog/blogHelpers";
import blogStyles from "@/components/blog/blog.module.css";
import styles from "./page.module.css";

void Post;

export const revalidate = 3600;

const BASE_URL = "https://agenticapp.cv";

export async function generateStaticParams() {
  try {
    await dbConnect();
    const posts = await Post.find({ published: true }).select("slug").lean();
    return posts.map((post) => ({ slug: post.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    await dbConnect();
    const post = await Post.findOne({ slug, published: true }).lean();

    if (!post) {
      return {
        title: "Post Not Found",
      };
    }

    const url = `${BASE_URL}/blog/${post.slug}`;
    const description =
      post.excerpt || `Read "${post.title}" on the Agentic CV blog.`;

    return {
      title: post.title,
      description,
      alternates: {
        canonical: url,
      },
      openGraph: {
        type: "article",
        title: post.title,
        description,
        url,
        publishedTime: post.publishedAt
          ? new Date(post.publishedAt).toISOString()
          : undefined,
        modifiedTime: post.updatedAt
          ? new Date(post.updatedAt).toISOString()
          : undefined,
        images: post.coverImageUrl
          ? [{ url: post.coverImageUrl }]
          : [{ url: "/og-default.png", width: 1200, height: 630 }],
      },
      twitter: {
        card: "summary_large_image",
        title: post.title,
        description,
        images: post.coverImageUrl
          ? [post.coverImageUrl]
          : ["/og-default.png"],
      },
    };
  } catch {
    return {
      title: "Post Not Found",
    };
  }
}

function estimateReadTime(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;
  return Math.max(1, Math.ceil(words / 200));
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  await dbConnect();
  const post = await Post.findOne({ slug, published: true }).lean();

  if (!post) {
    notFound();
  }

  const headings = extractHeadings(post.content);
  const contentHtml = injectHeadingIds(post.content);
  const readTime = estimateReadTime(post.content);

  const blogPostingSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    image: post.coverImageUrl || `${BASE_URL}/og-default.png`,
    datePublished: post.publishedAt
      ? new Date(post.publishedAt).toISOString()
      : new Date(post.updatedAt).toISOString(),
    dateModified: new Date(post.updatedAt).toISOString(),
    author: {
      "@type": "Organization",
      name: "Agentic CV",
    },
    publisher: {
      "@type": "Organization",
      name: "Agentic CV",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}/blog/${post.slug}`,
    },
  };

  const tags = post.tags as string[] | undefined;

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingSchema) }}
      />

      <div className={`${styles.content} ${blogStyles.fullBleed}`}>
        <div className={blogStyles.inner}>
          <PostHeader
            title={post.title}
            date={formatDate(post.publishedAt ?? post.updatedAt)}
            readTime={readTime}
            tags={tags}
          />

          <div className={styles.layout}>
            <div className={styles.body}>
              {post.coverImageUrl && (
                <div className={styles.coverWrapper}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.coverImageUrl}
                    alt={post.title}
                    className={styles.coverImage}
                  />
                </div>
              )}

              <article
                className={styles.article}
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />
            </div>

            {headings.length > 1 && (
              <aside className={styles.sidebar}>
                <PostTOC headings={headings} />
              </aside>
            )}
          </div>

          <footer className={styles.footerMeta}>
            {tags && tags.length > 0 && (
              <div className={styles.footerTags}>
                {tags.map((tag) => (
                  <TagPill key={tag} tag={tag} />
                ))}
              </div>
            )}
            <Link href="/blog" className={styles.allPostsLink}>
              <ArrowLeft size={16} />
              All articles
            </Link>
          </footer>
        </div>
      </div>
    </div>
  );
}
