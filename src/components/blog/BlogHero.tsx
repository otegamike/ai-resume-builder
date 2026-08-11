import blogStyles from "./blog.module.css";
import styles from "./BlogHero.module.css";

interface BlogHeroProps {
  eyebrow: string;
  title: string;
  subtitle: string;
}

export default function BlogHero({ eyebrow, title, subtitle }: BlogHeroProps) {
  return (
    <header className={styles.hero}>
      <p className={blogStyles.eyebrow}>
        <span className={blogStyles.eyebrowLine} />
        {eyebrow}
      </p>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.subtitle}>{subtitle}</p>
    </header>
  );
}
