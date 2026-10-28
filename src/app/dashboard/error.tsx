"use client";

import RouteError from "@/components/errors/RouteError";

export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return <RouteError error={error} retry={unstable_retry} flow="dashboard" />;
}
