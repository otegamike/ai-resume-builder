# Design System — Agentic CV (Resumy AI)

> Single source of truth for all visual and design decisions in this project.
> Read this before making any UI changes.

---

## 1. Tech Stack & Styling Approach

- **Framework:** Next.js 16.2.3 (App Router) + React 19
- **Language:** TypeScript (strict mode, `@/*` path alias maps to `src/*`)
- **Styling method:** CSS Modules (`*.module.css`) + CSS custom properties (design tokens)
- **No Tailwind CSS** — `postcss.config.mjs` has zero plugins, no `tailwind.config.*` exists
- **Icons:** `lucide-react` v1.8 for system icons; inline SVGs for custom icons (logo, auth page)
- **Design token location:** `src/styles/variables.css`
- **Global styles:** `src/app/globals.css` (imports variables.css, base resets)
- **Component library location:** `src/components/`
- **Font loading:** `next/font/google` in `src/app/layout.tsx`

---

## 2. Color System

### CSS Variables / Tokens — `src/styles/variables.css`

#### Primary Scale (Sage Green)
| Token | Value | Usage |
|---|---|---|
| `--primary-50` | `#f4f8f2` | Lightest tint, subtle backgrounds |
| `--primary-100` | `#e8f0e5` | Hover/fill backgrounds |
| `--primary-200` | `#d1e1cc` | Borders, decorative elements |
| `--primary-300` | `#b9d2b2` | Muted accent |
| `--primary-400` | `#a2c499` | Hover states, secondary fills |
| `--primary-500` | `#84b179` | Base primary |
| `--primary-600` | `#779f6d` | Button default, interactive primary |
| `--primary-700` | `#6a8e61` | Button hover, text highlight |
| `--primary-800` | `#5d7c55` | Active states |
| `--primary-900` | `#4f6a49` | Strong text, deep accents |
| `--primary-950` | `#2a3827` | Darkest tint |

#### Primary Accent Subset (Legacy)
| Token | Value | Usage |
|---|---|---|
| `--primary-1` | `var(--primary-600)` | Primary alias — buttons, links, icons |
| `--primary-2` / `--primary-leaf` | `#A2CB8B` | Badge borders, feature backgrounds |
| `--primary-3` / `--primary-mint` | `#C7EABB` | Secondary buttons, decorative |
| `--primary-4` / `--primary-dew` | `#E8F5BD` | Hover fills, light backgrounds |

#### AI Accent (Indigo/Violet)
| Token | Value | Usage |
|---|---|---|
| `--ai-accent-50` | `#f5f3ff` | Lightest tint |
| `--ai-accent-100` | `#ede9fe` | Light backgrounds |
| `--ai-accent-200` | `#ddd6fe` | Decorative elements |
| `--ai-accent-300` | `#c4b5fd` | Shimmer gradient |
| `--ai-accent-400` | `#a78bfa` | AI button elements |
| `--ai-accent-500` | `#8b5cf6` | AI button base, close button |
| `--ai-accent-600` | `#7c3aed` | AI button hover |
| `--ai-accent-700` | `#6d28d9` | Deep accent |
| `--ai-accent-800` | `#5b21b6` | Deeper accent |
| `--ai-accent-900` | `#4c1d95` | Darkest tint |

#### Gray Scale (Legacy — still in use)
| Token | Value | Usage |
|---|---|---|
| `--gray-50` | `#f9fafb` | Page background, card surfaces |
| `--gray-100` | `#f3f4f6` | Card borders, section backgrounds |
| `--gray-200` | `#e5e7eb` | Default borders, dividers |
| `--gray-300` | `#d1d5db` | Input borders, dashed lines |
| `--gray-400` | `#9ca3af` | Muted text, placeholder icons |
| `--gray-500` | `#6b7280` | Secondary text, meta info |
| `--gray-600` | `#4b5563` | Body text |
| `--gray-700` | `#374151` | Strong body text, labels |
| `--gray-800` | `#1f2937` | Heading text |
| `--gray-900` | `#111827` | Darkest text |

#### Neutral Scale (Newer — preferred going forward)
| Token | Value | Usage |
|---|---|---|
| `--neutral-50` | `#f9fafb` | Page background, form panel |
| `--neutral-100` | `#f3f4f6` | Editor section, light outline button text |
| `--neutral-200` | `#e5e7eb` | Default page background, dividers |
| `--neutral-300` | `#d1d5db` | Editor bottom border |
| `--neutral-400` | `#9ca3af` | Muted text, input default |
| `--neutral-500` | `#6b7280` | Secondary text |
| `--neutral-600` | `#4b5563` | Title bar background |
| `--neutral-700` | `#374151` | Label text, finish text |
| `--neutral-800` | `#1f2937` | Footer background |
| `--neutral-900` | `#111827` | Text primary |
| `--neutral-950` | `#030712` | Darkest |

#### Semantic Colors
| Token | Value | Usage |
|---|---|---|
| `--success` | `#22c55e` | Success state |
| `--error` | `#ef4444` | Error state |
| `--warning` | `#f59e0b` | Warning state |
| `--info` | `#3b82f6` | Info state |
| `--foreground-muted` | `#6b7280` | Muted body text |
| `--border-default` | `#e5e7eb` | Default border color |
| `--border-input` | `#d1d5db` | Input border color |
| `--ring` | `#84B179` | Focus ring color |
| `--red-50` | `#fef2f2` | Error background |
| `--red-100` | `#fee2e2` | Error hover background |
| `--red-200` | `#ff9d9d` | Delete icon stroke |
| `--red-500` | `#ef4444` | Error text, delete button color |
| `--red-600` | `#dc2626` | Saved indicator text |
| `--red-700` | `#b91c1c` | Delete hover color |

#### Semantic Aliases
| Token | Value | Usage |
|---|---|---|
| `--bg-main` | `var(--neutral-50)` | Page body background |
| `--surface` | `#ffffff` | Card/panel surface |
| `--text-highlight` | `var(--primary-700)` | Highlighted text, link accents |
| `--text-primary` | `var(--neutral-900)` | Primary body text |
| `--text-secondary` | `var(--neutral-600)` | Secondary body text |
| `--text-muted` | `var(--neutral-400)` | Muted/de-emphasized text |
| `--border-light` | `var(--neutral-200)` | Light border |
| `--background` | `#fdfdfd` (light) / `#0a0e0b` (dark) | Card/surface background (legacy) |
| `--foreground` | `#111a14` (light) / `#f3f6f3` (dark) | Text foreground (legacy) |
| `--background-color` | `var(--neutral-200)` | Body/element background |

### Color Usage Rules
- **Backgrounds:** `var(--bg-main)` or `var(--neutral-50)` for page; `var(--surface)` / `white` for cards
- **Body Text:** `var(--text-primary)` or `var(--foreground)` for primary; `var(--text-secondary)` or `var(--gray-500)` for secondary
- **Headings:** `var(--gray-900)` or `var(--text-primary)`
- **Borders:** `var(--border-default)` / `var(--gray-200)` for cards and containers; `var(--border-input)` / `var(--gray-300)` for inputs
- **Interactive:** Buttons use `--primary-600` (default), `--primary-700` (hover), `--primary-1` (active)
- **Focus:** `var(--ring)` (`#84B179`) for focus ring on inputs
- **AI features:** `--ai-accent-*` scale for AI-powered buttons and indicators
- **Destructive:** `--red-500` for delete actions, `--red-100` for hover backgrounds
- **Dark mode:** Only `--background` and `--foreground` swap via `@media (prefers-color-scheme: dark)` — no dark mode for component-level tokens

---

## 3. Typography

### Font Families — `src/app/layout.tsx`

| Role | Font | CSS Variable | Weights Used |
|---|---|---|---|
| Display/Title | Lora | `--font-lora-variable` / `--font-lora` / `--font-title` | 400 (variable) |
| Body/Primary UI | Plus Jakarta Sans | `--font-jakarta-variable` / `--font-jakarta` / `--font-body` | 400 (variable) |
| UI Fallback | Geist Sans | `--font-geist-sans` / `--font-sans` | 400, 500, 600, 700 |
| Monospace | Geist Mono | `--font-geist-mono` / `--font-mono` | 400 |
| Brand/Logo | Limelight | `--logo-font-variable` / `--font-uncial` | 400 only |

Note: `--font-sans` resolves to `var(--font-geist-sans), Arial, Helvetica, sans-serif`. The `*` universal selector in `globals.css` sets `font-family: var(--font-jakarta)`, overriding the sans fallback.

### Type Scale — `src/styles/variables.css`

| Token | Value | Typical Usage |
|---|---|---|
| `--text-xxs` | 0.625rem (10px) | Tiny metadata, timestamps |
| `--text-xs` | 0.75rem (12px) | Labels, helper text, skill tags |
| `--text-sm` | 0.875rem (14px) | Body small, feature descriptions, nav links |
| `--text-base` | 1rem (16px) | Default body text |
| `--text-lg` | 1.125rem (18px) | Large body, button labels |
| `--text-xl` | 1.25rem (20px) | Card titles, feature titles |
| `--text-2xl` | 1.5rem (24px) | Section headings, resume titles |
| `--text-3xl` | 1.875rem (30px) | Feature section headings |
| `--text-4xl` | 2.25rem (36px) | Hero title |
| `--text-5xl` | 3rem (48px) | Primary hero heading |

⚠️ **`--text-7xl`** is referenced in `src/app/page.module.css:98` but is **not defined** in `variables.css`. The hero title falls back to `--text-5xl` on mobile and references an undefined `--text-7xl` on desktop.

### Font Weight Tokens
| Token | Value |
|---|---|
| `--font-normal` | 400 |
| `--font-medium` | 500 |
| `--font-semibold` | 600 |
| `--font-bold` | 700 |

### Line Height Tokens
| Token | Value |
|---|---|
| `--leading-tight` | 1.25 |
| `--leading-relaxed` | 1.625 |

### Typography Rules
- **Heading hierarchy:** h1 → `--text-5xl`/`--text-4xl`, h2 → `--text-3xl`, h3 → `--text-xl`/`--text-2xl`
- **Max line length:** Hero text capped at `56rem` / `44rem`; body text uses container default
- **Line height:** Body uses `1.625` (`--leading-relaxed`); headings default to browser or `--leading-tight`
- **Letter spacing:** Headings often use `-0.025em` or `-0.05em` tight tracking
- **Responsive base font:** `--rem: clamp(12px, calc((3 / 70) * 100vw - (170 / 70) * 1px), 16px)` — fluid scaling between 12px and 16px

---

## 4. Spacing System

### Base Unit — 4px scale
| Token | Value | Rem |
|---|---|---|
| `--space-1` | 0.25rem | 4px |
| `--space-2` | 0.5rem | 8px |
| `--space-3` | 0.75rem | 12px |
| `--space-4` | 1rem | 16px |
| `--space-5` | 1.25rem | 20px |
| `--space-6` | 1.5rem | 24px |
| `--space-8` | 2rem | 32px |
| `--space-10` | 2.5rem | 40px |
| `--space-12` | 3rem | 48px |
| `--space-16` | 4rem | 64px |
| `--space-20` | 5rem | 80px |
| `--space-24` | 6rem | 96px |
| `--space-32` | 8rem | 128px |

### Container
- **Max width:** `--container-max-width: 72rem` (1152px)
- **Padding:** `--container-padding: 1.5rem` (`var(--space-6)`)
- **Main element:** `width: min(1440px, 95%)`

### Section Vertical Padding Patterns
- **Hero section:** `var(--space-20)` mobile, `var(--space-32)` desktop (`page.module.css`)
- **Features section:** `var(--space-24)` (`page.module.css:184`)
- **Page sections (dashboard, settings):** `var(--space-8)` gap, `var(--space-4) var(--space-8)` padding
- **Editor form sections:** `var(--space-4)` padding, `var(--space-6)` gap

### Internal Component Padding Patterns
- **Buttons:** `sm: 0 var(--space-3)`, `md: 0 var(--space-4)`, `lg: 0 var(--space-8)`
- **Cards:** `var(--space-6)` padding for header/content
- **Feature cards:** `var(--space-8)` padding
- **Input fields:** `var(--space-3)` padding
- **Skill tags:** `var(--space-1) var(--space-3)`

---

## 5. Border & Shape

### Border Radius Scale
| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 0.25rem (4px) | Input fields, iframe previews |
| `--radius-md` | 0.375rem (6px) | Buttons, dropdown options |
| `--radius-lg` | 0.5rem (8px) | Cards, section cards |
| `--radius-xl` | 0.75rem (12px) | Dashboard cards, settings cards |
| `--radius-2xl` | 1rem (16px) | Feature cards, hero image container, login card |
| `--radius-full` | 9999px | Pills, badges, icon wrappers, skill tags, hero buttons |

- **Most common:** `--radius-md` (interactive elements) and `--radius-xl` (card-level containers)
- **Login page** uses a separate `20px` / `10px` radius on card and inputs (hardcoded)

### Border Conventions
- **Card borders:** `1px solid var(--border-default)` or `1px solid var(--gray-200)`
- **Input borders:** `1px solid var(--border-input)` or `1.5px solid var(--neutral-200)`
- **Dashed border:** `2px dashed var(--gray-300)` (create card)
- **Focus ring:** `0 0 0 2px var(--ring)` / `2px solid var(--primary-1)` with offset

### Shadow Definitions
| Token | Value |
|---|---|
| `--shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` |
| `--shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.1)` |
| `--shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1)` |
| `--shadow-xl` | `0 20px 25px -5px rgb(0 0 0 / 0.1)` |
| `--shadow-inner` | `inset 0 2px 4px 0 rgb(0 0 0 / 0.06)` |

---

## 6. Breakpoints

⚠️ **No centralized breakpoint token system exists.** Breakpoints are hardcoded as raw pixel values across CSS files:

| Name | Value | Where Used |
|---|---|---|
| `sm` | 640px | Button flex direction, header gap, feature title |
| `md` | 768px | Hero/features responsive, form grid, container padding |
| `lg` | 1024px | Header padding, features grid (3 columns) |
| `xl` | 1280px | Not explicitly used |
| (editor) | 800px | Editor workspace container query |
| (login) | 900px | Login split layout → single column |
| (templates) | 720px | Template page mobile padding |
| (container) | `@container hero (max-width: 768px)` | Hero grid collapse |
| (container) | `@container header (max-width: 640px)` | Mobile hamburger nav |
| (container) | `@container mainWorkspace (width < 800px)` | Editor mobile layout |

**Recommendation:** Define breakpoint tokens in `variables.css` and migrate hardcoded values.

---

## 7. Animation & Motion

### Standard Transition
- **Duration:** `0.2s` (most hover/focus/color/box-shadow transitions)
- **Easing:** `ease` or `ease-in-out` (default CSS)
- **Hover transforms:** `translateY(-1px)` (buttons), `translateY(-2px)` (hero button), `translateY(-12px)` (login illustration)

### Named Keyframes
| Name | File | Purpose |
|---|---|---|
| `shimmer` | `src/components/ui/Button.module.css:142` | AI button gradient sweep (2.5s ease-in-out infinite) |
| `spin` | `src/app/dashboard/page.module.css:260`, `src/app/editor/[id]/page.module.css:1054` | Loading spinner (1s linear infinite) |
| `b0bUpDown` | `src/app/editor/[id]/page.module.css:1233` | Editor toggle arrow bounce (2s ease-in infinite) |
| `floatIllustration` | `src/app/auth/login/page.module.css:133` | Login illustration float (6s ease-in-out infinite) |

### Animation Rules
- **When to animate:** Hover states (buttons, cards), loading states (spinner), AI processing (shimmer), UI feedback (focus ring, save status)
- **When not to animate:** Static content, print exports
- **Libraries:** CSS-only — no Framer Motion or other JS animation libraries

---

## 8. Component Reference

### Primitives

**`Button`** — `src/components/ui/Button.tsx`
- Props: `variant` (primary | secondary | outline | ghost | light_outline | ai), `size` (sm | md | lg), `fullWidth` (boolean)
- Styling in `src/components/ui/Button.module.css`:
  - `.button`: `display: inline-flex`, `border-radius: var(--radius-md)`, `transition: 0.2s`, `font-weight: var(--font-medium)`
  - `.primary`: `background-color: var(--primary-600)`, `color: white` — hover: `--primary-700`, active: `--primary-1`
  - `.secondary`: `background-color: var(--primary-3)`, `color: var(--gray-800)` — hover: `--primary-4`
  - `.outline`: `transparent bg`, `border: 1px solid var(--primary-1)`, `color: var(--primary-1)` — hover: `--primary-4`
  - `.light_outline`: `transparent bg`, `border: 1px solid var(--neutral-100)`, `color: var(--neutral-100)` — hover: `--neutral-700`
  - `.ghost`: `transparent bg`, `color: var(--gray-700)` — hover: `--primary-4` / `--gray-900`
  - `.ai`: Shimmer gradient (`--ai-accent-500` to `--ai-accent-200`), `animation: shimmer 2.5s`, inner content with backdrop-filter blur
  - Sizes: sm (2.25rem), md (2.5rem), lg (2.75rem)
  - Focus-visible: `2px solid var(--primary-1)` outline
  - Disabled: `opacity: 0.5`, `pointer-events: none`

**`Input`** — `src/components/ui/Input.tsx`
- Props: standard `InputHTMLAttributes`, plus `className` forwarding
- Styling in `src/components/ui/Input.module.css`:
  - Default: `height: 2.5rem`, `border-radius: var(--radius-md)`, `border: 1px solid var(--neutral-400)`, `font-size: var(--text-sm)`, `color: var(--neutral-600)`
  - Focus: `border-color: var(--primary-1)`, `box-shadow: 0 0 0 2px var(--ring)`, `outline: none`
  - Placeholder: `color: var(--foreground-muted)`
  - Disabled: `opacity: 0.5`, `cursor: not-allowed`
  - Additional class modifiers: `.noBorder`, `.noShadow`, `.noPadding`, `.noBackground`, `.titleInput` (larger, bolder), `.fullWidth`
  - ⚠️ `.titleInput:focus` sets `border-color: var(--neutral-200)` — may conflict with default focus

**`Card`** — `src/components/ui/Card.tsx`
- Subcomponents: `Card`, `CardHeader`, `CardTitle`, `CardContent`
- Styling in `src/components/ui/Card.module.css`:
  - `.card`: `border-radius: var(--radius-lg)`, `border: 1px solid var(--border-default)`, `background-color: var(--background)`, `box-shadow: var(--shadow-sm)`
  - `.cardHeader`: `padding: var(--space-6)`, `flex-direction: column`, `gap: var(--space-1)`
  - `.cardTitle`: `font-size: var(--text-2xl)`, `font-weight: var(--font-semibold)`, `letter-spacing: -0.025em`
  - `.cardContent`: `padding: var(--space-6)`, `padding-top: 0`

### Layout Components

**`Header`** — `src/components/header/header.tsx`
- Position: `sticky`, `top: 0`, `z-index: var(--z-50)`
- Background: `hsl(69 20% 93%/ 0.5)` with `backdrop-filter: blur(12px)`
- Border-bottom: `1px solid var(--border-default)`
- Container query: `@container header (max-width: 640px)` for mobile nav
- Content: Logo (left) → Nav (center-right) → Sign In / Dashboard button → Hamburger menu (mobile)

**`NavBar`** — `src/components/header/NavBar.tsx`
- Mobile slide-down panel with fade animation (0.5s delay on close)
- Links: Templates, Features, Pricing
- Styling in `header.module.css`

**`HamburgerMenu`** — `src/components/header/hamburger-menu/hamburgerMenu.tsx`
- Animated hamburger-to-cross icon transition

**`PageBody`** — `src/components/page-body/PageBody.tsx`
- Wraps `<body>` tag; sets `overflow: clip` for editor route via inline style
- Background: `var(--background-color)` (`--neutral-200`)

**`SessionProvider`** — `src/components/auth/SessionProvider.tsx`
- Wraps `next-auth` `SessionProvider`

### SVG Components

**`Logo`** — `src/components/svgs/logo.tsx`
- Props: `size`, `color`, `rem` (unit toggle)
- Renders SVG document icon path (163×200 viewBox)

### Page Sections

**`Hero`** — `src/components/hero/Hero.tsx`
- Client component with session-aware CTA links
- Two-column grid layout (container query collapses at 768px)
- Title with highlighted AI-powered span (`--text-highlight`)
- Two CTA buttons: "Build My Resume Now" (primary) + "View Templates" (outline)
- Image container with hover lift animation
- Trusted-by label

---

## 9. Page Structure Reference

### Homepage (`/`) — `src/app/page.tsx`
1. Absolute-positioned gradient blobs (left: `--ai-accent-400` → transparent; right: `--primary-3` → transparent) with blur filter
2. `<Hero />` component inside `<main>`:
   - Two-column grid (text + image)
   - Hero title with gradient text span (`--primary-1` → `--primary-2`)
   - Description paragraph
   - Two CTA buttons (conditional auth-aware links)
   - Hero preview image
   - "Trusted by professionals" label
3. Features section (id="features"):
   - 3-card grid (1-col mobile, 3-col at 1024px):
     - AI Content Writer (Sparkles icon)
     - Live Preview (CheckCircle2 icon)
     - PDF Export (FileText icon)
4. Footer (dark `--neutral-800` background with copyright)

### Login (`/auth/login`) — `src/app/auth/login/page.tsx` + `LoginClient.tsx`
- Split layout: `grid-template-columns: minmax(450px, 30vw) 1fr`
- **Left brand panel:** Dark green gradient background, ambient glow blobs, illustration image with float animation, feature checklist, tagline
- **Right form panel:** Light background with subtle dot pattern, card with OAuth (Google) + credentials form + sign-in/sign-up toggle

### Dashboard (`/dashboard`) — `src/app/dashboard/page.tsx`
- Header: "My Resumes" title + subtitle
- Grid: `repeat(auto-fill, minmax(170px, 1fr))`
- Create card (dashed border, plus icon)
- Resume cards: iframe preview (794×1123 aspect ratio) + title + date + edit/delete actions (hover-reveal)
- Loading/error states

### Templates (`/templates`) — `src/app/templates/page.tsx`
- Header: "Template Gallery" + "Back to Homepage" button
- Grid: `repeat(auto-fit, minmax(260px, 1fr))`
- Template cards: iframe live preview (794×1123), template name, description, dimensions, "Use Template" button
- Auth-aware action links

### Editor (`/editor/[id]`) — `src/app/editor/[id]/page.tsx`
- Two-panel layout: `grid-template-columns: minmax(20rem, 1fr) 3fr`
- **Title bar:** Back arrow → divider → editable title → template picker → save status → Save Draft button → Export dropdown (PDF / Image)
- **Left panel (editor):**
  - Form navigation bar (7 tabs): Personal Details, Headshot, Work Experience, Education, Skills, Summary, Finish
  - Active tab content renders corresponding form component
  - Navigation footer: pagination dots + Previous/Next buttons + "View/Edit Resume" toggle
  - Mobile: absolute positioned, collapsible (max-height toggle with animation)
- **Right panel (preview):**
  - Live iframe preview of the rendered template (scales to fit)
  - Hidden export iframe for PDF/image generation
- Container query at 800px collapses to single-column mobile layout
- Uses `html2pdf.js` for PDF export and canvas-based image export

### Settings (`/settings`) — `src/app/settings/page.tsx`
- Server component with session check
- "Profile Information" card: first name, last name, email (read-only)
- "Notifications" card (disabled save button)

---

## 10. How to Make Design Changes

### Changing Colors
1. Update the token in `src/styles/variables.css` under the `:root` block
2. If the token is a semantic alias, update the variable reference (e.g., `--primary-1: var(--primary-600)`)
3. Do **not** hardcode color values in components — reference CSS variables only
4. If adding a new color role, define it as a CSS variable in `variables.css` with a semantic name

### Changing Fonts
1. Update the font import in `src/app/layout.tsx` (using `next/font/google`)
2. Add the CSS variable in the `className` of the `<html>` tag
3. Define the font-family alias in `src/styles/variables.css:` (e.g., `--font-body: var(--new-font-variable)`)
4. The variable will cascade automatically — no component changes needed unless you are adding a new font role

### Adding a New Component
1. Create the file in `src/components/[category]/ComponentName.tsx`
2. Create a co-located CSS Module: `ComponentName.module.css`
3. Use **only tokens** from `variables.css` — no hardcoded values
4. Prefer the `--neutral-*` scale over the legacy `--gray-*` scale for consistency
5. Use `--space-*` tokens for spacing, `--text-*` tokens for font sizes, `--radius-*` for border radius
6. Add responsive behavior using container queries (preferred) or media queries
7. Import and use existing primitives (`Button`, `Input`, `Card`) rather than reimplementing

### Changing Page Layout
1. Edit the page file at `src/app/[route]/page.tsx`
2. Use CSS Modules (`page.module.css`) for page-specific styles
3. Reuse existing section components (e.g., `Hero`) and primitives
4. If a new section is needed, create it in `src/components/sections/`

### Adding a New Page
1. Create `src/app/[route]/page.tsx` following the App Router conventions
2. Create `src/app/[route]/page.module.css` for page-specific styles
3. Import and compose from existing layout and section components
4. Add route to navigation in `src/components/header/NavBar.tsx`
5. Use `--container-max-width` for content width and `var(--space-8)` for page padding

### Dark Mode
- **Current state:** Minimal — only `--background` and `--foreground` swap via `@media (prefers-color-scheme: dark)` in `variables.css:170`
- **To add dark mode to a new component:** Add a `.dark` class or `@media (prefers-color-scheme: dark)` block that overrides the component's token references. The design system lacks a structured dark mode approach.
- ⚠️ **Gap:** Component backgrounds, card surfaces, borders do not have dark variants.

---

## 11. Known Issues & Tech Debt

| # | Issue | File(s) | Description |
|---|---|---|---|
| 1 | Dual color scales | `variables.css` | `--gray-*` and `--neutral-*` are nearly identical — both used inconsistently across codebase. Migrate to one scale. |
| 2 | Undefined token `--text-7xl` | `src/app/page.module.css:98` | Referenced for hero title on desktop but never defined in variables. Falls through to browser default. |
| 3 | Hardcoded values in login page | `src/app/auth/login/page.module.css` | Raw px/rem values throughout (gaps, padding, font sizes) instead of CSS variable tokens. |
| 4 | Hardcoded skill tag colors | `src/app/editor/[id]/page.module.css:528-529` | `background-color: #b0c1da`, `color: #223550` — should use design tokens. |
| 5 | No breakpoint token system | Multiple files | Breakpoints hardcoded as `640px`, `768px`, `800px`, `900px`, `720px` — no centralized variables. |
| 6 | Incomplete dark mode | `variables.css` | Only `--background`/`--foreground` swap; no component-level dark tokens. |
| 7 | Hardcoded login gradient | `src/app/auth/login/page.module.css:28-34` | `linear-gradient(145deg, #0d1f12, #132b1a, ...)` should use CSS variable tokens. |
| 8 | Hardcoded color in editor | `src/app/editor/[id]/page.module.css:1212` | `.completed` has `background-color: #5B21B6` before gradient — should be `--ai-accent-800`. |
| 9 | `--background` vs `--background-color` | `variables.css:108` vs `variables.css:165` | One-character naming difference is error-prone. `--background-color` is set to `var(--neutral-200)` while `--background` is `#fdfdfd`. |
| 10 | Inline style for editor overflow | `src/components/page-body/PageBody.tsx:13` | `style={isEditor ? {overflow: "clip"} : {}}` — should use a CSS class switch instead. |
| 11 | Missing `.openTab` style | `src/components/header/header.module.css` | `NavBar.tsx:27` references `styles.openTab` but no `.openTab` class is defined in `header.module.css` — only `.closeTab` exists. |
| 12 | `--gnetrual-100` typo | `src/app/editor/[id]/page.module.css:156` | `color: var(--gnetrual-100)` — should be `var(--neutral-100)`. |
| 13 | Duplicate `.hideScrollbar` | `src/app/globals.css:38-45, 52-58` | Class is defined twice in the same file. |
| 14 | Auth page hardcoded focus font-size | `src/app/auth/login/page.module.css:418` | `font-size: 16px` on input focus — prevents iOS zoom but should be a class-based toggle. |
| 15 | Resume template preview styles in editor CSS | `src/app/editor/[id]/page.module.css:639-923` | Classic/Minimal/Creative preview styles are co-located in the editor page CSS — should be in a separate module. |

---

## 12. Design Principles

- **Sage-green identity** — The primary palette is built around an earthy sage green (`#84B179`), conveying calm, professional, and environmentally-conscious brand values. All interactive states derive from this scale.

- **AI accent as a visual differentiator** — Indigo/violet gradients (the `--ai-accent-*` scale) are reserved exclusively for AI-powered features (content generation, shimmer buttons). This creates a clear visual language: green = core app, violet = AI capability.

- **Typography-led hierarchy** — Five distinct font roles (display/Lora, body/Jakarta Sans, UI/Geist, mono/Geist Mono, logo/Limelight) create a rich typographic system where hierarchy is communicated primarily through typeface, weight, and tracking rather than decorative elements.

- **Cards and gentle shadows** — The UI consistently uses rounded cards (`--radius-xl` / `--radius-lg`) with subtle box shadows for content grouping. Shadows escalate from `--shadow-sm` (resting) to `--shadow-md`/`--shadow-lg` (hovered), providing depth cues without visual noise.

- **Live preview as a first-class experience** — The editor is built around a real-time iframe preview that mirrors the final PDF output. This "what you see is what you get" philosophy drives the entire editing workflow and export pipeline.
