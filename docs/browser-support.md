# Browser support

The app targets the browsers listed in `package.json` under `browserslist`:

- Chrome and Edge 120+
- Firefox 120+
- Safari 16.4+
- iOS Safari 16.4+
- Samsung Internet 23+

## Why these versions

The resume upload flow uses `pdfjs-dist` and canvas rendering on the client. Newer JavaScript APIs such as `Uint8Array.prototype.toHex` and `Map.prototype.getOrInsertComputed` are not available in older browsers. The legacy pdf.js build bundles polyfills for those APIs, so the upload path must keep using:

- `pdfjs-dist/legacy/build/pdf.mjs`
- `public/pdf.worker.min.mjs` copied from the legacy build by `postinstall`

`npm run check:pdf` verifies both files and their hashes. `npm run check:browser-support` scans `src` for direct calls to the unsupported APIs and checks the `browserslist` baseline.

## Runtime fallback

`src/lib/errors/unsupportedBrowser.ts` detects likely outdated-browser failures when a `TypeError` happens alongside a missing upload feature or a known new API. Upload errors with that diagnosis show the shared message:

> Your browser may be out of date. This feature might not work on your current browser version. Please update your browser, or try the latest Chrome or Safari, and try again.

The upload flow also checks required features before processing a file. Sentry events from these failures are tagged with `suspectedOldBrowser=true` and `missingBrowserFeatures` when a feature name is known.

## Manual verification

1. Run `npx playwright install chromium`.
2. Run `npm run test:e2e`.
3. Open `/dev/old-browser-upload` in development and select a PDF with required APIs intact.
4. Optional: use browser devtools to remove `FileReader` before selecting a file and confirm the fallback message appears.
