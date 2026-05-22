import { BadRequestException } from "@nestjs/common";
import { AISuggestionSeverity } from "@prisma/client";

const TAG_LIMIT = 30;
const TITLE_LIMIT = 140;
const DESCRIPTION_LIMIT = 5000;
const PRIVATE_URL_PATTERN = /https?:\/\/[^\s]*(storage\.googleapis\.com|X-Goog-|Signature=|token=|authorization=)[^\s]*/i;

export function normalizeConfidence(value: unknown) {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : undefined;
  if (number == null || !Number.isFinite(number)) return undefined;
  return Math.max(0, Math.min(1, number > 1 ? number / 100 : number));
}

export function normalizeSeverity(value: unknown): AISuggestionSeverity {
  return value === "BLOCKER" || value === "WARNING" || value === "INFO" ? value : "INFO";
}

export function assertPublicPayloadSafe(payload: unknown) {
  const text = JSON.stringify(payload ?? {});
  if (PRIVATE_URL_PATTERN.test(text)) throw new BadRequestException("AI output contains a private or signed URL");
}

export function validateListingCopyPayload(payload: Record<string, unknown>) {
  const title = stringValue(payload.title, TITLE_LIMIT);
  const description = stringValue(payload.description, DESCRIPTION_LIMIT);
  const tags = Array.isArray(payload.tags)
    ? payload.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, TAG_LIMIT)
    : [];
  if (!title && !description && tags.length === 0) throw new BadRequestException("AI listing copy output is empty");
  const next = { ...payload, title, description, tags, aiGenerated: true };
  assertPublicPayloadSafe(next);
  return next;
}

export function validateTranslationPayload(payload: Record<string, unknown>) {
  const translatedText = stringValue(payload.translatedText, DESCRIPTION_LIMIT);
  const targetLanguage = String(payload.targetLanguage ?? "");
  if (!translatedText) throw new BadRequestException("AI translation output is empty");
  if (!["uz-Latn", "uz-Cyrl", "uz", "ru", "en"].includes(targetLanguage)) throw new BadRequestException("Unsupported AI translation language");
  const next = { ...payload, translatedText, targetLanguage, aiGenerated: true };
  assertPublicPayloadSafe(next);
  return next;
}

export function validateQaPayload(payload: Record<string, unknown>) {
  const warnings = stringArray(payload.warnings).slice(0, 20);
  const blockers = stringArray(payload.blockers).slice(0, 20);
  const suggestedFixes = stringArray(payload.suggestedFixes).slice(0, 20);
  const recommendation = ["PASS", "WARN", "BLOCK"].includes(String(payload.recommendation)) ? String(payload.recommendation) : blockers.length ? "BLOCK" : warnings.length ? "WARN" : "PASS";
  const next = { ...payload, recommendation, warnings, blockers, suggestedFixes, aiGenerated: true };
  assertPublicPayloadSafe(next);
  return next;
}

function stringValue(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : undefined;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}
