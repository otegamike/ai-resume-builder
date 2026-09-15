"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { WandSparkles, Sparkles } from "lucide-react";
import ImproveTab from "@/components/ai-tools/improve-tab/ImproveTab";
import TailorTab from "@/components/ai-tools/tailor-tab/TailorTab";
import styles from "./page.module.css";

type Tab = "improve" | "tailor";

function AiToolsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initial = searchParams.get("tab") === "tailor" ? "tailor" : "improve";
  const [activeTab, setActiveTab] = useState<Tab>(initial as Tab);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "tailor" || t === "improve") setActiveTab(t);
  }, [searchParams]);

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>AI Tools</h1>
          <p className={styles.subtitle}>Improve your CV for ATS or tailor it for a specific job. Improve your chances of getting that job.</p>
        </div>
      </header>

      <div className={styles.tabNavigation}>
        <button onClick={() => switchTab("improve")} className={`${styles.tab} ${activeTab === "improve" ? styles.activeTab : ""}`}>
          <WandSparkles size={16} />
          ATS Improve
        </button>
        <button onClick={() => switchTab("tailor")} className={`${styles.tab} ${activeTab === "tailor" ? styles.activeTab : ""}`}>
          <Sparkles size={16} />
          Tailor for Job
        </button>
      </div>

      {activeTab === "improve" && <ImproveTab />}
      {activeTab === "tailor" && <TailorTab />}
    </div>
  );
}

export default function AiToolsPage() {
  return (
    <Suspense fallback={null}>
      <AiToolsContent />
    </Suspense>
  );
}
