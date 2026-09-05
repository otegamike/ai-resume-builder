"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Briefcase, MapPin, DollarSign, Sparkles, Send, ArrowLeft, Loader2, Info } from "lucide-react";
import styles from "../../employer.module.css";

export default function PostNewJobPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Engineering");
  const [jobType, setJobType] = useState("full-time");
  const [workplaceType, setWorkplaceType] = useState("remote");
  const [location, setLocation] = useState("Remote");
  const [experienceLevel, setExperienceLevel] = useState("mid");

  // Salary
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [salaryCurrency, setSalaryCurrency] = useState("USD");
  const [salaryPeriod, setSalaryPeriod] = useState("yearly");
  const [hideSalary, setHideSalary] = useState(false);

  // Description & Requirements
  const [description, setDescription] = useState("");
  const [requirementsText, setRequirementsText] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [benefitsText, setBenefitsText] = useState("");

  // Application Method
  const [applicationType, setApplicationType] = useState("on_platform");
  const [externalUrl, setExternalUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/employer/jobs/new");
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("Job title is required");
      return;
    }
    if (!description.trim()) {
      setError("Job description is required");
      return;
    }

    setLoading(true);
    setError("");

    const requirements = requirementsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const skillsRequired = skillsText
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);

    const benefits = benefitsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category,
          jobType,
          workplaceType,
          location,
          experienceLevel,
          salaryMin: salaryMin ? Number(salaryMin) : undefined,
          salaryMax: salaryMax ? Number(salaryMax) : undefined,
          salaryCurrency,
          salaryPeriod,
          hideSalary,
          description,
          requirements,
          skillsRequired,
          benefits,
          applicationType,
          externalUrl,
          contactEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to post job ad");
        setLoading(false);
        return;
      }

      router.push("/employer/dashboard");
    } catch (err: any) {
      console.error("Error creating job ad:", err);
      setError(err.message || "Failed to post job ad");
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div style={{ marginBottom: "1.5rem" }}>
          <button
            onClick={() => router.back()}
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.9rem",
            }}
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
        </div>

        <div className={styles.header}>
          <Briefcase size={48} color="#6366f1" style={{ margin: "0 auto 1rem" }} />
          <h1 className={styles.title}>Post a Job Listing</h1>
          <p className={styles.subtitle}>Reach thousands of qualified job seekers. 100% Free Job Posting.</p>
        </div>

        <div className={styles.card}>
          <div
            style={{
              background: "rgba(99, 102, 241, 0.1)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              borderRadius: "10px",
              padding: "0.85rem 1rem",
              marginBottom: "1.5rem",
              fontSize: "0.85rem",
              color: "#a5b4fc",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Info size={18} style={{ flexShrink: 0 }} />
            <span>
              All job posts undergo automated anti-scam review by site admins before publishing to ensure platform safety.
            </span>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.errorBanner}>{error}</div>}

            <div className={styles.field}>
              <label className={styles.label}>Job Title *</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. Senior Full Stack Engineer (React/Node)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                id="job-title-input"
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>Category</label>
                <select
                  className={styles.select}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  id="job-category-select"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Design">Design</option>
                  <option value="Product">Product</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Sales">Sales</option>
                  <option value="HR">HR & Recruiting</option>
                  <option value="Finance">Finance</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Job Type</label>
                <select
                  className={styles.select}
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  id="job-type-select"
                >
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="freelance">Freelance</option>
                  <option value="internship">Internship</option>
                </select>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>Workplace Type</label>
                <select
                  className={styles.select}
                  value={workplaceType}
                  onChange={(e) => setWorkplaceType(e.target.value)}
                  id="workplace-type-select"
                >
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="on-site">On-site</option>
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Location / City</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Remote, San Francisco, CA, or London, UK"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  id="job-location-input"
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>Min Salary ($)</label>
                <input
                  type="number"
                  className={styles.input}
                  placeholder="e.g. 90000"
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(e.target.value)}
                  id="salary-min-input"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Max Salary ($)</label>
                <input
                  type="number"
                  className={styles.input}
                  placeholder="e.g. 140000"
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(e.target.value)}
                  id="salary-max-input"
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Job Description *</label>
              <textarea
                className={styles.textarea}
                rows={6}
                placeholder="Detailed overview of the role, team, and key responsibilities..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                id="job-description-input"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Requirements & Qualifications (One per line)</label>
              <textarea
                className={styles.textarea}
                rows={4}
                placeholder="- 4+ years React and Node.js experience&#10;- Experience building RESTful APIs&#10;- Strong problem solving skills"
                value={requirementsText}
                onChange={(e) => setRequirementsText(e.target.value)}
                id="job-requirements-input"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Required Skills (Comma separated)</label>
              <input
                type="text"
                className={styles.input}
                placeholder="React, TypeScript, Node.js, Next.js, MongoDB"
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
                id="job-skills-input"
              />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading} id="post-job-submit-btn">
              {loading ? <Loader2 className="loading_icon" size={20} /> : <>Publish Job Ad <Send size={18} /></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
