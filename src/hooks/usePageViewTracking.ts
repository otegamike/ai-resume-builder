"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function usePageViewTracking() {
  const pathname = usePathname();
  const lastPath = useRef("");

  useEffect(() => {
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;

    const payload = JSON.stringify({ path: pathname });

    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics/track", payload);
    } else {
      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  }, [pathname]);
}
