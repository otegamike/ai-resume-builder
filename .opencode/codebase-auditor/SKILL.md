---
name: codebase-auditor
description: >
  Deep codebase audit agent that scans an entire project for code quality issues and structural problems.
  Use this skill whenever the user asks to "audit the codebase", "find dead code", "clean up unused code",
  "find duplicate logic", "check for unused variables or imports", "identify legacy code", "look for
  inefficient implementations", "check type definitions", "find reusable components/hooks/utils",
  or any request to scan, review, or clean up a project's code health. Trigger even for partial phrasings
  like "what can I clean up?", "find code smells", "refactor suggestions", or "is there redundant code?"
---

# Codebase Auditor

A comprehensive agent skill that performs a full audit of a codebase, surfacing dead code, unused
variables, duplicated logic, missing abstractions, and type definition sprawl.

---

## Audit Philosophy

Prioritize findings in this order:
1. **Dead / unreachable code** — code that is never imported, called, or referenced
2. **Unused variables, imports, and exports** — declared but never consumed
3. **Duplicate / near-duplicate logic** — the same pattern implemented more than once
4. **Missing abstractions** — one-off functions that should be reusable hooks / utils / components
5. **Type definition sprawl** — inline types, re-declared interfaces, or diverging shapes for the same concept
6. **Inefficient implementations** — O(n²) loops that could be maps, repeated DOM queries, unnecessary re-renders

---

## Step-by-Step Workflow

### Step 1 — Understand the project

```bash
# Detect language / framework
ls package.json tsconfig.json pyproject.toml Cargo.toml go.mod 2>/dev/null | head -5
cat package.json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('name'), d.get('dependencies',{}).keys())" 2>/dev/null
```

- Identify: TypeScript / JavaScript / Python / Go / Rust / mixed
- Note entry points, src root, test directories, config files
- Check for monorepo structure (workspaces, nx, turborepo)

### Step 2 — Map the file tree

```bash
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \
  -o -name "*.py" -o -name "*.go" -o -name "*.rs" \) \
  ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" \
  ! -path "*/build/*" ! -path "*/.next/*" ! -path "*/coverage/*" \
  | sort > /tmp/audit_files.txt
wc -l /tmp/audit_files.txt
```

Group files by role: components, hooks, utils, types, services, pages, tests, config.

### Step 3 — Detect unused exports (TypeScript / JS)

Read the reference file for language-specific commands:
→ `references/ts-analysis.md`   (TypeScript / JavaScript)
→ `references/py-analysis.md`   (Python)

```bash
# Quick dead-export scan (TS/JS) — files that export something never imported elsewhere
grep -rn "^export " --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  . --exclude-dir={node_modules,dist,build,.next} \
  | awk -F: '{print $1}' | sort | uniq > /tmp/exporting_files.txt

# Cross-reference: find exports whose name never appears in any other file
# (detailed script in scripts/find_dead_exports.sh)
```

Run `scripts/find_dead_exports.sh` for the full dead-export analysis.

### Step 4 — Detect unused variables and imports

```bash
# TypeScript: leverage tsc --noEmit + grep for declared-but-never-used patterns
npx tsc --noEmit 2>&1 | grep "is declared but" | head -60

# ESLint quick pass (if configured)
npx eslint . --rule '{"no-unused-vars": "error"}' --format compact 2>/dev/null | head -80
```

For Python: run `scripts/py_unused_scan.sh`.

### Step 5 — Find duplicate logic

```bash
# Find suspiciously similar function signatures (same params, same return type)
grep -rn "const \|function \|def \|func " \
  --include="*.ts" --include="*.tsx" --include="*.py" --include="*.go" \
  . --exclude-dir={node_modules,dist,build} \
  | grep -E "\(.*\).*\{?$" \
  | awk -F: '{print $NF}' | sort | uniq -d | head -30
```

Run `scripts/find_duplicates.sh` for a content-hash based duplicate block detector.

### Step 6 — Identify missing abstractions

Look for these patterns that indicate a function should be extracted to a shared util/hook:

**Reuse opportunity signals:**
- Same logic block (≥ 5 lines) in ≥ 2 files
- Inline fetch/axios calls scattered across components (should be in a service/hook)
- `useState` + `useEffect` combos repeated for the same data-fetching pattern
- Inline date formatting, string truncation, number formatting done ad-hoc
- Error boundary / loading state logic copy-pasted instead of using a shared wrapper

```bash
# Find files with inline fetch calls (JS/TS)
grep -rn "fetch(\|axios\." --include="*.tsx" --include="*.ts" \
  . --exclude-dir={node_modules,dist,build} \
  | grep -v "hooks/\|services/\|api/" | head -30
```

### Step 7 — Audit type definitions

```bash
# Find type/interface declarations
grep -rn "^type \|^interface \|^export type \|^export interface " \
  --include="*.ts" --include="*.tsx" \
  . --exclude-dir={node_modules,dist,build} \
  > /tmp/all_types.txt

# Find inline types (types defined at usage site, not in a types file)
grep -rn ": {" --include="*.ts" --include="*.tsx" \
  . --exclude-dir={node_modules,dist,build} | head -40
```

Flag:
- The same shape declared more than once with different names
- Types defined inline in function signatures instead of referencing a shared type
- Diverging `User` / `UserDto` / `UserResponse` shapes that should share a base

### Step 8 — Check for inefficient patterns

```bash
# Nested loops (potential O(n²))
grep -rn "\.forEach\|\.map\|\.filter" --include="*.ts" --include="*.tsx" \
  . --exclude-dir={node_modules,dist,build} \
  | grep -E "(forEach|map|filter).*\.(forEach|map|filter)" | head -20

# Repeated querySelector / getElementById in React (should use refs)
grep -rn "document\.querySelector\|document\.getElementById" \
  --include="*.tsx" --include="*.ts" \
  . --exclude-dir={node_modules,dist,build} | head -20
```

---

## Output Format

After completing all steps, produce a structured audit report with these sections:

```
## Codebase Audit Report
### Summary
[X files scanned | Y issues found | severity breakdown]

### 🔴 Dead / Unreachable Code
[file path + line range + why it's dead]

### 🟠 Unused Variables & Imports
[file : line — symbol name]

### 🟡 Duplicate Logic
[files A and B share X lines of identical/near-identical logic → extract to util/hook Z]

### 🟡 Missing Abstractions
[pattern + affected files + recommended extraction target]

### 🔵 Type Definition Issues
[duplicate/diverging types + recommended canonical location]

### ⚪ Inefficient Implementations
[pattern + file + suggested alternative]

### ✅ Recommended Next Steps
[prioritised action list]
```

For each finding include:
- **File path** (relative)
- **Line number(s)** where possible
- **Why it's a problem**
- **Recommended fix** (rename, extract, delete, consolidate)

---

## Constraints & Safety

- **Never delete or rewrite code automatically.** Report only; let the developer decide.
- Skip `node_modules`, `dist`, `build`, `.next`, `coverage`, `.git`, vendor directories.
- Treat test files (`.test.`, `.spec.`, `__tests__`) separately — unused exports in tests are expected.
- If the codebase is > 10k files, sample by directory and note the sampling.
- Do not read `.env` files or files containing secrets.

---

## When to read reference files

- TypeScript/JS project → read `references/ts-analysis.md` before Step 3
- Python project → read `references/py-analysis.md` before Step 4
- Large monorepo (> 50 packages) → read `references/monorepo.md` before Step 1
