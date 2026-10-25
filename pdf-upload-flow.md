# PDF Upload Flow

## Overview

PDFs are never sent to the server as raw PDF files. Instead, they are rendered to `<canvas>` on the client, converted to PNG blobs, and sent as images. This avoids server-side PDF parsing dependencies (`pdfjs-dist/legacy`) which fail in serverless environments (Lambda/Vercel).

## Flow

```
User selects PDF
       │
       ▼
[Client] ResumeSelector.renderPdfPreview()
  ├─ Dynamically imports pdfjs-dist/legacy/build/pdf.mjs (legacy build)
  ├─ Sets worker to /pdf.worker.min.mjs (legacy worker, copied to public/ by postinstall)
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
- For PDFs: renders to canvas using `pdfjs-dist/legacy/build/pdf.mjs` with a locally-hosted worker (`/pdf.worker.min.mjs`)
- Enforces per-plan page limits via `maxPdfPagesForPlan()` + `MAX_PDF_PAGES_PER_PLAN` (`pdfConstants.ts`)
- Owns all upload machinery internally (file input, canvas refs, file hashes, backend processing)
- Communicates selection via slim `ResumeSelection` interface (finished results only):
  - saved mode: `selectedResumeId` + `selectedSavedResume`
  - upload mode: `uploadedResumeId` + `resumeContent` + `pdfPreviewUrls` + `uploadedTitle`

### Client-side pattern (all dashboard pages)
```ts
// ID-only: the selector processes every file before consumers see it.
import { buildResumeFormData } from "@/hooks/useResumeFormData";

const formData = buildResumeFormData(selection);
// saved  -> resumeMode + resumeId
// upload -> resumeMode + uploadedResumeId
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

- Server-side use of `pdfjs-dist` fails in serverless bundles (Lambda/Vercel) because its fake worker dynamically imports `pdf.worker.mjs`, which the bundler cannot resolve.
- The client uses the **legacy build** (`pdfjs-dist/legacy/build/pdf.mjs` + the legacy worker). The legacy build bundles its own polyfills for the new `Uint8Array` helpers (`toHex`, `toBase64`, `fromBase64`), the `Map`/`WeakMap` `getOrInsert`/`getOrInsertComputed` methods, `Math.sumPrecise`, and `Promise.try`/`Promise.withResolvers`. This keeps PDF parsing working on browsers that lack those methods (older Safari/iOS, older Chrome/Firefox). Both the main build and the worker are legacy and come from the same `pdfjs-dist` version.
- Client-side rendering avoids the serverless problem entirely — the real worker is bundled in `node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs` and copied to `public/` via a `postinstall` script, keeping it off a CDN.

## Worker Deployment

The `postinstall` script in `package.json` copies the worker file:
```
"postinstall": "node -e \"require('fs').cpSync('node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs', 'public/pdf.worker.min.mjs')\""
```

This ensures:
- The worker is served from the same origin (no CDN dependency)
- It survives builds and is included in the deploy artifact
- The client references it at runtime as `"/pdf.worker.min.mjs"`

## Important Notes

- **Page limit:** all page limits live in `src/lib/pdfConstants.ts`. `MAX_PDF_PAGES` is the hard ceiling, `MAX_PDF_PAGES_PER_PLAN` holds the per-plan values (free: 2, pro: 3, proPlus: 3), and `maxPdfPagesForPlan()` is the shared helper used by both `ResumeSelector` and the `/api/resume/process` route. Derived from `session.user.subscriptionPlan`.
- **Batch AI extraction:** `extractResumeTextFromImages` processes images 2 at a time in parallel (`Promise.all`) and concatenates results in page order. This avoids overwhelming the vision model with too many images per request.
- **Scale:** Canvas rendering uses 2x scale for high-quality OCR
- **File format:** PNG is used for canvas exports (lossless, good for OCR)
- **Server-side validation:** `assertSupportedUpload` only accepts image types (`image/png`, `image/jpeg`, `image/webp`). PDFs must be rendered client-side before upload.
