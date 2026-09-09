"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Building2, ShieldCheck } from "lucide-react";
import styles from "../jobs/jobs.module.css";
import EmployerHub from "@/components/jobs/employer-hub/EmployerHub";
import AdminQueue from "@/components/jobs/admin-queue/AdminQueue";

export default function EmployersPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin ?? false;
  const userAccountType = (session?.user as any)?.accountType ?? "candidate";
  const userOrgId = (session?.user as any)?.organizationId;
  const isEmployer = userAccountType === "employer" || userAccountType === "both" || !!userOrgId;
  const [activeTab, setActiveTab] = useState<"employer" | "admin">("employer");

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <h1 className={styles.title}>Employer Hub</h1>
        </div>
        <p className={styles.subtitle}>Manage your job ads, applicants, and moderation. Employers can post free job ads and review candidates.</p>
      </header>

      <div className={styles.tabNavigation}>
        <button className={`${styles.tabBtn} ${activeTab === "employer" ? styles.activeTab : ""}`} onClick={() => setActiveTab("employer")}>
          <Building2 size={16} /> {isEmployer ? "My Jobs" : "Become an Employer"}
        </button>
        {isAdmin && (
          <button className={`${styles.tabBtn} ${activeTab === "admin" ? styles.activeTab : ""}`} onClick={() => setActiveTab("admin")}>
            <ShieldCheck size={16} /> Admin
          </button>
        )}
      </div>

      {activeTab === "employer" && <EmployerHub isEmployer={isEmployer} />}
      {activeTab === "admin" && isAdmin && <AdminQueue />}
    </div>
  );
}
