import PageBody from "@/components/page-body/PageBody";
import FindJobsBoard from "@/components/jobs/find-jobs/FindJobsBoard";
import styles from "./page.module.css";

export default function JobsPage() {
  return (
    <PageBody>
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>Explore Jobs</h1>
          <p className={styles.subtitle}>Browse active openings from verified employers. Search by title, skills, or location.</p>
        </header>
        <FindJobsBoard />
      </div>
    </PageBody>
  );
}
