import styles from "./FeaturesSectionSkeleton.module.css";

export default function FeaturesSectionSkeleton() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={`${styles.pulse} ${styles.eyebrow}`} />
          <div className={`${styles.pulse} ${styles.title}`} />
          <div className={`${styles.pulse} ${styles.subtitle}`} />
        </div>

        <div className={styles.bento}>
          <div className={`${styles.card} ${styles.spanHero}`}>
            <div className={`${styles.pulse} ${styles.badge}`} />
            <div className={`${styles.pulse} ${styles.cardTitle}`} />
            <div className={`${styles.pulse} ${styles.cardDescription}`} />
            <div className={`${styles.pulse} ${styles.cardVisual}`} />
          </div>

          <div className={`${styles.card} ${styles.spanMedium}`}>
            <div className={`${styles.pulse} ${styles.badge}`} />
            <div className={`${styles.pulse} ${styles.cardTitle}`} />
            <div className={`${styles.pulse} ${styles.cardDescription}`} />
            <div className={`${styles.pulse} ${styles.cardVisual}`} />
          </div>

          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${styles.card} ${styles.spanThird}`}>
              <div className={`${styles.pulse} ${styles.cardTitle}`} />
              <div className={`${styles.pulse} ${styles.cardDescription}`} />
              <div className={`${styles.pulse} ${styles.cardVisual}`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
