"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Search, Building2, ShieldCheck } from "lucide-react";
import styles from "./jobs.module.css";
import FindJobsBoard from "@/components/jobs/find-jobs/FindJobsBoard";
import EmployerHub from "@/components/jobs/employer-hub/EmployerHub";
import AdminQueue from "@/components/jobs/admin-queue/AdminQueue";

export default function UnifiedJobsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin ?? false;
  const userAccountType = (session?.user as any)?.accountType ?? "candidate";
  const userOrgId = (session?.user as any)?.organizationId;
  const isEmployer = userAccountType === "employer" || userAccountType === "both" || !!userOrgId;
  const [activeTab, setActiveTab] = useState<"find" | "employer" | "admin">("find");

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <h1 className={styles.title}>Jobs & Hiring Hub</h1>
          {isAdmin && (
            <button className={`${styles.tabBtn}`} onClick={() => setActiveTab("admin")}>
              <ShieldCheck size={16} /> Admin {` `}
            </button>
          )}
        </div>
        <p className={styles.subtitle}>Browse top opportunities, apply with 1-Click AI matching, or register as an employer to hire top talent.</p>
      </header>

      <div className={styles.tabNavigation}>
        <button className={`${styles.tabBtn} ${activeTab === "find" ? styles.activeTab : ""}`} onClick={() => setActiveTab("find")}>
          <Search size={16} /> Find Jobs
        </button>
        <button className={`${styles.tabBtn} ${activeTab === "employer" ? styles.activeTab : ""}`} onClick={() => setActiveTab("employer")}>
          <Building2 size={16} /> {isEmployer ? "Employer Hub" : "Become an Employer"}
        </button>
      </div>

      {activeTab === "find" && <FindJobsBoard />}
      {activeTab === "employer" && <EmployerHub isEmployer={isEmployer} />}
      {activeTab === "admin" && isAdmin && <AdminQueue />}
    </div>
  );
}
