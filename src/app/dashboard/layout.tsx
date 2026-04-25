"use client";

import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import { FileText, Settings, Sparkles, Home, LogOut } from "lucide-react";
import styles from "./layout.module.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { signOut } = useClerk();

  const handleSignOut = () => {
    signOut({ redirectUrl: "/" });
  };

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        
        <nav className={styles.sidebarNav}>
          <Link href="/dashboard" className={`${styles.navLink} ${styles.navLinkActive}`}>
            <Home className={styles.navIcon} />
            Dashboard
          </Link>
          <Link href="/editor/new" className={styles.navLink}>
            <FileText className={styles.navIcon} />
            Create Resume
          </Link>
          <Link href="/settings" className={styles.navLink}>
            <Settings className={styles.navIcon} />
            Settings
          </Link>
        </nav>

        <div className={styles.sidebarFooter}>
          <button 
            onClick={handleSignOut}
            className={styles.signOutButton}
          >
            <LogOut className={styles.signOutIcon} />
            Sign Out
          </button>
        </div>
      </aside>

      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}