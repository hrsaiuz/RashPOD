import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const repoRoot = path.resolve(import.meta.dirname, "..", "..");
const dashboardRoot = path.join(repoRoot, "apps", "rashpod-dashboard");
const outputRoot = path.join(dashboardRoot, "messages");
const sourceRoots = [
  path.join(dashboardRoot, "app"),
  path.join(dashboardRoot, "components"),
  path.join(repoRoot, "packages", "ui", "src", "components"),
];
const locales = ["uz", "ru", "fr"];
const translatableAttributes = new Set([
  "alt",
  "aria-label",
  "cancelLabel",
  "caption",
  "confirmLabel",
  "description",
  "emptyMessage",
  "eyebrow",
  "heading",
  "helperText",
  "hint",
  "label",
  "message",
  "placeholder",
  "subtitle",
  "title",
]);
const translatableProperties = new Set([
  ...translatableAttributes,
  "group",
  "name",
  "notice",
  "statusLabel",
  "successMessage",
]);
const messageCalls = /(?:^|\.)(?:Error|setError|setMessage|setNotice|setSuccess|setWarning)$/;
const translationCalls = /(?:^|\.)t$/;
const ignoredFiles = /(?:\.test\.|\.spec\.|\.stories\.)/;
const ignoredLiteral = /^(?:https?:\/\/|\/api\/|\/dashboard\/|[.#][a-z-]|[a-z]+:\/\/|[A-Z0-9_./:-]{2,}|[a-z0-9_-]+\.(?:png|jpe?g|webp|svg|pdf|csv|xlsx|json)|(?:GET|POST|PUT|PATCH|DELETE)|(?:true|false|null|undefined))$/;
const technicalClassToken = /^(?:(?:sm|md|lg|xl|2xl|hover|focus|focus-visible|motion-reduce):)?(?:bg|text|border|rounded|shadow|grid|flex|items|justify|gap|p[trblxy]?|m[trblxy]?|w|h|min|max|font|leading|tracking|overflow|transition|duration|opacity|z|absolute|relative|fixed|sticky|inset|top|right|bottom|left|block|hidden|inline|object|cursor|select|whitespace|break|truncate)-/;
const additionalClassToken = /^(?:ring|from|via|to|divide|place|space|peer|group|aspect|columns|col|row|order|self|content|transform|translate|scale|rotate|origin|touch|pointer-events)-/;
const standaloneClassToken = /^(?:block|border|flex|grid|hidden|inline|relative|absolute|fixed|sticky)$/;

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target, files);
    else if (/\.tsx?$/.test(entry.name) && !ignoredFiles.test(entry.name)) files.push(target);
  }
  return files;
}

function normalize(value) {
  return value.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
}

function isHumanCopy(value) {
  const text = normalize(value);
  if (!text || !/[A-Za-z]/.test(text) || ignoredLiteral.test(text)) return false;
  const tokens = text.split(/\s+/);
  if (tokens.every((token) => technicalClassToken.test(token) || additionalClassToken.test(token) || standaloneClassToken.test(token))) return false;
  if (/^[a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9]+)+$/.test(text)) return false;
  if (/^[a-z0-9_-]+$/.test(text) && text.length > 24) return false;
  return true;
}

function propertyName(node) {
  if (!node) return null;
  if (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) return node.text;
  return null;
}

function collectCopy() {
  const phrases = new Set();
  const add = (value) => {
    const text = normalize(value);
    if (isHumanCopy(text)) phrases.add(text);
  };

  for (const file of sourceRoots.flatMap((root) => walk(root))) {
    const sourceText = fs.readFileSync(file, "utf8");
    const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    const visit = (node, jsxAttribute = null) => {
      let attribute = jsxAttribute;
      if (ts.isJsxAttribute(node)) attribute = node.name.text;

      if (ts.isJsxText(node)) add(node.text);

      if (ts.isJsxAttribute(node) && translatableAttributes.has(node.name.text)) {
        const initializer = node.initializer;
        if (initializer && ts.isStringLiteral(initializer)) add(initializer.text);
        if (initializer && ts.isJsxExpression(initializer) && initializer.expression && ts.isStringLiteralLike(initializer.expression)) {
          add(initializer.expression.text);
        }
      }

      if (ts.isStringLiteralLike(node)) {
        const parent = node.parent;
        if (attribute && translatableAttributes.has(attribute)) add(node.text);
        else if (ts.isJsxExpression(parent) && (!attribute || translatableAttributes.has(attribute))) add(node.text);
        else if (ts.isPropertyAssignment(parent) && translatableProperties.has(propertyName(parent.name))) add(node.text);
        else if (ts.isCallExpression(parent) && messageCalls.test(parent.expression.getText(source))) add(node.text);
        else if (
          ts.isCallExpression(parent) &&
          parent.arguments[0] === node &&
          translationCalls.test(parent.expression.getText(source))
        ) add(node.text);
        else if (ts.isConditionalExpression(parent) || ts.isBinaryExpression(parent)) {
          if (
            parent.parent &&
            (ts.isTemplateSpan(parent.parent) ||
              (ts.isJsxExpression(parent.parent) && (!attribute || translatableAttributes.has(attribute))))
          ) add(node.text);
        }
      }

      ts.forEachChild(node, (child) => visit(child, attribute));
    };
    visit(source);
  }

  return [...phrases].sort((a, b) => a.localeCompare(b, "en"));
}

function readCatalog(locale) {
  const file = path.join(outputRoot, `${locale}.json`);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
}

function writeCatalog(locale, catalog) {
  fs.mkdirSync(outputRoot, { recursive: true });
  const sorted = Object.fromEntries(Object.entries(catalog).sort(([left], [right]) => left.localeCompare(right, "en")));
  fs.writeFileSync(path.join(outputRoot, `${locale}.json`), `${JSON.stringify(sorted, null, 2)}\n`);
}

async function translate(text, locale, attempt = 1) {
  const body = new URLSearchParams({ client: "gtx", sl: "en", tl: locale, dt: "t", q: text });
  const response = await fetch("https://translate.googleapis.com/translate_a/single", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body,
  });
  if (!response.ok) {
    if (attempt < 9 && (response.status === 429 || response.status >= 500)) {
      const delay = response.status === 429
        ? Math.min(60_000, (2 ** attempt) * 1_500) + Math.round(Math.random() * 1_000)
        : attempt * 1_000;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return translate(text, locale, attempt + 1);
    }
    throw new Error(`Translation failed (${response.status}) for ${locale}: ${text}`);
  }
  const payload = await response.json();
  const translated = Array.isArray(payload?.[0])
    ? payload[0].map((segment) => segment?.[0] ?? "").join("").trim()
    : "";
  if (!translated) throw new Error(`Empty translation for ${locale}: ${text}`);
  return translated;
}

async function mapConcurrent(values, concurrency, task) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++;
      await task(values[index], index);
    }
  });
  await Promise.all(workers);
}

async function generate(phrases) {
  for (const locale of locales) {
    const catalog = readCatalog(locale);
    const missing = phrases.filter((phrase) => !catalog[phrase]);
    process.stdout.write(`${locale}: translating ${missing.length} missing phrases\n`);
    let completed = 0;
    await mapConcurrent(missing, 4, async (phrase) => {
      catalog[phrase] = await translate(phrase, locale);
      completed += 1;
      if (completed % 100 === 0 || completed === missing.length) {
        writeCatalog(locale, catalog);
        process.stdout.write(`${locale}: ${completed}/${missing.length}\n`);
      }
    });
    writeCatalog(locale, catalog);
  }
}

function check(phrases) {
  const failures = [];
  for (const locale of locales) {
    const catalog = readCatalog(locale);
    for (const phrase of phrases) {
      if (typeof catalog[phrase] !== "string" || !catalog[phrase].trim()) failures.push(`${locale}: ${phrase}`);
    }
  }
  if (failures.length) {
    process.stderr.write(`Dashboard translation coverage failed (${failures.length} missing).\n${failures.slice(0, 50).join("\n")}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`Dashboard translation coverage passed: ${phrases.length} phrases × ${locales.length} locales.\n`);
}

function prune(phrases) {
  const allowed = new Set(phrases);
  for (const locale of locales) {
    const catalog = readCatalog(locale);
    const pruned = Object.fromEntries(Object.entries(catalog).filter(([phrase]) => allowed.has(phrase)));
    writeCatalog(locale, pruned);
    process.stdout.write(`${locale}: pruned to ${Object.keys(pruned).length} phrases\n`);
  }
}

const phrases = collectCopy();
const command = process.argv[2] ?? "--check";
if (command === "--generate") await generate(phrases);
else if (command === "--list") process.stdout.write(`${phrases.join("\n")}\n`);
else if (command === "--prune") prune(phrases);
else check(phrases);
