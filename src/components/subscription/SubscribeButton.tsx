"use client";

import { useSession, signIn } from "next-auth/react";
import { useState } from "react";

interface SubscribeButtonProps {
  planId: "pro" | "proPlus";
  interval: "monthly" | "annually";
  label: string;
  className?: string;
}

export default function SubscribeButton({ planId, interval, label, className }: SubscribeButtonProps) {
  const { status } = useSession();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (status !== "authenticated") {
      signIn(undefined, { callbackUrl: "/pricing" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, interval }),
      });

      const data = await res.json();
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        console.error("Subscribe failed:", data);
        alert("Failed to start subscription. Please try again.");
      }
    } catch (error) {
      console.error("Subscribe error:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleClick} disabled={loading} className={className}>
      {loading ? "Processing..." : label}
    </button>
  );
}
