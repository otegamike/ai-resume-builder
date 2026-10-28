"use client";

import RouteError from "@/components/errors/RouteError";

export default function OnboardingError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return <RouteError error={error} retry={unstable_retry} flow="onboarding" />;
}
