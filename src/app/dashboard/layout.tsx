"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { FileText, Settings, Plus, LayoutTemplate, LogOut, BarChart3, WandSparkles } from "lucide-react";
import styles from "./layout.module.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAdmin = session?.user?.isAdmin ?? false;

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  function isActive(path: string) {
    return pathname === path ? styles.navLinkActive : "";
  }

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        
        <nav className={styles.sidebarNav}>
          <Link href="/dashboard" className={`${styles.navLink} ${isActive("/dashboard")}`}>
            <FileText className={styles.navIcon} />
            <span className={styles.navLinkText}>
              My Resumes
            </span>
          </Link>
          <Link href="/dashboard/templates" className={`${styles.navLink} ${isActive("/dashboard/templates")}`}>
            <LayoutTemplate className={styles.navIcon} />
            <span className={styles.navLinkText}>
              Templates
            </span>
          </Link>
          <Link href="/dashboard/improve" className={`${styles.navLink} ${isActive("/dashboard/improve")}`}>
            <WandSparkles className={styles.navIcon} />
            <span className={styles.navLinkText}>
              Improve
            </span>
          </Link>
          <Link href="/dashboard/settings" className={`${styles.navLink} ${isActive("/dashboard/settings")}`}>
            <Settings className={styles.navIcon} />
            <span className={styles.navLinkText}>
              Settings
            </span>
          </Link>
          {isAdmin && (
            <Link href="/dashboard/admin" className={`${styles.navLink} ${isActive("/dashboard/admin")}`}>
              <BarChart3 className={styles.navIcon} />
              <span className={styles.navLinkText}>
                Admin
              </span>
            </Link>
          )}
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
