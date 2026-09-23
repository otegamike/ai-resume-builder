"use client";

import OnboardingCard from "@/components/onboarding/OnboardingCard/OnboardingCard";
import styles from "./page.module.css";
import bgStyles from "@/app/auth/login/animated-bg.module.css";

export default function OnboardingClient() {
  return (
    <div className={`${bgStyles.animated_circles_bg} ${styles.pageWrapper}`}>
      <div className={styles.onboardingContainer}>
        <OnboardingCard includeResumeStep variant="default" skipDelayMs={0} />
      </div>
    </div>
  );
}
