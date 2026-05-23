#!/usr/bin/env node
/**
 * Flags raw hex colors and default Tailwind status palette usage outside @rashpod/ui.
 * Usage: node scripts/check-ui-tokens.mjs
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SCAN_DIRS = [
  "apps/rashpod-web",
  "apps/rashpod-dashboard",
];
const SKIP = new Set(["node_modules", ".next", "dist"]);
const HEX = /#[0-9A-Fa-f]{3,8}\b/g;
const RAW_STATUS = /\b(?:bg|text|border)-(?:emerald|green|red|rose|amber|yellow)-(?:50|100|200|300|400|500|600|700|800|900)\b/g;

async function walk(dir, files = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, files);
    else if (/\.(tsx|jsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

let violations = 0;

for (const rel of SCAN_DIRS) {
  const base = path.join(ROOT, rel);
  const files = await walk(base);
  for (const file of files) {
    const relFile = path.relative(ROOT, file).replace(/\\/g, "/");
    if (relFile.includes("packages/ui/")) continue;
    if (relFile.endsWith("product-swatches.ts")) continue;
    const content = await readFile(file, "utf8");
    for (const [pattern, label] of [
      [HEX, "raw hex"],
      [RAW_STATUS, "raw Tailwind status color"],
    ]) {
      pattern.lastIndex = 0;
      const matches = content.match(pattern);
      if (matches?.length) {
        violations += matches.length;
        console.log(`${relFile}: ${matches.length} ${label} (${[...new Set(matches)].slice(0, 5).join(", ")}${matches.length > 5 ? ", ..." : ""})`);
      }
    }
  }
}

if (violations > 0) {
  console.error(`\nFound ${violations} UI token violation(s). Prefer @rashpod/ui tokens and semantic-* classes.`);
  process.exit(1);
}

console.log("No UI token violations found in scanned app files.");
