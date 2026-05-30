# Prompt: Migrate PDF Export to `@sparticuz/chromium` for Vercel Compatibility

## Background

The app currently uses the full `playwright` package with its bundled Chromium for server-side PDF generation at `POST /api/export/pdf`. This works locally but **fails on Vercel** because:

1. Vercel runs on AWS Lambda (Amazon Linux x86_64) — the Chromium binary bundled with `playwright` is compiled for a different environment.
2. The `browsers.json` file and related Chromium assets are not included in the Vercel deployment bundle.
3. The full `playwright` package + Chromium exceeds Lambda's deployment size limits.

The fix is to replace the full `playwright` package with `playwright-core` (no bundled browser) and use `@sparticuz/chromium` — a Chromium build specifically compiled for AWS Lambda / serverless environments.

---

## Relevant Files

| File | What changes |
|---|---|
| `src/app/api/export/pdf/route.ts` | Primary change — browser launch logic |
| `next.config.ts` | Add `serverExternalPackages` |
| `vercel.json` | Set memory + maxDuration for the function |
| `package.json` | Swap `playwright` → `playwright-core` + add `@sparticuz/chromium` |

No changes needed to:
- `src/lib/templateRenderer.ts`
- `src/lib/templateServer.ts`
- `src/lib/templateCatalog.ts`
- `src/utils/exportUtils.ts`
- Any template HTML files

---

## Step 1 — Update `package.json` Dependencies

Remove the full `playwright` package and install the two replacements:

```bash
npm uninstall playwright
npm install playwright-core @sparticuz/chromium
```

Expected result in `package.json`:
```json
{
  "dependencies": {
    "playwright-core": "^1.52.0",
    "@sparticuz/chromium": "^133.0.0"
  }
}
```

> **Do not** keep `playwright` as a dependency alongside `playwright-core`. They conflict.
> `@sparticuz/chromium` ships the correct Amazon Linux Chromium binary and exposes `executablePath()` and `args` for launch configuration.

---

## Step 2 — Rewrite Browser Launch Logic in `route.ts`

### Current code (lines 1–48 of `route.ts`)

The current file imports from `playwright` and uses a custom `findCachedChromiumExecutable()` helper that scans `%LOCALAPPDATA%\ms-playwright`. This is Windows-local logic that does nothing useful on Vercel.

### What to replace it with

Replace the import block and the browser singleton section with the following pattern:

```ts
// TOP OF FILE — replace existing playwright import and getBrowser logic

import { chromium } from "playwright-core";
import type { Browser } from "playwright-core";

// ─── Browser singleton ────────────────────────────────────────────────────────

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserPromise) return browserPromise;

  browserPromise = (async () => {
    if (process.env.NODE_ENV === "development") {
      // Local dev: use whatever Chromium playwright-core can find locally.
      // Run `npx playwright install chromium` once to install it.
      return chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-dev-shm-usage"],
      });
    }

    // Production / Vercel: use @sparticuz/chromium (Lambda-compatible binary)
    const sparticuzChromium = await import("@sparticuz/chromium");

    return chromium.launch({
      args: sparticuzChromium.default.args,
      executablePath: await sparticuzChromium.default.executablePath(),
      headless: true, // sparticuz sets headless via args, but be explicit
    });
  })();

  return browserPromise;
}
```

### Key points

- **Dynamic import** of `@sparticuz/chromium` is required. Static top-level imports cause issues with Next.js bundling because `@sparticuz/chromium` does runtime filesystem operations to resolve the binary path. A dynamic `import()` inside the async function defers this correctly.
- **The singleton pattern** (`browserPromise ??= ...`) is preserved from the original. The browser instance is reused across requests within the same Lambda warm instance — this is still correct and desirable.
- **Remove `findCachedChromiumExecutable()`** entirely. That function scanned Windows `%LOCALAPPDATA%` paths and is irrelevant on Vercel. `@sparticuz/chromium` handles its own binary resolution via `executablePath()`.
- **The `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` env var** can be removed from the codebase and from `vercel.json` / local `.env` if present — `@sparticuz/chromium` does not use it.

### What NOT to change

Everything below the `getBrowser()` function stays identical:

- `waitForTemplateLayout()` — unchanged
- `buildPrintCss()` — unchanged
- The `POST` handler body (validation, template loading, rendering, `page.setContent`, `page.pdf`, response construction, `finally { page.close() }`) — all unchanged

---

## Step 3 — Update `next.config.ts`

Next.js must be told not to bundle `@sparticuz/chromium` and `playwright-core` — they must remain as external Node.js modules so their native binaries and runtime file resolution work correctly.

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],

  // ... rest of your existing config unchanged
};

export default nextConfig;
```

> If you are on Next.js 13 with the Pages Router (not App Router), use the legacy key instead:
> ```ts
> experimental: {
>   serverComponentsExternalPackages: ["@sparticuz/chromium", "playwright-core"],
> }
> ```
> This project uses App Router (confirmed by `src/app/api/...` path), so use `serverExternalPackages`.

---

## Step 4 — Update `vercel.json`

Chromium requires more memory than Vercel's default 1024 MB, and PDF generation can take several seconds. Set both `memory` and `maxDuration` on the PDF function.

```json
{
  "functions": {
    "src/app/api/export/pdf/route.ts": {
      "memory": 3009,
      "maxDuration": 60
    }
  }
}
```

> **Memory note:** `@sparticuz/chromium` recommends 1536–3009 MB. 3009 MB is the maximum on Vercel Pro. If you're on the Hobby plan, the max is 1024 MB — use that, but be aware very large resumes with many pages may hit memory limits.
>
> **maxDuration note:** 60 seconds is the max on Vercel Pro for serverless functions. The PDF generation step itself typically takes 3–8 seconds; the rest of the budget covers cold starts and Chromium launch time (~2–4 s on Lambda).

---

## Step 5 — Verify Local Dev Still Works

After the change, local development requires a local Chromium installation for `playwright-core` to use (since `@sparticuz/chromium` is only used in production).

Run once after the package changes:

```bash
npx playwright install chromium
```

This installs Chromium into Playwright's local cache (e.g., `~/.cache/ms-playwright` on Linux/macOS or `%LOCALAPPDATA%\ms-playwright` on Windows). The `getBrowser()` function's `development` branch will find and use it automatically.

---

## Environment Variables

### Remove (no longer needed)
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` — was used by `findCachedChromiumExecutable()`; remove from `.env.local` and any Vercel environment variable settings
- `PLAYWRIGHT_BROWSERS_PATH` — same reason

### No new env vars required
`@sparticuz/chromium` resolves its binary path automatically based on the Lambda execution environment. No configuration needed.

---

## Expected Behaviour After Migration

| Scenario | Before | After |
|---|---|---|
| Local dev (`NODE_ENV=development`) | Uses `playwright` bundled Chromium | Uses `playwright-core` + locally installed Chromium (`npx playwright install chromium`) |
| Vercel production | ❌ Crashes — `browsers.json` not found | ✅ Uses `@sparticuz/chromium` Lambda binary |
| PDF output quality | Pixel-perfect A4 | Identical — same Chromium rendering engine |
| Multi-page resumes | Works | Works — `page.pdf()` behaviour unchanged |
| Browser singleton / reuse | Works | Works — same singleton pattern preserved |
| Page cleanup (`page.close()`) | Works | Works — unchanged |

---

## What This Does NOT Change

- The `page.pdf()` call and all its options (`printBackground`, `preferCSSPageSize`, `width`, `height`, `margin`) — unchanged
- The print CSS injection (`buildPrintCss()`) and all `.cv-scaler`, `.cv`, `@page` overrides — unchanged
- Template rendering (`buildTemplateSrcDoc`, `renderTemplate`) — unchanged
- The three-stage layout wait (`waitForSelector`, `document.fonts.ready`, 150ms settle) — unchanged
- Request validation (`isTemplateId`, `isResumeContent`) — unchanged
- Response headers (`Content-Disposition`, `Cache-Control`) — unchanged
- The client-side download trigger (`exportUtils.ts`) — unchanged

---

## Common Pitfalls to Avoid

1. **Do not statically import `@sparticuz/chromium` at the top of the file.** Always use a dynamic `import()` inside the async `getBrowser` function. Static imports run at module evaluation time, before the Lambda environment is fully ready.

2. **Do not pass `executablePath` in the dev branch.** Let `playwright-core` auto-detect the local Chromium. Hardcoding a path breaks cross-platform dev setups.

3. **Do not set `headless: 'new'`** with `@sparticuz/chromium`. The package sets headless mode via its own args. Passing `headless: true` (boolean) is safe; passing the string `'new'` may conflict.

4. **Do not add `@sparticuz/chromium` to `devDependencies`.** It must be in `dependencies` so Vercel includes it in the production build.

5. **Do not reset `browserPromise = null` on error** without also closing the broken browser. If the launch itself fails, the rejected promise will be cached. Add error recovery if needed:
   ```ts
   browserPromise = (async () => { ... })().catch((err) => {
     browserPromise = null; // Allow retry on next request
     throw err;
   });
   ```
