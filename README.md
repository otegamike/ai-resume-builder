# Agentic CV

Agentic CV is a full-stack resume and job-application workspace built with Next.js. It helps users create ATS-friendly resumes, preview them in polished HTML templates, improve and tailor them with AI, generate cover letters, track applications, and export finished documents.

For deeper architecture details, see [PROJECT_WALKTHROUGH.md](./PROJECT_WALKTHROUGH.md).  
For template rendering details, see [template.md](./template.md).

## Product Scope

Agentic CV currently includes:
- Resume creation and editing with autosave.
- Live resume previews rendered from static HTML templates.
- PDF and image export from the selected resume template.
- AI-assisted summary, skills, categorized skills, and experience bullet generation.
- ATS resume analysis from saved resumes, uploaded PDFs, or resume images.
- AI resume tailoring against a job description or job-description image.
- Cover letter generation and saved cover letter history.
- Application tracking with status, notes, related resume, related cover letter, and quick-apply output.
- Gmail connection for sending application emails.
- Dashboard analytics and an admin statistics area.

## Technology Stack

- Framework: Next.js `16.2.3` App Router.
- UI: React `19`, CSS Modules, global CSS variables, `lucide-react`, `motion`, and `recharts`.
- Language: TypeScript.
- Authentication: NextAuth with Google OAuth and credentials login.
- Database: MongoDB with Mongoose.
- AI: Groq SDK, including text-generation, structured JSON, and vision-capable workflows.
- Uploads: Cloudinary for image uploads.
- Resume parsing: `pdfjs-dist` for PDF text extraction plus AI vision fallback for image/scanned inputs.
- Export: `html2pdf.js` for PDF export and canvas-based image export.
- State: Zustand stores plus local editor hooks.

## Main User Areas

Public routes:
- `/` - marketing landing page.
- `/pricing` - pricing page.
- `/auth/login` - sign in and sign up entry point.
- `/auth/gmail/success` - Gmail connection confirmation.

Authenticated app routes:
- `/dashboard` - career hub overview with stats, recent activity, and quick actions.
- `/dashboard/resumes` - saved resume library.
- `/dashboard/templates` - template browsing inside the dashboard.
- `/dashboard/writer` - cover letter writer.
- `/dashboard/applications` - application tracker and quick-apply workflow.
- `/dashboard/improve` - ATS resume analysis and improved-resume creation.
- `/dashboard/tailor` - job-specific resume tailoring.
- `/dashboard/settings` - account settings.
- `/dashboard/admin` - admin analytics for admin users.
- `/editor/new` - create a new resume.
- `/editor/:id` - edit an existing resume.
- `/templates` - standalone template gallery.
- `/settings` - account settings page outside the dashboard shell.

## Backend API Surface

Core API groups:
- `/api/auth/[...nextauth]` - NextAuth route handler.
- `/api/auth/signup` - credentials-account registration.
- `/api/auth/gmail/connect` and `/api/auth/gmail/callback` - Gmail OAuth connection.
- `/api/resumes` and `/api/resumes/:id` - resume CRUD.
- `/api/templates` and `/api/templates/:id` - template metadata and HTML loading.
- `/api/ai/generate` - inline resume-writing assistance.
- `/api/resume-improver/*` - ATS analysis and improved-resume creation.
- `/api/resume-tailor` - AI tailoring against job context.
- `/api/cover-letters` and `/api/cover-letters/:id` - cover letter CRUD.
- `/api/cover-letters/generate` - AI cover letter generation.
- `/api/applications` and `/api/applications/:id` - application CRUD.
- `/api/applications/quick-apply` - creates a tailored resume, cover letter, and application record together.
- `/api/applications/send` - sends an application email through connected Gmail.
- `/api/dashboard/stats` - user dashboard metrics.
- `/api/admin/stats` and `/api/admin/stats/timeline` - admin metrics.
- `/api/analytics/track` - site visit tracking.
- `/api/upload` - Cloudinary upload endpoint for resume/editor images.

## Data Model

The app persists four main MongoDB models:
- `User` - profile, auth providers, admin flag, subscription metadata, AI credits, and Gmail tokens.
- `Resume` - owner, title, selected template, and structured resume content.
- `CoverLetter` - owner, target company/role, related resume, generated content, and draft/final status.
- `Application` - owner, company, role, status, related resume/cover letter, job URL, optimization notes, and match scores.

Resume content is shared through `ResumeContent`, which includes personal info, summary, experience, education, projects, flat skills, and optional categorized skills.

## Template System

Templates are static HTML files in `src/templates_formatted`. The active catalog currently defines `template1` through `template20`, including Emerald, Copper, Sandstone, Monochrome, Aurora, Rose, Slate, Ember, Indigo, Cascade, Noir, Citrine, Sapphire, Terra, Mist, Pewter, Bloom, Amber, Obsidian, and Ivory.

The runtime template flow is:
1. Template metadata comes from `src/lib/templateCatalog.ts`.
2. Server code loads matching HTML files through `src/lib/templateServer.ts`.
3. `src/lib/templateRenderer.ts` resolves custom tokens, array sections, conditionals, and escaped values.
4. The editor, dashboard, and template gallery inject rendered HTML into iframes.

See [template.md](./template.md) for syntax and export-specific behavior.

## Configuration

Important environment variables:

```bash
# App/auth
AUTH_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...

# Google OAuth and Gmail send
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Database
MONGODB_URI=mongodb://localhost:27017/resumy-ai

# AI
GROQ_API_KEY=...

# Uploads
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

Notes:
- `src/lib/db.ts` falls back to `mongodb://localhost:27017/resumy-ai` when `MONGODB_URI` is not set.
- AI routes fail when `GROQ_API_KEY` is missing or left as the placeholder value.
- Google credentials power both normal Google sign-in and Gmail-send authorization.

## Scripts

```bash
npm run dev      # start local development server
npm run build    # build production app
npm run start    # start production server
npm run lint     # run ESLint
npm run test     # run Vitest
```

## Repository Layout

- `src/app` - App Router pages, layouts, and API route handlers.
- `src/components` - shared UI, dashboard, application, cover-letter, resume, header, and landing-page components.
- `src/app/hooks` - editor and browser-side workflow hooks.
- `src/lib` - server utilities for auth, database, AI, templates, and resume parsing.
- `src/models` - Mongoose models.
- `src/store` - Zustand stores.
- `src/types` - shared domain types.
- `src/utils` - export, template, formatting, layout, and date helpers.
- `src/templates_formatted` - static resume template HTML files.

## Current Documentation Notes

- [PROJECT_WALKTHROUGH.md](./PROJECT_WALKTHROUGH.md) describes system flows and API behavior.
- [template.md](./template.md) describes template syntax and rendering internals; it may need a follow-up refresh for the newer templates beyond `template12`.

