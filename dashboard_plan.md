Dashboard Overview & Writer Dashboard
Add an Overview Dashboard as the landing page for /dashboard, and a new Writer Dashboard at /dashboard/writer for cover letters and application tracking.

User Review Required
IMPORTANT

Route restructuring: The current /dashboard page shows "My Resumes". This plan moves that to /dashboard/resumes and replaces /dashboard with a new Overview page. All existing links in the sidebar and header will be updated. Users who bookmarked /dashboard will now see the overview instead of their resumes list.

IMPORTANT

Cover Letter AI generation: The cover letter writer will use the existing Groq AI integration (same as the resume improver/tailor). This will consume AI credits from the user's account. Should cover letter generation have its own credit cost, or share the same pool?

WARNING

New MongoDB collections: This adds two new Mongoose models (CoverLetter and Application). These will create new collections in the existing MongoDB database on first use. No migration is needed since they're additive.

Open Questions
IMPORTANT

Application tracking scope: Should the applications tracker be a simple manual log (user adds company, role, status, date, notes) or should it integrate with cover letters and resumes (e.g., link a specific resume + cover letter to each application)?

IMPORTANT

Cover letter templates: Should cover letters have visual HTML templates like resumes, or is a simpler rich-text / plain-text editor sufficient for v1?

NOTE

Stats on the overview page: The overview page will show counts (resumes, cover letters, applications) and recent activity. Should it also show AI credits remaining, or is that better left on the settings page?

Proposed Changes
1. Routing & Page Restructure
The current dashboard routes:


/dashboard          → My Resumes (current)
/dashboard/templates
/dashboard/improve
/dashboard/tailor
/dashboard/settings
/dashboard/admin
Proposed new route map:


/dashboard          → NEW Overview Dashboard (landing page)
/dashboard/resumes  → My Resumes (moved from /dashboard)
/dashboard/writer   → NEW Writer Dashboard (cover letters + applications)
/dashboard/templates
/dashboard/improve
/dashboard/tailor
/dashboard/settings
/dashboard/admin
2. Data Models
[NEW] 
CoverLetter.ts
New Mongoose model for cover letters:

typescript

interface ICoverLetter extends Document {
  userId: string;
  user: ObjectId;
  title: string;             // e.g. "Cover Letter for Google SWE"
  targetCompany: string;
  targetRole: string;
  content: string;           // The actual cover letter text
  resumeId?: ObjectId;       // Optional link to a resume
  status: "draft" | "final";
}
[NEW] 
Application.ts
New Mongoose model for job application tracking:

typescript

interface IApplication extends Document {
  userId: string;
  user: ObjectId;
  company: string;
  role: string;
  status: "saved" | "applied" | "interviewing" | "offered" | "rejected" | "withdrawn";
  appliedDate?: Date;
  notes: string;
  resumeId?: ObjectId;       // Link to resume used
  coverLetterId?: ObjectId;  // Link to cover letter used
  jobUrl?: string;
}
3. API Routes
[NEW] 
route.ts
GET /api/cover-letters — List user's cover letters
POST /api/cover-letters — Create a new cover letter
[NEW] 
route.ts
GET /api/cover-letters/:id — Get a single cover letter
PUT /api/cover-letters/:id — Update a cover letter
DELETE /api/cover-letters/:id — Delete a cover letter
[NEW] 
route.ts
POST /api/cover-letters/generate — AI-generate a cover letter from resume + job description (uses existing Groq/AI integration, deducts AI credits)
[NEW] 
route.ts
GET /api/applications — List user's applications (with optional status filter)
POST /api/applications — Create a new application entry
[NEW] 
route.ts
GET /api/applications/:id — Get a single application
PUT /api/applications/:id — Update application (status changes, notes, etc.)
DELETE /api/applications/:id — Delete an application
[NEW] 
route.ts
GET /api/dashboard/stats — Returns aggregate counts for the overview page (resume count, cover letter count, application counts by status, recent activity)
4. AI Integration
[MODIFY] 
ai.ts
Add a new generateCoverLetter() function:

Input: resume content (or extracted text), job description, target company, target role
Output: a professional cover letter string
Uses the existing callGroq() and GENERATION_MODEL infrastructure
System instruction: professional cover letter writer that creates tailored, concise letters
Includes a new COVER_LETTER_SYSTEM_INSTRUCTION constant
5. Frontend Pages
[NEW] 
page.tsx
[NEW] 
page.module.css
Overview Dashboard — The new /dashboard landing page.

Design:

Welcome banner with user's name and a motivational subtitle
Quick Stats row: 4 stat cards showing Resumes count, Cover Letters count, Active Applications count, AI Credits remaining — each with an icon and a subtle gradient accent
Quick Actions grid: Large interactive cards linking to each dashboard section:
📄 My Resumes → /dashboard/resumes
✍️ Writer Studio → /dashboard/writer
🎨 Templates → /dashboard/templates
🔧 Improve Resume → /dashboard/improve
✨ Tailor Resume → /dashboard/tailor
⚙️ Settings → /dashboard/settings
Each card has an icon, title, short description, and hover animation
Recent Activity feed: Last 5 items (recently edited resumes, created cover letters, status-changed applications) with timestamp and action type
[MODIFY] Rename current dashboard page → resumes sub-route
[MODIFY] 
page.tsx
[MODIFY] 
page.module.css
Move the existing 
page.tsx
 and 
page.module.css
 to /dashboard/resumes/. The content stays identical — this is a pure route relocation.

[NEW] 
page.tsx
[NEW] 
page.module.css
Writer Dashboard — The /dashboard/writer page with two tabbed sections:

Tab 1: Cover Letters

Grid of cover letter cards (similar to resume cards but simpler — no iframe preview, just title/company/role/status/date)
"Create Cover Letter" CTA card (dashed border, same pattern as resume create card)
Each card has Edit / Delete actions
Click "Create" opens an inline form or modal:
Target Company, Target Role fields
Option to select an existing resume as source
Paste/upload job description
"Generate with AI" button → calls /api/cover-letters/generate
Text editor for manual editing / reviewing the generated letter
Save as Draft / Mark as Final
Tab 2: Applications Tracker

Kanban-style or table view of job applications
Columns/statuses: Saved → Applied → Interviewing → Offered → Rejected/Withdrawn
Each application card shows: Company, Role, Status badge, Date, linked Resume/Cover Letter
"Add Application" button → form with Company, Role, Status, Date, Notes, optional Resume/CL links, Job URL
Status can be changed via dropdown on each card
Filter/sort by status, date, company
6. Sidebar Navigation Update
[MODIFY] 
layout.tsx
Update the sidebar navigation:

Add new Overview link at the top: Home icon → /dashboard
Update My Resumes link: /dashboard → /dashboard/resumes
Add new Writer link: PenLine icon → /dashboard/writer
Update isActive() to handle the overview route correctly (exact match for /dashboard)
Updated nav order:

🏠 Overview → /dashboard
📄 My Resumes → /dashboard/resumes
✍️ Writer → /dashboard/writer
🎨 Templates → /dashboard/templates
🔧 Improve → /dashboard/improve
✨ Tailor → /dashboard/tailor
⚙️ Settings → /dashboard/settings
📊 Admin (if admin)
7. Types
[NEW] 
CoverLetterData.ts
Frontend type interfaces for cover letter responses.

[NEW] 
ApplicationData.ts
Frontend type interfaces for application tracker responses.

Execution Order
Phase	Files	Description
1	Models, Types	Create CoverLetter.ts, Application.ts models and frontend types
2	API Routes	Build all CRUD API routes + AI generation endpoint + stats endpoint
3	AI Integration	Add generateCoverLetter() to ai.ts
4	Route Restructure	Move current dashboard page to /dashboard/resumes/
5	Overview Page	Build the new /dashboard overview page with stats + quick actions
6	Writer Page	Build the /dashboard/writer page with cover letters + applications tabs
7	Sidebar Update	Update layout.tsx with new nav links
8	Polish & Verify	Test all routes, check responsive layout, verify auth guards
Verification Plan
Automated Tests
N/A for now (existing test infra is minimal — vitest config exists but no dashboard tests)
Manual Verification
Navigate to /dashboard — should show the new overview page with stats and quick action cards
Click each quick action card — should route correctly
Navigate to /dashboard/resumes — should show the existing "My Resumes" page (identical behavior)
Navigate to /dashboard/writer — should show cover letters tab by default
Create a cover letter (manually and with AI generation) — should save and appear in the grid
Create an application — should appear in tracker, status should be changeable
Return to /dashboard — stats should reflect the new cover letter and application
Check sidebar navigation — all links should work and highlight correctly
Test responsive behavior — sidebar collapse on narrow viewports should still work
Verify auth guards — unauthenticated users should be redirected

#reviews
Application tracking scope: Should the applications tracker be a simple manual log (user adds compan...
the application tracking should be it's own dashboard page Applications.

Cover letter templates: Should cover letters have visual HTML templates like resumes, or is a simple...
the writter page should also have application letter where the user adds a context from either a screenshot or paste job description and a tailored application letter or cover letter would be generated