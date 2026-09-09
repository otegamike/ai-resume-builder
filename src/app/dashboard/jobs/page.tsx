"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Search, Building2, Clock, ArrowRight } from "lucide-react";
import styles from "./jobs.module.css";
import FindJobsBoard from "@/components/jobs/find-jobs/FindJobsBoard";
import ApplicationHistory from "@/components/jobs/application-history/ApplicationHistory";

export default function UnifiedJobsPage() {
  const { data: session } = useSession();
  const userAccountType = (session?.user as any)?.accountType ?? "candidate";
  const userOrgId = (session?.user as any)?.organizationId;
  const isEmployer = userAccountType === "employer" || userAccountType === "both" || !!userOrgId;
  const [activeTab, setActiveTab] = useState<"find" | "history">("find");

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <h1 className={styles.title}>Jobs & Hiring Hub</h1>
        </div>
        <p className={styles.subtitle}>Browse top opportunities, apply with AI matching, or register as an employer to hire top talent.</p>
      </header>

      {isEmployer ? (
        <Link href="/dashboard/employers" className={styles.employerBannerCard} style={{ padding: "var(--space-4)", textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <Building2 size={20} color="var(--primary-900)" />
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--primary-900)" }}>Go to Employer page to manage ads and review applications</span>
            </div>

          </div>
        </Link>
      ) : (
        <Link href="/dashboard/employers" className={styles.employerBannerCard} style={{ padding: "var(--space-4)", textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", width: "100%" }}>
            <div>
              <h3 className={styles.bannerTitle} style={{ fontSize: "var(--text-base)", marginBottom: 0 }}>Become an employer to post your own job ads</h3>
              <p className={styles.bannerText} style={{ fontSize: "var(--text-xs)", marginTop: "0.25rem" }}>Post free job ads and hire top talent.</p>
            </div>
            
          </div>
        </Link>
      )}

      <div className={styles.tabNavigation}>
        <button className={`${styles.tabBtn} ${activeTab === "find" ? styles.activeTab : ""}`} onClick={() => setActiveTab("find")}>
          <Search size={16} /> Find Jobs
        </button>
        <button className={`${styles.tabBtn} ${activeTab === "history" ? styles.activeTab : ""}`} onClick={() => setActiveTab("history")}>
          <Clock size={16} /> Application History
        </button>
      </div>

      {activeTab === "find" && <FindJobsBoard />}
      {activeTab === "history" && <ApplicationHistory />}
    </div>
  );
}
