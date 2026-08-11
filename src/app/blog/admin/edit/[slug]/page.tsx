import dbConnect from "@/lib/db";
import Post from "@/models/Post";
import PostForm from "../../PostForm";
import styles from "./page.module.css";

void Post;

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  await dbConnect();
  const post = await Post.findOne({ slug }).lean();

  if (!post) {
    return (
      <div className={styles.container}>
        <p className={styles.notFound}>Post not found.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Edit Post</h1>
      <p className={styles.subtitle}>Update your post.</p>
      <div className={styles.card}>
        <PostForm
          mode="edit"
          editSlug={slug}
          initialValues={{
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt,
            content: post.content,
            coverImageUrl: post.coverImageUrl,
            tags: post.tags ?? [],
            published: post.published,
          }}
        />
      </div>
    </div>
  );
}
