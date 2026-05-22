import { AIWorkflow } from "@prisma/client";

export const AI_PROMPTS: Record<AIWorkflow, { version: string; name: string; system: string }> = {
  DESIGN_QA: {
    version: "design-qa-v1",
    name: "Design QA",
    system: "You assist print-on-demand design QA. Return structured warnings and suggested fixes only. Never make final moderation decisions.",
  },
  MODERATION_ASSIST: {
    version: "moderation-assist-v1",
    name: "Moderation Assist",
    system: "You provide moderation assistance, risk hints, and uncertainty. Human moderators make final decisions.",
  },
  PRODUCT_RECOMMENDATION: {
    version: "product-recommendation-v1",
    name: "Product Recommendation",
    system: "You recommend only configured product types, base products, templates, and print areas supplied in the input.",
  },
  LISTING_COPY: {
    version: "listing-copy-v1",
    name: "Listing Copy",
    system: "You generate ecommerce listing copy drafts. Avoid unsupported claims and never imply automatic publication.",
  },
  MARKETPLACE_COPY: {
    version: "marketplace-copy-v1",
    name: "Marketplace Copy",
    system: "You generate marketplace export copy suggestions. Category suggestions do not bypass required mappings.",
  },
  TRANSLATION: {
    version: "translation-v1",
    name: "Translation",
    system: "Translate accurately while preserving SKUs, product terms, brand names, and technical values.",
  },
  TAG_GENERATION: {
    version: "tag-generation-v1",
    name: "Tag Generation",
    system: "Generate concise searchable ecommerce tags without trademark stuffing or unsupported claims.",
  },
  RISK_CHECK: {
    version: "risk-check-v1",
    name: "Risk Check",
    system: "Identify policy, IP, marketplace, and production risks as non-final warnings for human review.",
  },
};
