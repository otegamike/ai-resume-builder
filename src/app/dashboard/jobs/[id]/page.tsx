"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Briefcase,
  Loader2,
  Mail,
  Plus,
  Send,
  Sparkles,
  Trash2,
  ExternalLink,
} from "lucide-react";
import TipTapEditor from "@/components/blog/TipTapEditor";
import JobAutofillSection from "@/components/jobs/JobAutofillSection";
import type { ParsedJobAd } from "@/lib/ai";
import styles from "../jobs.module.css";

type ApplicationType = "on_platform" | "external_link" | "email";
type ScreeningQuestionType = "text" | "textarea" | "dropdown" | "checkbox";

interface ScreeningQuestion {
  id: string;
  question: string;
  type: ScreeningQuestionType;
  options: string[];
  required: boolean;
}

const CATEGORIES = ["Engineering", "Design", "Product", "Marketing", "Sales", "HR", "Finance", "Other"];

const createQuestion = (): ScreeningQuestion => ({
  id: crypto.randomUUID(),
  question: "",
  type: "text",
  options: [],
  required: false,
});

export default function DashboardJobEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const isEdit = id !== "new";
  const router = useRouter();
  const { data: session, status } = useSession();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Engineering");
  const [jobType, setJobType] = useState("full-time");
  const [workplaceType, setWorkplaceType] = useState("remote");
  const [location, setLocation] = useState("Remote");
  const [experienceLevel, setExperienceLevel] = useState("mid");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [salaryMode, setSalaryMode] = useState<"single" | "range">("single");
  const [salaryCurrency, setSalaryCurrency] = useState("USD");
  const [salaryCurrencyCustom, setSalaryCurrencyCustom] = useState("");
  const [salaryPeriod, setSalaryPeriod] = useState("yearly");
  const [hideSalary, setHideSalary] = useState(false);
  const [description, setDescription] = useState("");
  const [requirementsText, setRequirementsText] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [benefitsText, setBenefitsText] = useState("");
  const [applicationType, setApplicationType] = useState<ApplicationType>("on_platform");
  const [externalUrl, setExternalUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [screeningQuestions, setScreeningQuestions] = useState<ScreeningQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companyLogo, setCompanyLogo] = useState("");
  const [companyIndustry, setCompanyIndustry] = useState("Software & IT");
  const [companyLocation, setCompanyLocation] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");

  const isAdmin = Boolean(session?.user?.isAdmin);

  const [initialLoading, setInitialLoading] = useState(isEdit);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/auth/login?callbackUrl=/dashboard/jobs/${id}`);
    }
  }, [router, status, id]);

  useEffect(() => {
    if (!isEdit || status !== "authenticated") return;
    let cancelled = false;
    async function loadJob() {
      setInitialLoading(true);
      try {
        const res = await fetch(`/api/jobs/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load job");
        const job = data.job;
        if (!job || cancelled) return;
        setTitle(job.title || "");
        setCategory(job.category || "Engineering");
        setJobType(job.jobType || "full-time");
        setWorkplaceType(job.workplaceType || "remote");
        setLocation(job.location || "Remote");
        setExperienceLevel(job.experienceLevel || "mid");
        setSalaryMin(job.salaryMin != null ? String(job.salaryMin) : "");
        setSalaryMax(job.salaryMax != null ? String(job.salaryMax) : "");
        setSalaryMode(job.salaryMax != null ? "range" : "single");
        const knownCur = ["USD", "NGN", "GBP", "EUR"].includes(String(job.salaryCurrency || "USD").toUpperCase()) ? String(job.salaryCurrency || "USD").toUpperCase() : "OTHER";
        if (knownCur === "OTHER") {
          setSalaryCurrency("OTHER");
          setSalaryCurrencyCustom(String(job.salaryCurrency || "USD").toUpperCase());
        } else {
          setSalaryCurrency(knownCur);
          setSalaryCurrencyCustom("");
        }
        setSalaryPeriod(job.salaryPeriod || "yearly");
        setHideSalary(Boolean(job.hideSalary));
        setDescription(job.description || "");
        setRequirementsText(Array.isArray(job.requirements) ? job.requirements.join("\n") : "");
        setSkillsText(Array.isArray(job.skillsRequired) ? job.skillsRequired.join(", ") : "");
        setBenefitsText(Array.isArray(job.benefits) ? job.benefits.join("\n") : "");
        setApplicationType(job.applicationType || "on_platform");
        setExternalUrl(job.externalUrl || "");
        setContactEmail(job.contactEmail || "");
        setScreeningQuestions(Array.isArray(job.screeningQuestions) ? job.screeningQuestions : []);
        if (job.companyId) {
          const c = job.companyId as { name?: string; website?: string; logo?: string; industry?: string; location?: string; description?: string };
          setCompanyName(c.name || "");
          setCompanyWebsite(c.website || "");
          setCompanyLogo(c.logo || "");
          setCompanyIndustry(c.industry || "Software & IT");
          setCompanyLocation(c.location || "");
          setCompanyDescription(c.description || "");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load job");
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    }
    loadJob();
    return () => {
      cancelled = true;
    };
  }, [isEdit, id, status]);

  const handleAutofill = (fields: ParsedJobAd) => {
    if (fields.title) setTitle(fields.title);
    if (fields.category) setCategory(fields.category);
    if (fields.jobType) setJobType(fields.jobType);
    if (fields.workplaceType) setWorkplaceType(fields.workplaceType);
    if (fields.location) setLocation(fields.location);
    if (fields.experienceLevel) setExperienceLevel(fields.experienceLevel);
    setSalaryMin(fields.salaryMin != null ? String(fields.salaryMin) : "");
    setSalaryMax(fields.salaryMax != null ? String(fields.salaryMax) : "");
    setSalaryMode(fields.salaryMax != null ? "range" : "single");
    if (fields.salaryCurrency) {
      const cur = fields.salaryCurrency.toUpperCase();
      if (["USD", "NGN", "GBP", "EUR"].includes(cur)) {
        setSalaryCurrency(cur);
        setSalaryCurrencyCustom("");
      } else {
        setSalaryCurrency("OTHER");
        setSalaryCurrencyCustom(cur);
      }
    }
    if (fields.salaryPeriod) setSalaryPeriod(fields.salaryPeriod);
    if (fields.description) setDescription(fields.description);
    if (fields.requirements.length) setRequirementsText(fields.requirements.join("\n"));
    if (fields.skillsRequired.length) setSkillsText(fields.skillsRequired.join(", "));
    if (fields.benefits.length) setBenefitsText(fields.benefits.join("\n"));
    if (fields.companyName) setCompanyName(fields.companyName);
    if (fields.companyWebsite) setCompanyWebsite(fields.companyWebsite);
    if (fields.companyLogo) setCompanyLogo(fields.companyLogo);
    if (fields.companyLocation) setCompanyLocation(fields.companyLocation);
    if (fields.companyIndustry) setCompanyIndustry(fields.companyIndustry);
    if (fields.companyDescription) setCompanyDescription(fields.companyDescription);
    if (fields.applicationType) setApplicationType(fields.applicationType as ApplicationType);
    if (fields.externalUrl) setExternalUrl(fields.externalUrl);
    if (fields.contactEmail) setContactEmail(fields.contactEmail);
  };

  const updateQuestion = (id: string, updates: Partial<ScreeningQuestion>) => {
    setScreeningQuestions((questions) =>
      questions.map((question) => (question.id === id ? { ...question, ...updates } : question))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Job title is required");
      return;
    }

    if (!description.trim() || description === "<p></p>") {
      setError("Job description is required");
      return;
    }

    if (applicationType === "external_link" && !externalUrl.trim()) {
      setError("External application URL is required");
      return;
    }

    if (applicationType === "email" && !contactEmail.trim()) {
      setError("Application email is required");
      return;
    }

    const invalidQuestion = screeningQuestions.find((question) => {
      if (!question.question.trim()) return true;
      return question.type === "dropdown" && question.options.filter(Boolean).length === 0;
    });

    if (invalidQuestion) {
      setError("Each screening question needs question text, and dropdown questions need at least one option.");
      return;
    }

    setLoading(true);

    const splitLines = (value: string) => value.split("\n").map((line) => line.trim()).filter(Boolean);

    const effectiveCurrency = salaryCurrency === "OTHER" ? salaryCurrencyCustom.trim().toUpperCase() : salaryCurrency;
    const payload = {
          title: title.trim(),
          category,
          jobType,
          workplaceType,
          location: location.trim() || "Remote",
          experienceLevel,
          salaryMin: salaryMin ? Number(salaryMin) : undefined,
          salaryMax: salaryMode === "range" && salaryMax ? Number(salaryMax) : undefined,
          salaryCurrency: effectiveCurrency,
          salaryPeriod,
          hideSalary,
          description,
          requirements: splitLines(requirementsText),
          skillsRequired: skillsText.split(",").map((skill) => skill.trim()).filter(Boolean),
          benefits: splitLines(benefitsText),
          applicationType,
          externalUrl: applicationType === "external_link" ? externalUrl.trim() : "",
          contactEmail: applicationType === "email" ? contactEmail.trim() : "",
          screeningQuestions: screeningQuestions.map((question) => ({
            ...question,
            question: question.question.trim(),
            options: question.type === "dropdown" ? question.options.map((option) => option.trim()).filter(Boolean) : [],
          })),
          ...(isAdmin
            ? {
                companyName: companyName.trim(),
                companyWebsite: companyWebsite.trim(),
                companyLogo: companyLogo.trim(),
                companyIndustry,
                companyLocation: companyLocation.trim(),
                companyDescription: companyDescription.trim(),
              }
            : {}),
        };

    try {
      const res = await fetch(isEdit ? `/api/jobs/${id}` : "/api/jobs", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to post job ad");
        return;
      }

      router.push("/dashboard/jobs");
    } catch (err: any) {
      setError(err.message || "Failed to post job ad");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || !session || initialLoading) {
    return (
      <div className={styles.emptyState}>
        <Loader2 className="loading_icon" size={28} style={{ margin: "0 auto 1rem" }} />
        <p>{initialLoading ? "Loading job..." : "Loading job posting form..."}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <button className={styles.backButton} onClick={() => router.back()} >
            <ArrowLeft className={styles.backIcon} />
            Back to jobs
          </button>
        </div>
        <h1 className={styles.title}>{isEdit ? "Edit Job Ad" : "Post a Job"}</h1>
        <p className={styles.subtitle}>
          {isEdit ? "Update the job details, company, and screening questions." : "Create a public job page with rich details, application mode, and optional screening questions."}
        </p>
      </header>

      <form onSubmit={handleSubmit} className={styles.postJobForm}>
        {error && <div className={styles.errorBanner}>{error}</div>}

        {isAdmin && <JobAutofillSection onExtracted={handleAutofill} />}

        {isAdmin && (
          <section className={styles.formCard}>
            <div className={styles.formSectionHeader}>
              <Briefcase size={20} />
              <h2>Hiring Company</h2>
            </div>
            <p className={styles.subtitle} style={{ marginBottom: "1rem" }}>
              Fill in the employer for this posting. If a company with this name already exists it will be reused; otherwise a new verified company will be created.
            </p>
            <div className={styles.field}>
              <label className={styles.label}>Company Name</label>
              <input className={styles.input} value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Acme Corporation" />
            </div>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Website URL</label>
                <input type="url" className={styles.input} value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} placeholder="https://company.com" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Logo Image URL</label>
                <input type="url" className={styles.input} value={companyLogo} onChange={(e) => setCompanyLogo(e.target.value)} placeholder="https://company.com/logo.png" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Industry</label>
                <select className={styles.select} value={companyIndustry} onChange={(e) => setCompanyIndustry(e.target.value)}>
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
                <label className={styles.label}>HQ Location</label>
                <input className={styles.input} value={companyLocation} onChange={(e) => setCompanyLocation(e.target.value)} placeholder="e.g. San Francisco, CA" />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>About Company</label>
              <textarea className={styles.textarea} rows={3} value={companyDescription} onChange={(e) => setCompanyDescription(e.target.value)} placeholder="Brief overview of the employer..." />
            </div>
          </section>
        )}

        <section className={styles.formCard}>
          <div className={styles.formSectionHeader}>
            <h2>Job Details</h2>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Job Title *</label>
            <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Category</label>
              <select className={styles.select} value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Experience Level</label>
              <select className={styles.select} value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)}>
                <option value="entry">Entry</option>
                <option value="mid">Mid</option>
                <option value="senior">Senior</option>
                <option value="lead">Lead</option>
                <option value="executive">Executive</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Job Type</label>
              <select className={styles.select} value={jobType} onChange={(e) => setJobType(e.target.value)}>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="freelance">Freelance</option>
                <option value="internship">Internship</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Workplace Type</label>
              <select className={styles.select} value={workplaceType} onChange={(e) => setWorkplaceType(e.target.value)}>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="on-site">On-site</option>
              </select>
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Location</label>
            <input className={styles.input} value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
        </section>

        <section className={styles.formCard}>
          <div className={styles.formSectionHeader}>
            <h2>Compensation</h2>
          </div>
          <div className={styles.segmentedControl} style={{ marginBottom: "var(--space-4)" }}>
            <button type="button" className={salaryMode === "single" ? styles.segmentActive : ""} onClick={() => setSalaryMode("single")}>Single value</button>
            <button type="button" className={salaryMode === "range" ? styles.segmentActive : ""} onClick={() => setSalaryMode("range")}>Range</button>
          </div>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label}>{salaryMode === "single" ? "Salary" : "Minimum Salary"}</label>
              <input type="number" className={styles.input} value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} />
            </div>
            {salaryMode === "range" && (
              <div className={styles.field}>
                <label className={styles.label}>Maximum Salary</label>
                <input type="number" className={styles.input} value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} />
              </div>
            )}
            <div className={styles.field}>
              <label className={styles.label}>Currency</label>
              <select className={styles.select} value={salaryCurrency} onChange={(e) => setSalaryCurrency(e.target.value)}>
                <option value="USD">USD ($)</option>
                <option value="NGN">NGN (₦)</option>
                <option value="GBP">GBP (£)</option>
                <option value="EUR">EUR (€)</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            {salaryCurrency === "OTHER" && (
              <div className={styles.field}>
                <label className={styles.label}>Custom Currency</label>
                <input className={styles.input} placeholder="e.g. KES, ZAR" value={salaryCurrencyCustom} onChange={(e) => setSalaryCurrencyCustom(e.target.value.toUpperCase())} />
              </div>
            )}
            <div className={styles.field}>
              <label className={styles.label}>Period</label>
              <select className={styles.select} value={salaryPeriod} onChange={(e) => setSalaryPeriod(e.target.value)}>
                <option value="yearly">Yearly</option>
                <option value="monthly">Monthly</option>
                <option value="hourly">Hourly</option>
              </select>
            </div>
          </div>
          <label className={styles.checkboxLine}>
            <input type="checkbox" checked={hideSalary} onChange={(e) => setHideSalary(e.target.checked)} />
            Hide salary from public job page
          </label>
        </section>

        <section className={styles.formCard}>
          <div className={styles.formSectionHeader}>
            <h2>Application Method</h2>
          </div>
          <div className={styles.segmentedControl}>
            <button type="button" className={applicationType === "on_platform" ? styles.segmentActive : ""} onClick={() => setApplicationType("on_platform")}>
              <Sparkles size={16} /> On-Platform
            </button>
            <button type="button" className={applicationType === "external_link" ? styles.segmentActive : ""} onClick={() => setApplicationType("external_link")}>
              <ExternalLink size={16} /> External Link
            </button>
            <button type="button" className={applicationType === "email" ? styles.segmentActive : ""} onClick={() => setApplicationType("email")}>
              <Mail size={16} /> Email
            </button>
          </div>
          {applicationType === "external_link" && (
            <div className={styles.field}>
              <label className={styles.label}>External Application URL *</label>
              <input className={styles.input} value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} />
            </div>
          )}
          {applicationType === "email" && (
            <div className={styles.field}>
              <label className={styles.label}>Application Email *</label>
              <input type="email" className={styles.input} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </div>
          )}
        </section>

        <section className={styles.formCard}>
          <div className={styles.formSectionHeader}>
            <h2>Job Description</h2>
          </div>
          <TipTapEditor
            content={description}
            onChange={setDescription}
            placeholder="Describe the role, responsibilities, team, and what success looks like..."
          />
        </section>

        <section className={styles.formCard}>
          <div className={styles.formSectionHeader}>
            <h2>Job Requirements</h2>
          </div>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Requirements & Qualifications</label>
              <textarea className={styles.textarea} rows={6} value={requirementsText} onChange={(e) => setRequirementsText(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Perks & Benefits</label>
              <textarea className={styles.textarea} rows={6} value={benefitsText} onChange={(e) => setBenefitsText(e.target.value)} />
            </div>
          </div>
          <div className={styles.field} style={{ marginTop: "var(--space-4)" }}>
            <label className={styles.label}>Required Skills (comma-separated)</label>
            <input className={styles.input} value={skillsText} onChange={(e) => setSkillsText(e.target.value)} placeholder="React, TypeScript, MongoDB" />
          </div>
        </section>

        <section className={styles.formCard}>
          <div className={styles.formSectionHeader}>
            <h2>Screening Questions</h2>
            <button type="button" className={styles.inlineAction} onClick={() => setScreeningQuestions((questions) => [...questions, createQuestion()])}>
              <Plus size={16} /> Add Question
            </button>
          </div>

          {screeningQuestions.length === 0 ? (
            <p className={styles.subtitle}>No screening questions added.</p>
          ) : (
            <div className={styles.questionList}>
              {screeningQuestions.map((question, index) => (
                <div key={question.id} className={styles.questionCard}>
                  <div className={styles.cardHeader}>
                    <strong>Question {index + 1}</strong>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => setScreeningQuestions((questions) => questions.filter((item) => item.id !== question.id))}
                      aria-label="Remove question"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Question Text</label>
                    <input className={styles.input} value={question.question} onChange={(e) => updateQuestion(question.id, { question: e.target.value })} />
                  </div>
                  <div className={styles.formGrid}>
                    <div className={styles.field}>
                      <label className={styles.label}>Question Type</label>
                      <select
                        className={styles.select}
                        value={question.type}
                        onChange={(e) => updateQuestion(question.id, { type: e.target.value as ScreeningQuestionType })}
                      >
                        <option value="text">Short Answer</option>
                        <option value="textarea">Long Answer</option>
                        <option value="dropdown">Dropdown</option>
                        <option value="checkbox">Yes/No</option>
                      </select>
                    </div>
                  </div>
                  {question.type === "dropdown" && (
                    <div className={styles.field}>
                      <label className={styles.label}>Dropdown Options (comma-separated)</label>
                      <input
                        className={styles.input}
                        value={question.options.join(", ")}
                        onChange={(e) => updateQuestion(question.id, { options: e.target.value.split(",").map((option) => option.trim()) })}
                        placeholder="Yes, No, Maybe"
                      />
                    </div>
                  )}
                  <label className={styles.checkboxLine}>
                    <input checked={question.required} type="checkbox" onChange={(e) => updateQuestion(question.id, { required: e.target.checked })} />
                    Required
                  </label>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className={styles.formActions}>
          <button type="button" className={styles.inlineAction} onClick={() => router.back()}>
            Cancel
          </button>
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <Loader2 className="loading_icon" size={18} /> : isEdit ? <>Save Changes <Send size={18} /></> : <>Publish Job Ad <Send size={18} /></>}
          </button>
        </div>
      </form>
    </div>
  );
}
