"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Sparkles,
  FileText,
  PenLine,
  Briefcase,
  WandSparkles,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Upload,
  ArrowRight,
} from "lucide-react";
import ResumeSelector from "@/components/resume/ResumeSelector";
import type { ResumeSelection } from "@/components/resume/ResumeSelector";
import styles from "./page.module.css";
import bgStyles from "@/app/auth/login/animated-bg.module.css";

const GOALS = [
  { value: "build", label: "Build a resume", icon: FileText, desc: "Create a new resume from scratch" },
  { value: "improve", label: "Improve existing resume", icon: WandSparkles, desc: "ATS check & optimization" },
  { value: "tailor", label: "Tailor for jobs", icon: Sparkles, desc: "Customize for specific roles" },
  { value: "cover-letter", label: "Write cover letters", icon: PenLine, desc: "Generate cover letters" },
  { value: "track", label: "Track applications", icon: Briefcase, desc: "Manage your job hunt" },
];

interface StepIndicatorProps {
  current: number;
  total: number;
}

function StepIndicator({ current, total }: StepIndicatorProps) {
  return (
    <div className={styles.stepIndicator}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`${styles.stepDot} ${i === current ? styles.stepDotActive : ""} ${i < current ? styles.stepDotDone : ""}`}>
          {i < current ? <Check className={styles.stepDotIcon} /> : <span>{i + 1}</span>}
        </div>
      ))}
    </div>
  );
}

export default function OnboardingClient() {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Step 1 state
  const [name, setName] = useState(session?.user?.name ?? "");
  const [jobTitle, setJobTitle] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2 state
  const [goals, setGoals] = useState<string[]>([]);

  // Step 3 state
  const [targetField, setTargetField] = useState("");

  // Step 4 state
  const [mode, setMode] = useState<"upload" | "scratch" | null>(null);
  const [resumeSelection, setResumeSelection] = useState<ResumeSelection | null>(null);
  const [uploadError, setUploadError] = useState("");

  const totalSteps = 4;

  const toggleGoal = (value: string) => {
    setGoals((prev) =>
      prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value]
    );
  };

  const canProceed = () => {
    switch (step) {
      case 0: return name.trim().length > 0;
      case 1: return goals.length > 0;
      case 2: return true;
      case 3: return mode !== null;
      default: return false;
    }
  };

  const handleNext = () => {
    if (!canProceed()) return;
    setError("");
    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    setError("");
    setUploadError("");
    if (step > 0) {
      setStep((s) => s - 1);
    }
  };

  const handleSelectionChange = useCallback((selection: ResumeSelection | null) => {
    setResumeSelection(selection);
  }, []);

  const handleStartFromScratch = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/user/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle,
          location,
          phone,
          primaryGoal: goals,
          targetField,
          hasExistingResume: false,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      await updateSession();
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadResume = async () => {
    if (!resumeSelection?.selectedFile) {
      setUploadError("Please select a resume file to upload.");
      return;
    }
    setSubmitting(true);
    setUploadError("");
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", resumeSelection.selectedFile);

      const res = await fetch("/api/onboarding/upload-resume", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to process resume");
      }
      const data = await res.json();
      await updateSession();
      router.push(`/editor/${data.resumeId}`);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`${bgStyles.animated_circles_bg} ${styles.pageWrapper}`}>
      <div className={styles.onboardingContainer}>
        <div className={styles.onboardingCard}>
          <StepIndicator current={step} total={totalSteps} />

          <div className={styles.stepsWrapper}>
            {/* Step 0: Welcome + Basic Info */}
            <div className={`${styles.stepContent} ${step === 0 ? styles.stepActive : ""}`}>
              <div className={styles.stepHeader}>
                <div className={styles.stepBadge}>Step 1</div>
                <h2 className={styles.stepTitle}>Welcome! Let&apos;s get to know you</h2>
                <p className={styles.stepSubtitle}>
                  Tell us a bit about yourself so we can personalise your experience.
                </p>
              </div>
              <div className={styles.formFields}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Full name</label>
                  <input
                    className={styles.fieldInput}
                    type="text"
                    placeholder="e.g. Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Job title</label>
                  <input
                    className={styles.fieldInput}
                    type="text"
                    placeholder="e.g. Software Engineer"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                  />
                </div>
                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Location</label>
                    <input
                      className={styles.fieldInput}
                      type="text"
                      placeholder="e.g. New York, NY"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Phone</label>
                    <input
                      className={styles.fieldInput}
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 1: Goals */}
            <div className={`${styles.stepContent} ${step === 1 ? styles.stepActive : ""}`}>
              <div className={styles.stepHeader}>
                <div className={styles.stepBadge}>Step 2</div>
                <h2 className={styles.stepTitle}>What brings you here?</h2>
                <p className={styles.stepSubtitle}>
                  Select all that apply. You can use all of these later.
                </p>
              </div>
              <div className={styles.goalsGrid}>
                {GOALS.map((goal) => {
                  const selected = goals.includes(goal.value);
                  const Icon = goal.icon;
                  return (
                    <button
                      key={goal.value}
                      type="button"
                      className={`${styles.goalCard} ${selected ? styles.goalCardSelected : ""}`}
                      onClick={() => toggleGoal(goal.value)}
                    >
                      <div className={styles.goalCardCheck}>
                        {selected && <Check className={styles.goalCardCheckIcon} />}
                      </div>
                      <Icon className={styles.goalCardIcon} />
                      <div className={styles.goalCardText}>
                        <span className={styles.goalCardLabel}>{goal.label}</span>
                        <span className={styles.goalCardDesc}>{goal.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Target Role */}
            <div className={`${styles.stepContent} ${step === 2 ? styles.stepActive : ""}`}>
              <div className={styles.stepHeader}>
                <div className={styles.stepBadge}>Step 3</div>
                <h2 className={styles.stepTitle}>What role are you after?</h2>
                <p className={styles.stepSubtitle}>
                  Tell us the job title or industry you&apos;re targeting. This helps us tailor suggestions.
                </p>
              </div>
              <div className={styles.formFields}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Target role / industry</label>
                  <input
                    className={styles.fieldInput}
                    type="text"
                    placeholder="e.g. Frontend Developer, Product Manager, Data Science"
                    value={targetField}
                    onChange={(e) => setTargetField(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Existing Resume */}
            <div className={`${styles.stepContent} ${step === 3 ? styles.stepActive : ""}`}>
              <div className={styles.stepHeader}>
                <div className={styles.stepBadge}>Step 4</div>
                <h2 className={styles.stepTitle}>Do you have a resume already?</h2>
                <p className={styles.stepSubtitle}>
                  Upload an existing resume and we&apos;ll extract your info, or start fresh.
                </p>
              </div>

              {mode === null && (
                <div className={styles.resumeOptions}>
                  <button
                    type="button"
                    className={styles.resumeOptionCard}
                    onClick={() => setMode("upload")}
                  >
                    <div className={styles.resumeOptionIconWrapper}>
                      <Upload className={styles.resumeOptionIcon} />
                    </div>
                    <span className={styles.resumeOptionLabel}>Upload existing resume</span>
                    <span className={styles.resumeOptionDesc}>We&apos;ll extract your info so you can pick up where you left off.</span>
                    <ArrowRight className={styles.resumeOptionArrow} />
                  </button>
                  <button
                    type="button"
                    className={styles.resumeOptionCard}
                    onClick={() => setMode("scratch")}
                  >
                    <div className={styles.resumeOptionIconWrapper}>
                      <FileText className={styles.resumeOptionIcon} />
                    </div>
                    <span className={styles.resumeOptionLabel}>Start from scratch</span>
                    <span className={styles.resumeOptionDesc}>Build a new resume from a blank template.</span>
                    <ArrowRight className={styles.resumeOptionArrow} />
                  </button>
                </div>
              )}

              {mode === "upload" && (
                <div className={styles.uploadSection}>
                  <ResumeSelector onSelectionChange={handleSelectionChange} uploadOnly />
                  {uploadError && <div className={styles.errorMsg}>{uploadError}</div>}
                  <button
                    type="button"
                    className={styles.changeModeBtn}
                    onClick={() => { setMode(null); setResumeSelection(null); setUploadError(""); }}
                  >
                    Go back to options
                  </button>
                </div>
              )}

              {mode === "scratch" && (
                <div className={styles.scratchConfirm}>
                  <p className={styles.scratchText}>
                    No problem! You&apos;ll be able to create a beautiful resume using our templates and AI tools.
                  </p>
                </div>
              )}
            </div>
          </div>

          {error && <div className={styles.errorMsg}>{error}</div>}

          <div className={styles.navButtons}>
            {step > 0 && (
              <button
                type="button"
                className={styles.btnBack}
                onClick={handleBack}
                disabled={submitting}
              >
                <ChevronLeft className={styles.btnIcon} />
                Back
              </button>
            )}
            <div className={styles.navSpacer} />

            {step < totalSteps - 1 && (
              <button
                type="button"
                className={`${styles.btnPrimary} ${!canProceed() ? styles.btnDisabled : ""}`}
                onClick={handleNext}
                disabled={!canProceed() || submitting}
              >
                Continue
                <ChevronRight className={styles.btnIcon} />
              </button>
            )}

            {step === totalSteps - 1 && mode === "scratch" && (
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handleStartFromScratch}
                disabled={submitting}
              >
                {submitting ? (
                  <><Loader2 className={styles.btnSpinner} /> Saving…</>
                ) : (
                  <>Start your journey <ArrowRight className={styles.btnIcon} /></>
                )}
              </button>
            )}

            {step === totalSteps - 1 && mode === "upload" && (
              <button
                type="button"
                className={`${styles.btnPrimary} ${!resumeSelection ? styles.btnDisabled : ""}`}
                onClick={handleUploadResume}
                disabled={!resumeSelection || submitting}
              >
                {submitting ? (
                  <><Loader2 className={styles.btnSpinner} /> Processing…</>
                ) : (
                  <>Upload & continue <ArrowRight className={styles.btnIcon} /></>
                )}
              </button>
            )}
          </div>

          {step < totalSteps - 1 && (
            <div className={styles.skipRow}>
              <button
                type="button"
                className={styles.btnSkip}
                onClick={() => setStep((s) => Math.min(s + 1, totalSteps - 1))}
              >
                Skip for now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
