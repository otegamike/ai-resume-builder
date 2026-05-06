# Resumy AI Project Walkthrough

This document explains how the current system works end to end for contributors: architecture, boundaries, API contracts, and key user/data flows.

For setup and quick start, see [README.md](./README.md).  
For template engine internals, see [template.md](./template.md).

## 1) Architecture at a Glance
Resumy AI is a single Next.js 16 App Router codebase that contains:
- Frontend UI routes and client interactions
- Backend route handlers under `src/app/api/**/route.ts`
- Auth middleware and route-level authorization
- Database integration via Mongoose
- Template loading/rendering pipeline

High-level layers:
1. UI layer (`src/app`, `src/components`)
2. Client behavior hooks (`src/app/hooks/useAutoSave.ts`, `src/app/hooks/useAi.ts`)
3. API layer (`src/app/api/**`)
4. Service/util layer (`src/lib/**`)
5. Data model layer (`src/models/Resume.ts`)

## 2) Server vs Client Boundaries
Server-side:
- Route handlers in `src/app/api/**`
- `src/lib/db.ts` (Mongo connection, server-only)
- `src/lib/templateServer.ts` (reads template HTML from disk)
- `src/lib/ai.ts` (calls Groq API)
- `src/app/settings/page.tsx` (Server Component using `currentUser()`)

Client-side:
- Dashboard page (`src/app/dashboard/page.tsx`) fetches resumes/templates
- Editor page (`src/app/editor/[id]/page.tsx`) manages interactive state, autosave, and export
- Templates page (`src/app/templates/page.tsx`) fetches template definitions and renders previews
- Hooks `useAutoSave` and `useAi` run in the browser

## 3) Authentication and Access Control
- Middleware: `src/middleware.ts`
- Public routes: `/`, `/api/webhooks(.*)`
- All other matched routes are protected by Clerk `auth.protect()`
- API handlers also check `auth()` and return `401` if no user is present

This creates defense-in-depth: middleware protection plus per-handler auth checks.

## 4) Data Model and Shared Types
Resume document model (`src/models/Resume.ts`):
- `userId: string`
- `title: string`
- `template: string`
- `content: TemplateData`
- timestamps enabled (`createdAt`, `updatedAt`)

Shared editing/rendering type (`src/types/ResumeData.ts`):
- `ResumeContent` containing:
  - `personalInfo`
  - `summary`
  - `experience[]` (with `description: string[]`)
  - `education[]`
  - `skills[]`

`TemplateData` is currently an alias of `ResumeContent` in `src/lib/templateCatalog.ts`.

## 5) API Contracts
### `GET /api/resumes`
- Auth required
- Returns current user resumes sorted by `updatedAt desc`
- Errors: `401`, `500`

### `POST /api/resumes`
- Auth required
- Body: `{ title, content, template? }`
- Validation: `title` and `content` required (`400` if missing)
- Creates resume with fallback template `template1`
- Returns `{ id, content, status: 201 }`
- Errors: `401`, `400`, `500`

### `GET /api/resumes/:id`
- Auth required
- Special case: `id === "new"` returns `404`
- Returns resume only if owned by authenticated user
- Errors: `401`, `404`, `500`

### `PUT /api/resumes/:id`
- Auth required
- Body: `{ title, content, template? }`
- Validation: `title` and `content` required (`400` if missing)
- Updates owned resume and sets `updatedAt`
- Returns updated resume
- Errors: `401`, `400`, `404`, `500`

### `DELETE /api/resumes/:id`
- Auth required
- Deletes owned resume
- Returns `{ message: 'Resume deleted successfully' }`
- Errors: `401`, `404`, `500`

### `GET /api/templates`
- Returns all template definitions with HTML populated from `src/templates_formatted/*.html`
- Runtime explicitly `nodejs`
- Errors: `500`

### `GET /api/templates/:id`
- Validates template ID via `isTemplateId`
- Returns one template definition with HTML
- Errors: `404` for invalid ID, `500` for load failure

### `POST /api/ai/generate`
- Auth required
- Body: `{ type, data }`
- Supported `type` values:
  - `generateSummary`
  - `generateBulletPoints`
  - `improveSummary`
  - `generateSkills`
- Returns `{ result }` where `result` is string or string[]
- Errors: `401`, `400` invalid type, `500`

### `POST /api/upload`
- Accepts multipart form data with `file`
- Uploads to Cloudinary folder `Resume`
- Returns `{ secure_url }`
- Errors: `400` missing file, `500`

## 6) End-to-End User Journeys
### A) New resume creation (`/editor/new`)
1. Editor boots with local `initialResume` and empty/new title
2. No autosave writes occur while `resumeId === 'new'`
3. First explicit save (`Save Draft`) triggers `POST /api/resumes`
4. Returned DB id replaces local `resumeId` in `useAutoSave`
5. Subsequent edits use debounced autosave via `PUT /api/resumes/:id`

### B) Existing resume edit (`/editor/:id`)
1. Editor fetches `/api/resumes/:id`
2. Loads `title`, `content`, and normalized `template`
3. Field edits update local state and schedule debounced autosave
4. Save indicator transitions: `idle -> saving -> saved` or `error`

### C) Template selection and preview
1. Editor fetches template definitions from `/api/templates`
2. Selected template is rendered via `buildTemplateSrcDoc(template.html, resume)`
3. Preview iframe receives rendered HTML using `srcDoc`
4. Template change persists via `saveTemplate(...)` (save with new template id)

### D) AI assist flow
1. UI actions call hook methods in `useAi`
2. Hook posts to `/api/ai/generate` with selected generation type
3. Response updates resume state (summary/skills/experience bullets)
4. Editor queues autosave for changed content

### E) Export flow (PDF/PNG)
1. Rendered template is written into hidden export iframe
2. `html2pdf.js` captures iframe document element
3. Export options:
  - PDF via `html2pdf().save()`
  - PNG via canvas data URL download

## 7) Template System Integration
- Template metadata is defined in `src/lib/templateCatalog.ts`
- Template HTML is loaded server-side from `src/templates_formatted`
- Rendering engine in `src/lib/templateRenderer.ts` resolves custom tokens and escapes values
- Legacy template labels (`modern`, `classic`, `minimal`, `creative`) are normalized to `template1..template4`

See [template.md](./template.md) for full syntax and extension guide.

## 8) Known Limitations / Implementation Notes
- `/templates` is currently protected by middleware (not publicly browsable).
- `POST /api/resumes` returns a JSON payload containing `status: 201` but HTTP status is not explicitly set to 201.
- `GET /api/resumes/:id` logs full resume objects to server console.
- Cloudinary upload route does not currently require auth in handler logic.
- `useAutoSave` skips debounced autosave until the first save creates an id.

## 9) Where to Extend the System
- Add new API behavior: create/extend `src/app/api/**/route.ts`
- Add model fields: update `src/types/ResumeData.ts`, `src/models/Resume.ts`, editor forms, and renderer/template usage
- Add template styles/layouts: see the checklist in [template.md](./template.md)
- Add new AI actions: extend `src/lib/ai.ts`, `/api/ai/generate`, and `useAi`

## 10) Quick Troubleshooting
- `401 Unauthorized`: verify Clerk session and route protection expectations.
- Template preview blank: check `/api/templates` response and template HTML load.
- Autosave not firing on new resume: expected until initial save creates real id.
- AI errors: verify `GROQ_API_KEY` and provider availability.
- Upload failures: verify Cloudinary credentials and file payload.
