"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { FileText, Settings, Plus, LayoutTemplate, LogOut} from "lucide-react";
import styles from "./layout.module.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        
        <nav className={styles.sidebarNav}>
          <Link href="/dashboard" className={`${styles.navLink} ${styles.navLinkActive}`}>
            <FileText className={styles.navIcon} />
            <span className={styles.navLinkText}>
              My Resumes
            </span>
          </Link>
          <Link href="/templates" className={styles.navLink}>
            <LayoutTemplate className={styles.navIcon} />
            <span className={styles.navLinkText}>
              Templates
            </span>
          </Link>
          <Link href="/settings" className={styles.navLink}>
            <Settings className={styles.navIcon} />
            <span className={styles.navLinkText}>
              Settings
            </span>
          </Link>
        </nav>

        <div className={styles.sidebarFooter}>
        
          <Link href="/editor/new" className={`${styles.navLink} ${styles.create__button}`}>
            <Plus className={styles.navIcon} color="var(--neutral-50)" />
            <span className={styles.navLinkText}> 
              Create New
            </span>
          </Link>
        
          <div className={styles.logout__container}>
            <button 
              onClick={handleSignOut}
              className={styles.signOutButton}
            >
              <LogOut className={styles.signOutIcon} />
              <span className={styles.navLinkText}>
                Sign Out
              </span>
            </button>
          </div>
        </div>
      </aside>

      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}