import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import dbConnect from "@/lib/db";
import Post from "@/models/Post";
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
      post.excerpt ||
      `Read "${post.title}" on the Agentic CV blog.`;

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

function formatDate(iso: Date | string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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

  return (
    <div className={styles.container}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingSchema) }}
      />

      <Link href="/blog" className={styles.backLink}>
        <ArrowLeft size={16} />
        Back to blog
      </Link>

      <article className={styles.article}>
        <header className={styles.header}>
          {post.tags && post.tags.length > 0 && (
            <div className={styles.tags}>
              {(post.tags as string[]).map((tag) => (
                <span key={tag} className={styles.tag}>
                  {tag}
                </span>
              ))}
            </div>
          )}
          <h1 className={styles.title}>{post.title}</h1>
          <p className={styles.meta}>
            Published{" "}
            {formatDate(post.publishedAt ?? post.updatedAt)}
          </p>
          {post.excerpt && <p className={styles.excerpt}>{post.excerpt}</p>}
        </header>

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

        <div
          className={styles.content}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>
    </div>
  );
}
