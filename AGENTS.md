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
