# Template System Documentation

This document is the source of truth for how template metadata, HTML files, and runtime rendering work in Agentic CV.

For full project architecture, see [PROJECT_WALKTHROUGH.md](./PROJECT_WALKTHROUGH.md).  
For setup and contributor onboarding, see [README.md](./README.md).

## 1) Overview
Templates are static HTML files loaded on the server, combined with resume data using a custom Mustache-like renderer, and displayed in iframes in the dashboard/editor/templates pages.

Core pipeline:
1. Metadata from `src/lib/templateCatalog.ts`
2. HTML loaded from `src/templates_formatted/*.html` by `src/lib/templateServer.ts`
3. Data merged into template HTML by `src/lib/templateRenderer.ts`
4. Rendered HTML injected into iframe `srcDoc`

## 2) Template Catalog Contract
Defined in `src/lib/templateCatalog.ts`.

### Template IDs
Valid IDs:
- `template1`
- `template2`
- `template3`
- `template4`
- `template5`
- `template6`
- `template7`
- `template8`
- `template9`
- `template10`
- `template11`
- `template12`

### Metadata shape
Each template definition includes:
- `id`
- `name`
- `description`
- `html` (populated at runtime by server loader)
- `page` (`widthPx`, `heightPx`, `aspectRatio`)

Current names/descriptions:
- `template1` / Emerald
- `template2` / Copper
- `template3` / Sandstone
- `template4` / Monochrome
- `template5` / Aurora
- `template6` / Rose
- `template7` / Slate
- `template8` / Ember
- `template9` / Indigo
- `template10` / Cascade
- `template11` / Noir
- `template12` / Citrine

## 3) Data Shape Used by Renderer
`TemplateData` is an alias of `ResumeContent` (`src/types/ResumeData.ts`), containing:
- `personalInfo` (`name`, `jobTitle`, `email`, `phone`, `location`, `website`, optional `photo`)
- `summary`
- `experience[]` (`id`, `company`, `role`, `startDate`, `endDate`, `description: string[]`)
- `education[]` (`id`, `school`, `degree`, `startDate`, `endDate`)
- `skills[]`

## 4) Server Loading
Implemented in `src/lib/templateServer.ts`.

Functions:
- `isTemplateId(value)` validates IDs against the catalog.
- `readTemplateHtml(id)` reads `src/templates_formatted/<id>.html`.
- `getTemplateDefinition(id)` returns metadata + loaded HTML.
- `getAllTemplateDefinitions()` returns all template definitions with HTML.

Exposed via API:
- `GET /api/templates`
- `GET /api/templates/:id`

Both routes run in `nodejs` runtime and return full HTML strings.

## 5) Rendering Engine Details
Implemented in `src/lib/templateRenderer.ts`.

### Supported template syntax
1. Variable token:
```html
{{personalInfo.name}}
{{summary}}
```

2. Section iteration over arrays:
```html
{{#experience}}
  <h3>{{company}}</h3>
{{/experience}}
```

3. Conditional blocks:
```html
{{?personalInfo.photo}}
  <img src="{{personalInfo.photo}}" alt="Photo" />
{{/personalInfo.photo}}
```

4. Current context token:
```html
{{.}}
```

### Resolution behavior
- Paths resolve against current context first, then root data.
- Section blocks render only when target value is a non-empty array.
- Conditional blocks render when value is truthy (arrays must be non-empty).

### Escaping behavior
All token substitutions are HTML-escaped (`&`, `<`, `>`, `"`, `'`) before output, reducing XSS risk from text fields.

### Entry points
- `renderTemplate(templateHtml, data)`
- `buildTemplateSrcDoc(templateHtml, data)` (current frontend alias)
- `getTemplatePreviewData()` sample preview content

## 6) Legacy Template ID Normalization
`normalizeTemplateId(templateId)` maps legacy labels:
- `modern -> template1`
- `classic -> template2`
- `minimal -> template3`
- `creative -> template4`

If the input starts with `template`, it is cast and used. Unknown values fall back to `template1`.

## 7) Frontend Usage Patterns
### Editor (`src/app/editor/[id]/page.tsx`)
- Fetches templates from `/api/templates`
- Selects active template by id
- Builds rendered HTML with `buildTemplateSrcDoc`
- Injects HTML into preview iframe `srcDoc`

### Dashboard (`src/app/dashboard/page.tsx`)
- Fetches templates and resumes
- Renders each resume card preview using selected template + resume content

### Template gallery (`src/app/templates/page.tsx`)
- Fetches templates
- Renders each template with `getTemplatePreviewData()` sample data

## 8) Add a New Template (Safe Checklist)
1. Add a new HTML file: `src/templates_formatted/templateN.html`.
2. Add matching metadata entry in `templateDefinitions` inside `src/lib/templateCatalog.ts`.
3. Ensure the new id follows `templateN` naming.
4. Use existing token syntax (`{{...}}`, `{{#...}}`, `{{?...}}`) and valid field paths from `TemplateData`.
5. Confirm `/api/templates` includes the new entry with HTML.
6. Verify preview rendering in:
   - `/templates`
   - `/editor/new?template=templateN`
   - `/dashboard` cards for resumes using that template
7. Verify export still works (PDF/PNG) from editor with the new template.

## 9) Troubleshooting
- Invalid template id returns `404` from `/api/templates/:id`.
- Blank preview usually means missing template HTML load or malformed placeholders.
- Unexpected field output often comes from mismatched data paths vs `ResumeContent` shape.
- If legacy IDs appear from older records, rely on `normalizeTemplateId` fallback behavior.

## 10) HTML2PDF Export Pipeline (Single Mode)
PDF export now uses only the HTML template pipeline + `html2pdf.js`. The previous React-PDF export mode has been retired.

### Step 1: Data -> Template HTML
- The editor builds `formattedResume` from in-memory resume state.
- It calls `buildTemplateSrcDoc(templateHtml, formattedResume)` from `src/lib/templateRenderer.ts`.
- This resolves tokens (`{{...}}`), sections (`{{#...}}`), and conditionals (`{{?...}}`) into final HTML.

### Step 2: Hidden export iframe hydration
- The rendered HTML is written into an offscreen iframe (`exportIframeRef`) in `src/app/editor/[id]/page.tsx` using:
  - `doc.open()`
  - `doc.write(renderedTemplate)`
  - `doc.close()`
- Export targets `iframe.contentDocument.documentElement` so the full document (not just a subtree) is captured.

### Step 3: In-template scaling and page counting
- Each template script defines a fixed CV page geometry (`CV_WIDTH = 794`, `CV_HEIGHT = 1123`) and scales the visual preview with `.cv-scaler`.
- The script computes content height and rounds page count with:
  - `pages = Math.ceil(contentHeight / CV_HEIGHT)`
  - `newHeight = pages * CV_HEIGHT`
- It posts `window.parent.postMessage({ type: 'RESIZE_IFRAME', pages }, '*')` so the preview canvas can match page count.

### Step 4: html2canvas clone transforms (export-time sanitation)
- `html2pdf` runs with an `onclone` hook that adjusts the cloned DOM before rasterization:
  - Replaces `<img>` elements with background-image `<div>` mirrors for more consistent capture.
  - Removes page-indicator overlays.
  - Clears border radius on key containers for print edges.
  - Forces `overflow: visible` in clone document/container roots.
- These are export-only clone edits and do not mutate live editor DOM.

### Step 5: PDF generation settings
- `html2pdf().set(opt).from(element).save()` is used in `exportPDF`.
- Current export options include:
  - filename from resume title
  - image mode `jpeg` with high quality
  - `html2canvas` scaling + CORS config
  - jsPDF format `[794, 1123]` (portrait, px unit)

### Step 6: Copyable text behavior and caveats
- Export is generated from real rendered HTML text nodes, so PDF text remains selectable/copyable in normal cases.
- Copy fidelity still depends on runtime font availability and browser/PDF viewer behavior.
- Aggressive visual effects, unsupported CSS features, or external asset failures can still affect text layer quality.
