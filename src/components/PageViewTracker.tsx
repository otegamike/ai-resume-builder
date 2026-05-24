"use client";

import { usePageViewTracking } from "@/hooks/usePageViewTracking";

export default function PageViewTracker() {
  usePageViewTracking();
  return null;
}
