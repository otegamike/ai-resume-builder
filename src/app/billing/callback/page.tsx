"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get("reference");
  const [status, setStatus] = useState<"loading" | "success" | "failed">(
    reference ? "loading" : "failed"
  );
  const [message, setMessage] = useState(
    reference ? "Processing your payment..." : "No payment reference found."
  );

  useEffect(() => {
    if (!reference) return;

    let cancelled = false;

    const verify = async () => {
      try {
        const res = await fetch(`/api/subscription/verify?reference=${reference}`);
        const data = await res.json();

        if (cancelled) return;

        if (data.data?.status === "success") {
          setStatus("success");
          setMessage("Payment successful! Your subscription is being activated...");
          setTimeout(() => router.push("/dashboard"), 3000);
        } else if (data.data?.status === "failed" || data.data?.status === "abandoned") {
          setStatus("failed");
          setMessage("Payment did not complete. Please try again.");
        } else {
          setStatus("loading");
          setMessage("Verifying payment status...");
        }
      } catch {
        if (!cancelled) {
          setStatus("failed");
          setMessage("Unable to verify payment. Please contact support.");
        }
      }
    };

    const timer = setTimeout(verify, 2000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [reference, router]);

  return (
    <div style={{ maxWidth: 600, margin: "100px auto", textAlign: "center", padding: "0 1rem" }}>
      <h1>
        {status === "success" ? "Subscription Confirmed" : status === "failed" ? "Payment Failed" : "Processing..."}
      </h1>
      <p style={{ marginTop: "1rem", color: status === "failed" ? "#d32f2f" : "#555" }}>{message}</p>
      {status === "failed" && (
        <Link
          href="/pricing"
          style={{
            display: "inline-block",
            marginTop: "1.5rem",
            padding: "0.75rem 1.5rem",
            background: "#000",
            color: "#fff",
            textDecoration: "none",
            borderRadius: 8,
          }}
        >
          Back to Pricing
        </Link>
      )}
      {status === "loading" && (
        <p style={{ marginTop: "1.5rem", fontSize: "0.875rem", color: "#999" }}>
          Please wait while we confirm your payment...
        </p>
      )}
    </div>
  );
}

export default function BillingCallbackPage() {
  return (
    <Suspense fallback={<div style={{ maxWidth: 600, margin: "100px auto", textAlign: "center" }}>Loading...</div>}>
      <CallbackContent />
    </Suspense>
  );
}
