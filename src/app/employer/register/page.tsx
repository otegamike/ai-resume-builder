"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Building2, Globe, MapPin, Users, Sparkles, Loader2, ArrowRight } from "lucide-react";
import styles from "../employer.module.css";

export default function RegisterOrganizationPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("Software & IT");
  const [companySize, setCompanySize] = useState("11-50");
  const [location, setLocation] = useState("");
  const [logo, setLogo] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/employer/register");
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Company / Organization name is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          website: website.trim(),
          industry,
          companySize,
          location: location.trim(),
          logo: logo.trim(),
          description: description.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to register organization");
        setLoading(false);
        return;
      }

      // Success! Refresh session or redirect to employer dashboard
      router.push("/employer/dashboard");
    } catch (err: any) {
      console.error("Error registering organization:", err);
      setError(err.message || "Failed to register organization");
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <Building2 size={48} color="#6366f1" style={{ margin: "0 auto 1rem" }} />
          <h1 className={styles.title}>Register Your Business / Organization</h1>
          <p className={styles.subtitle}>
            Post job ads for free, reach top talent, and manage candidates with AI resume matching.
          </p>
        </div>

        <div className={styles.card}>
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.errorBanner}>{error}</div>}

            <div className={styles.field}>
              <label className={styles.label}>Organization / Company Name *</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. Acme Corporation"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                id="org-name-input"
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>Industry</label>
                <select
                  className={styles.select}
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  id="org-industry-select"
                >
                  <option value="Software & IT">Software & IT</option>
                  <option value="Design & Creative">Design & Creative</option>
                  <option value="E-Commerce & Retail">E-Commerce & Retail</option>
                  <option value="Finance & Fintech">Finance & Fintech</option>
                  <option value="Healthcare & Bio">Healthcare & Bio</option>
                  <option value="Marketing & Media">Marketing & Media</option>
                  <option value="Education">Education</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Company Size</label>
                <select
                  className={styles.select}
                  value={companySize}
                  onChange={(e) => setCompanySize(e.target.value)}
                  id="org-size-select"
                >
                  <option value="1-10">1 - 10 employees</option>
                  <option value="11-50">11 - 50 employees</option>
                  <option value="51-200">51 - 200 employees</option>
                  <option value="201-500">201 - 500 employees</option>
                  <option value="500+">500+ employees</option>
                </select>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>Website URL (Optional)</label>
                <input
                  type="url"
                  className={styles.input}
                  placeholder="https://company.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  id="org-website-input"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>HQ Location (Optional)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. San Francisco, CA or Remote"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  id="org-location-input"
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Company Logo Image URL (Optional)</label>
              <input
                type="url"
                className={styles.input}
                placeholder="https://company.com/logo.png"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                id="org-logo-input"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>About Organization / Overview</label>
              <textarea
                className={styles.textarea}
                rows={4}
                placeholder="Describe your company, mission, and company culture..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                id="org-description-input"
              />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading} id="register-org-submit-btn">
              {loading ? <Loader2 className="loading_icon" size={20} /> : <>Complete Registration <ArrowRight size={18} /></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
