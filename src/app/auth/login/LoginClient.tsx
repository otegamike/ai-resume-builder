"use client";

import { FormEvent, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import styles from "./page.module.css";

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
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>{isSignUp ? "Create account" : "Welcome back"}</h1>
        <p className={styles.subtitle}>
          {isSignUp ? "Sign up to start building resumes." : "Sign in to continue."}
        </p>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.row}>
          <Button onClick={onGoogle}>Continue with Google</Button>
        </div>

        <hr className={styles.divider} />

        <form className={styles.row} onSubmit={onCredentials}>
          {isSignUp && (
            <Input
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" disabled={submitting}>
            {submitting ? "Please wait..." : isSignUp ? "Sign up" : "Sign in"}
          </Button>
        </form>

        <p className={styles.toggle}>
          {isSignUp ? "Already have an account?" : "Need an account?"}
          <button type="button" onClick={() => setIsSignUp((v) => !v)}>
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}

