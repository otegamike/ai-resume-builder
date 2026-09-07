<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# template
see template.md for info on how templates are rendered

# mongoose + Turbopack

Mongoose models must be **referenced in function body code** (not just imported) in any file that uses `.populate()` on a ref to that model. Turbopack tree-shakes unused imports, which prevents `mongoose.model()` registration from executing and causes `MissingSchemaError` at runtime.

Always guard model imports with `void ModelName;` after the import block:

```ts
import CoverLetter from "@/models/CoverLetter";
import Resume from "@/models/Resume";

void CoverLetter;
void Resume;
```

Speak plainly, avoid dense technical shorthand

Explain things in plain, everyday language instead of dense, jargon-packed technical shorthand. This applies generally — not just to bug investigations, and not as a fixed template to fill in every time.

Why

Left alone, technical explanations tend to compress into shorthand: chained file.ts:123 -> other.ts:45 traces, arrow notation, variable names standing in for concepts, and multiple ideas packed into one run-on sentence. That's fast to write but hard to read — the reader has to reverse-engineer the code just to follow the explanation of the code.

How to write
Say what's going on in plain sentences first. Add file:line references or code specifics afterward, only where they genuinely help — as a pointer, not as the explanation itself.
Don't use a variable, function, or type name as if it were an English word the reader already knows — say what it represents in plain terms the first time it comes up.
Define jargon (race condition, null vs undefined, guard clause, etc.) in one clause the first time it's used, if it's used at all.
Prefer short sentences over long ones with multiple clauses joined by commas, slashes, or stacked parentheses.
No chained arrow traces (a:1 -> b:2 -> c:3) as a substitute for prose.
What NOT to do
Don't force every response into a fixed shape (e.g. always restating "why it happens" or "how to fix it") regardless of whether that's relevant. If the cause is already obvious, known, or not in question, skip explaining it — answer what was actually asked.
Don't pad a simple answer with unrequested structure, headers, or extra sections just to look thorough. Match the length and depth of the response to the actual question.
This is a tone and clarity preference, not a template. Use judgment about what needs explaining and what doesn't.
Example

Don't write:

completeSend:210 now edits pendingNotificationMessageId to [Label] incoming: ${pendingMessage} and unconditionally editDraftNotification (editPromptMessageId, "[corrected] ...")

Write instead:

Your code now updates two messages instead of one every time a draft is sent — including one that doesn't need updating in this case.

# Page & Component Architecture — split by responsibility, not size

A page that does several different things or hosts distinct tabs/sections must not hold all of that UI and state in one file. This is how `dashboard/jobs` grew to a 1100-line file before the refactor (Find + Employer Hub + Admin in one component).

Rules:
* Split when a page has distinct tabs, distinct concerns, or serves multiple roles — e.g. `dashboard/jobs` with Find / Employer Hub / Admin, or any page where sections have separate fetches, states, and actions. Size alone is not the trigger; structure is.
* Each tab/section becomes its own reusable component that owns its own data: its `useState`/`useEffect`, fetch functions, pagination, and actions live inside that component. The shell page only switches which tab is shown and derives shared flags like `isEmployer/isAdmin` from `useSession`.
* Folder per tab/section: `src/components/<feature>/<tab-name>/`
  * `TabName.tsx` + `TabName.module.css` side-by-side in the same folder. The component imports `import styles from "./TabName.module.css"` — never a parent's `jobs.module.css`.
  * No `style={{...}}` inside the component (see Styling); every visual goes to a named class in that same `TabName.module.css`.
* Mapped blocks are components: any array rendered with `.map(...)` — cards, list items, row templates — must be its own component. Define it as `function TabCard` (or `EmployerJobCard`, `AdminJobCard`, `JobCard`, `ScreeningQuestionCard`, etc.) at the **bottom of the same `TabName.tsx` file** and use it in the parent's map (`jobs.map(j => <TabCard key={j._id} job={j} />)`). Do not leave raw JSX inline in the map, and do not create a separate `Card.tsx` file per mapped type — the bottom-of-file co-location is the convention.

Established reference after the `dashboard/jobs` refactor:
```
src/components/jobs/find-jobs/FindJobsBoard.tsx + FindJobsBoard.module.css // owns Find fetch + infinite scroll + JobCard at bottom
src/components/jobs/employer-hub/EmployerHub.tsx + EmployerHub.module.css   // owns register + fetchMine + EmployerJobCard at bottom
src/components/jobs/admin-queue/AdminQueue.tsx + AdminQueue.module.css       // owns admin fetch + moderate + AdminJobCard at bottom
src/app/jobs/page.tsx         // public: PageBody + <FindJobsBoard /> (header lives here, not in the board)
src/app/dashboard/jobs/page.tsx // slim shell: tab buttons + {activeTab==="find" && <FindJobsBoard /> …}
```

# Styling — named classes, no inline styles

* Do not use `style={{ ... }}` or `style="..."` in components except `src/templates_formatted/**` (generated HTML). The codebase still has ~150 `style=` hits inside tab files from before this rule — new code must avoid adding more.
* Every visual rule is a named class in the `*.module.css` file that sits next to its component. Use `className={styles.myClass}` and tokens `var(--space-*, --gray-*, --primary-*)`.

# Reusable Logic — hooks vs colocated

* If a function/parse/normalize/fetch is used by two or more components, extract it to `src/hooks/useX.ts`.
* If it is used by only one tab/section, keep it colocated inside that tab's component (e.g. `FindJobsBoard` keeps its `fetchPublicJobs` + `IntersectionObserver` pagination). Do not create a hook file by default when there is no cross-component reuse.

# Global State — Zustand stores

Examples to follow: `src/store/useResumeStore.ts`, `useAiCreditStore.ts`, `useAlertStore.ts`, `useTemplateStore.ts`.

* State that is read or mutated from multiple pages/components (resumes, templates, credits, alerts, anything truly cross-cutting) goes in a Zustand store at `src/store/useXStore.ts` via `import { create } from 'zustand'` (`package.json` pins 5.0.14):
  ```ts
  interface XState { items: T[]; isLoading: boolean; error: string|null; fetchItems: ()=>Promise<void> }
  export const useXStore = create<XState>((set,get)=>({ items:[], ... }))
  ```
* Inside actions use `get()`/`set()` and `useAlertStore.getState().addAlert(...)` for user-visible errors as `useResumeStore:50` does. Consumers select with `useXStore(s=>s.items)`.

# Product rule — `/jobs` is public

`/jobs` is the unauthenticated explore surface. It renders `FindJobsBoard` inside `PageBody`; its header lives in `jobs/page.tsx`, not inside the board. `/jobs/[slug]` “Back to Job Search” must land on `/jobs` with real content, not redirect to `/dashboard/jobs`.
