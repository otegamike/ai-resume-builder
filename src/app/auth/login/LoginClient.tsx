"use client";

import { FormEvent, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./page.module.css";
import bgStyles from "./animated-bg.module.css";
import { calculateEditorHeight } from "@/utils/headerSize";

// ── SVG Icons ────────────────────────────────────────────────────────────────
const containerHeight = `${calculateEditorHeight()}px`;
/** Agentic CV logomark: a stylised "A" with a sparkle */
function LogoIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L3 20h18L12 2z" />
      <path d="M8 14h8" strokeWidth="1.5" />
      <circle cx="20" cy="4" r="1.5" fill="white" stroke="none" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10">
      <path d="M12 1l2.09 6.26L21 9l-6.91 1.74L12 17l-2.09-6.26L3 9l6.91-1.74L12 1z" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

/** Google "G" colour logo rendered as inline SVG */
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}

// ── Feature list data ─────────────────────────────────────────────────────────
const FEATURES = [
  "AI-powered resume content generation",
  "ATS-optimised formatting & scoring",
  "Export to PDF in one click",
  "Multiple professional templates",
];

// ── Main component ────────────────────────────────────────────────────────────
export default function LoginClient({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const { status } = useSession();

  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (status === "authenticated") {
    router.replace(callbackUrl);
  }

  const onGoogle = async () => {
    await signIn("google", { callbackUrl });
  };

  const onCredentials = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (isSignUp) {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });

        const payload = await response.json();
        if (!response.ok) {
          setError(payload.error || "Sign up failed");
          setSubmitting(false);
          return;
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
        setSubmitting(false);
        return;
      }

      router.push(result?.url || callbackUrl);
    } catch {
      setError("Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container} style={{ height: containerHeight }}>

      {/* ── LEFT BRAND PANEL ───────────────────────────────────── */}
      <aside className={styles.brandPanel}>

        {/* Illustration + features */}
        <div className={styles.brandIllustration}>
          <div className={styles.illustrationWrapper}>
            <Image
              src="/login-illustration.png"
              alt="AI-powered resume builder illustration"
              fill
              className={styles.illustrationImg}
              priority
              onError={(e) => {
                // Hide if image doesn't exist; the CSS background will show through
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>

          <ul className={styles.featureList}>
            {FEATURES.map((feat) => (
              <li key={feat} className={styles.featureItem}>
                <div className={styles.featureDot}>
                  <CheckIcon />
                </div>
                <span className={styles.featureText}>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer tagline */}
        <div className={styles.brandFooter}>
          <p className={styles.brandTagline}>Build your career story with AI</p>
        </div>
      </aside>

      {/* ── RIGHT FORM PANEL ────────────────────────────────────── */}
      <main className={`${bgStyles.animated_circles_bg} ${styles.formPanel} `}>


        <div className={styles.card}>

          {/* Heading */}
          <div className={styles.headingArea}>
            <div className={styles.badge}>
              <SparkleIcon />
              {isSignUp ? "Get started free" : "Welcome back"}
            </div>
            <h1 className={styles.title}>
              {isSignUp ? "Create your account" : "Sign in to your account"}
            </h1>
            <p className={styles.subtitle}>
              {isSignUp
                ? "Start building AI-powered resumes in minutes."
                : "Continue building your career story with Agentic CV."}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className={styles.error}>
              <AlertIcon />
              {error}
            </div>
          )}

          {/* ── OAuth providers ── */}
          <div className={styles.oauthSection}>
            <button
              id="login-google-btn"
              type="button"
              className={styles.oauthBtn}
              onClick={onGoogle}
            >
              <GoogleLogo />
              Continue with Google
            </button>
          </div>

          {/* Divider */}
          <div className={styles.dividerRow}>
            <div className={styles.dividerLine} />
            <span className={styles.dividerLabel}>or continue with email</span>
            <div className={styles.dividerLine} />
          </div>

          {/* ── Credentials form ── */}
          <form className={styles.credForm} onSubmit={onCredentials}>
            {isSignUp && (
              <div className={styles.inputWrapper}>
                <label htmlFor="login-name" className={styles.inputLabel}>
                  Full name
                </label>
                <input
                  id="login-name"
                  type="text"
                  placeholder="Jane Doe"
                  className={styles.inputField}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <div className={styles.inputWrapper}>
              <label htmlFor="login-email" className={styles.inputLabel}>
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                className={styles.inputField}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className={styles.inputWrapper}>
              <label htmlFor="login-password" className={styles.inputLabel}>
                Password
              </label>
              <input
                id="login-password"
                type="password"
                placeholder="••••••••"
                className={styles.inputField}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isSignUp ? "new-password" : "current-password"}
              />
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              className={styles.submitBtn}
              disabled={submitting}
            >
              {submitting && <span className={styles.submitBtnSpinner} />}
              {submitting
                ? "Please wait…"
                : isSignUp
                ? "Create account"
                : "Sign in"}
            </button>
          </form>

          {/* Toggle */}
          <p className={styles.toggleRow}>
            {isSignUp ? "Already have an account?" : "Don't have an account?"}
            <button
              id="login-toggle-btn"
              type="button"
              className={styles.toggleBtn}
              onClick={() => {
                setIsSignUp((v) => !v);
                setError("");
              }}
            >
              {isSignUp ? "Sign in" : "Sign up for free"}
            </button>
          </p>

          {/* Terms */}
          <p className={styles.termsNote}>
            By continuing you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </main>
    </div>
  );
}