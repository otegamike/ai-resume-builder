---
name: pro-template-generator
description: >
  Use this skill whenever generating a new pro-tier or when the user asks for a pro skill or mentions 'pro' or 'ATS'. ATS resume template for Agentic CV.
  Triggers include: "create a pro template", "add an ATS template", "design a pro CV template",
  "build ats-templateN", or any request to produce a pro/ATS template pair (.html + .tsx).
  This skill covers the dual-file architecture, React-PDF export components, system-font-only
  typography, single-column ATS layout, accessible color palette with contrast rules, and catalog registration
  with tier: "pro" and kind: "html". Always read this skill together with
  agentic-cv-template-generator before writing any code.
---

# Agentic CV Pro Template Generator Skill

This skill is a companion to **agentic-cv-template-generator**.  
You MUST read that skill first — it covers shared rules that also apply to pro templates:

- Section 2: Fixed Page Geometry (CV_WIDTH 794, CV_HEIGHT 1123)
- Section 4: Renderer Token Syntax (`{{...}}`, `{{#array}}`, `{{?field}}`)
- Section 5: Complete Data Shape Reference
- Section 3 (JS only): Mandatory scaling/pagination script (copy verbatim)
- Section 9: ATS Optimization Rules (text elements, reading order, alt attributes)
- Section 10: Break-avoidance patterns (`.block`, `.block__parent`, page indicator CSS)

This skill defines **only what is different or additional** for pro-tier ATS templates.

---

## 1. What a Pro Template Is

A pro template is **two coordinated files**:

1. `src/templates_formatted/ats-<name>.html` — HTML preview (same Mustache rendering pipeline as free templates)
2. `src/templates_pdf/ats-<name>.tsx` — React-PDF component for high-fidelity PDF export

Both files must match visually (same spacing, sizing, color palette). The React-PDF component
consumes the `AtsResumeView` interface (see `src/lib/atsResumeMapper.ts`) rather than the
renderer token syntax.

---

## 2. Mandatory HTML Shell (Pro Version)

Same as Section 3 in `agentic-cv-template-generator`, with these differences:

- **Omit the Google Fonts `<link>` tag entirely**
- Use `font-family: Arial, Helvetica, sans-serif;` on the `body` element
- The `body` style is simply `body { margin: 0; background: transparent; font-family: Arial, Helvetica, sans-serif; }`

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-size: 20px; overflow: hidden; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
  body { margin: 0; background: transparent; font-family: Arial, Helvetica, sans-serif; }
  /* ... rest identical to Section 3 shell ... */
</style>
</head>
```

The JS scaling/pagination script is copied verbatim from the free skill's Section 3.
`document.fonts.ready.then(scaleCv)` must still be present (it fires immediately since
no Google Fonts are loaded).

---

## 3. Layout Pattern — ATS Single-Column

Use this single pattern. Do **not** use Patterns A–D from the free template skill.

```css
.cv { display: flex; flex-direction: column; padding: 48px 56px; }
```

Rules:

- **Single column only** — no sidebar, no grid, no multi-column layout
- **No decorative elements** — no SVG polygons, no clip-path shapes, no images, no icons
- **No background colors in content area** — pure white `#fff` background only (exception: dark-themed templates may use a dark background; text must maintain WCAG AA contrast 4.5:1 body, 3:1 large text)
- **No photo/avatar** — omit the `{{?personalInfo.photo}}` block entirely
- **Contact info** rendered as a single centered text line with `|` separators (no icon SVGs)
- **Section dividers** use `<hr class="divider">` or equivalent horizontal rule
- **Section labels** use simple bottom-border underline (no inline rules, no double rules)
- **All text must be real HTML** — no text inside SVG or pseudo-elements
- **Color palette** uses hardcoded values with WCAG AA contrast minimums (see Section 5)
- **No CSS custom properties** — use hardcoded color values

---

## 4. Typography — System Fonts Only

Pro-tier ATS templates must **not** use Google Fonts. Use the system font stack:

- **HTML:** `font-family: Arial, Helvetica, sans-serif;`
- **React-PDF:** `fontFamily: "Helvetica"`

No display/body font pairing. A single system font is used for all text.

### Type Scale (HTML, base 20px = 1rem)

```
Candidate name:     1.8rem, font-weight 700
Job title:          0.78rem, letter-spacing 3px, uppercase, color #555
Section headers:    0.72rem, letter-spacing 3px, uppercase, font-weight 700
Entry titles:       0.80rem – 0.82rem, font-weight 600–700
Entry subtitles:    0.74rem – 0.76rem, color #444–#555
Body / descriptions:0.72rem – 0.74rem, line-height 1.6–1.7
Contact items:      0.72rem – 0.74rem
```

Never go below `0.68rem` (HTML) or `9pt` (React-PDF).

---

## 5. Color Palette Rules

ATS templates use hardcoded color values. Accent colors are permitted provided they maintain WCAG AA contrast on the white `#fff` page background (4.5:1 minimum for body-size text, 3:1 for large text ≥24px / 19px bold).

### Core palette (required — same for all pro templates)

| Role     | Color  | Usage                                  |
|----------|--------|----------------------------------------|
| headings | #1a1a1a| Name, entry titles                     |
| body     | #2a2a2a| Summary text, descriptions             |
| muted-1  | #333   | Contact line text                      |
| muted-2  | #444   | Company names (experience)             |
| muted-3  | #555   | Job titles, education details          |
| muted-4  | #666   | Dates                                  |
| border-1 | #ccc   | Horizontal dividers between sections   |

### Accent palette (choose per template)

An accent color may be used for **section labels**, **bullet/dash markers**, **contact separators**, and **section label bottom borders**. Pair with a matching light tint for border use.

| Role            | Rule                                               |
|-----------------|----------------------------------------------------|
| accent          | Minimum 3:1 contrast on white (WCAG AA large text) |
| accent-tint     | Lightened version of accent for borders (~1.5:1 on white) |
| accent on gray  | Never use accent as background — pure `#fff` only  |

### Example accent combinations

| Template identity | Accent        | Accent tint (border) |
|-------------------|---------------|----------------------|
| Steel blue        | `#2c5f8a`     | `#c8d6e5`            |
| Dark teal         | `#4a7a7a`     | `#d0e0e0`            |
| Navy              | `#1a3a5c`     | `#c8d4e0`            |
| Warm gray         | `#6a6a6a`     | `#d4d4d4`            |
| Charcoal          | `#3a3a3a`     | `#cccccc`            |

### Hardcoding rules

- All values are hardcoded. Do not use CSS custom properties or `color-mix()`.
- Do not use `rgba()` or opacity for color adjustments — use explicit hex values.
- No more than 2 colors from the palette should appear on a single element (accent + one neutral at most).

---

## 6. React-PDF Component Rules

Each pro (ATS) template needs a React-PDF component at `src/templates_pdf/ats-<name>.tsx`
that mirrors the HTML preview for high-fidelity PDF export.

### Imports

```tsx
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { AtsResumeView } from "@/lib/atsResumeMapper";
```

Only these imports are allowed. Do not import images, icons, or external assets.

### StyleSheet Rules

- Use `StyleSheet.create({...})` for all styles
- `page` style: `{ padding: 48, fontFamily: "Helvetica", fontSize: 10, color: "#1a1a1a", lineHeight: 1.4 }`
- Sizing convention: 1rem in HTML ≈ 12.5pt in React-PDF (e.g., 0.72rem HTML = 9pt PDF, 0.82rem = 11pt)
- Use matching color values between HTML and React-PDF (see Section 5 palette)
- No `letterSpacing` values above 3 (React-PDF renders wide letter-spacing poorly)
- All style values are plain numbers/strings — no dynamic computed values

### Component Structure

```tsx
interface AtsNamePdfProps {
  data: AtsResumeView;
}

function AtsNamePdf({ data }: AtsNamePdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* content using data.name, data.jobTitle, etc. */}
      </Page>
    </Document>
  );
}

export default AtsNamePdf;
```

### Visual Matching

The React-PDF component must visually match the HTML preview:

| Aspect              | HTML                          | React-PDF                        |
|---------------------|-------------------------------|----------------------------------|
| Font family         | `Arial, Helvetica, sans-serif`| `"Helvetica"`                    |
| Base font size      | 20px html, 0.72rem body       | `fontSize: 10`                   |
| Name font size      | 1.8rem (36px)                 | `fontSize: 22`                   |
| Job title size      | 0.78rem                       | `fontSize: 10` + `letterSpacing: 3` |
| Section label size  | 0.72rem                       | `fontSize: 9`                    |
| Body line-height    | 1.6–1.7                       | `lineHeight: 1.5–1.6`            |
| Padding             | 48px 56px                     | `padding: 48`                    |
| Divider             | `<hr>` with border-top        | `<View>` with `borderBottomWidth`|
| Colors              | Hardcoded gray values         | Same hardcoded values            |

### Prohibited Elements

- No `<Image>` or `<img>` tags — ATS templates don't include photos
- No `<Link>` or anchor elements
- No custom fonts or `@font-face` — use system `"Helvetica"` only
- No SVG, no icons, no decorative shapes
- No conditional hooks or React state — the component is pure render
- No `wrap={false}` on long text blocks (causes rendering artifacts)

### Conditionals

Use conditional rendering with `.length > 0` for arrays and truthy checks for strings:

```tsx
{data.experience.length > 0 ? (
  <>
    <View style={styles.divider} />
    <Text style={styles.sectionLabel}>Experience</Text>
    ...
  </>
) : null}
```

---

## 7. Catalog Registration

After generating the template pair, register in the catalog:

### Files to create

1. `src/templates_formatted/ats-<name>.html` — HTML preview
2. `src/templates_pdf/ats-<name>.tsx` — React-PDF export component (see Section 6)

### React-PDF registry (`src/templates_pdf/index.ts`)

```typescript
import YourComponent from "./ats-<name>";

export const atsTemplateComponents: Record<string, FC<{ data: AtsResumeView }>> = {
  "ats-classic": AtsClassicPdf,
  "ats-<name>": YourComponent,
};
```

### Catalog entry (`src/lib/templateCatalog.ts`)

```typescript
{
  id: 'ats-<name>',
  name: 'Your ATS Name',            // e.g. 'ATS Modern', 'ATS Compact'
  description: 'One line description',
  html: '',
  kind: 'html',                     // always 'html' — the preview is HTML-based
  tier: 'pro',
  page: { widthPx: 794, heightPx: 1123, aspectRatio: 794 / 1123 }
}
```

### Verification

- Check at `/templates`, `/editor/new?template=ats-<name>`, and `/dashboard`
- Test PDF export from the editor — the React-PDF component renders the PDF

---

## 8. Quality Checklist

Run through every item before producing the final output.

**Files**
- [ ] HTML preview saved to `src/templates_formatted/ats-<name>.html`
- [ ] React-PDF component saved to `src/templates_pdf/ats-<name>.tsx`
- [ ] React-PDF component registered in `src/templates_pdf/index.ts`
- [ ] Catalog entry has `tier: "pro"` and `kind: "html"`

**Typography**
- [ ] No Google Fonts import in HTML or React-PDF
- [ ] HTML uses `font-family: Arial, Helvetica, sans-serif`
- [ ] React-PDF uses `fontFamily: "Helvetica"`
- [ ] No font size below `0.68rem` (HTML) or `9pt` (React-PDF)

**Layout**
- [ ] Single-column layout only
- [ ] No decorative elements (SVG, clip-path, images, icons)
- [ ] `.cv` has `padding: 48px 56px`
- [ ] Contact info uses text-only centered line with `|` separators (no icon SVGs)
- [ ] No photo block in template

**Colors**
- [ ] Accent colors (if used) maintain WCAG AA contrast (4.5:1 body, 3:1 large text) on white `#fff`
- [ ] No CSS custom properties — hardcoded values only
- [ ] No `color-mix()` or `rgba()` in CSS
- [ ] No more than 2 palette colors per element (accent + one neutral gray maximum)

**Visual matching**
- [ ] HTML and React-PDF versions match visually (same colors, spacing, sizing)
- [ ] Font sizes follow the 1rem ≈ 12.5pt convention
- [ ] Same padding and margins in both versions

---

## 9. Reference Implementation

See `src/templates_formatted/ats-classic.html` and `src/templates_pdf/ats-classic.tsx`
for the canonical pro template reference. These files demonstrate:

- No Google Fonts, system font stack
- Single-column layout with 48px 56px padding
- Text-only centered contact line with `|` separators
- Gray-only color palette with hardcoded values
- Matching React-PDF component with `"Helvetica"` font
- `AtsResumeView` data consumption pattern
