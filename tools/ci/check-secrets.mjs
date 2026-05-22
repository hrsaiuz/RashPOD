import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
const forbiddenFiles = tracked.filter((file) => /(^|\/)\.env(\.|$)?/.test(file) && !file.endsWith(".example"));
const secretPatterns = [
  { name: "OpenAI API key", pattern: /sk-[A-Za-z0-9_-]{32,}/ },
  { name: "Telegram bot token", pattern: /\b\d{7,12}:[A-Za-z0-9_-]{30,}\b/ },
  { name: "Google private key", pattern: /-----BEGIN PRIVATE KEY-----/ },
  { name: "JWT-like token", pattern: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/ },
];
const ignored = [/^package-lock\.json$/, /^docs\/SEED_CREDENTIALS\.md$/];
const findings = [];

for (const file of tracked) {
  if (ignored.some((pattern) => pattern.test(file))) continue;
  if (/\.(png|jpg|jpeg|webp|gif|ico|pdf|zip)$/i.test(file)) continue;
  let content = "";
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  for (const item of secretPatterns) {
    if (item.pattern.test(content)) findings.push(`${item.name} pattern in ${file}`);
  }
}

if (forbiddenFiles.length > 0 || findings.length > 0) {
  console.error("Secret scan failed.");
  for (const file of forbiddenFiles) console.error(`Tracked env file is not allowed: ${file}`);
  for (const finding of findings) console.error(finding);
  process.exit(1);
}

console.log("Secret scan passed.");
