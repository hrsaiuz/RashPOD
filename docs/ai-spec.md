# RashPOD AI Spec

## Philosophy
AI suggests. Human approves.

## Provider
OpenAI.

## MVP Features
### Listing Copy Generator
Inputs: design title, product type, product color, designer notes, language, category.
Outputs: title, short description, long description, tags, SEO title, SEO description.
Approval: designer/admin.

### Translation Assistant
Languages: Uzbek Latin, Russian, English. Uzbek Cyrillic later.

### Moderation Assistant
Outputs: policy risk hints, quality hints, trademark/copyright suspicion, checklist. Moderator decides.

### Film Readiness Assistant
Inputs: design dimensions, DPI, transparency, file type, print size, film method.
Outputs: readiness summary, warnings, suggested fixes, production notes.

### Corporate Offer Draft Assistant
Inputs: corporate request, selected bid, product details, admin cost lines, timeline, delivery.
Outputs: offer text, terms draft, email draft. Admin approves.

## Later AI Features
- Designer onboarding assistant.
- Customer support assistant.
- Marketplace optimization assistant.
- Analytics insight assistant.
- Product recommendation assistant.
- Corporate request matching assistant.

## Hard Prohibitions in MVP
AI must not approve designs, reject designs permanently, publish listings, enable film sales, select bid winners, send offers, change royalties, change payment settings, change delivery settings, or issue refunds.

## AI Logging
Log feature, model, input summary, output summary, tokens, cost estimate, status, error, user, and time.

## Prompt Templates
```text
listing_copy
listing_tags
listing_translation
moderation_assist
film_readiness
corporate_offer_draft
email_copy
```

## UX Rules
AI appears as assistive actions: Generate title, Generate description, Generate tags, Translate, Check film readiness, Draft offer, Summarize bids.

Show label:
```text
AI draft — please review before publishing.
```
