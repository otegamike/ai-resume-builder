#!/bin/bash
# py_unused_scan.sh
# Scans a Python project for unused imports, variables, and dead functions.
# Usage: bash scripts/py_unused_scan.sh [src_root]

SRC="${1:-.}"

echo "🐍 Python Unused Code Scanner"
echo "Root: $SRC"
echo ""

# --- 1. pyflakes (fast, no config needed) ---
if command -v pyflakes &>/dev/null; then
  echo "── pyflakes: unused imports & variables ──"
  pyflakes "$SRC" 2>&1 \
    | grep -vE "migrations/|venv/|\.venv/|__pycache__" \
    | grep -E "imported but unused|redefinition of unused|local variable .* assigned to but never used" \
    | head -60
  echo ""
else
  echo "⚠️  pyflakes not found. Run: pip install pyflakes --break-system-packages"
fi

# --- 2. vulture (dead code detector) ---
if command -v vulture &>/dev/null; then
  echo "── vulture: dead functions, classes, variables ──"
  vulture "$SRC" \
    --min-confidence 70 \
    --exclude "migrations,venv,.venv,tests,test_,*_test.py,conftest.py" \
    2>/dev/null | head -60
  echo ""
else
  echo "⚠️  vulture not found. Run: pip install vulture --break-system-packages"
fi

# --- 3. Manual: functions never called anywhere ---
echo "── Functions defined but never called (heuristic) ──"
TMP_DEFS=$(mktemp)
TMP_CALLS=$(mktemp)

grep -rn "^def \|^    def \|^        def " \
  --include="*.py" "$SRC" \
  | grep -vE "migrations/|venv/|test_|_test\.py|conftest" \
  | sed -E 's/.*def ([a-z_][a-z0-9_]*)\(.*/\1/' \
  | sort | uniq > "$TMP_DEFS"

# Collect all call sites
grep -rn --include="*.py" -oE "[a-z_][a-z0-9_]+\(" "$SRC" \
  | sed 's/(//' | sort | uniq > "$TMP_CALLS"

echo "Potentially uncalled functions:"
comm -23 <(sort "$TMP_DEFS") <(sort "$TMP_CALLS") \
  | grep -vE "^(test_|setUp|tearDown|main|__)" \
  | head -30

rm "$TMP_DEFS" "$TMP_CALLS"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Python scan complete."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
