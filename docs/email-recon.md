# Email recon — agenticapp.cv (Resend transactional layer)

Date: 2026-10-08. Inspected the repo directly; no assumptions.

## DB layer
- Mongoose only (v9.4.1). Single connection helper: `src/lib/db.ts` (`connectToDatabase`, cached on `globalThis`, `dbName: "Resumy"`).
- Call pattern everywhere: `await dbConnect()` at the top of routes/services.
- Model registration guard per file: `mongoose.models.X || mongoose.model(...)`.
- Turbopack rule (AGENTS.md): any file using `.populate()` on a ref must reference the model in body code (`void ModelName;`) or registration is tree-shaken away.

## Models (`src/models/`, 16 files)
- `User.ts` — `{ name, email (unique, indexed), authProviders[], oauthAccounts[], isAdmin, subscriptionPlan/Status, AiCredits, gmail*Tokens, hasCompletedOnboarding, accountType: candidate|employer|both (default candidate), organizationId ref Company }`. No `emailVerified`, no preferences, no tokens.
- `Company.ts` — `{ ownerId ref User, members[{userId, role: owner|admin|recruiter}], isVerified, status }`.
- `JobAd.ts` — `{ title, slug (unique), companyId ref Company, postedBy ref User, applicationType: on_platform|external_link|email, contactEmail, externalUrl, status, screeningQuestions[], applicationsCount }`.
- `JobApplication.ts` — canonical apply record, unique `{jobId, applicantId}`, `{ jobId, applicantId, companyId, status, resumeType, resume (embedded), jobMatchAnalysis (embedded), source: platform|off_platform }`.
- `DraftJobApplication.ts` — persisted in-progress applications, unique `{jobId, applicantId}`, timestamps. Reminder scanning is feasible.
- `Activity.ts` — `{ actorId, actorEmail, actorName, type (incl. application_submitted, user_signup), entityType, entityId, metadata }`, indexes on `(actorId,createdAt)`, `(type,createdAt)`.
- `Notification.ts` — `{ recipientId ref User, activityId ref Activity, type, title, body, link, isRead }`, fan-out via `recordActivity` in `src/lib/activityService.ts`.
- No email models exist (no outbox, quota, suppression, events).

## Auth (NextAuth v4, JWT, no verification)
- Config `src/lib/auth.ts`, handler `src/app/api/auth/[...nextauth]/route.ts`.
- Providers: Google + Credentials (scrypt `salt:key` hash).
- Two user-creation paths: `POST src/app/api/auth/signup/route.ts` (`User.create`) and `callbacks.signIn` upsert (Google). No `events.createUser`, no verification flow.
- Welcome email hooks: both paths, deduped by `welcome:{userId}`.

## Apply flow
- UI: `src/components/jobs/job-application/JobApplicationModal.tsx` posts to `POST /api/jobs/[id]/apply` with `{ resume, jobMatchAnalysis, screeningAnswers, source: platform|off_platform }`.
- Route `src/app/api/jobs/[id]/apply/route.ts`: auth check → job lookup + active check → duplicate guard (`findOne` + catch 11000) → strict body parse (`parseJobApplyBody`, throws `InputExtractionError`) → resume snapshot resolve → `JobApplication.create` → `$inc applicationsCount` → best-effort draft delete → `recordActivity` with per-recipient notifications (employer = `job.postedBy`, applicant = self) → returns `unreadCount`.
- Email hook point: after `recordActivity` succeeds, wrapped in try/catch. Owner rule: employer email only when `job.applicationType === "on_platform"`. Applicant confirmation sends for both sources. Employer recipient: `job.contactEmail` first, fallback to `postedBy` user email, else skip `no_recipient`.

## Notifications (leave unchanged)
- Types `src/types/NotificationData.ts`, fan-out `src/lib/activityService.ts`, routes under `src/app/api/notifications/`, store `src/store/useNotificationStore.ts`, UI `src/components/notifications/NotificationBell.tsx` (wired into header). Email is additive only.

## Conventions to follow
- API routes: `export async function VERB` in `route.ts`, `getAuthenticatedUser()`, `await dbConnect()`, `void Model;` guards, `InputExtractionError(status)` → status-coded JSON before generic 500.
- `src/lib/*` starts with `import "server-only"`. Types live in `src/types/*` (reuse, don't redeclare). Cross-component logic → `src/hooks/`, cross-cutting state → Zustand in `src/store/`.
- Styling: CSS Modules with named classes only, tokens from `src/styles/variables.css` (sage base `--primary-500:#84b179`, gray scale, 4px spacing). Email templates use inline styles (email clients ignore external CSS), no Tailwind anywhere including React Email `<Tailwind>`.
- Tests: Vitest (`npm test` = `vitest run`, includes `src/**/*.test.ts`, `tests/**/*.test.ts`, alias `@`).

## External facts verified
- Resend free: 3,000/mo, 100/day hard cap, UTC calendar day (midnight UTC reset), multi-recipient counts separately. `Idempotency-Key` header supported (24h window). Webhooks are Svix-signed (HMAC-SHA256 over `svix-id.timestamp.rawBody`, key = base64 after `whsec_`).
- Next 16: `after()` from `next/server` is stable — use for post-response drain.
- Vercel Hobby: cron once/day max, timing imprecise (±59 min). Cron is safety net only; `after()` does the fast path.
