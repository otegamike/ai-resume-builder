"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Search, MapPin, Briefcase, CheckCircle2, Loader2 } from "lucide-react";
import DropDown from "@/components/ui/dropdown/Dropdown";
import styles from "./FindJobsBoard.module.css";

interface JobCompany {
  _id: string;
  name: string;
  isVerified?: boolean;
}

interface JobItem {
  _id: string;
  title: string;
  slug: string;
  companyId: JobCompany;
  jobType: string;
  workplaceType: string;
  location: string;
  category: string;
  hideSalary: boolean;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
  isFeatured: boolean;
}

const CATEGORIES = ["All", "Engineering", "Design", "Product", "Marketing", "Sales", "HR", "Finance", "Other"];

export default function FindJobsBoard() {
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [locations, setLocations] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchJobs = useCallback(async (pageNum: number, reset: boolean) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (locationInput && locationInput !== "all locations") params.append("location", locationInput);
      if (activeCategory !== "All") params.append("category", activeCategory);
      params.append("page", String(pageNum));
      params.append("limit", "12");
      const res = await fetch(`/api/jobs?${params.toString()}`);
      const data = await res.json();
      const newJobs: JobItem[] = data.jobs || [];
      setJobs((prev) => (reset ? newJobs : [...prev, ...newJobs]));
      setLocations(data.locations || []);
      const totalPages = data.pagination?.totalPages ?? 1;
      setHasMore(pageNum < totalPages);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [search, locationInput, activeCategory]);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchJobs(1, true);
  }, [search, activeCategory, locationInput, fetchJobs]);

  useEffect(() => {
    if (page === 1) return;
    fetchJobs(page, false);
  }, [page, fetchJobs]);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && !loadingMore && hasMore) {
          setPage((p) => p + 1);
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleCategory = (cat: string) => {
    setActiveCategory(cat);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <form onSubmit={handleSearchSubmit} className={styles.searchCard}>
        <div className={styles.inputGroup} style={{ flex: 1 }}>
          <input
            type="text"
            placeholder="Job title, skills, or keywords..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            id="search-input"
          />
        </div>
        <div className={styles.inputGroup}>
          <MapPin size={18} color="var(--gray-400)" />
          <DropDown
            defaultOption="all locations"
            options={locations || []}
            updateSelectedOption={setLocationInput}
            selectedOption={locationInput}
            fullwidth
          />
        </div>
        <button type="submit" className={styles.searchBtn} id="search-submit-btn">
          <Search size={18} color="white" />
          Search Jobs
        </button>
      </form>

      <div className={`${styles.categoryChips} hideScrollbar`} id="category-chips-container">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategory(cat)}
            className={`${styles.chip} ${activeCategory === cat ? styles.activeChip : ""}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className={styles.jobsGrid}>
        {loading ? (
          <div className={styles.emptyState}>
            <Loader2 size={32} style={{ margin: "0 auto 1rem" }} className="loading_icon" />
            <p>Loading active job postings...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className={styles.emptyState}>
            <Briefcase size={40} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
            <h3>No Job Listings Found</h3>
            <p style={{ marginTop: "0.5rem" }}>Try adjusting your search criteria or keywords.</p>
          </div>
        ) : (
          <>
            {jobs.map((job) => (
              <JobCard key={job._id} job={job} />
            ))}
            <div ref={sentinelRef} className={styles.sentinel} />
            {loadingMore && (
              <div className={styles.loadingMore}>
                <Loader2 size={20} className="loading_icon" />
              </div>
            )}
            {!hasMore && jobs.length > 0 && (
              <p style={{ textAlign: "center", color: "var(--gray-400)", fontSize: "var(--text-xs)", padding: "1rem" }}>
                You’ve reached the end
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function salaryText(job: JobItem): string | null {
  if (job.hideSalary || !job.salaryMin) return null;
  const cur = String(job.salaryCurrency || "").toUpperCase();
  const symbolMap: Record<string, string> = { USD: "$", NGN: "₦", GBP: "£", EUR: "€" };
  const sym = symbolMap[cur] ?? (cur ? cur + " " : "");
  const periodMap: Record<string, string> = { yearly: "/yr", monthly: "/mo", hourly: "/hr" };
  const period = periodMap[String(job.salaryPeriod || "").toLowerCase()] ?? (job.salaryPeriod ? `/${job.salaryPeriod}` : "");
  const min = job.salaryMin.toLocaleString();
  const periodSuffix = period ? ` ${period}` : "";
  if (!job.salaryMax) return `${sym}${min}${periodSuffix}`.trim();
  return `${sym}${min} - ${sym}${job.salaryMax.toLocaleString()}${periodSuffix}`.trim();
}

function JobCard({ job }: { job: JobItem }) {
  const companyName = job.companyId?.name || "Hiring Organization";
  const isVerified = job.companyId?.isVerified;
  return (
    <Link href={`/jobs/${job.slug || job._id}`} className={styles.jobCard}>
      <div className={styles.cardHeader}>
        <div>
          <h2 className={styles.jobTitle}>{job.title}</h2>
          <div className={styles.companyName}>
            {companyName}
            {isVerified && (
              <span className={styles.verifiedBadge} title="Verified Employer">
                <CheckCircle2 size={14} />
              </span>
            )}
          </div>
        </div>
        {job.isFeatured && <span className={styles.featuredBadge}>Featured</span>}
      </div>
      <div className={styles.tagsRow}>
        <span className={styles.tag}>
          <MapPin size={13} /> {job.location} ({job.workplaceType})
        </span>
        <span className={styles.tag}>
          <Briefcase size={13} /> {job.jobType}
        </span>
        {salaryText(job) && (
          <span className={`${styles.tag} ${styles.salaryTag}`}>{salaryText(job)}</span>
        )}
      </div>
    </Link>
  );
}
