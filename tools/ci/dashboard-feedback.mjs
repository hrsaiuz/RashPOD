import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dashboardRoot = path.join(root, "apps", "rashpod-dashboard");
const sourceRoots = ["app/dashboard", "components", "lib"].map((entry) => path.join(dashboardRoot, entry));
const extensions = new Set([".ts", ".tsx"]);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(target);
    return extensions.has(path.extname(entry.name)) && !entry.name.includes(".test.") ? [target] : [];
  });
}

const files = sourceRoots.flatMap(walk);
const failures = [];
let mutationFiles = 0;
let uploadInputs = 0;
let backgroundDownloads = 0;

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const relative = path.relative(root, file).replaceAll("\\", "/");
  if (/api\.(post|patch|put|delete)\s*\(|method\s*:\s*["'](?:POST|PATCH|PUT|DELETE)["']/.test(source)) mutationFiles += 1;
  if (/type\s*=\s*["']file["']/.test(source)) {
    uploadInputs += 1;
    if (!/(uploadToSignedUrl|beginDashboardTransfer)/.test(source)) {
      failures.push(`${relative}: file input is not connected to the background transfer layer`);
    }
  }
  if (/downloadFileInBackground|saveBlobInBackground/.test(source)) backgroundDownloads += 1;
  if (/window\.open\s*\(/.test(source)) failures.push(`${relative}: window.open bypasses background download progress`);
  if (/\.download\s*=/.test(source) && !relative.endsWith("/lib/background-transfer.ts")) failures.push(`${relative}: direct anchor download bypasses background download progress`);
  if (/<a\b[^>]*(?:download|target\s*=\s*["']_blank["'])[^>]*>[\s\S]{0,240}?\bDownload\b/i.test(source)) failures.push(`${relative}: download link bypasses background download progress`);
  if (/fetch\s*\(\s*(?:signed\.uploadUrl|upload\.url)/.test(source)) failures.push(`${relative}: direct signed upload bypasses background upload progress`);
}

const providerPath = path.join(dashboardRoot, "components", "feedback", "toast-provider.tsx");
const provider = fs.readFileSync(providerPath, "utf8");
for (const [description, pattern] of [
  ["top-right action viewport", /fixed right-4 top-20/],
  ["bottom-right transfer viewport", /fixed bottom-4 right-4/],
  ["mutation result interception", /window\.fetch\s*=\s*async/],
  ["polite live regions", /aria-live="polite"/],
]) {
  if (!pattern.test(provider)) failures.push(`toast-provider.tsx: missing ${description}`);
}

console.log(`Dashboard feedback audit: ${mutationFiles} mutation files, ${uploadInputs} upload surfaces, ${backgroundDownloads} background download consumers.`);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("All dashboard mutations and file transfers are covered by the shared feedback system.");
