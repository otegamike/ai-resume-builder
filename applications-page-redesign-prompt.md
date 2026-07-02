# Prompt: Redesign the Applications page (Agentic CV)

## Objective

Redesign the `/applications` page (the "Create Application" flow) to remove the current tab-based navigation, restyle the generated cover letter to look like an actual letter, and tighten up the overall result page. This touches three states of the same page: the input form, the result view, and history.

Do not change the underlying generation logic (resume tailoring, cover letter generation, scoring). This is a UI/UX pass only.

## Current state

The page currently has two tabs at the top: `Create Application` and `History`. The form state shows a 3-step "How it works" list, a resume picker, a job description textarea, and a Generate button. The result state shows a cover letter in a plain textarea-style box, a before/after score comparison, an optimizations list, and a resume preview thumbnail.

Locate the current implementation before making changes — likely under something like `app/applications/` or `components/applications/`. Read the existing components fully before editing so the redesign reuses existing data/state rather than re-architecting it.

## 1. Remove the tabs — replace with a header + action pattern

Delete the `Create Application` / `History` tab bar entirely. Replace the page header with a single consistent pattern that adapts its right-side action based on which state the page is in:

- **Form state**: Left = title "Applications" + subtitle (unchanged copy). Right = a ghost button with a clock icon, label "History".
- **History state**: Same left side. Right = a ghost button with a plus icon, label "New application".
- **Result state**: Left = a text button with a left-arrow icon, label "Back to form". Right = a ghost button with a plus icon, label "New application".

This header row sits where the tab bar used to be. Do not put any of these actions in the global hamburger menu — that's site-wide nav and out of scope.

History becomes its own view (not a tab), reachable only via this header button. Clicking it should navigate/transition to a history list — implement as a route if the app already uses routes for this kind of thing, otherwise a view-state swap consistent with how the rest of the app handles this.

## 2. History view

Give each entry in the history list its own card showing: job title, company name, match score (or before → after if available), and date generated. Add a "New application" button at the top of this list (in addition to the one in the header, this one can be a more prominent primary button since it's the main CTA of an otherwise empty-feeling list).

Empty state (no applications yet): a short invitation ("You haven't generated any applications yet." or similar, in the app's voice) plus the New application CTA — not a bare empty list.

## 3. Cover letter — redesign as an actual letter

This is the main visual change. Replace the current plain-box cover letter display with a letter-styled card:

- **Letterhead row** at the top: sender name + contact details (email, phone, location — pull from the resume/profile data already available) on the left, generation date on the right. Separated from the body by a hairline rule.
- **Subject line block**: a small tinted callout below the letterhead reading "Re: [Job Title] — [Company]", pulled from the job details already captured in the form. This is new — there's no equivalent field currently, so derive it from the job title/company metadata already being extracted for the tailored resume.
- **Salutation, body paragraphs, signature block**: render as they do today, but restyle:
  - Use a serif typeface for the letter body specifically (salutation through signature) to differentiate it from the surrounding UI chrome, which stays in the app's normal sans-serif font. Use a CSS variable/custom property for this font choice rather than hardcoding a font-family, consistent with how the rest of the app themes typography.
  - Signature block ("Sincerely, [Name]") gets its own top rule so it doesn't blend into the last paragraph.
- **Actions row** below the card: Copy, Edit, Export — same three actions as today, just restyled to sit under the letter card instead of above the textarea.

Keep the underlying content editable (this replaces the current textarea's edit affordance) — clicking "Edit" should let the user modify the letter inline or open the existing edit flow, whichever the current implementation supports. Don't regress editability for the sake of the visual redesign.

## 4. Result page — supporting polish

- **Optimizations Performed**: replace the plain bullet list with a small leading icon per item, categorized by what changed (e.g. summary/profile, experience, skills/keywords). Use icons already available in the app's icon set if one exists; otherwise pick simple, consistent ones (a person/profile icon, a briefcase icon, a tag/keyword icon).
- **Score circles**: keep the before/after circular score display as-is functionally, but add a brief count-up animation on the "after" number when the result first renders, respecting `prefers-reduced-motion`.
- **Resume preview**: the thumbnail should be tappable to open a larger/fullscreen preview (modal or existing viewer, whichever pattern the app already uses elsewhere) before committing to "Open in Editor" — currently the thumbnail isn't legible enough to review before editing.

## 5. Form state — minor polish (optional, do this last if time allows)

Condense the current numbered "How it works" list (Select Resume / Add Job Details / Generate & Apply) into a compact horizontal stepper that reflects the user's actual progress through the form (e.g. highlights step 1 once a resume is selected, step 2 once job details are entered). Keep it lightweight — this is a nice-to-have, not a rebuild of the form logic.

## Technical constraints

- **No Tailwind.** Use vanilla CSS, CSS custom properties, or CSS Modules — whichever the existing codebase already uses for this page. Match the existing convention rather than introducing a new one.
- TypeScript throughout, consistent with the rest of the codebase.
- Preserve all existing props/data flow into these components — this is a visual/structural pass, not a rewrite of data fetching or generation logic.
- Respect `prefers-reduced-motion` for any new animation (score count-up, transitions).
- Keep everything responsive down to mobile — the current page is used on mobile widths, so the letterhead row, subject block, and header action pattern all need to reflow sensibly at narrow widths (e.g. letterhead sender info and date may need to stack instead of sitting side-by-side below ~400px).

## Acceptance criteria

- [ ] Tab bar is gone; header row with contextual right-side action is in place across all three states
- [ ] History is its own view, not a tab, with per-entry cards and its own New application CTA
- [ ] Cover letter renders as a letterhead + subject line + serif body + signature block, all data-driven from existing fields (plus the new derived subject line)
- [ ] Copy/Edit/Export actions still work exactly as before, just relocated under the new card
- [ ] Optimizations list has category icons
- [ ] Score count-up animation added, respects reduced motion
- [ ] Resume thumbnail opens a larger preview on tap
- [ ] No Tailwind classes introduced anywhere
- [ ] Page still works end-to-end on mobile widths
