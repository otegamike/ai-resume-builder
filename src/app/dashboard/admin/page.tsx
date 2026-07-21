"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import styles from "./page.module.css";
import type { Stats, Timeline, AiUsageStats } from "@/types/Stats";

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [aiUsage, setAiUsage] = useState<AiUsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "loading") return;

    if (status !== "authenticated" || !session?.user?.isAdmin) {
      window.location.href = "/dashboard";
      return;
    }

    const fetchData = async () => {
      try {
        const [statsRes, timelineRes, aiUsageRes] = await Promise.all([
          fetch("/api/admin/stats"),
          fetch("/api/admin/stats/timeline"),
          fetch("/api/admin/stats/ai-usage"),
        ]);

        if (!statsRes.ok || !timelineRes.ok) {
          setError("Failed to load admin data");
          return;
        }

        const statsData: Stats = await statsRes.json();
        const timelineData: Timeline = await timelineRes.json();

        const mergedChartData = timelineData.visits.map((v) => ({
          date: v.date.slice(5),
          visits: v.count,
          signups:
            timelineData.signups.find((s) => s.date === v.date)?.count ?? 0,
          resumes:
            timelineData.resumes.find((r) => r.date === v.date)?.count ?? 0,
        }));

        setStats(statsData);
        setTimeline({ ...timelineData, chartData: mergedChartData });

        if (aiUsageRes.ok) {
          setAiUsage(await aiUsageRes.json());
        }
      } catch {
        setError("Failed to load admin data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [status, session]);

  const chartData = timeline?.chartData;

  const featureChartData = useMemo(() => {
    if (!aiUsage?.daily?.length) return [];
    const features = new Set<string>();
    for (const day of aiUsage.daily) {
      for (const f of day.byFeature) features.add(f.feature);
    }
    const featureList = Array.from(features);
    return aiUsage.daily.map((day) => {
      const row: Record<string, string | number> = { date: day.date.slice(5) };
      for (const f of day.byFeature) row[f.feature] = f.requests;
      for (const f of featureList) { if (!(f in row)) row[f] = 0; }
      return row;
    });
  }, [aiUsage]);

  const featureColors = [
    "#84b179", "#6a8e61", "#a78bfa", "#f59e0b",
    "#ef4444", "#3b82f6", "#ec4899", "#14b8a6",
  ];

  const tokenChartData = useMemo(() => {
    if (!aiUsage?.daily?.length) return [];
    return aiUsage.daily.map((day) => ({
      date: day.date.slice(5),
      tokens: day.totalTokens,
    }));
  }, [aiUsage]);

  if (status === "loading" || loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className={styles.loadingIcon} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorText}>{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Admin Dashboard</h1>
        <p className={styles.subtitle}>Key metrics and growth trends for your site.</p>
      </div>

      <div className={styles.statsGrid}>
        <StatCard label="Total Users" value={stats.totalUsers} />
        <StatCard label="New This Week" value={stats.newUsersThisWeek} />
        <StatCard label="Total Resumes" value={stats.totalResumes} />
        <StatCard label="Visits Today" value={stats.visitsToday} />
        <StatCard label="Active Users (30d)" value={stats.activeUsers} />
      </div>

      <div className={styles.chartSection}>
        <h2 className={styles.chartTitle}>Growth Trends — Last 30 Days</h2>
        <div className={styles.chartWrapper}>
          {chartData && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--gray-500)" }}
                  interval={4}
                />
                <YAxis tick={{ fontSize: 11, fill: "var(--gray-500)" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--gray-200)",
                    fontSize: "var(--text-sm)",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "var(--text-sm)", paddingTop: "var(--space-4)" }}
                />
                <Line
                  type="monotone"
                  dataKey="visits"
                  stroke="#84b179"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  name="Visits"
                />
                <Line
                  type="monotone"
                  dataKey="signups"
                  stroke="#6a8e61"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  name="Sign Ups"
                />
                <Line
                  type="monotone"
                  dataKey="resumes"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  name="Resumes"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className={styles.noData}>Not enough data to display chart yet.</p>
          )}
        </div>
      </div>

      {aiUsage && (
        <>
          <div className={styles.statsGrid}>
            <StatCard label="AI Requests Today" value={aiUsage.today.totalRequests} />
            <StatCard label="Tokens Used Today" value={aiUsage.today.totalTokens} />
            <StatCard label="Truncated Responses" value={aiUsage.today.truncatedCount} />
          </div>

          <div className={styles.chartSection}>
            <h2 className={styles.chartTitle}>AI Requests by Feature — Last 30 Days</h2>
            <div className={styles.chartWrapper}>
              {featureChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={featureChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "var(--gray-500)" }}
                      interval={4}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "var(--gray-500)" }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--gray-200)",
                        fontSize: "var(--text-sm)",
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "var(--text-sm)", paddingTop: "var(--space-4)" }}
                    />
                    {featureChartData.length > 0 &&
                      Object.keys(featureChartData[0])
                        .filter((k) => k !== "date")
                        .map((feature, i) => (
                          <Bar
                            key={feature}
                            dataKey={feature}
                            stackId="requests"
                            fill={featureColors[i % featureColors.length]}
                            name={feature}
                          />
                        ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className={styles.noData}>No AI usage data yet.</p>
              )}
            </div>
          </div>

          <div className={styles.chartSection}>
            <h2 className={styles.chartTitle}>Token Usage per Day — Last 30 Days</h2>
            <div className={styles.chartWrapper}>
              {tokenChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={tokenChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "var(--gray-500)" }}
                      interval={4}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "var(--gray-500)" }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--gray-200)",
                        fontSize: "var(--text-sm)",
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "var(--text-sm)", paddingTop: "var(--space-4)" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="tokens"
                      stroke="#a78bfa"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      name="Tokens"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className={styles.noData}>No token usage data yet.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value.toLocaleString()}</span>
    </div>
  );
}
