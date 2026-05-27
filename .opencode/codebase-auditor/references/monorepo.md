# Monorepo Analysis Reference

## Detecting the monorepo type

```bash
# Turborepo
cat turbo.json 2>/dev/null | head -20

# Nx
cat nx.json 2>/dev/null | head -20

# pnpm workspaces
cat pnpm-workspace.yaml 2>/dev/null

# Yarn / npm workspaces
cat package.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('workspaces'))"
```

## Audit strategy for large monorepos

When > 50 packages are detected, audit by layer:

1. **Shared packages first** (`packages/ui`, `packages/utils`, `packages/types`, `libs/`)
   - Dead exports here affect all consumers — highest value
   - Look for packages with 0 consumers

2. **App packages second** (`apps/web`, `apps/api`, `apps/mobile`)
   - Internal dead code within each app
   - Imports from shared packages that are unused

3. **Cross-package type duplication**
   - Same interface defined in multiple packages
   - A canonical `@org/types` package may be missing

## Finding unused packages

```bash
# List all workspace packages
cat pnpm-workspace.yaml 2>/dev/null || \
  cat package.json | python3 -c "import sys,json; d=json.load(sys.stdin); print('\n'.join(d.get('workspaces',[])))"

# For each package, check if any other package imports it
for pkg in $(ls packages/ 2>/dev/null); do
  pkg_name=$(cat packages/$pkg/package.json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('name',''))" 2>/dev/null)
  if [ -n "$pkg_name" ]; then
    count=$(grep -rn "\"$pkg_name\"" --include="package.json" . \
      --exclude-dir={node_modules} | grep -v "packages/$pkg/package.json" | wc -l)
    echo "$pkg_name: $count consumers"
  fi
done
```

## Cross-package duplicate logic detection

```bash
# Find functions with the same name in multiple packages
grep -rn "^export (const|function) [a-z]" \
  --include="*.ts" --include="*.tsx" \
  packages/ apps/ libs/ \
  --exclude-dir={node_modules,dist,build} \
  | sed -E 's/.*export (const|function) ([a-zA-Z]+).*/\2/' \
  | sort | uniq -d | head -30
```

## Sampling strategy for > 10k files

If file count is extreme, focus on:
1. All files in `packages/` or `libs/` (shared code)
2. Top-level entry points in each app
3. Any file touched in the last 90 days (`git log --since="90 days ago" --name-only`)
4. Files with the most imports (high fan-in = most impactful to clean)

```bash
git log --since="90 days ago" --name-only --format="" | sort | uniq | \
  grep -E "\.(ts|tsx|js|jsx|py)$" > /tmp/recently_changed.txt
```
