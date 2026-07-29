"use client";

import { useState } from "react";

interface CancelButtonProps {
  className?: string;
  disabled?: boolean;
}

export default function CancelButton({ className, disabled }: CancelButtonProps) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your subscription? Your premium features will remain active until the end of the current billing period.")) return;

    setLoading(true);
    try {
      const res = await fetch("/api/subscription/cancel", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setDone(true);
      } else {
        alert(data.error || "Failed to cancel subscription");
      }
    } catch {
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return <span style={{ color: "#666", fontSize: "0.875rem" }}>Cancellation requested — active until period ends.</span>;
  }

  return (
    <button onClick={handleCancel} disabled={disabled || loading} className={className}>
      {loading ? "Processing..." : "Cancel Subscription"}
    </button>
  );
}
