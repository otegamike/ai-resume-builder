#!/bin/bash
# find_dead_exports.sh
# Finds TypeScript/JavaScript exports that are never imported anywhere in the project.
# Usage: bash scripts/find_dead_exports.sh [src_root]
#
# Output: one line per potentially dead export:
#   DEAD  path/to/file.ts:42  ExportedName

SRC="${1:-.}"
EXCLUDE_DIRS="node_modules|dist|build|\.next|coverage|\.git|__tests__|\.test\.|\.spec\."
TMP_EXPORTS=$(mktemp)
TMP_RESULTS=$(mktemp)

echo "🔍 Scanning for exports in: $SRC"

# Collect all named exports with file + line
grep -rn \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  -E "^export (const|function|class|type|interface|enum|abstract class) [A-Za-z_][A-Za-z0-9_]*" \
  "$SRC" \
  | grep -vE "$EXCLUDE_DIRS" \
  | sed -E 's/(.+):([0-9]+):export (const|function|class|type|interface|enum|abstract class) ([A-Za-z_][A-Za-z0-9_]*).*/\1:\2:\4/' \
  > "$TMP_EXPORTS"

TOTAL=$(wc -l < "$TMP_EXPORTS")
echo "📦 Found $TOTAL named exports to check"
echo ""

DEAD_COUNT=0

while IFS=: read -r file line name; do
  # Skip if name is empty or looks like a re-export barrel
  [ -z "$name" ] && continue
  [[ "$file" == *"index.ts"* ]] && continue
  [[ "$file" == *"index.tsx"* ]] && continue

  # Count how many OTHER files import this name
  import_count=$(grep -rn \
    --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
    -E "(import|from).*\b${name}\b" \
    "$SRC" \
    | grep -vE "$EXCLUDE_DIRS" \
    | grep -v "^${file}:" \
    | wc -l)

  if [ "$import_count" -eq 0 ]; then
    echo "  DEAD  ${file}:${line}  ${name}" | tee -a "$TMP_RESULTS"
    DEAD_COUNT=$((DEAD_COUNT + 1))
  fi
done < "$TMP_EXPORTS"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔴 Dead exports found: $DEAD_COUNT / $TOTAL"
echo "Results saved to: $TMP_RESULTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

rm "$TMP_EXPORTS"
