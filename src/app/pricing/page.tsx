"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";
import styles from "./page.module.css";
import bgStyles from "@/app/auth/login/animated-bg.module.css";
import Footer from "@/components/sections/Footer";
import { NGN_PRICING, detectCurrency, CURRENCIES, type CurrencyConfig } from "@/utils/pricing";

const PLANS = [
  {
    id: "free",
    name: "Free",
    tagline: "Best for getting started.",
    monthlyPrice: 0,
    annualPrice: 0,
    isPro: false,
    badge: null,
    cta: "Get Started",
    ctaHref: "/auth/login",
    features: [
      { label: "1000 AI Credits/month", icon: "check", muted: false, isAiCredit: true },
      { label: "10 Resumes/CV", icon: "check", muted: false },
      { label: "10 Cover letters", icon: "check", muted: false },
      { label: "Over 20+ Unique Templates", icon: "check", muted: false },
      { label: "Unlimited Application Tracking", icon: "check", muted: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Best for active job seekers.",
    monthlyPrice: 7,
    annualPrice: 5,
    isPro: true,
    badge: null,
    savePercent: 20,
    cta: "Start Free Trial",
    ctaHref: "/auth/login",
    features: [
      { label: "50000 AI credits/month", icon: "check", muted: false, isAiCredit: true },
      { label: "Unlimited Resumes", icon: "check", muted: false },
      { label: "Unlimited AI Assistant", icon: "check", muted: false },
      { label: "High Definition PDF Export", icon: "check", muted: false },
      { label: "Job Application Tracker", icon: "check", muted: false },
      { label: "Premium Professional Templates", icon: "check", muted: false },
    ],
  },
  {
    id: "proPlus",
    name: "Pro+",
    tagline: "For recruitment teams.",
    monthlyPrice: 15,
    annualPrice: 12,
    isPro: false,
    badge: null,
    savePercent: 20,
    cta: "Get started",
    ctaHref: "mailto:sales@agenticcv.com",
    features: [
      { label: "Unlimited AI credits", icon: "check", muted: false, isAiCredit: true },
      { label: "Custom Brand Templates", icon: "check", muted: false },
      { label: "Bulk Export Options", icon: "check", muted: false },
      { label: "Priority Support", icon: "check", muted: false },
      { label: "All Pro features", icon: "check", muted: false },
    ],
  },
];

const COMPARE_ROWS = [
  { feature: "Resume Limit",              free: "10",        pro: "50",   enterprise: "Unlimited" },
  { feature: "AI credits/month",    free: "1000",    pro: '50,000',          enterprise: 'Unlimited'},
  { feature: "High Definition Export",  free: false,             pro: true,          enterprise: true },
  { feature: "Premium Proffesional Templates",   free: false,             pro: true,          enterprise: true },
  { feature: "Branding Removal",          free: false,             pro: true,          enterprise: true },
  { feature: "Team Members",             free: "1",               pro: "1",           enterprise: "Unlimited" },
  { feature: "Priority Support",          free: false,             pro: false,         enterprise: true },
];

const FAQS = [
  {
    q: "Can I cancel my subscription anytime?",
    a: "Yes, you can cancel your subscription at any time through your account settings. If you cancel, your premium features will remain active until the end of your current billing period.",
  },
  {
    q: "What are AI credits and how do they work?",
    a: "AI credits power our bullet point optimizer and summary generator. Pro users have unlimited credits, while Free users receive a fixed allocation upon registration to test our premium AI tools.",
  },
  {
    q: "Can I export my resume to Word?",
    a: "Absolutely. Pro and Enterprise users can export their resumes in both high-fidelity PDF and fully editable DOCX formats to suit any job application requirement.",
  },
  {
    q: "Is my data secure with AgenticApp.cv?",
    a: "We prioritize your privacy. All your personal data and resumes are encrypted at rest and in transit. We never sell your data to third parties, and our AI processing is strictly for enhancing your content.",
  },
  {
    q: "Is there a free trial for the Pro plan?",
    a: "Yes! Every new user gets a 7-day free trial of the Pro plan with no credit card required. After the trial, you can choose to upgrade or continue on the Free tier.",
  },
];

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5l-4-4 1.41-1.41L10 13.67l6.59-6.59L18 8.5l-8 8z" />
    </svg>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1l2.09 6.26L21 9l-6.91 1.74L12 17l-2.09-6.26L3 9l6.91-1.74L12 1z" />
    </svg>
  );
}

function CrossIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [currency, setCurrency] = useState<CurrencyConfig>(CURRENCIES.USD);
  const [isNigerian, setIsNigerian] = useState(false);

  useEffect(() => {
    const { currency: detectedCurrency, isNigerian: detected } = detectCurrency();
    setCurrency(detectedCurrency);
    setIsNigerian(detected);
  }, []);

  const getPlanPrice = (plan: typeof PLANS[0]) => {
    if (plan.monthlyPrice === null) return null;
    if (plan.monthlyPrice === 0) return 0;
    if (isNigerian && plan.id !== "free") {
      const p = NGN_PRICING[plan.id as keyof typeof NGN_PRICING];
      return isAnnual ? p.annual : p.monthly;
    }
    return isAnnual ? plan.annualPrice : plan.monthlyPrice;
  };

  const getSavePercent = (plan: typeof PLANS[0]) => {
    if (isNigerian && plan.id !== "free") {
      return NGN_PRICING[plan.id as keyof typeof NGN_PRICING].savePercent;
    }
    return plan.savePercent;
  };

  const displayPrice = (plan: typeof PLANS[0]) => {
    const price = getPlanPrice(plan);
    if (price === null) return "Custom";
    if (price === 0) return `${currency.symbol}0`;
    return `${currency.symbol}${price.toLocaleString()}`;
  };

  return (
    <main>
      <div className={`${bgStyles.animated_circles_bg} ${styles.heroSection}`}>

        <div className={styles.heroText}>
          <span className={styles.heroBadge}>Do more with your cv</span>
          <h1 className={styles.heroTitle}>Simple, transparent pricing</h1>
          <p className={styles.heroSubtitle}>
            Find a plan that fits your career goals. Whether you&apos;re just starting out or a seasoned
            professional, we&apos;ve got the AI tools to elevate your resume.
          </p>

          <div className={styles.billingToggle}>
            <span className={`${styles.billingLabel} ${!isAnnual ? styles.active : ""}`}>
              Monthly
            </span>
            <button
              id="billing-toggle"
              className={`${styles.toggleTrack} ${isAnnual ? styles.isAnnual : ""}`}
              onClick={() => setIsAnnual((v) => !v)}
              aria-label="Toggle billing period"
            >
              <span className={styles.toggleThumb} />
            </button>
            <span className={`${styles.billingLabel} ${isAnnual ? styles.active : ""}`}>
              Annual
            </span>
            <span className={styles.saveBadge}>Save</span>
          </div>
        </div>

        <div className={styles.cardsGrid}>
          {PLANS.map((plan, index) => (
            <div
              key={plan.id}
              id={`pricing-card-${plan.id}`}
              className={[
                styles.pricingCard,
                index === 0 ? styles.cardDelay0 : index === 1 ? styles.cardDelay1 : styles.cardDelay2,
              ].join(" ")}
            >
              {plan.badge && (
                <span className={styles.planBadge}>{plan.badge}</span>
              )}

              <h2 className={`${styles.planName} ${plan.isPro ? styles.proName : ""}`}>
                {plan.name}
              </h2>
              <p className={styles.planTagline}>{plan.tagline}</p>

              <div className={styles.priceRow}>
                <span className={styles.priceAmount}>{displayPrice(plan)}</span>
                {plan.monthlyPrice !== null && plan.monthlyPrice > 0 && (
                  <span className={styles.pricePeriod}>/mo</span>
                )}
              </div>
              <p className={styles.billingNote}>
                {plan.monthlyPrice > 0 && isAnnual && `Billed annually — save ${getSavePercent(plan)}%`}
                {plan.monthlyPrice > 0 && !isAnnual && "Billed monthly"}
              </p>

              <ul className={styles.featureList}>
                {plan.features.map((f) => (
                  <li key={f.label} className={`${styles.featureItem} ${f.muted ? styles.muted : ""}`}>
                    {(f as any).isAiCredit ? (
                      <>
                        <Zap className={styles.creditIcon} />
                        <span className={styles.creditValue}>{f.label}</span>
                      </>
                    ) : f.icon === "sparkle" ? (
                      <SparkleIcon className={styles.sparkleIcon} />
                    ) : (
                      <CheckIcon className={`${styles.checkIcon} ${plan.isPro ? styles.proCheck : ""}`} />
                    )}
                    {!(f as any).isAiCredit && f.label}
                  </li>
                ))}
              </ul>

              <Link
                id={`pricing-cta-${plan.id}`}
                href={plan.ctaHref}
                className={`${styles.ctaBtn} ${plan.isPro ? styles.ctaPrimary : ""}`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>

      <section className={styles.compareSection} aria-labelledby="compare-heading">
        <h2 id="compare-heading" className={styles.sectionHeading}>Compare features</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th>Features</th>
                <th>Free</th>
                <th className={styles.thPro}>Pro</th>
                <th>Pro+</th>
              </tr>
            </thead>
            <tbody className={styles.tableBody}>
              {COMPARE_ROWS.map((row) => (
                <tr key={row.feature}>
                  <td>{row.feature}</td>
                  <td>
                    {typeof row.free === "boolean" ? (
                      row.free
                        ? <CheckIcon className={styles.checkCell} />
                        : <CrossIcon className={styles.crossCell} />
                    ) : row.free}
                  </td>
                  <td className={styles.tdPro}>
                    {typeof row.pro === "boolean" ? (
                      row.pro
                        ? <CheckIcon className={styles.proCheckCell} />
                        : <CrossIcon className={styles.crossCell} />
                    ) : row.pro}
                  </td>
                  <td>
                    {typeof row.enterprise === "boolean" ? (
                      row.enterprise
                        ? <CheckIcon className={styles.checkCell} />
                        : <CrossIcon className={styles.crossCell} />
                    ) : row.enterprise}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.faqSection} aria-labelledby="faq-heading">
        <div className={styles.faqInner}>
          <h2 id="faq-heading" className={styles.sectionHeading}>Frequently asked questions</h2>
          <ul className={styles.faqList}>
            {FAQS.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <li key={i} className={styles.faqItem}>
                  <button
                    id={`faq-trigger-${i}`}
                    className={styles.faqTrigger}
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    aria-expanded={isOpen}
                  >
                    {faq.q}
                    <ChevronIcon className={`${styles.faqChevron} ${isOpen ? styles.isOpen : ""}`} />
                  </button>
                  <div className={`${styles.faqBody} ${isOpen ? styles.isOpen : ""}`} aria-hidden={!isOpen}>
                    <p className={styles.faqAnswer}>{faq.a}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div className={styles.ctaBanner}>
          <h2 className={styles.ctaTitle}>Ready to land your dream job?</h2>
          <p className={styles.ctaSubtitle}>
            Join over 50,000 professionals who used AgenticApp.cv to accelerate their career growth.
          </p>
          <div className={styles.ctaActions}>
            <Link id="cta-get-started" href="/auth/login" className={styles.ctaActionPrimary}>
              Get Started for Free
            </Link>
            <Link id="cta-view-templates" href="/templates" className={styles.ctaActionSecondary}>
              View Templates
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
