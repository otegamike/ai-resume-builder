# Resumy AI Contributor Guide

Resumy AI is a full-stack Next.js 16 App Router application for building ATS-friendly resumes with live template previews, AI writing assistance, autosave, and export tools.

This README is the contributor entrypoint. For deep dives:
- Architecture and request/data flows: [PROJECT_WALKTHROUGH.md](./PROJECT_WALKTHROUGH.md)
- Template engine internals: [template.md](./template.md)

## Stack
- Framework: Next.js `16.2.3` (App Router) + React `19`
- Language: TypeScript
- Auth: Clerk (`@clerk/nextjs`)
- Database: MongoDB + Mongoose
- AI: Groq SDK (`llama-3.1-8b-instant`)
- Media upload: Cloudinary
- Resume export: `html2pdf.js`

## Prerequisites
- Node.js 20+
- npm 10+
- MongoDB instance (local or hosted)
- Clerk app credentials
- Groq API key
- Cloudinary account credentials

## Environment Variables
Create `.env.local` with:

```bash
# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...

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
- `src/lib/db.ts` falls back to `mongodb://localhost:27017/resumy-ai` if `MONGODB_URI` is unset.
- AI endpoints fail if `GROQ_API_KEY` is missing or placeholder.

## Local Development
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Scripts:
- `npm run dev`: start dev server
- `npm run build`: production build
- `npm run start`: run production server
- `npm run lint`: run ESLint

## Route Map
UI routes:
- `/`: landing page (public)
- `/dashboard`: resume dashboard (protected)
- `/editor/new`: create new resume (protected)
- `/editor/:id`: edit existing resume (protected)
- `/templates`: gallery page (protected by middleware)
- `/settings`: account settings (protected)

API routes:
- `GET /api/resumes`: list current user resumes
- `POST /api/resumes`: create resume
- `GET /api/resumes/:id`: fetch one resume
- `PUT /api/resumes/:id`: update one resume
- `DELETE /api/resumes/:id`: delete one resume
- `GET /api/templates`: list template definitions + HTML
- `GET /api/templates/:id`: fetch one template definition + HTML
- `POST /api/ai/generate`: generate summary/skills/bullets/improvements
- `POST /api/upload`: upload image to Cloudinary

## Authentication Model
`src/middleware.ts` uses Clerk middleware and protects all app/API routes except:
- `/`
- `/api/webhooks(.*)`

Route handlers also enforce auth with `auth()` checks and return `401` when no `userId` is present.

## How This App Is Organized
- `src/app`: pages, layouts, route handlers (`api/**/route.ts`)
- `src/components`: shared UI and page sections
- `src/lib`: server utilities (DB, AI, templates)
- `src/models`: Mongoose schemas/models
- `src/types`: shared TypeScript domain types
- `src/templates_formatted`: template HTML source files rendered in iframes

Start with:
- [PROJECT_WALKTHROUGH.md](./PROJECT_WALKTHROUGH.md) for architecture, data flow, and operational behavior
- [template.md](./template.md) for template syntax and rendering internals

## Contributor Quick Answers
- Where does resume data live? MongoDB (`Resume` model in `src/models/Resume.ts`).
- How is data saved? Editor uses `useAutoSave` + `/api/resumes` CRUD routes.
- Where are AI actions wired? `useAi` hook + `POST /api/ai/generate` + `src/lib/ai.ts`.
- How are templates rendered? `src/lib/templateRenderer.ts` + iframe `srcDoc`.

## Important Next.js Note
This project uses a non-legacy Next.js version with potential behavior differences from older examples. Before major framework-level changes, review relevant docs under:
- `node_modules/next/dist/docs/`
