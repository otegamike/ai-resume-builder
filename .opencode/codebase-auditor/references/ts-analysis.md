# TypeScript / JavaScript Analysis Reference

## Useful tsc flags for auditing

```bash
# Report all unused locals and parameters
npx tsc --noEmit --noUnusedLocals --noUnusedParameters 2>&1 | grep -E "error TS6133|error TS6196"

# Find circular dependencies
npx madge --circular --extensions ts,tsx src/ 2>/dev/null
```

## ESLint rules worth enabling for the audit

| Rule | What it catches |
|------|----------------|
| `no-unused-vars` | Variables declared but never read |
| `no-unreachable` | Code after return/throw |
| `no-unused-expressions` | Expressions with no side effects |
| `@typescript-eslint/no-unused-vars` | TS-aware version |
| `import/no-unused-modules` | Exported symbols with no importers |

Quick one-shot run (no config change needed):
```bash
npx eslint . \
  --ext .ts,.tsx,.js,.jsx \
  --rule '{"no-unused-vars":["error",{"vars":"all","args":"after-used"}]}' \
  --rule '"no-unreachable":"error"' \
  --format compact \
  --ignore-pattern "node_modules/" \
  --ignore-pattern "dist/" \
  2>/dev/null | head -100
```

## Finding dead exports

An export is "dead" if its name never appears as an import anywhere else in the project.

```bash
#!/bin/bash
# Collect all exported names
grep -rn --include="*.ts" --include="*.tsx" \
  -E "^export (const|function|class|type|interface|enum|default) ([A-Za-z_][A-Za-z0-9_]*)" \
  . --exclude-dir={node_modules,dist,build,.next} \
  | sed -E 's/.*export (const|function|class|type|interface|enum|default) ([A-Za-z_][A-Za-z0-9_]*).*/\2/' \
  | sort | uniq > /tmp/exported_names.txt

# For each exported name, check if it's imported anywhere
while IFS= read -r name; do
  count=$(grep -rn --include="*.ts" --include="*.tsx" \
    "import.*\b${name}\b" \
    . --exclude-dir={node_modules,dist,build,.next} 2>/dev/null | wc -l)
  if [ "$count" -eq 0 ]; then
    echo "POTENTIALLY DEAD: $name"
  fi
done < /tmp/exported_names.txt
```

## Finding duplicate hook/util patterns (React)

Signs a custom hook is needed:
```bash
# useState + useEffect pairs in component files (should be hooks)
grep -rn "useState\|useEffect" --include="*.tsx" \
  . --exclude-dir={node_modules,dist,.next} \
  | grep -v "hooks/" \
  | awk -F: '{print $1}' | sort | uniq -c | sort -rn | head -20
```

Files with the most state/effect calls are prime candidates for hook extraction.

## Finding inline type definitions

These should be moved to a shared types file:
```bash
# Function parameters typed inline with object literals
grep -rn --include="*.ts" --include="*.tsx" \
  -E "\(.*: \{[^}]{20,}\}" \
  . --exclude-dir={node_modules,dist,build} | head -30

# Props typed inline instead of using an interface
grep -rn --include="*.tsx" \
  -E "^(export )?const [A-Z][A-Za-z]+ = \(\{" \
  . --exclude-dir={node_modules,dist,build} \
  | head -20
# Then check if the next line has }: { ... }) pattern
```

## Detecting type duplication

```bash
# List all type/interface names
grep -rn --include="*.ts" --include="*.tsx" \
  -E "^(export )?(type|interface) [A-Z][A-Za-z0-9]+" \
  . --exclude-dir={node_modules,dist,build} \
  | sed -E 's/.*\b(type|interface) ([A-Za-z0-9]+).*/\2/' \
  | sort > /tmp/type_names.txt

# Duplicates (same name, multiple files)
sort /tmp/type_names.txt | uniq -d

# Near-duplicates (same base name with suffixes like Dto, Response, Input)
grep -E "(User|Product|Order|Auth|Request|Response)" /tmp/type_names.txt | sort
```
