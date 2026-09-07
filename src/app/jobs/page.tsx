import PageBody from "@/components/page-body/PageBody";
import FindJobsBoard from "@/components/jobs/find-jobs/FindJobsBoard";

export default function JobsPage() {
  return (
    <PageBody>
      <div style={{ maxWidth: "var(--container-max-width)", margin: "0 auto", padding: "var(--space-6) var(--space-8)", display: "flex", flexDirection: "column", gap: "var(--space-6)", width: "100%" }}>
        <header style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
          <h1 style={{ color: "var(--primary-900)", fontSize: "var(--text-xl)", fontWeight: "var(--font-bold)" }}>Explore Jobs</h1>
          <p style={{ color: "var(--gray-500)", fontSize: "var(--text-sm)", maxWidth: "48rem" }}>
            Browse active openings from verified employers. Search by title, skills, or location.
          </p>
        </header>
        <FindJobsBoard />
      </div>
    </PageBody>
  );
}
