import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const sourceRoot = path.join(root, "src");
const skipDirs = new Set(["node_modules", ".next", "templates_formatted", "templates_pdf"]);
const forbiddenPatterns = [
  { label: "Uint8Array.prototype.toHex", pattern: /\.toHex\s*\(/ },
  { label: "Map.prototype.getOrInsertComputed", pattern: /\.getOrInsertComputed\s*\(/ },
  { label: "Map.prototype.getOrInsert", pattern: /\.getOrInsert\s*\(/ },
];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

const violations = [];
for (const file of walk(sourceRoot)) {
  const text = fs.readFileSync(file, "utf8");
  for (const { label, pattern } of forbiddenPatterns) {
    if (pattern.test(text)) {
      violations.push(`${path.relative(root, file)} uses ${label}`);
    }
  }
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const browserslist = Array.isArray(pkg.browserslist) ? pkg.browserslist : [];
const requiredBrowsers = [
  "Chrome >= 120",
  "Edge >= 120",
  "Firefox >= 120",
  "Safari >= 16.4",
  "iOS >= 16.4",
  "Samsung >= 23",
];
const missingBrowsers = requiredBrowsers.filter((entry) => !browserslist.includes(entry));

if (violations.length > 0) {
  console.error("Browser support check failed:\n" + violations.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

if (missingBrowsers.length > 0) {
  console.error(
    "Browser support check failed:\n" +
      missingBrowsers.map((item) => `- missing browserslist entry: ${item}`).join("\n")
  );
  process.exit(1);
}

console.log("Browser support check passed.");
