# Pricing Page — Full Implementation Guide

> **Source of truth:** Read `design.md` before touching any file.
> Stitch reference HTML: `pricing_stitch.html` (workspace root)
> Stitch screenshot: `pricing_stitch.png` (workspace root)

---

## Table of Contents

1. [New Files to Create](#1-new-files-to-create)
2. [Files to Modify](#2-files-to-modify)
3. [Step-by-Step Implementation](#3-step-by-step-implementation)
   - [Step 1 — Create the CSS Module](#step-1--create-the-css-module)
   - [Step 2 — Create the Page Component](#step-2--create-the-page-component)
   - [Step 3 — Update NavBar links](#step-3--update-navbar-links)
   - [Step 4 — Update Header to show NavBar on /pricing](#step-4--update-header-to-show-navbar-on-pricing)
4. [Design Rules & Decisions](#4-design-rules--decisions)

---

## 1. New Files to Create

| File | Purpose |
|---|---|
| `src/app/pricing/page.tsx` | The pricing route page component (`/pricing`) |
| `src/app/pricing/page.module.css` | All pricing-specific styles (no Tailwind, no hardcoded values) |

---

## 2. Files to Modify

| File | Change |
|---|---|
| `src/components/header/NavBar.tsx` | Update "Pricing" link to point to `/pricing` (absolute URL) |
| `src/components/header/header.tsx` | Show `<NavBar>` on both `/` and `/pricing` routes |

---

## 3. Step-by-Step Implementation

---

### Step 1 — Create the CSS Module

**File:** `src/app/pricing/page.module.css`

This is the most critical file. Every class below must use **only** CSS tokens from `src/styles/variables.css`. No hardcoded hex values, no Tailwind.

#### 1A — Animated Background (reuses login pattern)

The hero section (containing the billing toggle + pricing cards) must use the same animated circles background used in the login page right panel. Import the animation CSS from the login page:

```tsx
// At the top of page.tsx
import bgStyles from "@/app/auth/login/animated-bg.module.css";
```

Apply the class to the outer wrapper of the hero+cards section:

```tsx
<section className={`${bgStyles.animated_circles_bg} ${styles.heroSection}`}>
```

The `animated_circles_bg` class from `animated-bg.module.css` handles ALL the background animation via `::before` and `::after` pseudo-elements. You just need to set the correct height and padding on the wrapper.

**Key:** The `animated-bg.module.css::after` pseudo-element provides a `backdrop-filter: blur(10px)` overlay. The pricing cards must sit **above** this overlay (z-index: 2+). The `.animated_circles_bg > *` rule in the existing CSS already handles this by setting `position: relative; z-index: 2` on direct children.

#### 1B — Hero Section Styles

```css
/* src/app/pricing/page.module.css */

.heroSection {
  /* Sits on top of animated bg — padding only, no background */
  padding: var(--space-20) var(--space-6) var(--space-12);
  text-align: center;
}

.heroBadge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--primary-700);
  background: var(--primary-4);
  border: 1px solid var(--primary-3);
  border-radius: var(--radius-full);
  padding: var(--space-1) var(--space-4);
  margin-bottom: var(--space-6);
}

.heroTitle {
  font-family: var(--font-title);
  font-size: var(--text-5xl);
  font-weight: var(--font-bold);
  color: var(--neutral-900);
  line-height: var(--leading-tight);
  letter-spacing: -0.025em;
  margin-bottom: var(--space-6);
  max-width: 44rem;
  margin-left: auto;
  margin-right: auto;
}

.heroSubtitle {
  font-size: var(--text-lg);
  color: var(--neutral-500);
  line-height: var(--leading-relaxed);
  max-width: 36rem;
  margin: 0 auto var(--space-12);
}
```

#### 1C — Billing Toggle

```css
.billingToggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-12);
  background: hsl(0 0% 100% / 0.6);
  border: 1px solid var(--neutral-200);
  border-radius: var(--radius-full);
  padding: var(--space-2) var(--space-5);
  backdrop-filter: blur(8px);
}

.billingLabel {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--neutral-500);
  transition: color 0.2s;
}

.billingLabel.active {
  color: var(--primary-700);
  font-weight: var(--font-semibold);
}

.toggleTrack {
  position: relative;
  width: 3rem;
  height: 1.5rem;
  background-color: var(--neutral-200);
  border-radius: var(--radius-full);
  cursor: pointer;
  border: none;
  transition: background-color 0.2s;
  padding: 0;
}

.toggleTrack.isAnnual {
  background-color: var(--primary-500);
}

.toggleThumb {
  position: absolute;
  top: 0.2rem;
  left: 0.2rem;
  width: 1.1rem;
  height: 1.1rem;
  background: #ffffff;
  border-radius: 50%;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease;
}

.toggleTrack.isAnnual .toggleThumb {
  transform: translateX(1.5rem);
}

.saveBadge {
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  color: var(--primary-800);
  background: var(--primary-4);
  border: 1px solid var(--primary-3);
  border-radius: var(--radius-full);
  padding: 0.2rem var(--space-3);
  animation: pulseSave 2.5s ease-in-out infinite;
}

@keyframes pulseSave {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.65; }
}
```

#### 1D — Pricing Cards Grid

The cards grid sits INSIDE the animated-bg section. Cards themselves are translucent glass (matching the login card style).

```css
.cardsGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-8);
  max-width: var(--container-max-width); /* 72rem */
  margin: 0 auto;
  padding: 0 var(--space-6);
  align-items: start;
}

@media (max-width: 1024px) {
  .cardsGrid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 640px) {
  .cardsGrid {
    grid-template-columns: 1fr;
  }
}
```

#### 1E — Individual Card Styles (Glassmorphism)

Each card must be translucent so the animated background blobs are visible through it. Match the login page card style (`hsl(0 0% 100% / 0.5)`).

```css
/* Base card — glass effect */
.pricingCard {
  background: hsl(0 0% 100% / 0.55);
  border: 1px solid hsl(0 0% 100% / 0.4);
  border-radius: var(--radius-2xl);
  padding: var(--space-8);
  display: flex;
  flex-direction: column;
  box-shadow:
    0 2px 4px rgb(0 0 0 / 0.04),
    0 12px 40px rgb(0 0 0 / 0.06);
  backdrop-filter: blur(16px);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.pricingCard:hover {
  transform: translateY(-4px);
  box-shadow:
    0 4px 8px rgb(0 0 0 / 0.06),
    0 20px 60px rgb(0 0 0 / 0.1);
}

/* Pro card — emphasised with a colored border */
.pricingCard.isPro {
  background: hsl(0 0% 100% / 0.72);
  border: 2px solid var(--primary-400);
  box-shadow:
    0 0 0 4px hsl(132 27% 70% / 0.15),
    0 4px 8px rgb(0 0 0 / 0.06),
    0 20px 60px rgb(0 0 0 / 0.1);
  /* Lift to stand out */
  transform: scale(1.04);
  z-index: 1;
}

.pricingCard.isPro:hover {
  transform: scale(1.04) translateY(-4px);
}
```

#### 1F — Staggered Enter Animations

Cards must animate in with a staggered fade-up effect on page load. Use pure CSS with `animation-delay`.

```css
/* Define the enter animation */
@keyframes cardEnter {
  from {
    opacity: 0;
    transform: translateY(28px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Apply to each card with staggered delays */
.pricingCard {
  /* existing styles above... */
  opacity: 0; /* starts invisible */
  animation: cardEnter 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.cardDelay0 { animation-delay: 0.1s; }
.cardDelay1 { animation-delay: 0.25s; }
.cardDelay2 { animation-delay: 0.4s; }

/* IMPORTANT: The isPro card animates from scale(0.97) to scale(1.04) */
.pricingCard.isPro {
  animation-name: cardEnterPro;
}

@keyframes cardEnterPro {
  from {
    opacity: 0;
    transform: translateY(28px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: scale(1.04); /* matches its resting state */
  }
}
```

Apply these classes in JSX:

```tsx
<div className={`${styles.pricingCard} ${styles.cardDelay0}`}>  {/* Free */}
<div className={`${styles.pricingCard} ${styles.isPro} ${styles.cardDelay1}`}>  {/* Pro */}
<div className={`${styles.pricingCard} ${styles.cardDelay2}`}>  {/* Enterprise */}
```

#### 1G — Card Inner Content Styles

```css
.planBadge {
  display: inline-block;
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #ffffff;
  background: var(--primary-600);
  border-radius: var(--radius-full);
  padding: 0.2rem var(--space-3);
  margin-bottom: var(--space-3);
}

.planName {
  font-family: var(--font-title);
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--neutral-900);
  margin-bottom: var(--space-2);
}

.planName.proName {
  color: var(--primary-700);
}

.planTagline {
  font-size: var(--text-sm);
  color: var(--neutral-500);
  margin-bottom: var(--space-8);
}

.priceRow {
  display: flex;
  align-items: baseline;
  gap: var(--space-1);
  margin-bottom: var(--space-2);
}

.priceAmount {
  font-size: var(--text-5xl);
  font-weight: var(--font-bold);
  color: var(--neutral-900);
  line-height: 1;
  transition: all 0.3s ease;
}

.pricePeriod {
  font-size: var(--text-base);
  color: var(--neutral-400);
}

.billingNote {
  font-size: var(--text-xs);
  color: var(--primary-600);
  font-weight: var(--font-medium);
  margin-bottom: var(--space-8);
  min-height: 1.25rem; /* prevents layout shift when hidden */
}

/* Feature list */
.featureList {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--space-8);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  flex: 1;
}

.featureItem {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--text-sm);
  color: var(--neutral-700);
}

.featureItem.muted {
  opacity: 0.55;
}

.checkIcon {
  width: 1.1rem;
  height: 1.1rem;
  flex-shrink: 0;
  color: var(--success);
}

.checkIcon.proCheck {
  color: var(--primary-600);
}

.sparkleIcon {
  width: 1.1rem;
  height: 1.1rem;
  flex-shrink: 0;
  color: var(--ai-accent-500);
}

/* CTA Buttons */
.ctaBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid var(--neutral-200);
  background: transparent;
  color: var(--neutral-700);
  font-family: inherit;
}

.ctaBtn:hover {
  background: var(--neutral-100);
  border-color: var(--neutral-300);
  transform: translateY(-1px);
}

.ctaBtn.ctaPrimary {
  background: linear-gradient(135deg, var(--primary-600), var(--primary-500));
  color: #ffffff;
  border-color: transparent;
  box-shadow: 0 4px 14px hsl(120 24% 55% / 0.35);
}

.ctaBtn.ctaPrimary:hover {
  box-shadow: 0 6px 20px hsl(120 24% 55% / 0.45);
  background: linear-gradient(135deg, var(--primary-700), var(--primary-600));
}

.ctaBtn:active {
  transform: translateY(0) scale(0.99);
}
```

#### 1H — Feature Comparison Table Section

This section has a plain white background (not animated bg):

```css
/* ── COMPARISON TABLE SECTION ── */
.compareSection {
  padding: var(--space-24) var(--space-6);
  max-width: var(--container-max-width);
  margin: 0 auto;
}

.sectionHeading {
  font-family: var(--font-title);
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  color: var(--neutral-900);
  text-align: center;
  margin-bottom: var(--space-16);
  letter-spacing: -0.025em;
}

.tableWrapper {
  overflow-x: auto;
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-default);
  box-shadow: var(--shadow-sm);
  background: var(--surface);
}

.table {
  width: 100%;
  border-collapse: collapse;
  min-width: 560px;
  text-align: left;
}

.tableHead th {
  padding: var(--space-5) var(--space-6);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--neutral-700);
  background: var(--neutral-50);
  border-bottom: 1px solid var(--border-default);
}

.tableHead th:not(:first-child) {
  text-align: center;
}

.tableHead th.thPro {
  color: var(--primary-600);
}

.tableBody tr {
  transition: background 0.15s;
}

.tableBody tr:hover {
  background: var(--primary-50);
}

.tableBody tr:not(:last-child) {
  border-bottom: 1px solid var(--neutral-100);
}

.tableBody td {
  padding: var(--space-4) var(--space-6);
  font-size: var(--text-sm);
  color: var(--neutral-600);
}

.tableBody td:not(:first-child) {
  text-align: center;
}

.tableBody td.tdPro {
  color: var(--primary-600);
  font-weight: var(--font-semibold);
}

.checkCell {
  color: var(--success);
}

.proCheckCell {
  color: var(--primary-600);
}

.crossCell {
  color: var(--neutral-300);
}
```

#### 1I — FAQ Accordion Section

```css
/* ── FAQ SECTION ── */
.faqSection {
  padding: var(--space-24) var(--space-6);
  background: var(--neutral-50);
}

.faqInner {
  max-width: 44rem;
  margin: 0 auto;
}

.faqList {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.faqItem {
  background: var(--surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.faqItem:has(.faqBody[data-open="true"]) {
  box-shadow: var(--shadow-md);
}

.faqTrigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-5) var(--space-6);
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--neutral-800);
  transition: color 0.15s;
}

.faqTrigger:hover {
  color: var(--primary-700);
}

.faqChevron {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
  color: var(--neutral-400);
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), color 0.15s;
}

.faqChevron.isOpen {
  transform: rotate(180deg);
  color: var(--primary-600);
}

.faqBody {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.faqBody.isOpen {
  max-height: 20rem;
}

.faqAnswer {
  padding: 0 var(--space-6) var(--space-5);
  font-size: var(--text-sm);
  color: var(--neutral-500);
  line-height: var(--leading-relaxed);
  border-top: 1px solid var(--border-light);
}
```

#### 1J — CTA Banner Section

```css
/* ── CTA SECTION ── */
.ctaSection {
  padding: var(--space-24) var(--space-6);
}

.ctaBanner {
  max-width: 56rem;
  margin: 0 auto;
  background: linear-gradient(135deg, var(--primary-600) 0%, var(--primary-500) 60%, var(--primary-400) 100%);
  border-radius: var(--radius-2xl);
  padding: var(--space-16) var(--space-12);
  text-align: center;
  position: relative;
  overflow: hidden;
  box-shadow: var(--shadow-xl);
}

/* Subtle dot-grid overlay */
.ctaBanner::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle at 2px 2px, hsl(0 0% 100% / 0.12) 1px, transparent 0);
  background-size: 24px 24px;
  pointer-events: none;
}

/* AI accent glow in corner */
.ctaBanner::after {
  content: "";
  position: absolute;
  bottom: -4rem;
  right: -4rem;
  width: 16rem;
  height: 16rem;
  background: radial-gradient(circle, var(--ai-accent-400) 0%, transparent 70%);
  opacity: 0.25;
  border-radius: 50%;
  pointer-events: none;
}

.ctaTitle {
  font-family: var(--font-title);
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  color: #ffffff;
  line-height: var(--leading-tight);
  letter-spacing: -0.025em;
  margin-bottom: var(--space-4);
  position: relative;
  z-index: 1;
}

.ctaSubtitle {
  font-size: var(--text-lg);
  color: hsl(0 0% 100% / 0.8);
  margin-bottom: var(--space-10);
  position: relative;
  z-index: 1;
}

.ctaActions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
}

.ctaActionPrimary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4) var(--space-10);
  background: #ffffff;
  color: var(--primary-700);
  font-weight: var(--font-bold);
  font-size: var(--text-base);
  border-radius: var(--radius-xl);
  border: none;
  cursor: pointer;
  font-family: inherit;
  box-shadow: var(--shadow-lg);
  transition: transform 0.2s, box-shadow 0.2s;
}

.ctaActionPrimary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-xl);
}

.ctaActionSecondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4) var(--space-10);
  background: hsl(0 0% 100% / 0.15);
  color: #ffffff;
  font-weight: var(--font-semibold);
  font-size: var(--text-base);
  border-radius: var(--radius-xl);
  border: 1px solid hsl(0 0% 100% / 0.3);
  cursor: pointer;
  font-family: inherit;
  backdrop-filter: blur(8px);
  transition: background 0.2s, transform 0.2s;
}

.ctaActionSecondary:hover {
  background: hsl(0 0% 100% / 0.25);
  transform: translateY(-2px);
}

/* ── FOOTER ── */
.footer {
  background: var(--neutral-800);
  padding: var(--space-12) var(--space-6);
}

.footerInner {
  max-width: var(--container-max-width);
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-6);
}

.footerBrand {
  font-family: var(--font-uncial);
  font-size: var(--text-xl);
  color: var(--primary-300);
}

.footerTagline {
  font-size: var(--text-xs);
  color: var(--neutral-400);
  margin-top: var(--space-1);
}

.footerLinks {
  display: flex;
  gap: var(--space-6);
  flex-wrap: wrap;
}

.footerLink {
  font-size: var(--text-xs);
  color: var(--neutral-400);
  text-decoration: none;
  transition: color 0.15s;
}

.footerLink:hover {
  color: var(--primary-400);
}
```

---

### Step 2 — Create the Page Component

**File:** `src/app/pricing/page.tsx`

This is a **Client Component** (`"use client"`) because it needs React state for the billing toggle and FAQ accordion.

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import bgStyles from "@/app/auth/login/animated-bg.module.css";

// ── Data ─────────────────────────────────────────────────────────────────────

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
      { label: "1 Resume", icon: "check" },
      { label: "Basic Templates", icon: "check" },
      { label: "AI Content Analysis (Limited)", icon: "check", muted: true },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Best for active job seekers.",
    monthlyPrice: 15,
    annualPrice: 12,
    isPro: true,
    badge: "Most Popular",
    cta: "Start Free Trial",
    ctaHref: "/auth/login",
    features: [
      { label: "Unlimited Resumes", icon: "check" },
      { label: "Premium Templates", icon: "check" },
      { label: "Unlimited AI Assistant", icon: "sparkle" },
      { label: "PDF & DOCX Export", icon: "check" },
      { label: "Job Application Tracker", icon: "check" },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For recruitment teams.",
    monthlyPrice: null,
    annualPrice: null,
    isPro: false,
    badge: null,
    cta: "Contact Sales",
    ctaHref: "mailto:sales@agenticcv.com",
    features: [
      { label: "Team Collaboration", icon: "check" },
      { label: "Custom Brand Templates", icon: "check" },
      { label: "Bulk Export Options", icon: "check" },
      { label: "Priority Support", icon: "check" },
    ],
  },
];

const COMPARE_ROWS = [
  { feature: "Resume Limit",              free: "1 active",        pro: "Unlimited",   enterprise: "Unlimited" },
  { feature: "AI Bullet Optimization",    free: "5 per resume",    pro: true,          enterprise: true },
  { feature: "Job Description Matching",  free: false,             pro: true,          enterprise: true },
  { feature: "Custom Domain Portfolio",   free: false,             pro: true,          enterprise: true },
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
    q: "Is my data secure with Agentic CV?",
    a: "We prioritize your privacy. All your personal data and resumes are encrypted at rest and in transit. We never sell your data to third parties, and our AI processing is strictly for enhancing your content.",
  },
  {
    q: "Is there a free trial for the Pro plan?",
    a: "Yes! Every new user gets a 7-day free trial of the Pro plan with no credit card required. After the trial, you can choose to upgrade or continue on the Free tier.",
  },
];

// ── SVG Icons ─────────────────────────────────────────────────────────────────

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

// ── Component ─────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const displayPrice = (plan: typeof PLANS[0]) => {
    if (plan.monthlyPrice === null) return "Custom";
    if (plan.monthlyPrice === 0) return "$0";
    return isAnnual ? `$${plan.annualPrice}` : `$${plan.monthlyPrice}`;
  };

  return (
    <main>
      {/* ── HERO + CARDS (Animated BG) ─────────────────────────────── */}
      <div className={`${bgStyles.animated_circles_bg} ${styles.heroSection}`}>

        {/* Hero Text */}
        <div className={styles.heroText}>
          <span className={styles.heroBadge}>Simple Plans for Success</span>
          <h1 className={styles.heroTitle}>Simple, transparent pricing</h1>
          <p className={styles.heroSubtitle}>
            Find a plan that fits your career goals. Whether you&apos;re just starting out or a seasoned
            professional, we&apos;ve got the AI tools to elevate your resume.
          </p>

          {/* Billing Toggle */}
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
            <span className={styles.saveBadge}>Save 20%</span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className={styles.cardsGrid}>
          {PLANS.map((plan, index) => (
            <div
              key={plan.id}
              id={`pricing-card-${plan.id}`}
              className={[
                styles.pricingCard,
                plan.isPro ? styles.isPro : "",
                index === 0 ? styles.cardDelay0 : index === 1 ? styles.cardDelay1 : styles.cardDelay2,
              ].join(" ")}
            >
              {/* Badge */}
              {plan.badge && (
                <span className={styles.planBadge}>{plan.badge}</span>
              )}

              {/* Plan name */}
              <h2 className={`${styles.planName} ${plan.isPro ? styles.proName : ""}`}>
                {plan.name}
              </h2>
              <p className={styles.planTagline}>{plan.tagline}</p>

              {/* Price */}
              <div className={styles.priceRow}>
                <span className={styles.priceAmount}>{displayPrice(plan)}</span>
                {plan.monthlyPrice !== null && plan.monthlyPrice > 0 && (
                  <span className={styles.pricePeriod}>/mo</span>
                )}
              </div>
              <p className={styles.billingNote}>
                {plan.isPro && isAnnual && "Billed annually — save 20%"}
                {plan.isPro && !isAnnual && "Billed monthly"}
              </p>

              {/* Features */}
              <ul className={styles.featureList}>
                {plan.features.map((f) => (
                  <li key={f.label} className={`${styles.featureItem} ${f.muted ? styles.muted : ""}`}>
                    {f.icon === "sparkle" ? (
                      <SparkleIcon className={styles.sparkleIcon} />
                    ) : (
                      <CheckIcon className={`${styles.checkIcon} ${plan.isPro ? styles.proCheck : ""}`} />
                    )}
                    {f.label}
                  </li>
                ))}
              </ul>

              {/* CTA */}
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

      {/* ── COMPARISON TABLE ───────────────────────────────────────── */}
      <section className={styles.compareSection} aria-labelledby="compare-heading">
        <h2 id="compare-heading" className={styles.sectionHeading}>Compare features</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th>Features</th>
                <th>Free</th>
                <th className={styles.thPro}>Pro</th>
                <th>Enterprise</th>
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

      {/* ── FAQ ────────────────────────────────────────────────────── */}
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

      {/* ── CTA BANNER ─────────────────────────────────────────────── */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaBanner}>
          <h2 className={styles.ctaTitle}>Ready to land your dream job?</h2>
          <p className={styles.ctaSubtitle}>
            Join over 50,000 professionals who used Agentic CV to accelerate their career growth.
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

      {/* ── FOOTER ─────────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div>
            <div className={styles.footerBrand}>Agentic CV</div>
            <p className={styles.footerTagline}>© 2024 Agentic CV. Elevate your career with AI.</p>
          </div>
          <nav className={styles.footerLinks} aria-label="Footer">
            <Link className={styles.footerLink} href="#">Privacy Policy</Link>
            <Link className={styles.footerLink} href="#">Terms of Service</Link>
            <Link className={styles.footerLink} href="#">Cookie Policy</Link>
            <Link className={styles.footerLink} href="#">Contact Support</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
```

---

### Step 3 — Update NavBar links

**File:** `src/components/header/NavBar.tsx`

Change the "Pricing" link from `#pricing` (anchor on homepage) to `/pricing` (absolute route). Also update "Features" to use `/#features` so it works from any page.

```tsx
// Change these three links:
<Link className={styles.navLink} href="/templates">
  <li>Templates</li>
</Link>
<Link className={styles.navLink} href="/#features">
  <li>Features</li>
</Link>
<Link className={styles.navLink} href="/pricing">
  <li>Pricing</li>
</Link>
```

---

### Step 4 — Update Header to show NavBar on /pricing

**File:** `src/components/header/header.tsx`

The `NavBar` is currently only rendered when `isHome` (i.e., pathname === `/`). Update this so it also shows on `/pricing`.

```tsx
// Change:
const isHome = pathname === "/";

// To:
const showNav = pathname === "/" || pathname === "/pricing";

// Then in JSX change:
{isHome && <NavBar menuState={isMenuOpen} />}

// To:
{showNav && <NavBar menuState={isMenuOpen} />}
```

Also update the NavBar's active link highlight. Add an `activePricing` modifier in `header.module.css`:

```css
/* header.module.css — add this */
.navLinkActive {
  color: var(--primary-600);
  font-weight: var(--font-semibold);
}
```

And pass the pathname to NavBar so it can apply the active class:

```tsx
// In header.tsx, pass pathname:
<NavBar menuState={isMenuOpen} pathname={pathname} />

// In NavBar.tsx, accept and use it:
export default function NavBar({ menuState, pathname }: { menuState: boolean; pathname?: string }) {
  // ...
  <Link
    className={`${styles.navLink} ${pathname === "/pricing" ? styles.navLinkActive : ""}`}
    href="/pricing"
  >
    <li>Pricing</li>
  </Link>
}
```

---

## 4. Design Rules & Decisions

### Do's
- ✅ Use only tokens from `src/styles/variables.css` — no raw hex values.
- ✅ Use `var(--font-title)` (Lora) for h1/h2 section headings.
- ✅ Use `var(--font-body)` (Plus Jakarta Sans) for everything else.
- ✅ Import `bgStyles` from `@/app/auth/login/animated-bg.module.css` for the animated background — do **not** copy/duplicate the keyframes.
- ✅ Use `hsl(0 0% 100% / 0.55)` for the glass card background (same formula as the login page card).
- ✅ All `Link` components use Next.js `<Link>` — never `<a href>` for internal navigation.
- ✅ Give every interactive element a unique `id` (e.g., `billing-toggle`, `faq-trigger-0`, `pricing-cta-pro`).

### Don'ts
- ❌ Do NOT add Tailwind classes — the Stitch HTML uses Tailwind but our project doesn't.
- ❌ Do NOT hardcode colors like `#84b179` — use `var(--primary-500)`.
- ❌ Do NOT copy the `@property`, `@keyframes cx*`, or `.animated_circles_bg` CSS — import it instead.
- ❌ Do NOT use `<a href>` for page navigation — use Next.js `<Link>`.
- ❌ Do NOT use inline `style={{}}` for anything covered by design tokens.

### Animation Summary
| Animation | Where | How |
|---|---|---|
| Animated blobs | Hero section bg | CSS `@property` keyframes in `animated-bg.module.css` (imported, not copied) |
| Blur overlay | Hero section bg | `::after` pseudo-element in `animated-bg.module.css` |
| Card stagger enter | 3 pricing cards | `@keyframes cardEnter` + `.cardDelay0/1/2` in `page.module.css` |
| Pro card stagger | Middle card | `@keyframes cardEnterPro` (lands at `scale(1.04)`) |
| Toggle thumb slide | Billing switch | CSS `transform: translateX` transition on `.toggleThumb` |
| FAQ accordion | Each FAQ item | CSS `max-height` transition on `.faqBody` |
| Save badge pulse | "Save 20%" badge | `@keyframes pulseSave` opacity animation |
| Card hover lift | All cards | `transform: translateY(-4px)` on `:hover` |

---

## Stitch Reference Assets

- **Screenshot:** [`pricing_stitch.png`](file:///c:/Users/latop/OneDrive/Documents/Projects/ai-resume-builder/pricing_stitch.png) — use as the visual reference for layout, proportions, and section order.
- **HTML:** [`pricing_stitch.html`](file:///c:/Users/latop/OneDrive/Documents/Projects/ai-resume-builder/pricing_stitch.html) — use as a content/copy reference. **Do not copy its Tailwind classes or inline styles.** Translate to CSS modules instead.