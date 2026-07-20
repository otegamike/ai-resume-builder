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
  ├─ Sets worker CDN path (unpkg.com)
  ├─ Renders each page to <canvas> @ 2x scale
  └─ Stores canvas refs + preview data URLs
       │
       ▼
[Client] Parent page (improve, onboarding, etc.)
  ├─ Iterates resumeSelection.pdfCanvasRefs
  ├─ Calls canvas.toBlob("image/png") on each
  └─ Appends blobs to FormData as "file" entries
       │
       ▼
[SERVER] API route
  ├─ formData.getAll("file") → File[]
  ├─ Converts each to data URL
  └─ Sends all to extractResumeTextFromImages (vision AI)
```

## Key Components

### `src/components/resume/ResumeSelector.tsx`
- Shared component used by onboarding and all dashboard pages (improve, writer, tailor, applications)
- Handles both image and PDF file selection
- For PDFs: renders to canvas using `pdfjs-dist` with a CDN-hosted worker
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

### Server-side pattern
```ts
const entries = formData.getAll("file");
const files = entries.filter((f): f is File => f instanceof File);
const dataUrls = await Promise.all(files.map(fileToDataUrl));
const extractedText = await extractResumeTextFromImages(dataUrls);
```

## Why Not Server-Side PDF Parsing?

- `pdfjs-dist/legacy/build/pdf.mjs` tries to dynamically import `pdf.worker.mjs` for its fake worker
- The relative `import("./pdf.worker.mjs")` with `/*webpackIgnore:true*/` fails in serverless bundles
- Error: `Setting up fake worker failed: "Cannot find module '...pdf.worker.mjs'"`
- Client-side rendering avoids this entirely — the worker is loaded from CDN (`unpkg.com`)

## Important Notes

- **Page limit:** `ResumeSelector` enforces a max of 3 pages per PDF
- **Scale:** Canvas rendering uses 2x scale for high-quality OCR
- **File format:** PNG is used for canvas exports (lossless, good for OCR)
- **Server-side validation:** `assertSupportedUpload` now only accepts image types (`image/png`, `image/jpeg`, `image/webp`). PDFs must be rendered client-side before upload.
