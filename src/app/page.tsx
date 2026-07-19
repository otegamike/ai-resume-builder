import dynamic from "next/dynamic";
import styles from "./page.module.css";
import Hero from "@/components/hero/Hero";
import TestimonialStats from "@/components/sections/TestimonialStats";
import FinalCTA from "@/components/sections/FinalCTA";
import Footer from "@/components/sections/Footer";
import SectionDivider from "@/components/ui/SectionDivider";

const FeaturesSection = dynamic(
  () => import("@/components/sections/FeaturesSection")
);

export default function Home() {
  return (
    <div className={styles.container}>
      <div className={styles.heroGradientLeft} />
      <div className={styles.heroGradientRight} />
      <main className={styles.main}>
        <Hero />
        <FeaturesSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
