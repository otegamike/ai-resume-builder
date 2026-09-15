"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, Loader2, MapPin } from "lucide-react";
import styles from "./JobsForYou.module.css";

interface RecommendedJob {
  _id: string;
  title: string;
  slug: string;
  location: string;
  category: string;
  jobType: string;
  companyId?: { name?: string };
}

export default function JobsForYou() {
  const [jobs, setJobs] = useState<RecommendedJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/jobs/recommended");
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        if (!cancelled) setJobs(Array.isArray(data.jobs) ? data.jobs.slice(0, 10) : []);
      } catch {
        if (!cancelled) setJobs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className={styles.section}>
        <div className={styles.headerRow}>
          <h2 className="sectionTitle">Jobs for you</h2>
        </div>
        <div className={styles.loading}>
          <Loader2 className={styles.spinner} />
          Finding jobs tailored to your profile...
        </div>
      </section>
    );
  }

  if (jobs.length === 0) {
    return (
      <section className={styles.section}>
        <div className={styles.headerRow}>
          <h2 className={styles.sectionTitle}>Jobs for you</h2>
          <Link href="/jobs" className={styles.viewAll}>
            Browse all
          </Link>
        </div>
        <div className={styles.empty}>
          No recommendations yet. Complete your profile or{" "}
          <Link href="/jobs" className={styles.emptyLink}>
            browse all jobs
          </Link>
          .
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.headerRow}>
        <h2 className={styles.sectionTitle}>Jobs for you</h2>
        <Link href="/jobs" className={styles.viewAll}>
          View all
        </Link>
      </div>
      <div className={styles.grid}>
        {jobs.map((job) => (
          <JobForYouCard key={job._id} job={job} />
        ))}
      </div>
    </section>
  );
}

function JobForYouCard({ job }: { job: RecommendedJob }) {
  return (
    <Link href={`/jobs/${job.slug || job._id}`} className={styles.card}>
      <h3 className={styles.cardTitle}>{job.title}</h3>
      <span className={styles.companyName}>
        <Briefcase size={12} />
        {job.companyId?.name || "Hiring Organization"}
      </span>
      <div className={styles.metaRow}>
        <span className={styles.tag}>
          <MapPin size={10} style={{ display: "inline", marginRight: 4 }} />
          {job.location || "Remote"}
        </span>
        <span className={styles.tag}>{job.category}</span>
        <span className={styles.tag}>{job.jobType}</span>
      </div>
    </Link>
  );
}
