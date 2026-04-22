# Resumy AI

Resumy AI is a Next.js App Router resume builder with a landing page, dashboard shell, client-side editor, and a scaffolded MongoDB/Mongoose data layer ready to be wired into real CRUD flows.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to view Resumy AI.

Main app routes live in `src/app`, shared UI lives in `src/components/ui`, and server-side data utilities live in `src/lib` and `src/models`.

Current key files:

- `src/app/page.tsx`: landing page
- `src/app/dashboard`: dashboard layout and page
- `src/app/editor/[id]/page.tsx`: interactive resume editor
- `src/app/settings/page.tsx`: settings screen
- `src/lib/db.ts`: MongoDB connection helper
- `src/models/Resume.ts`: Mongoose schema/model

## Project Walkthrough

See [PROJECT_WALKTHROUGH.md](./PROJECT_WALKTHROUGH.md) for the full project structure, current frontend/backend boundaries, and the Next.js-specific concepts a MERN developer should know.

## Learn More

To learn more about the stack used here:

- [Next.js Documentation](https://nextjs.org/docs)
- [App Router Documentation](https://nextjs.org/docs/app)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
