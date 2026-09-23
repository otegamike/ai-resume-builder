"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Modal from "@/components/ui/modal/Modal";
import OnboardingCard from "@/components/onboarding/OnboardingCard/OnboardingCard";

export default function OnboardingOverlay() {
  const { data: session, status } = useSession();
  const [completed, setCompleted] = useState(false);

  const shouldShow =
    status === "authenticated" &&
    session?.user?.hasCompletedOnboarding === false &&
    !session?.user?.isAdmin &&
    !completed;

  if (!shouldShow) return null;

  return (
    <Modal
      open={true}
      onClose={() => {}}
      closeOnOverlayClick={false}
      showCloseButton={false}
      dismissible={false}
      size="sm"
    >
      <OnboardingCard
        includeResumeStep={false}
        variant="compact"
        skipDelayMs={4000}
        onComplete={() => setCompleted(true)}
      />
    </Modal>
  );
}
