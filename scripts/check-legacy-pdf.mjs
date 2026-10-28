import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const selectorPath = path.join(root, "src/components/resume/ResumeSelector.tsx");
const packagePath = path.join(root, "package.json");
const publicWorkerPath = path.join(root, "public/pdf.worker.min.mjs");
const legacyWorkerPath = path.join(
  root,
  "node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs"
);

const failures = [];

function requireText(file, needle, label) {
  if (!fs.existsSync(file)) {
    failures.push(`${label}: missing file ${path.relative(root, file)}`);
    return;
  }
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes(needle)) {
    failures.push(`${label}: expected to find ${JSON.stringify(needle)}`);
  }
}

requireText(
  selectorPath,
  'pdfjs-dist/legacy/build/pdf.mjs',
  "ResumeSelector must use the legacy pdf.js build"
);
requireText(
  selectorPath,
  '"/pdf.worker.min.mjs"',
  "ResumeSelector must use the locally hosted legacy worker"
);
requireText(
  packagePath,
  'node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs',
  "postinstall must copy the legacy worker"
);

if (!fs.existsSync(publicWorkerPath)) {
  failures.push("public/pdf.worker.min.mjs is missing; run npm install");
} else if (fs.existsSync(legacyWorkerPath)) {
  const hash = (file) =>
    crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  if (hash(publicWorkerPath) !== hash(legacyWorkerPath)) {
    failures.push("public/pdf.worker.min.mjs does not match the installed legacy worker");
  }
}

if (failures.length > 0) {
  console.error("Legacy PDF check failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("Legacy PDF check passed.");
