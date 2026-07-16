# Agentic CV Project Walkthrough

This document describes the current Agentic CV system: architecture, boundaries, data flows, API groups, and major user journeys.

For a product-level overview, see [README.md](./README.md).  
For template rendering internals, see [template.md](./template.md).

## 1) Architecture at a Glance

Agentic CV is a single Next.js 16 App Router application. It contains:
- Public marketing and auth pages.
- Authenticated dashboard and editor experiences.
- Backend route handlers under `src/app/api/**/route.ts`.
- NextAuth session handling with Google OAuth and credentials login.
- MongoDB persistence through Mongoose models.
- AI workflows for resume writing, ATS review, tailoring, cover letters, and vision-assisted extraction.
- Static HTML resume templates rendered into browser iframes.

High-level layers:
1. UI routes and layouts in `src/app`.
2. Shared UI components in `src/components`.
3. Browser workflow hooks in `src/app/hooks`.
4. API route handlers in `src/app/api`.
5. Service utilities in `src/lib`.
6. Data models in `src/models`.
7. Domain types in `src/types`.

## 2) Server and Client Boundaries

Server-side responsibilities:
- NextAuth configuration in `src/lib/auth.ts`.
- Session-to-user resolution in `src/lib/authUser.ts`.
- MongoDB connection caching in `src/lib/db.ts`.
- Template HTML loading in `src/lib/templateServer.ts`.
- AI provider calls and normalization in `src/lib/ai.ts`.
- Resume PDF/image text extraction helpers in `src/lib/resumeImprover.ts`.
- Route handlers in `src/app/api/**`.
- Server-rendered settings pages that read the current session.

Client-side responsibilities:
- Dashboard overview and navigation state.
- Resume editor state, autosave, AI action buttons, template selection, and export triggers.
- Resume, cover-letter, application, ATS improver, and tailoring screens.
- Zustand stores for templates, resumes, and alerts.
- Template previews rendered in iframes with `srcDoc`.

There is no active `src/middleware.ts` route-protection layer in the current tree. Protected behavior is handled in pages through `useSession()` redirects and in API handlers through server-session checks.

## 3) Authentication and User Ownership

Authentication uses NextAuth:
- Google OAuth provider.
- Credentials provider backed by stored password hashes.
- JWT session strategy.
- Custom session fields for `id`, `isAdmin`, `subscriptionPlan`, `AiCredits`, and Gmail connection status.

User lookup and ownership are centralized in `src/lib/authUser.ts`:
- `getAuthenticatedUser()` reads the server session, upserts/fetches a `User`, and returns both the Mongo `_id` and legacy session id.
- `buildResumeOwnerQuery()` supports both the current `user` ObjectId ownership field and older `userId` records.

Most API handlers return `401` when no authenticated user is available. Admin routes additionally require `session.user.isAdmin`.

## 4) Data Model and Shared Types

### User

`User` stores:
- Name, email, image.
- Optional password hash.
- Auth providers and OAuth account metadata.
- Admin status.
- Subscription plan/status/id.
- AI credits and credit rate limit.
- Gmail access/refresh tokens and token expiry.

### Resume

`Resume` stores:
- `userId` legacy owner string.
- `user` current owner ObjectId.
- `title`.
- `template`.
- `content`.
- timestamps.

`content` follows `ResumeContent`, which includes:
- `personalInfo` with name, structured full name, job title, contact fields, website, and optional photo.
- `summary`.
- `experience[]` with bullet descriptions.
- `education[]`.
- `projects[]`.
- `skills[]`.
- optional `skillCategories[]`.
- optional `skillCategorized`.

### CoverLetter

`CoverLetter` stores:
- Owner fields.
- Title.
- Target company and target role.
- Generated or edited content.
- Optional linked resume.
- Job description.
- Draft/final status.

### Application

`Application` stores:
- Owner fields.
- Company and role.
- Status: `saved`, `applied`, `interviewing`, `offered`, `rejected`, or `withdrawn`.
- Applied date, notes, and job URL.
- Optional linked resume and cover letter.
- Optimization notes, before/after match scores, and explanation.

## 5) Template System

Templates are static HTML documents stored in `src/templates_formatted`.

Current catalog:
- `template1` Emerald
- `template2` Copper
- `template3` Sandstone
- `template4` Monochrome
- `template5` Aurora
- `template6` Rose
- `template7` Slate
- `template8` Ember
- `template9` Indigo
- `template10` Cascade
- `template11` Noir
- `template12` Citrine
- `template13` Sapphire
- `template14` Terra
- `template15` Mist
- `template16` Pewter
- `template17` Bloom
- `template18` Amber
- `template19` Obsidian
- `template20` Ivory

Rendering flow:
1. `src/lib/templateCatalog.ts` defines metadata and page dimensions.
2. `src/lib/templateServer.ts` reads the matching HTML file on the server.
3. `src/lib/templateRenderer.ts` resolves variables, array sections, conditionals, and current-context tokens.
4. Rendered HTML is injected into iframes in the editor, dashboard cards, and template galleries.

Legacy template ids are normalized by `normalizeTemplateId()`: `modern`, `classic`, `minimal`, and `creative` map to the first four templates, while unknown values fall back to `template1`.

## 6) API Groups

### Auth

- `POST /api/auth/signup` creates credentials users.
- `/api/auth/[...nextauth]` handles NextAuth sign-in/session routes.
- `GET /api/auth/gmail/connect` starts Gmail OAuth.
- `GET /api/auth/gmail/callback` stores Gmail tokens on the user.

### Resumes

- `GET /api/resumes` returns current-user resumes sorted by `updatedAt desc`, with ETag support.
- `POST /api/resumes` creates a resume and returns HTTP `201`.
- `GET /api/resumes/:id` returns an owned resume or `404`.
- `PUT /api/resumes/:id` updates an owned resume.
- `DELETE /api/resumes/:id` deletes an owned resume.

### Templates

- `GET /api/templates` returns all template definitions with HTML populated.
- `GET /api/templates/:id` validates and returns one template definition.

Both template routes run in the Node.js runtime because they read template files from disk.

### Inline Resume AI

`POST /api/ai/generate` supports:
- `generateSummary`.
- `generateBulletPoints`.
- `improveSummary`.
- `generateSkills`.
- `generateCategorizedSkills`.
- `categorizeExistingSkills`.

### ATS Improver

- `POST /api/resume-improver/upload` accepts PDF/image uploads, extracts text, analyzes ATS readiness, and returns an ATS report.
- `POST /api/resume-improver/resume/:id` analyzes an existing saved resume.
- `POST /api/resume-improver/create` saves an improved resume produced by ATS analysis or tailoring.

### Tailoring

- `POST /api/resume-tailor` accepts a saved or uploaded resume plus job context as text or image, then returns a tailoring report with before/after match scores and a tailored resume.

### Cover Letters

- `GET /api/cover-letters` lists current-user cover letters.
- `POST /api/cover-letters` creates a cover letter record.
- `GET /api/cover-letters/:id` fetches one owned cover letter.
- `PUT /api/cover-letters/:id` updates one owned cover letter.
- `DELETE /api/cover-letters/:id` deletes one owned cover letter.
- `POST /api/cover-letters/generate` generates and stores a cover letter with AI.

### Applications

- `GET /api/applications` lists current-user applications and enriches records with cover-letter content and resume content/template.
- `POST /api/applications` creates an application record.
- `GET /api/applications/:id` fetches an application with related generated content.
- `PUT /api/applications/:id` updates an application.
- `DELETE /api/applications/:id` deletes an application.
- `POST /api/applications/quick-apply` runs tailoring and cover-letter generation together, then saves the tailored resume, cover letter, and application.
- `POST /api/applications/send` sends application email through the user's connected Gmail account.

### Analytics and Admin

- `POST /api/analytics/track` records site visits.
- `GET /api/dashboard/stats` returns user-level dashboard counts and recent activity.
- `GET /api/admin/stats` returns admin-only aggregate metrics.
- `GET /api/admin/stats/timeline` returns admin-only timeline metrics.

### Uploads

- `POST /api/upload` uploads an image file to Cloudinary and returns its secure URL.

## 7) Main User Journeys

### New resume creation

1. User opens `/editor/new`.
2. Editor initializes local resume state and selected template.
3. Debounced autosave is skipped while the resume id is `new`.
4. User explicitly saves a draft.
5. `POST /api/resumes` creates the resume.
6. The returned database id becomes the active editor id.
7. Later edits autosave with `PUT /api/resumes/:id`.

### Existing resume editing

1. User opens `/editor/:id`.
2. Editor fetches the resume and templates.
3. Resume content, title, and normalized template id hydrate editor state.
4. Field edits update local state immediately.
5. Autosave queues a debounced API update.
6. Preview iframe re-renders from the selected template and current resume state.

### Template selection

1. Editor or template browser fetches `/api/templates`.
2. User selects a template id.
3. Template id is normalized and stored.
4. Current resume content is rendered into the selected template HTML.
5. Template choice is persisted with the resume.

### Inline AI writing

1. User triggers an AI action in the editor.
2. `useAi()` posts to `/api/ai/generate`.
3. Server calls Groq through `src/lib/ai.ts`.
4. Result is normalized and returned.
5. Editor applies the generated text/list to resume state.
6. Autosave persists the change when applicable.

### ATS improvement

1. User selects a saved resume or uploads a PDF/image.
2. Server extracts readable resume text.
3. AI returns an ATS report, issues, recommended keywords, parsed resume, and improved resume.
4. User can create a new improved resume from the report.

### Resume tailoring

1. User selects or uploads a resume.
2. User provides a job description as text or image.
3. Server extracts resume and job text.
4. AI returns match scores, explanation, key changes, and tailored resume content.
5. User can save the tailored resume as a new resume.

### Quick apply

1. User provides resume source and job context.
2. Server runs resume tailoring and cover-letter generation in parallel.
3. App saves the tailored resume and generated cover letter.
4. App creates an application record linking both artifacts.
5. User can copy/export/send the result.

### Export

1. Editor renders current resume content into template HTML.
2. A hidden export iframe receives the rendered HTML.
3. PDF export uses `html2pdf.js` against the iframe document.
4. Image export captures the rendered output as a downloadable image.

## 8) AI Workflows

`src/lib/ai.ts` contains several workflow families:
- Resume writing helpers for summaries, bullets, skills, and categorized skills.
- ATS analysis that returns structured JSON.
- Resume tailoring that returns structured JSON and normalized resume content.
- Cover-letter generation that returns structured JSON.
- Vision-assisted extraction for resume images and job-description images.

The code includes JSON parsing fallbacks and normalization helpers to reduce malformed AI-output failures.

## 9) Operational Notes

- `MONGODB_URI` defaults to `mongodb://localhost:27017/resumy-ai`; the connection uses database name `Resumy`.
- Most protected APIs rely on `getAuthenticatedUser()` rather than middleware.
- Google OAuth credentials are used for both sign-in and Gmail sending.
- Gmail send requires the user to connect Gmail first so tokens are stored on the user record.
- Cloudinary is used by `/api/upload` for image uploads.
- Template routes require Node.js runtime because file-system reads are involved.
- Some console logging remains in AI/application flows and may be noisy in production logs.

## 10) Troubleshooting

- `401 Unauthorized`: verify the user has an active NextAuth session.
- Google sign-in issues: verify `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_URL`, and callback configuration.
- Gmail send returns `403`: connect Gmail from the app before sending.
- Template preview is blank: check `/api/templates`, the selected template id, and the matching file in `src/templates_formatted`.
- Autosave does not run for a new resume: expected until the first explicit save creates a database id.
- AI routes fail: verify `GROQ_API_KEY` and provider/model availability.
- Resume upload analysis fails: verify file type, readable PDF text, or image quality.
- Cloudinary upload fails: verify Cloudinary credentials and multipart `file` payload.

