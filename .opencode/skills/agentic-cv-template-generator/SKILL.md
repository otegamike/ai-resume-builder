---
name: agentic-cv-template-generator
description: >
  Use this skill whenever generating a new HTML resume template for Agentic CV.
  Triggers include: "create a new template", "add a resume template", "design a CV template",
  "build templateN", or any request to produce a .html file that fits the Agentic CV template pipeline.
  This skill covers layout architecture, the custom Mustache-like rendering syntax, mandatory
  JavaScript scaling/pagination boilerplate, ATS compliance rules, typography, color, and
  visual-balance guidelines. Always read this skill before writing a single line of template HTML.
---

# Agentic CV Template Generator Skill

You are generating a professional, ATS-optimized, visually polished HTML resume template
for the **Agentic CV** resume builder. Read every section of this skill before writing code.
Skipping any section produces broken templates.

---

## 1. What a Template Is

A template is one of two types:

**Free templates** — a single self-contained HTML file stored at:

```
src/templates_formatted/templateN.html
```

It is loaded by `templateServer.ts`, rendered by `templateRenderer.ts` (custom Mustache-like
engine), and injected into an iframe via `srcDoc`. The iframe has no parent CSS; the template
is fully responsible for its own styling and scaling.

**Pro (ATS) templates** — two coordinated files:

1. `src/templates_formatted/ats-<name>.html` — HTML preview (same rendering pipeline as free templates)
2. `src/templates_pdf/ats-<name>.tsx` — React-PDF component for high-fidelity PDF export

Both files must match visually (same spacing, sizing, color palette). The React-PDF component
consumes the `AtsResumeView` interface (see `src/lib/atsResumeMapper.ts`) rather than the
renderer token syntax.

---

## 2. Fixed Page Geometry — NEVER Change These

```
CV_WIDTH  = 794   (px, A4 at 96 dpi)
CV_HEIGHT = 1123  (px, A4 at 96 dpi)
```

The `.cv` element must always start as `width: 794px; height: 1123px`.
The JS scaling function shrinks or grows it to fit any viewport.
Do **not** use `vw`, `vh`, `%`, or `rem` on the `.cv` element itself.

---

## 3. Mandatory HTML Shell

Every template must open and close with this exact shell.
Replace only the content between the `<!-- DESIGN STARTS HERE -->` comments.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<!-- Google Fonts import goes here (free templates) — omit for pro/ATS templates -->
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-size: 20px; overflow: hidden; }
  body { margin: 0; background: transparent; font-family: 'YourFont', sans-serif; }

  .cv-viewport {
    width: 100%;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .cv-scaler {
    display: flex;
    flex-direction: column;
    align-items: center;
    transform-origin: top center;
    will-change: transform;
  }

  .cv {
    width: 794px;
    height: 1123px;
    background: #fff;
    border: 1px solid rgb(216, 216, 216);
    overflow: hidden;
    /* your layout properties: display:grid, flex, etc. */
  }

  .page-indicator::before {
    content: '';
    position: absolute;
    top: -10px;
    left: 0;
    width: 100%;
    height: 15px;
    background: #fff;
    border-top: 1px solid rgb(216, 216, 216);
    border-bottom: 1px solid rgb(216, 216, 216);
    z-index: -1;
  }

  /* === YOUR DESIGN CSS HERE === */

</style>
</head>
<body>
<div class="cv-viewport">
  <div class="cv-scaler">
    <div class="cv">

      <!-- DESIGN STARTS HERE -->
      <!-- ... template HTML ... -->
      <!-- DESIGN ENDS HERE -->

    </div>
  </div>
</div>

<!-- MANDATORY SCALING + PAGINATION SCRIPT — copy verbatim, change nothing -->
<script>
  const CV_WIDTH  = 794;
  const CV_HEIGHT = 1123;
  const MULTIPAGE = "{{multipage}}";
  const isMultipage = MULTIPAGE === "true";

  const scaler = document.querySelector('.cv-scaler');

  function createPageIndicators(cvElement, cvHeight, pages) {
    document.querySelectorAll('.page-indicator').forEach(el => el.remove());
    for (let i = 1; i < pages; i++) {
      const indicator = document.createElement('div');
      indicator.className = 'page-indicator';
      indicator.style.position = 'absolute';
      indicator.style.top = (i * cvHeight) + 'px';
      indicator.style.left = '0';
      indicator.style.width = '100%';
      indicator.style.borderTop = '2px dashed rgba(255, 0, 0, 0.6)';
      indicator.style.zIndex = '9999';
      cvElement.appendChild(indicator);
    }
  }

  function handleBreakAvoidElements(cvElement, cvHeight, avoidSelector) {
    const avoids = Array.from(cvElement.querySelectorAll(avoidSelector));
    let maxIter = 20;
    while (maxIter-- > 0) {
      let shifted = false;
      const height = cvElement.scrollHeight;
      const pages = Math.ceil(height / cvHeight);
      for (let p = 1; p < pages; p++) {
        const boundary = p * cvHeight;
        for (const el of avoids) {
          let groupTop = el.offsetTop;
          let groupBottom = groupTop + el.offsetHeight;
          let target = el;
          let isGroupShift = false;

          const parent = el.closest('.block__parent');
          if (parent) {
            const firstBlockChild = parent.querySelector(avoidSelector);
            if (firstBlockChild === el) {
              const firstChild = parent.firstElementChild;
              if (firstChild) {
                groupTop = firstChild.offsetTop;
                target = firstChild;
                isGroupShift = true;
              }
            }
          }

          if (groupTop < boundary && groupBottom > boundary) {
            const pushDown = boundary - groupTop;
            const currentMT = parseFloat(target.style.marginTop) || 0;
            target.style.marginTop = (currentMT + pushDown + 15) + 'px';

            if (isGroupShift) {
              target.style.paddingTop = '0.4rem';
            }

            shifted = true;
            break;
          }
        }
        if (shifted) break;
      }
      if (!shifted) break;
    }
  }

  function scaleCv() {
    const available = document.documentElement.clientWidth;
    const scale = available / CV_WIDTH;
    scaler.style.transform = `scale(${scale})`;

    const cvElement = document.querySelector('.cv');
    cvElement.style.height = 'auto';
    cvElement.style.minHeight = '0px';

    const avoidSelector = '.block';
    handleBreakAvoidElements(cvElement, CV_HEIGHT, avoidSelector);

    const contentHeight = cvElement.scrollHeight;
    const pages = isMultipage ? Math.max(1, Math.ceil(contentHeight / CV_HEIGHT)) : 1;
    const newHeight = pages * CV_HEIGHT;

    cvElement.style.height = newHeight + 'px';
    cvElement.style.minHeight = newHeight + 'px';
    cvElement.style.position = 'relative';

    const scaledHeight = newHeight * scale;
    scaler.style.marginBottom = (scaledHeight - newHeight) + 'px';

    createPageIndicators(cvElement, CV_HEIGHT, pages);

    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.parent.postMessage({ type: 'RESIZE_IFRAME', pages: pages }, '*');
      });
    });
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(scaleCv, 60);
  });

  document.fonts.ready.then(scaleCv);
</script>
</body>
</html>
```

> **Pro/ATS templates:** Omit the Google Fonts `<link>` tag entirely. Use `font-family: Arial, Helvetica, sans-serif;` on the `body` element. See Section 7 for pro typography rules.

**Critical JS rules:**
- Copy the script block **verbatim**. Do not rename functions, change constants, or remove the
  `postMessage` call — the parent app depends on it.
- `{{multipage}}` is a renderer token; leave it exactly as written inside the string literal.
- The `avoidSelector` string is simply `'.block'`. Add the `block` class to any HTML
  element that should never be split across pages.
- For sections with a section label + repeating items (Experience, Education, Projects, Skills with categories), use `class="block__parent"` on the outer wrapper and `class="block"` on each inner repeating item. The JS detects the first `.block` child inside a `block__parent` and shifts the entire group (label + first item) together.
- `document.fonts.ready.then(scaleCv)` must be the final trigger — Google Fonts load async.

---

## 4. Renderer Token Syntax

The renderer (`templateRenderer.ts`) uses a **custom Mustache-like** syntax.
Use **only** these constructs. Do not use real Mustache or Handlebars syntax.

### 4a. Variable interpolation
```html
{{personalInfo.name}}

{{personalInfo.fullname}}
fullname is an object that breaks the name into first and other names, provided for templates that prefer that wording. Both fields
{{personalInfo.fullname.firstName}}
{{personalInfo.fullname.otherNames}}

{{personalInfo.jobTitle}}
{{personalInfo.email}}
{{personalInfo.phone}}
{{personalInfo.location}}
{{personalInfo.website}}
{{personalInfo.photo}}
{{summary}}
```

### 4b. Array iteration
```html
{{#experience}}
  <div>{{company}} — {{role}}</div>
  <div>{{startDate}} – {{endDate}}</div>
  {{#description}}<p>{{.}}</p>{{/description}}
{{/experience}}

{{#education}}
  <div>{{degree}}, {{school}}</div>
  <div>{{startDate}} – {{endDate}}</div>
{{/education}}

{{#skills}}<li>{{.}}</li>{{/skills}}
{{#languages}}<div>{{.}}</div>{{/languages}}
{{#references}}
  {{name}}, {{company}}, {{phone}}, {{email}}
{{/references}}

{{#skillCategories}}
  <div>{{category}}</div>
  {{#skills}}<span>{{.}}</span>{{/skills}}
{{/skillCategories}}

{{#projects}}
  <div>{{name}}</div>
  {{#description}}<p>{{.}}</p>{{/description}}
{{/projects}}
```

### 4c. Conditional blocks (render only if truthy / non-empty)
```html
{{?personalInfo.photo}}
  <img src="{{personalInfo.photo}}" alt="Profile photo"/>
{{/personalInfo.photo}}

{{?summary}}<p>{{summary}}</p>{{/summary}}
{{?skills}}...{{/skills}}
{{?experience}}...{{/experience}}
{{?education}}...{{/education}}
{{?languages}}...{{/languages}}
{{?references}}...{{/references}}
{{?skillCategories}}...{{/skillCategories}}
{{?projects}}...{{/projects}}
```

### 4d. Current-context shorthand (inside array loops)
```html
{{.}}   <!-- renders the current scalar item, e.g. inside {{#skills}} -->
```

### 4e. Special multipage token
```html
"{{multipage}}"  <!-- used ONLY inside the JS script as shown in Section 3 -->
```

**Never invent new tokens.** If a field doesn't exist in the data shape, don't reference it.

---

## 5. Complete Data Shape Reference

```
personalInfo
  .name          string
  .jobTitle      string
  .email         string
  .phone         string
  .location      string
  .website       string (optional)
  .photo         string URL (optional)

summary          string

experience[]
  .id            string
  .company       string
  .role          string
  .startDate     string
  .endDate       string
  .description   string[]   ← iterate with {{#description}}{{.}}{{/description}}

education[]
  .id            string
  .school        string
  .degree        string
  .startDate     string
  .endDate       string

skills[]         string[]   ← iterate with {{#skills}}{{.}}{{/skills}}
skillCategories[]
  .id            string
  .category      string
  .skills        string[]   ← iterate with {{#skills}}{{.}}{{/skills}}
languages[]      string[]
references[]
  .name          string
  .company       string
  .phone         string
  .email         string
projects[]
  .id            string
  .name          string
  .description   string[]   ← iterate with {{#description}}{{.}}{{/description}}
```

Always wrap optional fields (`photo`, `website`, `references`, `languages`, `skillCategories`, `projects`) in `{{?...}}` guards.

---

## 6. Layout Patterns (Use One Per Template)

Pick one of the following proven layout patterns. Do not mix patterns or invent unsupported grid
structures. Each pattern has been validated against the 794×1123 page geometry.

### Pattern A — Two-Column (Sidebar + Main)
```css
.cv { display: grid; grid-template-columns: 220px 1fr; }
/* or 240px, 260px depending on content density */
```
Sidebar holds: photo, contact, skills, languages, (optionally) education.  
Main holds: name/title block, summary, experience, (optionally) education + references.

### Pattern B — Header + Two-Column Body
```css
.cv { display: flex; flex-direction: column; }
.header { /* full-width accent header, min-height 160–220px */ }
.body { display: grid; grid-template-columns: 220px 1fr; flex: 1; }
```
Header holds: name, title, optional summary.  
Left column: contact, skills, languages.  
Right column: education, experience, references.

### Pattern C — Full-Width Single Column (Classic/ATS-first)
```css
.cv { display: flex; flex-direction: column; padding: 48px 56px; }
```
Sections stacked vertically. Strong horizontal rules between sections.
Best for pure ATS parsing — no background colors in main content area.

### Pattern D — Accent-Left Geometric
```css
.cv { display: grid; grid-template-columns: 260px 1fr; position: relative; overflow: hidden; }
/* Use SVG polygon or CSS shapes for decorative left panel */
```
Left panel uses a dark or colored SVG polygon background.
Right panel is white/near-white for clean text rendering.
Photo floats at top-left, overlapping the panel boundary.

### Pattern E — ATS Single-Column (Pro Templates Only)

```css
.cv { display: flex; flex-direction: column; padding: 48px 56px; }
```

Used exclusively for pro-tier ATS templates. Rules:

- **Single column only** — no sidebar, no grid, no multi-column layout
- **No decorative elements** — no SVG polygons, no clip-path shapes, no images, no icons
- **No background colors in content area** — pure white `#fff` background only
- **No photo/avatar** — omit the `{{?personalInfo.photo}}` block entirely
- **Contact info** rendered as a single centered text line with `|` separators (no icon SVGs)
- **Section dividers** use `<hr class="divider">` or equivalent horizontal rule
- **Section labels** use simple bottom-border underline (no inline rules, no double rules)
- **All text must be real HTML** — no text inside SVG or pseudo-elements
- **Color palette** restricted to grays: `#1a1a1a` (headings), `#2a2a2a`/`#333`/`#444`/`#555`/`#666` (body/muted), `#ccc`/`#ddd` (borders)
- **No CSS custom properties** — use hardcoded color values

See `src/templates_formatted/ats-classic.html` for a reference implementation.

---

## 7. Typography Rules

### Font Pairing Strategy
Every template needs exactly **two Google Fonts**: a display font for name/headings and a body
font for all other text. Import both in a single `<link>` tag.

**Approved display fonts** (distinctive, professional):
- `Playfair Display` — editorial, elegant serif
- `Cormorant Garamond` — refined, literary serif
- `Josefin Sans` — geometric, architectural
- `Outfit` — modern geometric, approachable
- `DM Serif Display` — contemporary editorial
- `Fraunces` — optical, expressive serif
- `Syne` — contemporary grotesque with personality
- `Gilda Display` — classic roman with subtle flair

**Approved body fonts** (highly readable at small sizes):
- `Raleway` — elegant, thin weights available
- `Source Sans 3` — neutral, highly legible
- `Barlow` — compact, great for dense layouts
- `Lato` — clean, warm sans-serif
- `Nunito Sans` — rounded, friendly
- `IBM Plex Sans` — technical, precise
- `Mulish` — clean, modern
- `DM Sans` — geometric, pairs with DM Serif

**Never use (free templates)**: Arial, Helvetica, Times New Roman, Comic Sans, Courier, Impact,
or any font not available on Google Fonts. Avoid Inter and Roboto — they produce a generic AI look.
Pro (ATS) templates must use Arial/Helvetica (see below).

### Type Scale (all in rem, base 20px = 1rem)
```
Candidate name:     1.8rem – 2.4rem, font-weight 700–800
Job title:          0.75rem – 0.9rem, letter-spacing 3–5px, uppercase, weight 300–400
Section headers:    0.65rem – 0.85rem, letter-spacing 3–4px, uppercase, weight 600–700
Entry titles:       0.78rem – 0.88rem, weight 600–700
Entry subtitles:    0.72rem – 0.78rem, weight 400, color muted
Body / descriptions:0.70rem – 0.78rem, weight 300–400, line-height 1.6–1.8
Contact items:      0.72rem – 0.78rem
```

Never go below `0.68rem` — text becomes illegible when scaled for A4 export.

### Pro (ATS) Templates — System Fonts Only

Pro-tier ATS templates must **not** use Google Fonts. Use the system font stack:

- **HTML:** `font-family: Arial, Helvetica, sans-serif;`
- **React-PDF:** `fontFamily: "Helvetica"`

No display/body font pairing is needed. A single system font is used for all text.

---

## 8. Color System Rules

### Palette Structure
Every template needs exactly four color roles:

| Role           | Usage                                           |
|----------------|-------------------------------------------------|
| `--accent`     | Header bg, section label color, bullets, icons  |
| `--accent-dark`| Darker shade of accent for contrast/depth       |
| `--surface`    | Sidebar / panel background (near-white or tinted)|
| `--text`       | Body text, entry titles                         |
| `--text-muted` | Dates, subtitles, secondary info                |

Define these as CSS custom properties on `:root` and use them throughout.

### Palette Presets (choose one or create your own in this spirit)
These are starting points — vary them to produce a unique template:

```
Forest:    --accent: #2e6b5e;  --surface: #e2eeea; --text: #1a3330
Copper:    --accent: #b08870;  --surface: #ede8e2; --text: #1a1a1a
Slate:     --accent: #1a2540;  --accent2: #7ec8cc; --surface: #d8dce4
Charcoal:  --accent: #2a2a2a;  --surface: #ebebeb; --text: #1a1a1a
Plum:      --accent: #5c3d6e;  --surface: #ede8f5; --text: #1a0a2a
Rust:      --accent: #9b4a2e;  --surface: #f5ece8; --text: #2a1510
Teal:      --accent: #1d7a8a;  --surface: #e3f3f5; --text: #0a2a30
Navy:      --accent: #1e3a5f;  --surface: #e8edf5; --text: #0a1a30
```

### Color Don'ts
- No more than 2 background colors in the main content area (white + one tint maximum)
- Never use pure `#000000` for text — use `#1a1a1a` or `#2a2a2a`
- Never use bright/neon colors — they destroy ATS scan aesthetics and look unprofessional
- The accent color must contrast white at minimum WCAG AA (4.5:1 for body text)
- Keep the white/near-white right-column background: `#fff`, `#fafafa`, `#f7faf9`, or `#f9f8f6`

---

## 9. ATS Optimization Rules

ATS (Applicant Tracking Systems) parse plain HTML text. Follow these rules so templates
never interfere with machine reading:

### Structure rules
1. **Name must be a plain text element** — never an SVG, image, or canvas.
2. **All section content** (job titles, companies, descriptions, dates, skills) must be
   rendered as real HTML text, not as part of SVG or background images.
3. **Reading order** must match logical resume order: name → title → summary → experience
   → education → skills. Achieved automatically when using standard HTML flow order.
4. **No text in `background-image`** — decorative shapes must use `background-color`,
   CSS `clip-path`, or inline `<svg>` with no text content.
5. **All `<img>` elements** must have a descriptive `alt` attribute.
6. **Description bullet points** (`{{.}}` items from `description[]`) must be real `<p>`
   or `<li>` elements — never rendered as border/pseudo-element tricks.

### Spacing and density
- Minimum padding inside content panels: `16px` on all sides
- Experience description lines: `line-height` minimum `1.6`
- Minimum gap between experience entries: `14px`
- Section header margin-bottom minimum: `10px`

### What ATS-safe SVG looks like (decorative only)
```html
<!-- OK: decorative polygon, no text -->
<svg viewBox="0 0 260 720" preserveAspectRatio="none" style="width:100%;height:100%">
  <polygon points="0,0 260,0 220,720 0,720" fill="#1a2540"/>
</svg>

<!-- NOT OK: text inside SVG -->
<svg><text>Work Experience</text></svg>
```

---

## 10. CSS Patterns and Conventions

### Section labels (two proven patterns)

**Pattern 1 — Colored label with bottom border**
```css
.section-label {
  font-size: 0.68rem;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 700;
  margin-bottom: 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  padding-bottom: 6px;
}
```

**Pattern 2 — Inline rule (horizontal line extends after text)**
```css
.section-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 3.5px;
  text-transform: uppercase;
  color: #1a1a1a;
  white-space: nowrap;
}
.section-label::after {
  content: '';
  flex: 1;
  height: 1.5px;
  background: currentColor;
}
```

**Pattern 3 — Double rule (balanced line, label centered between two rules)**
```css
.section-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 3.5px;
  text-transform: uppercase;
  color: var(--accent);
  white-space: nowrap;
  margin-top: 0.6rem;
  margin-bottom: 14px;
}
.section-label::before,
.section-label::after {
  content: '';
  flex: 1;
  height: 1.5px;
  background: color-mix(in srgb, var(--accent) 25%, transparent);
}
```
The `::before` rule creates a rule line on the left side of the label, balancing the `::after` rule on the right.

### Experience entry (standard structure)
```html
<div class="exp-entry">
  <div class="exp-header">
    <span class="exp-role">{{role}}</span>
    <span class="exp-dates">{{startDate}} – {{endDate}}</span>
  </div>
  <div class="exp-company">{{company}}</div>
  {{#description}}
  <p class="exp-desc">{{.}}</p>
  {{/description}}
</div>
```
```css
.exp-entry { margin-bottom: 0; margin-top: 0; }
.exp-header { display: flex; justify-content: space-between; align-items: baseline; }
.exp-role { font-size: 0.82rem; font-weight: 700; color: var(--text); }
.exp-dates { font-size: 0.72rem; color: var(--text-muted); white-space: nowrap; }
.exp-company { font-size: 0.76rem; color: var(--text-muted); margin-bottom: 4px; }
.exp-desc { font-size: 0.72rem; line-height: 1.7; color: var(--text); padding-left: 14px; position: relative; }
.exp-desc::before { content: '–'; position: absolute; left: 0; color: var(--accent); }
```

### Skill category name (for categorized skills)
Always define an explicit `color` — these often appear on tinted or dark backgrounds where inheritance doesn't provide sufficient contrast:
```css
.skill-category-name {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text);
  margin-top: 0.5rem;
  margin-bottom: 0.25rem;
}
```

### Photo wrapper (circular, positioned)
```css
.photo-wrapper {
  width: 150px;      /* adjust per layout */
  height: 150px;
  border-radius: 50%;
  border: 4px solid #fff;
  overflow: hidden;
  background: #ccc;  /* fallback when no photo */
}
.photo-wrapper img { width: 100%; height: 100%; object-fit: cover; display: block; }
```

### Contact icons (inline SVG, no external icon libraries)
Use inline `<svg>` stroke icons. Stroke icons render crisply at small sizes without font loading.
```html
<!-- email -->
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <rect x="2" y="4" width="20" height="16" rx="2"/>
  <polyline points="2,4 12,13 22,4"/>
</svg>

<!-- phone -->
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.39 19
           a19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.9-8.39A2 2 0 0 1 3.48 2h3
           a2 2 0 0 1 2 1.72c.13.96.36 1.9.66 2.81a2 2 0 0 1-.45 2.11L7.91 9.91
           a16 16 0 0 0 6 6l.77-.77a2 2 0 0 1 2.11-.45c.91.3 1.85.53 2.81.66
           A2 2 0 0 1 22 16.92z"/>
</svg>

<!-- location pin -->
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
  <circle cx="12" cy="10" r="3"/>
</svg>

<!-- link/website -->
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
</svg>
```

### Break-avoidance (required on every block element that must not split across pages)
Use a single reusable `.block` class instead of listing individual selectors.
Add the `block` class to any HTML wrapper element that should stay together:

```css
.block {
  margin-bottom: 0;
  margin-top: 0;
  padding-top: 0.4rem;
  break-inside: avoid;
  page-break-inside: avoid;
}
```

Add `.block` to section wrappers in your HTML:
```html
<div class="block">
  <div class="section-label">Contact</div>
  <!-- content -->
</div>
```

### Block-parent pattern (label + repeating items)
For sections that have a section label followed by repeating child items (Experience, Education, Projects, Skills with categories), use `block__parent` on the outer wrapper and `block` on the inner items. This ensures the section label stays with the first child item when paginating:

```html
<div class="block__parent">
  <div class="section-label">Experience</div>
  {{#experience}}
  <div class="exp-entry">
    <div class="exp-header">
      <span class="exp-role">{{role}}</span>
      <span class="exp-dates">{{startDate}} – {{endDate}}</span>
    </div>
    <div class="exp-company">{{company}}</div>
    {{#description}}<p class="exp-desc block">{{.}}</p>{{/description}}
  </div>
  {{/experience}}
</div>
```

The JS detects the first `.block` child inside a `block__parent` and shifts the entire parent group (label + first item) downward together.

**PDF export behavior:** During PDF export, the `groupBlockParentHeaders()` function in `exportUtils.ts` wraps the section label + first `.block` child inside each `block__parent` into a `<div class="block" style="display:contents; break-inside:avoid">`. This ensures the label and first item stay together on the same page in the PDF. Design accordingly — avoid relying on the section label being a direct first-child of `block__parent` in CSS selectors (prefer `.block__parent > .block` over `.block__parent > :first-child`).

Then reference `.block` in the JS `avoidSelector`:
```js
const avoidSelector = '.block';
```

### Page indicator (page-break dividers)

Every template must include this `.page-indicator::before` CSS rule to visually mask
the red dashed page-break lines with a clean white border seam:

```css
.page-indicator::before {
  content: '';
  position: absolute;
  top: -10px;
  left: 0;
  width: 100%;
  height: 15px;
  background: #fff;
  border-top: 1px solid rgb(216, 216, 216);
  border-bottom: 1px solid rgb(216, 216, 216);
  z-index: -1;
}
```

The `background` must always be `#fff` so page breaks remain visible even on dark or
tinted templates.

---

## 11. Decorative Elements — Safe Techniques

These techniques are tested and render correctly through html2canvas for PDF export.

### CSS clip-path panels
```css
.accent-panel {
  background: var(--accent);
  clip-path: polygon(0 0, 100% 0, 85% 100%, 0 100%);
}
```

### CSS border-radius blobs (header decoration)
```css
.header::before {
  content: '';
  position: absolute;
  bottom: -30px;
  right: 120px;
  width: 340px;
  height: 260px;
  background: color-mix(in srgb, var(--accent) 80%, white);
  border-radius: 50% 50% 0 0 / 60% 60% 0 0;
  transform: rotate(-10deg);
  z-index: 0;
}
```

### Inline SVG polygon backgrounds
```html
<div class="panel" style="position:relative">
  <svg viewBox="0 0 260 900" preserveAspectRatio="none"
       style="position:absolute;inset:0;width:100%;height:100%;display:block;">
    <polygon points="0,0 260,0 230,900 0,900" fill="#1a2540"/>
  </svg>
  <div style="position:relative;z-index:1"><!-- content --></div>
</div>
```

### Diagonal color-stop header
```css
.header {
  background: linear-gradient(135deg, var(--accent) 60%, var(--accent-dark) 100%);
}
```

### Things that DO NOT export correctly — avoid these
- `backdrop-filter` (blur)
- CSS `filter` (drop-shadow, blur) on content elements
- `mix-blend-mode` other than `normal`
- `position: sticky` inside the `.cv`
- `overflow: auto` or `overflow: scroll` on any inner panel
- `color-mix()` — html2canvas cannot parse this function; use hardcoded `rgba()` or `opacity` instead

---

## 12. Quality Checklist Before Output

Run through every item before producing the final template HTML.

**Rendering engine**
- [ ] All data tokens use `{{...}}` not `{{{...}}}` or `<%...%>`
- [ ] Every array uses `{{#array}}...{{/array}}`
- [ ] Optional fields wrapped in `{{?field}}...{{/field}}`
- [ ] `{{.}}` used only inside an active array loop
- [ ] `{{multipage}}` appears only inside the JS string literal

**JavaScript**
- [ ] Script block is copied verbatim from Section 3
- [ ] `avoidSelector` includes all block-level classes in this template
- [ ] `document.fonts.ready.then(scaleCv)` is present
- [ ] `window.parent.postMessage(...)` line is present

**Layout**
- [ ] `.cv` is exactly `width: 794px; height: 1123px` initially
- [ ] No `vw/vh/%` on the `.cv` element
- [ ] `overflow: hidden` on `.cv`
- [ ] `transform-origin: top center` on `.cv-scaler`
- [ ] `.page-indicator::before` CSS is present, with `background` matching the body/cv background color

**Typography**
- [ ] Two Google Fonts imported via single `<link>` tag
- [ ] Name element uses display font
- [ ] No font size below `0.68rem`
- [ ] Body line-height ≥ 1.6

**ATS compliance**
- [ ] Name and all section text are real HTML text elements
- [ ] No text inside SVG
- [ ] Photo wrapped in `{{?personalInfo.photo}}` guard
- [ ] All `<img>` have `alt` attributes
- [ ] Experience descriptions are `<p>` or `<li>` elements

**Visual balance**
- [ ] Left column width 220–260px (two-column layouts)
- [ ] Right column padding ≥ 24px all sides
- [ ] Section label margin-bottom ≥ 10px
- [ ] Minimum contrast: accent color vs white ≥ 4.5:1

**Pro-tier ATS templates only**
- [ ] HTML file saved to `src/templates_formatted/ats-<name>.html`
- [ ] React-PDF file saved to `src/templates_pdf/ats-<name>.tsx`
- [ ] React-PDF component registered in `src/templates_pdf/index.ts`
- [ ] Catalog entry has `tier: "pro"` and `kind: "html"`
- [ ] No Google Fonts import in HTML or React-PDF
- [ ] No decorative elements (SVG, clip-path, images, icons)
- [ ] Single-column layout only
- [ ] HTML and React-PDF versions match visually (same colors, spacing, sizing)
- [ ] React-PDF component uses `Helvetica` font family
- [ ] No photo block in template
- [ ] Contact info uses text-only centered line (no icon SVGs)

---

## 13. Design Differentiation — Make It Memorable

Each template must have a **distinct visual identity** from existing templates. Before designing,
decide on one of these identity directions and commit to it fully:

| Identity         | Key choices                                                            |
|------------------|------------------------------------------------------------------------|
| Editorial        | Serif display font, generous line-height, thin horizontal rules, cream bg |
| Corporate-Modern | Geometric sans, strong accent band header, 2-col grid, crisp spacing  |
| Bold Geometric   | SVG polygon sidebar, dramatic color contrast, bold name, icon grid     |
| Classic Elegant  | Full-width single column, tasteful serif, wide margins, subtle dividers|
| Creative Pro     | Asymmetric layout, accent blob shapes, playful font pairing            |
| Minimalist       | Almost no color, letter-spaced uppercase labels, lots of white space   |
| Dark Accent      | Dark panel on left or top, white content area, strong name lockup      |

**Do not produce a template that looks like template1–4.**  
Vary the accent color family, font pairing, layout pattern, and decorative technique.

---

## 14. Template Catalog Registration

After generating the template files, register in the catalog:

### Free Templates (`src/templates_formatted/templateN.html`)

1. Save file to `src/templates_formatted/templateN.html`
2. Add entry to `src/lib/templateCatalog.ts`:
```typescript
{
  id: 'templateN',
  name: 'YourTemplateName',        // one evocative word e.g. 'Slate', 'Ember'
  description: 'One line description of the visual style',
  html: '',                        // populated at runtime by templateServer.ts
  kind: 'html',
  tier: 'free',
  page: { widthPx: 794, heightPx: 1123, aspectRatio: 794 / 1123 }
}
```
3. Verify at `/templates`, `/editor/new?template=templateN`, and `/dashboard`
4. Test PDF export from the editor

### Pro (ATS) Templates (`src/templates_formatted/ats-<name>.html` + `src/templates_pdf/ats-<name>.tsx`)

1. Save HTML preview to `src/templates_formatted/ats-<name>.html`
2. Create React-PDF export component at `src/templates_pdf/ats-<name>.tsx` (see Section 16)
3. Register the React-PDF component in `src/templates_pdf/index.ts`:
```typescript
import YourComponent from "./ats-<name>";

export const atsTemplateComponents: Record<string, FC<{ data: AtsResumeView }>> = {
  "ats-classic": AtsClassicPdf,
  "ats-<name>": YourComponent,
};
```
4. Add entry to `src/lib/templateCatalog.ts`:
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
5. Verify at `/templates`, `/editor/new?template=ats-<name>`, and `/dashboard`
6. Test PDF export from the editor — the React-PDF component renders the PDF

---

## 15. Minimal Working Example

For free templates, see `src/templates_formatted/template1.html` for the smallest valid template skeleton.  
For pro (ATS) templates, see `src/templates_formatted/ats-classic.html` for a canonical reference (no Google Fonts, single-column, system font stack, text-only contact line).

---

## 16. React-PDF Component Rules (Pro Templates)

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
- Use matching color values between HTML and React-PDF
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

### Visual Matching Rules

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

### Registration

After creating the component, register it in `src/templates_pdf/index.ts` and add the catalog
entry (see Section 14).
