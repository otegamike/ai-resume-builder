# Agent Task: Implement Groq Error Handling Across the Project

## Context

This is a Next.js AI resume builder that uses the Groq SDK for AI features.
The core AI service file is at `lib/ai-service.ts` (or wherever `analyzeResumeForAts`,
`generateWithAI`, and related functions live — locate it before doing anything else).

A new error handling layer has been designed. Your job is to implement it cleanly
without breaking any existing functionality.

---

## Step 0 — Explore First, Touch Nothing Yet

Before writing a single line, do ALL of the following:

1. Find the AI service file (search for `analyzeResumeForAts` if unsure of its path)
2. Find every API route that calls functions from the AI service file
3. Find every frontend component or hook that calls those API routes and displays
   errors to the user
4. Check whether an `AppError` class or similar already exists anywhere in the codebase
5. Check whether the project uses a central error-handling utility or middleware
6. Note the project's import alias (`@/`, `~/`, etc.)
7. Note whether the project uses the Next.js App Router (`app/`) or Pages Router (`pages/api/`)

Do not proceed until you have a clear map of all affected files.

---

## Step 1 — Add the Error Handling Utilities to the AI Service File

Add the following two constructs to the AI service file.
Place them near the top, after imports but before any functions.

### 1A — AppError class

```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}
```

**Rules:**
- Export it so API routes can import and check `instanceof AppError`
- If an `AppError` or equivalent already exists in the codebase, reuse it instead
  of creating a duplicate — just make sure it has `message`, `code`, and `statusCode`

### 1B — handleGroqError function

```typescript
function handleGroqError(error: unknown): never {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status: number }).status;
    const message =
      "message" in error && typeof (error as { message: unknown }).message === "string"
        ? (error as { message: string }).message
        : "";

    switch (status) {
      case 401:
        throw new AppError("Invalid API credentials.", "AUTH_ERROR", 401);

      case 429:
        if (message.toLowerCase().includes("quota")) {
          throw new AppError(
            "Daily usage limit reached. Please try again tomorrow.",
            "QUOTA_EXCEEDED",
            429
          );
        }
        throw new AppError(
          "Too many requests. Please wait a moment and try again.",
          "RATE_LIMITED",
          429
        );

      case 413:
        throw new AppError(
          "Your resume is too large to process. Try reducing the file size.",
          "PAYLOAD_TOO_LARGE",
          413
        );

      case 503:
      case 504:
        throw new AppError(
          "The AI service is temporarily unavailable. Please try again shortly.",
          "SERVICE_UNAVAILABLE",
          503
        );

      default:
        console.error("[Groq API Error]", { status, message });
        throw new AppError(
          "Something went wrong while processing your resume. Please try again.",
          "AI_ERROR",
          500
        );
    }
  }

  if (error instanceof TypeError && error.message.includes("fetch")) {
    throw new AppError(
      "Could not reach the AI service. Check your connection and try again.",
      "NETWORK_ERROR",
      503
    );
  }

  console.error("[Unknown AI Error]", error);
  throw new AppError(
    "An unexpected error occurred. Please try again.",
    "UNKNOWN_ERROR",
    500
  );
}
```

**Rules:**
- Keep this function private (no `export`) — only used internally by the service
- The return type `never` is intentional; do not change it

---

## Step 2 — Wrap All Groq SDK Calls with handleGroqError

Find every place in the AI service file where `groq.chat.completions.create(...)` is called.
Wrap each one in a try/catch that calls `handleGroqError(error)` in the catch block.

### Pattern to apply:

```typescript
// BEFORE
const completion = await groq.chat.completions.create({ ... });

// AFTER
let completion;
try {
  completion = await groq.chat.completions.create({ ... });
} catch (error) {
  handleGroqError(error);
}
```

If a unified `callGroq()` helper already exists (or you add one), it only needs
wrapping in one place — do not double-wrap if the call already goes through that helper.

**Rules:**
- Every raw `groq.chat.completions.create` call must be covered
- Do not swallow errors silently — always call `handleGroqError`, never just `console.error`
- Do not change function signatures, return types, or export names

---

## Step 3 — Update Every API Route

For each API route that calls AI service functions, apply this pattern:

### App Router (`app/api/.../route.ts`)

```typescript
import { AppError } from "@/lib/ai-service"; // adjust path to match project

export async function POST(req: Request) {
  try {
    // ... existing handler logic, unchanged ...
  } catch (error) {
    if (error instanceof AppError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    console.error("[API Route Error]", error);
    return Response.json(
      { error: "Something went wrong. Please try again.", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
```

### Pages Router (`pages/api/....ts`)

```typescript
import type { NextApiRequest, NextApiResponse } from "next";
import { AppError } from "@/lib/ai-service"; // adjust path to match project

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // ... existing handler logic, unchanged ...
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
    }

    console.error("[API Route Error]", error);
    return res.status(500).json({
      error: "Something went wrong. Please try again.",
      code: "SERVER_ERROR",
    });
  }
}
```

**Rules:**
- Wrap the entire existing handler body in try/catch — do not restructure the logic inside
- The `error.message` and `error.code` from `AppError` are already safe for the client;
  never forward raw SDK error messages or stack traces
- If a route already has a try/catch, nest the new catch outside it or merge carefully
  so the `AppError` check always runs last

---

## Step 4 — Update Frontend Error Display

Find every component, hook, or utility that:
- Calls an API route that uses the AI service
- Reads an error from the response
- Displays that error to the user (toast, inline message, alert, etc.)

The API now returns `{ error: string, code: string }` on failure.

Update the error-reading logic to use the `error` field from the response body
instead of relying on HTTP status text or a generic fallback string.

Example pattern — adjust to match the project's actual data-fetching style:

```typescript
const res = await fetch("/api/analyze-resume", { method: "POST", body: ... });

if (!res.ok) {
  const body = await res.json().catch(() => ({}));
  const message = body?.error ?? "Something went wrong. Please try again.";
  // show message in your existing toast/alert/state — do not change the UI structure
  showError(message);
  return;
}
```

**Rules:**
- Do not redesign the error UI — only update where the message string comes from
- Keep all existing loading states, success paths, and component structure intact
- If the project already reads `body.error` from responses, verify it still works
  with the new shape `{ error, code }` — it should, no change needed

---

## Step 5 — Verify Nothing Is Broken

After all changes, check the following:

1. **TypeScript** — run `tsc --noEmit`. Fix any type errors introduced by this change.
   Do not suppress errors with `any` unless absolutely unavoidable, and comment why.

2. **No silent swallows** — search the entire codebase for `catch` blocks that have
   only `console.log`, `console.error`, or are empty. Each one inside the AI service
   or API routes should now call `handleGroqError` or rethrow as `AppError`.

3. **No Groq internals exposed** — search for any `res.json(error)` or
   `res.json({ message: error.message })` patterns where `error` is the raw caught
   value (not an `AppError`). These must be replaced with the safe fallback response.

4. **Export check** — confirm `AppError` is exported from the service file and that
   all API routes import it from the correct path.

5. **Existing tests** — if the project has tests, run them and fix any failures
   caused by this change. Do not delete tests.

---

## Hard Constraints

- **Do not rename, move, or delete any existing functions or files**
- **Do not change any function signatures or return types**
- **Do not change any UI layout, component structure, or styling**
- **Do not install new packages** — everything needed is already available
- **Do not add retry logic** — the existing retry in `analyzeResumeForAts` is sufficient
- **Only modify**: the AI service file, API route files, and frontend error-reading logic
- If you are unsure whether a change is safe, do it minimally and note the uncertainty
