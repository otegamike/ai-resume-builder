# PDF Upload Flow

## Overview

PDFs are never sent to the server as raw PDF files. Instead, they are rendered to `<canvas>` on the client, converted to PNG blobs, and sent as images. This avoids server-side PDF parsing dependencies (`pdfjs-dist/legacy`) which fail in serverless environments (Lambda/Vercel).

## Flow

```
User selects PDF
       │
       ▼
[Client] ResumeSelector.renderPdfPreview()
  ├─ Dynamically imports pdfjs-dist
  ├─ Sets worker to /pdf.worker.min.mjs (copied to public/ by postinstall)
  ├─ Renders each page to <canvas> @ 2x scale
  └─ Stores canvas refs + preview data URLs
       │
       ▼
[Client] Parent page (improve, onboarding, etc.)
  ├─ Iterates resumeSelection.pdfCanvasRefs
  ├─ Calls canvas.toBlob("image/png") on each
  ├─ Appends blobs to FormData as "file" entries (improve/onboarding routes)
  └─ Appends blobs to FormData as "resumeFile" entries (tailor/cover-letter/quick-apply routes)
       │
       ▼
[SERVER] API route
  ├─ formData.getAll("file") or formData.getAll("resumeFile") → File[]
  ├─ Converts each to data URL
  └─ Sends all to extractResumeTextFromImages (vision AI) — batched 2 at a time
```

## Key Components

### `src/components/resume/ResumeSelector.tsx`
- Shared component used by onboarding and all dashboard pages (improve, writer, tailor, applications)
- Handles both image and PDF file selection
- For PDFs: renders to canvas using `pdfjs-dist` with a locally-hosted worker (`/pdf.worker.min.mjs`)
- Enforces per-plan page limits via `MAX_PDF_PAGES_PER_PLAN` + `useSession()` (`creditCosts.ts`)
- Communicates selection via `ResumeSelection` interface:
  - `selectedFile` — raw File (for image uploads)
  - `pdfCanvasRefs` — HTMLCanvasElement[] (for PDF uploads, rendered client-side)
  - `pdfPreviewUrls` — string[] (data URLs for preview display)

### Client-side pattern (all dashboard pages)
```ts
if (selection.mode === "upload") {
  const formData = new FormData();

  if (selection.selectedFile?.type.startsWith("image/")) {
    formData.append("file", selection.selectedFile);
  } else if (selection.pdfCanvasRefs.length > 0) {
    for (const canvas of selection.pdfCanvasRefs) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png")
      );
      if (blob) formData.append("file", blob, "page.png");
    }
  }
}
```

### Server-side pattern (improve / onboarding — uses `"file"`)
```ts
const entries = formData.getAll("file");
const files = entries.filter((f): f is File => f instanceof File);
const dataUrls = await Promise.all(files.map(fileToDataUrl));
const extractedText = await extractResumeTextFromImages(dataUrls);
```

### Server-side pattern (tailor / cover-letter / quick-apply — uses `"resumeFile"`)
```ts
const entries = formData.getAll("resumeFile");
const files = entries.filter((f): f is File => f instanceof File);
const dataUrls = await Promise.all(files.map(fileToDataUrl));
const extractedText = await extractResumeTextFromImages(dataUrls);
```

## Why Not Server-Side PDF Parsing?

- `pdfjs-dist/legacy/build/pdf.mjs` tries to dynamically import `pdf.worker.mjs` for its fake worker
- The relative `import("./pdf.worker.mjs")` with `/*webpackIgnore:true*/` fails in serverless bundles
- Error: `Setting up fake worker failed: "Cannot find module '...pdf.worker.mjs'"`
- Client-side rendering avoids this entirely — the real worker is bundled in `node_modules/pdfjs-dist/build/pdf.worker.min.mjs` and copied to `public/` via a `postinstall` script, keeping it off a CDN

## Worker Deployment

The `postinstall` script in `package.json` copies the worker file:
```
"postinstall": "node -e \"require('fs').cpSync('node_modules/pdfjs-dist/build/pdf.worker.min.mjs', 'public/pdf.worker.min.mjs')\""
```

This ensures:
- The worker is served from the same origin (no CDN dependency)
- It survives builds and is included in the deploy artifact
- The client references it at runtime as `"/pdf.worker.min.mjs"`

## Important Notes

- **Page limit:** `ResumeSelector` enforces per-plan limits via `MAX_PDF_PAGES_PER_PLAN` (`creditCosts.ts`). Free users: 2 pages. Pro/Pro+ users: 4 pages. Derived from `session.user.subscriptionPlan`.
- **Batch AI extraction:** `extractResumeTextFromImages` processes images 2 at a time in parallel (`Promise.all`) and concatenates results in page order. This avoids overwhelming the vision model with too many images per request.
- **Scale:** Canvas rendering uses 2x scale for high-quality OCR
- **File format:** PNG is used for canvas exports (lossless, good for OCR)
- **Server-side validation:** `assertSupportedUpload` only accepts image types (`image/png`, `image/jpeg`, `image/webp`). PDFs must be rendered client-side before upload.
