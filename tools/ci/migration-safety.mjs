import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

function changedFiles() {
  const base = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}...HEAD` : "HEAD~1...HEAD";
  try {
    return execFileSync("git", ["diff", "--name-only", base], { encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
  } catch {
    return execFileSync("git", ["diff", "--name-only", "--cached"], { encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
  }
}

const files = changedFiles();
const schemaChanged = files.includes("apps/rashpod-api/prisma/schema.prisma");
const migrationFiles = files.filter((file) => file.startsWith("apps/rashpod-api/prisma/migrations/") && file.endsWith("migration.sql"));
if (schemaChanged && migrationFiles.length === 0) {
  console.error("Prisma schema changed without a migration file under apps/rashpod-api/prisma/migrations.");
  process.exit(1);
}

const destructive = [/\bDROP\s+TABLE\b/i, /\bDROP\s+COLUMN\b/i, /\bTRUNCATE\b/i, /\bDELETE\s+FROM\b/i, /\bALTER\s+TYPE\b[\s\S]*\bDROP\s+VALUE\b/i];
const findings = [];
for (const file of migrationFiles) {
  const path = join(process.cwd(), file);
  if (!existsSync(path)) continue;
  const sql = readFileSync(path, "utf8");
  if (destructive.some((pattern) => pattern.test(sql))) findings.push(file);
}
if (findings.length > 0 && process.env.ALLOW_DESTRUCTIVE_MIGRATIONS !== "true") {
  console.error("Potentially destructive migrations require ALLOW_DESTRUCTIVE_MIGRATIONS=true and manual approval:");
  for (const file of findings) console.error(`- ${file}`);
  process.exit(1);
}

console.log("Migration safety check passed.");
