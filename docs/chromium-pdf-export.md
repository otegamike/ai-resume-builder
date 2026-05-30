# Chromium PDF Export — Backend Architecture

## 1. Overview

The application uses **Playwright Chromium** (headless browser automation) to perform server-side PDF generation of resume templates. This approach ensures pixel-perfect rendering identical to what the user sees in the editor preview, with full support for CSS, web fonts, and custom JavaScript layout logic embedded in each template.

**Key technologies:**

| Component | Technology |
|---|---|
| Framework | Next.js 16 (App Router) — Node.js runtime |
| Browser automation | Playwright 1.60.0 (`chromium` launcher) |
| Template engine | Custom Mustache-like renderer (`templateRenderer.ts`) |
| Page dimensions | A4 equivalent at ~96 DPI: 794 × 1123 px |
| Client transport | `fetch` → `POST /api/export/pdf` → binary Blob download |

## 2. End-to-End Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  Editor Page (client)                                               │
│                                                                     │
│  User clicks "Export PDF"                                           │
│       │                                                             │
│       ▼                                                             │
│  exportResumeAsPdf(resume, templateId, title)                       │
│       │                                                             │
│       │  POST /api/export/pdf                                       │
│       │  { resume, templateId, title }                              │
│       ▼                                                             │
└───────────────┬─────────────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  API Route: POST /api/export/pdf  (route.ts)                       │
│                                                                     │
│  1. Validate payload (JSON parse, templateId, resume structure)     │
│  2. Load template HTML from disk (templateServer.ts)                │
│  3. Render data into template (templateRenderer.ts)                │
│  4. Get/launch Chromium browser (lazy singleton)                    │
│  5. Create new page with A4 viewport (794×1123)                     │
│  6. Set page content (setContent with domcontentloaded)             │
│  7. Wait for layout (.cv selector, fonts ready, settle)             │
│  8. Inject print CSS (page resets, A4 sizing, hide overlays)        │
│  9. Generate PDF via page.pdf()                                     │
│ 10. Return PDF as binary download (Content-Disposition: attachment) │
│ 11. Close browser page (finally block)                              │
└─────────────────┬───────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Client (exportUtils.ts)                                            │
│                                                                     │
│  Receive Blob → createObjectURL → <a download> → click → cleanup   │
└─────────────────────────────────────────────────────────────────────┘
```

## 3. Detailed Pipeline

### 3.1 Client Initiation

**File:** `src/utils/exportUtils.ts:74-105`

```ts
export async function exportResumeAsPdf(resume, templateId, title) {
  const response = await fetch("/api/export/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume, templateId, title }),
  });
  // ...error handling...
  const blob = await response.blob();
  // Trigger download via invisible <a> element
}
```

The function:
1. Sends a `POST` with the full resume data, template ID, and optional title.
2. On success, converts the response to a `Blob`.
3. Creates a temporary object URL, programmatically clicks an `<a>` element to trigger the browser's download dialog, then cleans up.

**Called from:** `src/app/editor/[id]/page.tsx` (lines ~225-235) when the user clicks the Export PDF button.

### 3.2 API Route Entry

**File:** `src/app/api/export/pdf/route.ts:118-178`

```ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
```

The route is explicitly set to `nodejs` runtime (not Edge) because it needs filesystem access and Playwright's Node.js API. `force-dynamic` prevents any static optimization or caching of the route handler.

### 3.3 Request Validation

**File:** `src/app/api/export/pdf/route.ts:118-134`

Three layers of validation:

| Check | Location | Failure response |
|---|---|---|
| Valid JSON body | `request.json()` (line 122) | `400 { error: "Invalid export payload" }` |
| `templateId` exists + is valid | `isTemplateId()` (line 128) | `404 { error: "Template not found" }` |
| `resume` has required shape | `isResumeContent()` (line 132) | `400 { error: "Resume content is required" }` |

`isResumeContent()` verifies the payload is an object with:
- `personalInfo` — object
- `summary` — string
- `experience` — array (of work history entries)
- `education` — array (of education entries)
- `skills` — array (of strings)

### 3.4 Template Loading

**File:** `src/lib/templateServer.ts:16-24`

```ts
export async function getTemplateDefinition(id: TemplateId) {
  const metadata = templateDefinitions.find((t) => t.id === id);
  const html = await readTemplateHtml(id);
  return { ...metadata, html };  // metadata + raw HTML string
}
```

1. Looks up template metadata from `templateCatalog.ts` (name, description, page dimensions).
2. Reads the raw HTML from `src/templates_formatted/{templateId}.html` via `fs.readFile`.
3. Returns a combined `TemplateDefinition` object with the HTML string attached.

There are 17 templates (template1–template17), each stored as a standalone `.html` file in `src/templates_formatted/`.

### 3.5 Template Rendering (Data Injection)

**File:** `src/lib/templateRenderer.ts:63-79`

```ts
export function buildTemplateSrcDoc(templateHtml, data, options) {
  const formattedName = formatName(data.personalInfo.name);
  // Merge formatted name into data
  const newData = { ...data, personalInfo: { ...data.personalInfo, fullname: formattedName } };
  // Set multipage flag for export
  const finalData = options?.editorMode ? { ...newData, multipage: "true" } : newData;
  return renderTemplate(templateHtml, finalData);
}
```

Key steps:
1. **Name formatting:** Splits the full name into `firstName` / `otherNames` via `nameFormatter.ts` (used by templates that display first/last name separately).
2. **Multipage flag:** Sets `multipage: "true"` in the template data context so the template's JavaScript knows to enable page-breaking logic (rather than single-page scaling).
3. **Custom Mustache rendering:** `renderTemplate()` iterates the HTML, replacing:
   - `{{personalInfo.name}}` — simple variable interpolation (HTML-escaped)
   - `{{#experience}}...{{/experience}}` — section iteration over arrays
   - `{{?personalInfo.photo}}...{{/personalInfo.photo}}` — conditionals
   - See `src/lib/templateRenderer.ts:7-9` for regex patterns

### 3.6 Chromium Browser Lifecycle

**File:** `src/app/api/export/pdf/route.ts:13-48`

#### Singleton Pattern

```ts
let browserPromise: Promise<Browser> | null = null;

function getBrowser() {
  browserPromise ??= chromium.launch({ ... });
  return browserPromise;
}
```

A module-level `browserPromise` variable caches a single Chromium browser instance. On the first request, Playwright launches a headless Chromium process. All subsequent requests reuse the same process. This avoids the ~2-3 second cold-start cost for every export.

The browser is **never explicitly closed** — it lives for the lifetime of the Node.js server process. Only individual pages (`page.close()` in the `finally` block) are cleaned up per request.

#### Executable Path Resolution

**File:** `src/app/api/export/pdf/route.ts:21-37`

```ts
function findCachedChromiumExecutable() {
  const defaultPath = chromium.executablePath();
  if (fs.existsSync(defaultPath)) return defaultPath;

  const cacheRoot = process.env.PLAYWRIGHT_BROWSERS_PATH
    || path.join(process.env.LOCALAPPDATA, "ms-playwright");

  const candidates = fs.readdirSync(cacheRoot)
    .filter((entry) => entry.startsWith("chromium-"))
    .sort().reverse()
    .map((entry) => path.join(cacheRoot, entry, "chrome-win64", "chrome.exe"));

  return candidates.find((candidate) => fs.existsSync(candidate));
}
```

Priority order:

1. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` environment variable (explicit override)
2. `chromium.executablePath()` — Playwright's default resolved path
3. Manual scan of Playwright's browser cache directory (checks `%LOCALAPPDATA%\ms-playwright` or `PLAYWRIGHT_BROWSERS_PATH` for `chromium-*/chrome-win64/chrome.exe`)
4. If nothing found, `undefined` is passed to `chromium.launch()`, letting Playwright auto-detect

#### Launch Configuration

```ts
chromium.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
```

| Argument | Purpose |
|---|---|
| `headless: true` | No visible window — runs entirely in background |
| `--no-sandbox` | Required in containerized/Docker environments |
| `--disable-dev-shm-usage` | Prevents shared memory issues in memory-constrained environments |

### 3.7 Page Creation & Viewport Configuration

**File:** `src/app/api/export/pdf/route.ts:142-145`

```ts
page = await browser.newPage({
  viewport: { width: TEMPLATE_PAGE.widthPx, height: TEMPLATE_PAGE.heightPx },
  deviceScaleFactor: 1,
});
```

| Setting | Value | Rationale |
|---|---|---|
| Width | 794 px | A4 at ~96 DPI (210mm ≈ 794px) |
| Height | 1123 px | A4 at ~96 DPI (297mm ≈ 1123px) |
| `deviceScaleFactor` | 1 | Ensures crisp vector-like text; avoids sub-pixel anti-aliasing issues |

**Page dimension constants** (`src/lib/templateCatalog.ts:20-24`):
```ts
export const TEMPLATE_PAGE = {
  widthPx: 794,
  heightPx: 1123,
  aspectRatio: 794 / 1123,
};
```

Each template HTML also embeds these as inline JavaScript constants (`CV_WIDTH = 794`, `CV_HEIGHT = 1123`) for its own page-counting and scaling logic.

### 3.8 Content Injection

**File:** `src/app/api/export/pdf/route.ts:147-151`

```ts
try {
  await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 5_000 });
} catch (error) {
  if (!(error instanceof Error) || !error.name.includes("Timeout")) throw error;
}
```

- Sets the full rendered HTML (including `<script>` and `<style>` tags) as the page's document.
- `waitUntil: "domcontentloaded"` — Playwright waits until the DOM is parsed and ready (does NOT wait for images, fonts, or external resources).
- **5-second timeout** — if the DOM hasn't parsed in 5 seconds, the timeout is silently caught (the error is only re-thrown if it's not a timeout). This prevents a slow template from breaking the entire export.

### 3.9 Layout Wait Strategy

**File:** `src/app/api/export/pdf/route.ts:106-116`

```ts
async function waitForTemplateLayout(page) {
  await page.waitForSelector(".cv", { timeout: 10_000 });
  await page.evaluate(async () => {
    if (!("fonts" in document)) return;
    await Promise.race([
      document.fonts.ready,
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
  });
  await page.waitForTimeout(150);
}
```

Three-stage stabilization:

| Stage | What it waits for | Timeout | Purpose |
|---|---|---|---|
| 1. DOM selector | `.cv` element | 10s | Ensures the template's root element is rendered (confirms the Mustache rendering produced valid HTML and the template JS has run) |
| 2. Font loading | `document.fonts.ready` | 3s (raced) | Web fonts must be loaded before measuring layout — text metrics change once custom fonts apply. Falls back after 3s to avoid hanging on a slow font CDN |
| 3. Settle | Fixed delay | 150ms | Gives the browser one final frame to reflow after fonts load, ensuring `page.pdf()` captures the final layout |

### 3.10 Print CSS Injection

**File:** `src/app/api/export/pdf/route.ts:67-104, 153`

```ts
await page.addStyleTag({ content: buildPrintCss() });
```

The `buildPrintCss()` function generates a `<style>` tag with rules that override the template's screen styles for PDF output:

```css
/* 1. Set the PDF page dimensions to match our A4 viewport */
@page { size: 794px 1123px; margin: 0; }

/* 2. Strip all body/document margins and force exact width */
html, body {
  width: 794px !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: visible !important;         /* No scrollbars */
  background: #fff !important;
  -webkit-print-color-adjust: exact;    /* Preserve background colors */
  print-color-adjust: exact;
}

/* 3. Remove the viewport centering wrapper's centering behavior */
.cv-viewport {
  width: 794px !important;
  min-height: auto !important;
  display: block !important;
  align-items: initial !important;
  justify-content: initial !important;
}

/* 4. Remove scaling transform applied by template JS */
.cv-scaler {
  display: block !important;
  transform: none !important;           /* CRITICAL: No scaling for PDF */
  margin: 0 !important;
  transform-origin: top left !important;
}

/* 5. Ensure CV content box matches A4 exactly */
.cv {
  width: 794px !important;
  max-width: 794px !important;
  margin: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  overflow: clip !important;
}

/* 6. Hide multipage page-break indicators */
.page-indicator { display: none !important; }
```

**Critical design note:** In the editor preview, each template's JavaScript (`scaleCv()`) scales the `.cv-scaler` to fit the screen. For PDF export, this scaling must be disabled (`transform: none`) so that every pixel of the A4-sized `.cv` is captured at native 1:1 resolution.

### 3.11 PDF Generation

**File:** `src/app/api/export/pdf/route.ts:155-161`

```ts
const pdf = await page.pdf({
  printBackground: true,
  preferCSSPageSize: true,
  width: "794px",
  height: "1123px",
  margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" },
});
```

| Option | Value | Effect |
|---|---|---|
| `printBackground` | `true` | Renders CSS backgrounds, gradients, and images (not just foreground content) |
| `preferCSSPageSize` | `true` | Uses the `@page { size }` rule from injected CSS instead of Playwright's default US Letter |
| `width` / `height` | `794px` / `1123px` | Explicit A4 dimensions (backup if `@page` rule is somehow ignored) |
| `margin` | `0` on all sides | No PDF margins — the template's own internal padding controls white space |

The output `pdf` is a `Buffer` (Uint8Array) of raw PDF bytes.

### 3.12 Response Construction

**File:** `src/app/api/export/pdf/route.ts:163-171`

```ts
const filename = `${sanitizeFilename(payload.title || "resume")}.pdf`;
const pdfBlob = new Blob([new Uint8Array(pdf)], { type: "application/pdf" });
return new NextResponse(pdfBlob, {
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  },
});
```

| Header | Purpose |
|---|---|
| `Content-Type: application/pdf` | Tells the browser this is a PDF |
| `Content-Disposition: attachment; filename="..."` | Forces download (not inline view) with the user's chosen title (or "resume.pdf") |
| `Cache-Control: no-store` | Prevents any caching of the PDF bytes |

`sanitizeFilename()` strips illegal filesystem characters (`\ / : * ? " < > |`) and replaces them with hyphens.

### 3.13 Cleanup

**File:** `src/app/api/export/pdf/route.ts:175-177`

```ts
finally {
  await page?.close();
}
```

The `finally` block guarantees the browser page is closed even if an error occurs during content loading, font waiting, or PDF generation. This prevents memory leaks. The Chromium browser instance itself (the singleton) is NOT closed — it remains running for future requests.

## 4. Error Handling Summary

| Scenario | HTTP Status | Response Body | Lines |
|---|---|---|---|
| Invalid JSON in request body | 400 | `{ "error": "Invalid export payload" }` | 123-125 |
| Missing/unknown templateId | 404 | `{ "error": "Template not found" }` | 128-130 |
| Missing/invalid resume data | 400 | `{ "error": "Resume content is required" }` | 132-134 |
| Page content load timeout | — | Silently caught, continues | 149-151 |
| Any other error during generation | 500 | `{ "error": "Failed to export PDF" }` | 172-174 |
| Browser page resource leak | — | Guaranteed cleanup in `finally` | 175-177 |
| Client network/HTTP error | — | Throws `Error` with message from server | exportUtils.ts:85-94 |

## 5. Caching Strategy

| Cache Target | Strategy | Rationale |
|---|---|---|
| Chromium browser process | **Singleton** — one instance for all requests (module-level `browserPromise`) | Launching Chromium takes ~2-3s; reusing is much faster |
| Template HTML files | **Fresh read per request** — no in-memory cache | Templates may change during development; simplicity |
| Rendered HTML | **Not cached** — generated fresh per request | Each request has different user data |
| PDF output | **`Cache-Control: no-store`** — never cached | PDFs contain user-specific personal data |
| Playwright `BrowserContext` / pages | **Per-request** — new page per request, closed in `finally` | Prevents cross-request state leakage |

## 6. Template JavaScript Interaction

Each template HTML file contains inline JavaScript that runs in the browser context. For PDF export, the key interactions are:

### 6.1 Multipage Detection

The template JS reads `{{multipage}}` from the rendered HTML:

```js
const MULTIPAGE = "{{multipage}}" === "true";
```

During export, `buildTemplateSrcDoc()` sets `multipage: "true"` (line 77 of `templateRenderer.ts`), which causes the template JS to:
- **Not** scale the content to fit a single page
- Enable page-break logic for multi-page output

### 6.2 Scale Calculation (Disabled for PDF)

In editor preview mode, `scaleCv()` computes a scale factor to fit the A4 content into the viewport:

```js
const scale = Math.min(innerWidth / CV_WIDTH, innerHeight / CV_HEIGHT);
scaler.style.transform = `scale(${scale})`;
```

For PDF export, the injected print CSS sets `.cv-scaler { transform: none !important; }`, disabling this scaling. The content renders at native 1:1 A4 size.

### 6.3 Page Breaking

When `multipage: "true"`, the template JS calculates `pageCount = Math.ceil(contentHeight / CV_HEIGHT)` and inserts visual `.page-indicator` elements between pages. These are hidden during PDF export by `.page-indicator { display: none !important; }` in the print CSS.

Playwright's `page.pdf()` handles the actual multi-page PDF splitting — it respects the CSS `@page { size }` and will generate one PDF page per A4-sized block of content, just like Chrome's "Print to PDF" would.

## 7. Configuration & Environment Variables

| Variable | Purpose | Default |
|---|---|---|
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` | Explicit path to Chromium executable | `undefined` (auto-detect) |
| `PLAYWRIGHT_BROWSERS_PATH` | Root directory for Playwright browser installations | `%LOCALAPPDATA%\ms-playwright` |

## 8. File Reference

| File | Role |
|---|---|
| `src/app/api/export/pdf/route.ts` | Core API route — Playwright orchestration, PDF generation, response |
| `src/lib/templateRenderer.ts` | Custom Mustache-like engine — injects resume data into template HTML |
| `src/lib/templateServer.ts` | Reads template HTML from disk, resolves template metadata |
| `src/lib/templateCatalog.ts` | Template definitions (ID, name, page dimensions) |
| `src/utils/exportUtils.ts` | Client-side fetch + download trigger |
| `src/utils/nameFormatter.ts` | Name splitting (firstName / otherNames) for template variables |
| `src/templates_formatted/*.html` | 17 template HTML files with inline JS/CSS |
| `src/app/editor/[id]/page.tsx` | Editor page — UI for export buttons |

## 9. Troubleshooting

### PDF is blank
- Check that Chromium is installed (`npx playwright install chromium`).
- Verify `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` points to a valid `chrome.exe`.
- Check the server console for "Failed to export PDF" errors.

### PDF has wrong dimensions
- Confirm `TEMPLATE_PAGE` values match your target paper size.
- Ensure `@page { size }` in `buildPrintCss()` overrides any template-level `@page` rules.

### Fonts look different from preview
- Web fonts must be accessible from the server's network.
- Increase the 3s font timeout in `waitForTemplateLayout()` for slow font CDNs.

### Chromium fails to launch
- Check that `--no-sandbox` is set (required in Docker/CI environments).
- Verify sufficient system memory — Chromium typically needs ~200-300 MB.
- Ensure the platform's Playwright dependencies are installed (on Linux: `npx playwright install-deps chromium`).

### Memory grows over time
- The browser singleton is expected; each page is closed after every request (`page.close()`).
- If memory leaks persist, consider restarting the browser instance periodically or adding a browser context disposal strategy. Currently the project does not implement periodic browser restarts.
