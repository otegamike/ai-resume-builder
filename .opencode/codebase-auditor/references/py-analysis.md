# Python Analysis Reference

## Tools to use

```bash
# Install audit tools if not present
pip install vulture pyflakes pylint --break-system-packages -q

# Or check if they exist
which vulture pyflakes pylint 2>/dev/null
```

## Dead code — vulture

```bash
# Find unused functions, classes, variables, imports
vulture . --min-confidence 80 --exclude "migrations/,venv/,.venv/,tests/"

# With a whitelist file to suppress false positives
vulture . whitelist.py --min-confidence 70
```

## Unused imports — pyflakes

```bash
pyflakes . 2>&1 | grep -E "imported but unused|redefinition of unused" | head -50
```

## Unused variables — pylint

```bash
pylint . --disable=all --enable=W0611,W0612,W0613,W0614 \
  --ignore=migrations,venv,.venv \
  2>/dev/null | grep -E "W06" | head -50
# W0611 = unused-import
# W0612 = unused-variable
# W0613 = unused-argument
# W0614 = unused-wildcard-import
```

## Finding duplicate functions

```bash
# Functions with identical signatures
grep -rn "^def \|^    def " --include="*.py" \
  . --exclude-dir={venv,.venv,migrations,__pycache__} \
  | awk '{print $NF}' | sort | uniq -d | head -30
```

## Type annotation sprawl (Python 3.x)

```bash
# Find TypedDicts and dataclasses that may duplicate each other
grep -rn "TypedDict\|@dataclass\|class.*BaseModel" --include="*.py" \
  . --exclude-dir={venv,.venv,migrations} | head -40

# Find inline Dict/List type hints that should be defined types
grep -rn "Dict\[str,\|List\[Dict\|Optional\[Dict" --include="*.py" \
  . --exclude-dir={venv,.venv,migrations} | head -30
```
