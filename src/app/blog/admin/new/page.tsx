import PostForm from "../PostForm";
import styles from "./page.module.css";

export default function NewPostPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>New Post</h1>
      <p className={styles.subtitle}>Create a new blog post.</p>
      <div className={styles.card}>
        <PostForm mode="create" />
      </div>
    </div>
  );
}
