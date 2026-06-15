"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  FileText,
  PenLine,
  Briefcase,
  Sparkles,
  Loader2,
  LayoutTemplate,
  WandSparkles,
  Settings,
  Clock,
  BarChart3,
} from "lucide-react";
import styles from "./page.module.css";

interface DashboardStats {
  counts: {
    resumes: number;
    coverLetters: number;
    applications: number;
    applicationsByStatus: Record<string, number>;
  };
  recent: {
    resumes: Array<{ _id: string; title: string; updatedAt: string; template: string }>;
    coverLetters: Array<{ _id: string; title: string; targetCompany: string; targetRole: string; updatedAt: string; status: string }>;
    applications: Array<{ _id: string; company: string; role: string; status: string; updatedAt: string }>;
  };
}

interface RecentActivity {
  id: string;
  type: "resume" | "cover-letter" | "application";
  label: string;
  detail: string;
  timestamp: string;
  href: string;
}

export default function OverviewPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      router.push("/");
      return;
    }

    const fetchStats = async () => {
      try {
        const res = await fetch("/api/dashboard/stats");
        if (res.ok) {
          const data: DashboardStats = await res.json();
          setStats(data);
        }
      } catch {
        // silent fail — stats are non-critical
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [status, router]);

  const activeApplications = stats?.counts.applicationsByStatus
    ? Object.entries(stats.counts.applicationsByStatus)
        .filter(([s]) => s === "saved" || s === "applied" || s === "interviewing")
        .reduce((sum, [, c]) => sum + c, 0)
    : 0;

  const recentActivity: RecentActivity[] = [
    ...(stats?.recent.resumes.map((r) => ({
      id: r._id,
      type: "resume" as const,
      label: "Edited Resume",
      detail: r.title,
      timestamp: r.updatedAt,
      href: `/editor/${r._id}`,
    })) ?? []),
    ...(stats?.recent.coverLetters.map((c) => ({
      id: c._id,
      type: "cover-letter" as const,
      label: "Created Cover Letter",
      detail: c.title,
      timestamp: c.updatedAt,
      href: `/dashboard/writer`,
    })) ?? []),
    ...(stats?.recent.applications.map((a) => ({
      id: a._id,
      type: "application" as const,
      label: `Application ${a.status}`,
      detail: `${a.role} at ${a.company}`,
      timestamp: a.updatedAt,
      href: `/dashboard/applications`,
    })) ?? []),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  const quickActions = [
    {
      icon: FileText,
      title: "My Resumes",
      description: "View and manage your resume collection",
      href: "/dashboard/resumes",
      color: "var(--primary-1)",
      bg: "#f0f7ed",
    },
    {
      icon: PenLine,
      title: "Writer Studio",
      description: "Create cover letters and application letters",
      href: "/dashboard/writer",
      color: "var(--ai-accent-500)",
      bg: "#f5f3ff",
    },
    {
      icon: BarChart3,
      title: "Applications",
      description: "Track your job applications",
      href: "/dashboard/applications",
      color: "var(--info)",
      bg: "#eff6ff",
    },
    {
      icon: LayoutTemplate,
      title: "Templates",
      description: "Browse and choose resume templates",
      href: "/dashboard/templates",
      color: "var(--primary-leaf)",
      bg: "#f4faf2",
    },
    {
      icon: WandSparkles,
      title: "Improve Resume",
      description: "ATS check and optimization",
      href: "/dashboard/improve",
      color: "var(--warning)",
      bg: "#fffbeb",
    },
    {
      icon: Sparkles,
      title: "Tailor Resume",
      description: "Customize your CV for a specific job",
      href: "/dashboard/tailor",
      color: "var(--ai-accent-700)",
      bg: "#f3e8ff",
    },
    {
      icon: Settings,
      title: "Settings",
      description: "Manage your account and preferences",
      href: "/dashboard/settings",
      color: "var(--gray-500)",
      bg: "#f9fafb",
    },
  ];

  if (status === "loading" || loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className={styles.loadingIcon} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <section className={styles.welcomeBanner}>
        <div>
          <h1 className={styles.welcomeTitle}>
            Welcome back{ session?.user?.name ? `, ${session.user.name}` : "" }
          </h1>
          <p className={styles.welcomeSubtitle}>
            Your career hub. manage resumes, cover letters, applications, and more.
          </p>
        </div>
      </section>

      <section className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ backgroundColor: "var(--primary-4)", color: "var(--primary-1)" }}>
            <FileText className={styles.statIcon} />
          </div>
            <p className={styles.statValue}>{stats?.counts.resumes ?? 0}</p>
            <p className={styles.statLabel}>Resumes</p>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ backgroundColor: "#ddd5e5ff", color: "#765e8fff" }}>
            <PenLine className={styles.statIcon} />
          </div>
            <p className={styles.statValue}>{stats?.counts.coverLetters ?? 0}</p>
            <p className={styles.statLabel}>Cover Letters</p>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ backgroundColor: "#ecfdf5", color: "#578a72ff" }}>
            <Briefcase className={styles.statIcon} />
          </div>
            <p className={styles.statValue}>{activeApplications}</p>
            <p className={styles.statLabel}>Active Applications</p>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ backgroundColor: "#fef3c7", color: "#998f68ff" }}>
            <Sparkles className={styles.statIcon} />
          </div>
            <p className={styles.statValue}>{stats?.counts.applications ?? 0}</p>
            <p className={styles.statLabel}>Total Applications</p>
        </div>
      </section>

      <section className={styles.quickActionsSection}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.quickActionsGrid}>
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={styles.actionCard}
              style={{ backgroundColor: action.bg }}
            >
              <div className={styles.actionIconWrapper} style={{ backgroundColor: `${action.color}20`, color: action.color }}>
                <action.icon className={styles.actionIcon} />
              </div>
              <div>
                <h3 className={styles.actionTitle}>{action.title}</h3>
                <p className={styles.actionDescription}>{action.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.activitySection}>
        <h2 className={styles.sectionTitle}>
          <Clock className={styles.sectionTitleIcon} />
          Recent Activity
        </h2>
        {recentActivity.length > 0 ? (
          <div className={styles.activityList}>
            {recentActivity.map((item) => (
              <Link key={item.id} href={item.href} className={styles.activityItem}>
                <div className={styles.activityDot} data-type={item.type} />
                <div className={styles.activityContent}>
                  <p className={styles.activityLabel}>{item.label}</p>
                  <p className={styles.activityDetail}>{item.detail}</p>
                </div>
                <span className={styles.activityTime}>
                  {formatRelativeTime(item.timestamp)}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.activityEmpty}>
            <p>No recent activity yet. Start by creating your first resume!</p>
          </div>
        )}
      </section>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
