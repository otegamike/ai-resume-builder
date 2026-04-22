# Resumy AI Project Walkthrough

## High-Level Summary

This project is a Next.js 16 App Router application. It is not split into a traditional MERN-style `client/` and `server/` structure. Next.js combines routing, rendering, and backend entry points in one codebase.

For a MERN developer, the main mindset shift is:

- React UI, route definitions, and backend endpoints can all live in the same app.
- `src/app` is a Next.js convention and should stay named `app`.
- Server-rendered pages, client-rendered components, API endpoints, and database logic are composed together instead of being deployed as separate frontend and backend apps.

## Current Top-Level Structure

```text
ai-resume-builder/
|-- public/
|-- src/
|   |-- app/
|   |   |-- dashboard/
|   |   |   |-- layout.tsx
|   |   |   `-- page.tsx
|   |   |-- editor/
|   |   |   `-- [id]/
|   |   |       `-- page.tsx
|   |   |-- settings/
|   |   |   `-- page.tsx
|   |   |-- favicon.ico
|   |   |-- globals.css
|   |   |-- layout.tsx
|   |   `-- page.tsx
|   |-- components/
|   |   `-- ui/
|   |       |-- Button.tsx
|   |       |-- Card.tsx
|   |       `-- Input.tsx
|   |-- lib/
|   |   `-- db.ts
|   `-- models/
|       `-- Resume.ts
|-- next.config.ts
|-- package.json
|-- tsconfig.json
`-- PROJECT_WALKTHROUGH.md
```

## Routing and Layouts

Next.js App Router uses the filesystem as the router:

- `src/app/page.tsx` -> `/`
- `src/app/dashboard/page.tsx` -> `/dashboard`
- `src/app/settings/page.tsx` -> `/settings`
- `src/app/editor/[id]/page.tsx` -> `/editor/:id`

Layouts define shared shells:

- `src/app/layout.tsx` is the root layout for the whole app.
- `src/app/dashboard/layout.tsx` wraps dashboard routes only.

When a user visits `/dashboard`, Next renders:

1. `src/app/layout.tsx`
2. `src/app/dashboard/layout.tsx`
3. `src/app/dashboard/page.tsx`

That is different from a typical React SPA using `react-router-dom`, where route config is usually declared in code rather than folders.

## Frontend Structure

### `src/app/page.tsx`

The landing page for the public site.

Important notes:

- It is a Server Component by default.
- It uses `next/link` for navigation.
- It uses `next/image` for optimized image rendering.
- It uses the shared `Button` component from `src/components/ui/Button.tsx`.

### `src/app/dashboard/page.tsx`

The dashboard screen.

Current state:

- It renders dummy data.
- It is not querying MongoDB yet.
- The file itself notes that auth/db integration is still pending.

### `src/app/editor/[id]/page.tsx`

The main resume editor.

This file starts with `"use client"`, which means it is a Client Component and runs in the browser.

That is why it can use:

- `useState`
- `onChange`
- local interactive form editing

Current behavior:

- stores resume data in React state
- updates form fields locally
- re-renders the live preview from the same state

Current limitation:

- it does not load from MongoDB
- it does not save to MongoDB
- it does not call any route handler or server action

So this editor is currently interactive, but not yet persistent.

### `src/components/ui`

This folder contains reusable UI primitives:

- `Button.tsx`
- `Input.tsx`
- `Card.tsx`

Think of this as the shared component layer.

## Styling

### `src/app/globals.css`

This file sets:

- Tailwind import
- global theme variables
- color tokens
- font tokens
- base body styling

It acts as the global stylesheet for the entire application.

## Backend Layer Inside Next.js

This project already has backend-oriented files even though there is no separate Express server.

### `src/lib/db.ts`

This is the MongoDB connection helper.

Responsibilities:

- reads `process.env.MONGODB_URI`
- falls back to a local MongoDB URL for development
- connects with Mongoose
- caches the connection on `global` for dev/hot-reload stability

This file is server-only infrastructure.

### `src/models/Resume.ts`

This is the Mongoose model definition.

Responsibilities:

- defines the resume document structure
- defines nested `personalInfo`
- defines arrays for `experience`, `education`, and `skills`
- exports a reusable `Resume` model safely across reloads

This is equivalent to a model file in a traditional Node/Express backend.

## How the Backend Connects to the Frontend Right Now

Right now, it does not connect yet.

The project contains:

- a MongoDB connector
- a Mongoose model

But it does not yet contain:

- `src/app/api/**/route.ts` API endpoints
- server actions for save/update
- server-side data fetching from MongoDB into pages
- client `fetch()` calls into Next backend routes
- authentication that ties resumes to a real user

So the backend layer is scaffolded, but not wired into the UI.

## Where MongoDB Would Connect to the Frontend

In a Next.js App Router app, there are three common connection patterns.

### Option 1: Route Handlers

Example files:

```text
src/app/api/resumes/route.ts
src/app/api/resumes/[id]/route.ts
```

Flow:

1. The client calls `fetch("/api/resumes")`
2. The route handler runs on the server
3. The route handler imports `connectToDatabase` from `src/lib/db.ts`
4. The route handler imports `Resume` from `src/models/Resume.ts`
5. MongoDB is queried or updated
6. JSON is returned to the frontend

This is the closest equivalent to Express routes inside a Next app.

### Option 2: Server Components

Flow:

1. A page or layout runs on the server
2. It imports `connectToDatabase()` and `Resume` directly
3. It fetches from MongoDB during render
4. It passes plain data down to client components as props

This is usually the preferred approach for initial reads in App Router because it avoids an unnecessary internal HTTP request.

### Option 3: Server Actions

Flow:

1. A client form triggers a server action
2. The action runs on the server
3. It imports `connectToDatabase()` and `Resume`
4. It writes to MongoDB
5. The UI is refreshed or revalidated

This is often the cleanest option for create/update/delete form submissions.

## How This Differs From Traditional MERN

Traditional MERN often looks like this:

- React frontend
- Express backend
- API routes in Express
- Mongoose models in the server app

This Next.js project looks like this instead:

- React UI in `src/app` and `src/components`
- backend entry points would live in `src/app/api/**/route.ts` or server actions
- Mongo connection logic lives in `src/lib/db.ts`
- Mongoose models live in `src/models`

So Next.js is acting as both:

- the frontend framework
- the backend-for-frontend layer

## What Runs on the Server vs Client

### Server by default

- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/dashboard/layout.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/settings/page.tsx`

These can fetch secure data and use server-side resources as long as they stay Server Components.

### Client-side

- `src/app/editor/[id]/page.tsx`

This runs in the browser because it uses `"use client"` and React state.

### Server-only modules

- `src/lib/db.ts`
- `src/models/Resume.ts`

These should stay on the server side of the app.

## Actual Data Flow Today

The editor currently works like this:

```text
Form input -> React state -> Live preview
```

That means:

- the input controls update local state
- the preview reads from that same state
- nothing is persisted after a refresh

The future full-stack flow would look like this:

```text
Form input -> React state -> route handler or server action -> db.ts -> Resume model -> MongoDB
```

And reads would look like this:

```text
MongoDB -> Resume model -> server component or route handler -> props/UI
```

## File-by-File Notes

### `src/app/layout.tsx`

- root HTML shell
- metadata
- font loading
- wraps all routes

### `src/app/dashboard/layout.tsx`

- sidebar shell for dashboard routes
- isolates dashboard UI from landing page UI

### `src/lib/db.ts`

- Mongo connection bootstrap
- connection reuse/caching
- should only be imported from server contexts

### `src/models/Resume.ts`

- resume schema/model
- backend domain definition for resume data

### `next.config.ts`

- currently minimal
- this is where project-wide runtime config would go

### `public/`

- static assets served directly
- for example, `/hero.png`

## Practical Rules for a MERN Developer Here

1. Do not rename `src/app`; Next expects the App Router folder to be named `app`.
2. Put backend endpoints in `src/app/api/**/route.ts` if you want API-style access.
3. Keep MongoDB logic and secrets in server-only modules.
4. Use Client Components only where interactivity is needed.
5. Prefer server-side reads for initial page loads.
6. Use route handlers or server actions for mutations.
7. Pass only serializable data from Server Components into Client Components.

## What Is Already Scaffolded vs Missing

### Scaffolded

- App Router pages
- nested layouts
- shared UI components
- interactive editor
- MongoDB connector
- Mongoose resume model

### Missing

- API routes
- server actions
- authenticated user flow
- CRUD persistence
- dashboard loading from MongoDB
- editor save/load from MongoDB
- settings persistence

## Recommended Next Step

The cleanest next implementation step is:

1. create `src/app/api/resumes/route.ts`
2. create `src/app/api/resumes/[id]/route.ts`
3. wire them to `src/lib/db.ts` and `src/models/Resume.ts`
4. replace dashboard dummy data with real reads
5. load and save editor data through those server endpoints

That would make Resumy AI a working full-stack Next.js + MongoDB application without needing a separate Express backend.
