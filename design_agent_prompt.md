# Agent Prompt: Generate design.md from Codebase

## Your Task

You are a senior frontend engineer and design systems specialist. Your job is to thoroughly audit this repository and produce a single `design.md` file that serves as the definitive design reference for this project — covering the current state of the design system and a clear guide for how to make design changes.

This file will be used by future agents and developers as the first thing they read before touching any UI code.

---

## Step 1: Explore the Repository Structure

Before reading any files, map out the full project structure. Run:

```bash
find . -type f | grep -v node_modules | grep -v .git | grep -v .next | grep -v dist | sort
```

Identify and note:
- The framework in use (Next.js, React, Vue, etc.)
- Whether TypeScript is used
- The styling approach (Tailwind, CSS Modules, styled-components, plain CSS, etc.)
- Where global styles live
- Where components live
- Whether there is a dedicated `styles/`, `theme/`, `tokens/`, or `design-system/` folder
- The presence of any config files: `tailwind.config.*`, `theme.ts`, `tokens.ts`, `globals.css`, etc.

---

## Step 2: Read Every Style-Related File

Read the full contents of every file that contributes to visual styling. This includes but is not limited to:

- `tailwind.config.js` / `tailwind.config.ts` — custom theme extensions, colors, fonts, spacing, breakpoints
- `globals.css` / `global.css` / `app/globals.css` — CSS variables, base resets, font imports
- Any `theme.ts`, `tokens.ts`, or `constants/design.ts` — design token definitions
- Any `*.module.css` files that define reusable patterns
- `_variables.scss` or similar if using Sass
- `postcss.config.js` — to understand CSS pipeline

For each file, extract:
- All **color values** (hex, HSL, CSS variables)
- All **typography** settings (font families, sizes, weights, line heights)
- All **spacing** values (padding, margin, gap scales)
- All **border radius** values
- All **shadow** definitions
- All **breakpoint** definitions
- All **animation/transition** definitions
- Any **z-index** scale

---

## Step 3: Audit the Component Library

Read every file in the `components/` directory (and `ui/`, `shared/`, `common/` if they exist). For each component:

- Note the component name and its file path
- Identify what **variants** or **props** control its appearance
- Note which design tokens / Tailwind classes / CSS variables it uses
- Flag any **hardcoded** color or spacing values (not using tokens/variables) — these are tech debt
- Note if the component has responsive behavior
- Note if it has animation or transition behavior

Categorize components into:
- **Primitives** — Button, Input, Badge, Icon, Avatar, etc.
- **Layout** — Navbar, Footer, Container, Grid, Section, etc.
- **Composite** — Cards, Modals, Forms, Feature blocks, etc.
- **Page-level** — Hero, CTA banners, Feature sections, etc.

---

## Step 4: Audit the Pages

Read every file in `app/` or `pages/` to understand page structure. For each page:

- What is the route?
- Which components does it compose?
- Does it have any page-specific styles or overrides?
- Are there any inline styles that should be refactored into components or tokens?

Pay special attention to the **homepage** (`app/page.tsx` or `pages/index.tsx`) — read it fully and note the exact section structure, component usage, and layout approach.

---

## Step 5: Identify the Font Setup

Check:
- `next/font` imports in `layout.tsx` or `_app.tsx`
- `@import` or `<link>` tags for Google Fonts or Fontshare
- Any local font files in `public/fonts/`
- How CSS variables for fonts are named and applied (e.g. `var(--font-heading)`)

Document:
- The display/heading font and where it's applied
- The body/UI font and where it's applied
- Any monospace or accent font
- Font weight usage patterns

---

## Step 6: Identify Design Patterns and Conventions

Look across components and pages to extract implicit conventions:

- What is the **base spacing unit**? (e.g. 4px, 8px — infer from Tailwind scale or CSS vars)
- What **border radius** style is used? (sharp, rounded, pill — and which radius value is most common)
- Are **gradients** used? Document all gradient definitions
- Is there a **dark mode**? If so, how is it implemented (class toggle, prefers-color-scheme, CSS vars)?
- What is the **max content width**? (look for `max-w-*` or `max-width` in layout components)
- What is the **section padding pattern**? (vertical rhythm used between page sections)
- How are **interactive states** handled? (hover, focus, active — look for consistent patterns)
- Are there **animation primitives**? (fade, slide, scale — check for shared animation classes or motion config)

---

## Step 7: Flag Issues and Inconsistencies

While auditing, flag:

1. **Hardcoded values** — colors, spacing, or font sizes not using tokens or Tailwind config
2. **Duplicated patterns** — similar UI repeated across pages instead of being a reusable component
3. **Inconsistent naming** — CSS variable names or class names that don't follow a clear convention
4. **Missing responsive behavior** — components that lack mobile breakpoints
5. **Accessibility gaps** — missing focus styles, low contrast combinations, or unlabeled interactive elements

List each issue with the file path and a short description.

---

## Step 8: Write the design.md File

Using everything you've gathered, write a comprehensive `design.md` file at the **root of the project**. Structure it exactly as follows:

---

```markdown
# Design System — [Project Name]

> Single source of truth for all visual and design decisions in this project.
> Read this before making any UI changes.

---

## 1. Tech Stack & Styling Approach

- Framework: ...
- Styling method: ...
- Design token location: ...
- Component library location: ...

---

## 2. Color System

### CSS Variables / Tokens
List every color token, its variable name, its value, and its intended use.

| Token | Value | Usage |
|---|---|---|
| `--color-background` | `#0A0A0B` | Page background |
| `--color-primary` | `#C8F04D` | CTAs, highlights |
| ... | ... | ... |

### Tailwind Color Extensions (if applicable)
List any custom colors added to tailwind.config.

### Color Usage Rules
- Background: ...
- Text: ...
- Borders: ...
- Interactive elements: ...
- Semantic colors (success, error, warning): ...

---

## 3. Typography

### Font Families
| Role | Font | Variable | Weights Used |
|---|---|---|---|
| Display/Heading | ... | `--font-heading` | 600, 700 |
| Body | ... | `--font-body` | 400, 500 |
| Mono | ... | `--font-mono` | 400 |

### Type Scale
Document heading sizes (h1–h4), body sizes, label/caption sizes with their Tailwind classes or CSS values.

### Typography Rules
- Heading hierarchy: ...
- Max line length: ...
- Line height conventions: ...

---

## 4. Spacing System

- Base unit: ...
- Scale: (reference Tailwind default or custom scale)
- Section vertical padding: ...
- Container max-width: ...
- Internal component padding patterns: ...

---

## 5. Border & Shape

- Border radius scale: ...
- Most common border radius: ...
- Border color and width conventions: ...
- Shadow definitions: ...

---

## 6. Breakpoints

| Name | Value | Usage |
|---|---|---|
| `sm` | 640px | ... |
| `md` | 768px | ... |
| `lg` | 1024px | ... |
| `xl` | 1280px | ... |

---

## 7. Animation & Motion

- Transition duration standard: ...
- Easing standard: ...
- Named animations: list any custom keyframes
- Libraries used (Framer Motion, CSS-only, etc.): ...
- Rules: when to animate, when not to

---

## 8. Component Reference

### Primitives
For each primitive component:
**`Button`** — `components/ui/Button.tsx`
- Props: `variant` (primary | secondary | ghost), `size` (sm | md | lg)
- Styling: ...
- Usage: ...

(Repeat for each component)

### Layout Components
...

### Page Sections
...

---

## 9. Page Structure Reference

### Homepage (`/`)
Section-by-section breakdown of what renders and which components are used.

### (Other key pages)
...

---

## 10. How to Make Design Changes

### Changing Colors
1. Update the token in `[file path]`
2. If using Tailwind, update `tailwind.config.ts` under `theme.extend.colors`
3. Do not hardcode color values in components — always reference tokens

### Changing Fonts
1. Update the font import in `[layout file]`
2. Update the CSS variable in `globals.css`
3. The variable will cascade automatically — no component changes needed unless you are adding a new font role

### Adding a New Component
1. Create the file in `components/[category]/ComponentName.tsx`
2. Use only tokens from the design system — no hardcoded values
3. Add responsive variants for at least `mobile` and `desktop`
4. Document props and variants below in this file

### Changing Page Layout
1. Edit the page file at `app/[route]/page.tsx`
2. Reuse existing section components where possible
3. If a new section is needed, create it in `components/sections/`

### Adding a New Page
1. Create `app/[route]/page.tsx`
2. Import and compose from existing layout and section components
3. Add route to the navigation in `components/layout/Navbar.tsx`

### Dark Mode (if applicable)
- How it works: ...
- How to add dark mode styles to a new component: ...

---

## 11. Known Issues & Tech Debt

List all flagged issues from Step 7 here with file paths.

| Issue | File | Description |
|---|---|---|
| Hardcoded color | `components/Hero.tsx:42` | `#3B82F6` should use `var(--color-accent)` |
| ... | ... | ... |

---

## 12. Design Principles

Based on the current design, summarise the 3–5 core visual principles that should guide all future design decisions.

Example:
- **Precision over decoration** — every element earns its place
- **Dark and confident** — the palette communicates authority
- **Type-led hierarchy** — layout is built around typographic rhythm

```

---

## Output Requirements

- Write the file to `design.md` at the project root
- Be specific — use actual file paths, actual token names, actual Tailwind class names from this repo
- Do not invent or assume values — only document what you find in the code
- Where something is missing (e.g. no font documented, no tokens defined), flag it explicitly as `⚠️ Not defined — recommend adding`
- The final file should be detailed enough that a developer with no prior knowledge of this project can make a confident UI change after reading it

---

## Final Check

Before finishing, re-read the completed `design.md` and verify:

- [ ] Every color token used in the codebase is documented
- [ ] Every font in use is documented  
- [ ] Every reusable component is listed
- [ ] The "How to Make Design Changes" section gives clear, actionable steps specific to this repo
- [ ] All flagged issues from Step 7 are listed in Section 11
- [ ] No values are invented — everything maps to actual code in the repo
