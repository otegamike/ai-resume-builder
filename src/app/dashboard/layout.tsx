"use client";

import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { FileText, Settings, Plus, LayoutTemplate, PanelRightClose,  PanelRightOpen, LogOut, BarChart3, WandSparkles, Sparkles, Home, PenLine, Briefcase } from "lucide-react";
import styles from "./layout.module.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAdmin = session?.user?.isAdmin ?? false;
  const [isSideBarOpen, setIsSideBarOpen] = useState<boolean>(false);
  const [sidebarState, setSideBarState] = useState<'show'|'hide'>('show');

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setSideBarState('hide');
    }, 5000);
  };

  useEffect(() => {
    if (!isSideBarOpen) {
      resetTimer();
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [sidebarState, isSideBarOpen]);

  const toggleSidebar = (menuState?: boolean) => {
    setIsSideBarOpen(prevState => menuState !== undefined ? menuState : !prevState); 
  }

  const toggleSidebarState = (toggleTo?: 'show'|'hide' ) => {
    setSideBarState(prev => toggleTo? toggleTo : prev==='show'? 'hide' : 'show')
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  function isActive(path: string) {
    return pathname === path ? styles.navLinkActive : "";
  }

  function closeSidebar () {
    toggleSidebar(false);
  }

  return (
    <div className={styles.container}>
      <aside className={`${styles.sidebar} ${isSideBarOpen? styles.open : ''} ${sidebarState === 'hide'? styles.hide : ''}`}>
        
        <nav className={styles.sidebarNav}>
          <div onClick={() => {toggleSidebar()}} className={`${styles.navLink} ${styles.sidebar__toggle__button}`}>
            <span className={styles.navLinkText}>
            </span>
            {isSideBarOpen?
              <PanelRightOpen className={styles.navIcon} /> : 
              <PanelRightClose className={styles.navIcon} />
            }
          </div>
          <Link href="/dashboard" onClick={closeSidebar} className={`${styles.navLink} ${isActive("/dashboard")}`}>
            <Home className={styles.navIcon} />
            <span className={styles.navLinkText}>
              Home
            </span>
          </Link>
          <Link href="/dashboard/resumes" onClick={closeSidebar} className={`${styles.navLink} ${isActive("/dashboard/resumes")}`}>
            <FileText className={styles.navIcon} />
            <span className={styles.navLinkText}>
              My Resumes
            </span>
          </Link>
          <Link href="/dashboard/writer" onClick={closeSidebar} className={`${styles.navLink} ${isActive("/dashboard/writer")}`}>
            <PenLine className={styles.navIcon} />
            <span className={styles.navLinkText}>
              Writer
            </span>
          </Link>
          <Link href="/dashboard/applications" onClick={closeSidebar} className={`${styles.navLink} ${isActive("/dashboard/applications")}`}>
            <Briefcase className={styles.navIcon} />
            <span className={styles.navLinkText}>
              Applications
            </span>
          </Link>
          <Link href="/dashboard/templates" onClick={closeSidebar} className={`${styles.navLink} ${isActive("/dashboard/templates")}`}>
            <LayoutTemplate className={styles.navIcon} />
            <span className={styles.navLinkText}>
              Templates
            </span>
          </Link>
          <Link href="/dashboard/improve" onClick={closeSidebar} className={`${styles.navLink} ${isActive("/dashboard/improve")}`}>
            <WandSparkles className={styles.navIcon} />
            <span className={styles.navLinkText}>
              Improve
            </span>
          </Link>
          <Link href="/dashboard/tailor" onClick={closeSidebar} className={`${styles.navLink} ${isActive("/dashboard/tailor")}`}>
            <Sparkles className={styles.navIcon} />
            <span className={styles.navLinkText}>
              Tailor
            </span>
          </Link>
          <Link href="/dashboard/settings" onClick={closeSidebar} className={`${styles.navLink} ${isActive("/dashboard/settings")}`}>
            <Settings className={styles.navIcon} />
            <span className={styles.navLinkText}>
              Settings
            </span>
          </Link>
          {isAdmin && (
            <Link href="/dashboard/admin" onClick={closeSidebar} className={`${styles.navLink} ${isActive("/dashboard/admin")}`}>
              <BarChart3 className={styles.navIcon} />
              <span className={styles.navLinkText}>
                Admin
              </span>
            </Link>
          )}
        </nav>

        <div className={styles.sidebarFooter}>
        
          <Link href="/editor/new" onClick={closeSidebar} className={`${styles.navLink} ${styles.create__button}`}>
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

      <div className={`${styles.floating__sidebar_toggle} ${sidebarState === 'show'? styles.hidefloatbar : ''}`} onClick={() => {toggleSidebarState('show'); toggleSidebar(true)} } >
        <PanelRightClose className={styles.navIcon} />
      </div>

      <div
        className={`${styles.overlay} ${isSideBarOpen ? styles.overlayVisible : ''}`}
        onClick={() => { toggleSidebar(false)}}
        aria-hidden="true"
      />

      <main className={`${styles.mainContent} ${sidebarState === 'hide'? styles.hide__sidebar : ''}`}>
        {children}
      </main>
    </div>
  );
}
