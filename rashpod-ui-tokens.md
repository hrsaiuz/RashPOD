# RashPOD UI Tokens & Design Reference

This file is the human-readable UI reference for RashPOD. Use it together with the TypeScript token file during coding.

## 1. Visual Identity

RashPOD should preserve the visual language from the current Figma/screenshots:

- Soft blue and peach brand palette
- Light lavender-gray background
- Rounded product cards and category tiles
- Thin outline icon style
- Playful geometric background assets
- Minimal storefront with soft shadows
- Calm Framer Motion interactions, not heavy animation
- Clean Recharts data visualizations

The product should feel **friendly, creative, clean, and operationally reliable**.

---

## 2. Brand Colors

| Token | Hex | Usage |
|---|---:|---|
| Main Blue | `#788AE0` | Primary brand color, selected states, category tiles |
| Secondary Blue | `#A3AFE5` | Secondary surfaces, soft highlights |
| Light Blue | `#CFD6FA` | Background gradients, subtle badges |
| Main Peach | `#F39E7C` | Main CTA, add-to-cart, action highlights |
| Secondary Peach | `#EBB7A2` | Secondary peach surfaces |
| Light Peach | `#FFD6C6` | Soft backgrounds, decorative accents |
| Background | `#F0F2FA` | Main app/storefront background |
| Ink | `#0B1020` | Primary dark text |
| Text | `#20243A` | Default text |
| Muted | `#6B7280` | Secondary text |
| Subtle | `#9CA3AF` | Captions and helper text |
| White | `#FFFFFF` | Cards and elevated surfaces |
| Focus Ring | `rgba(120,138,224,0.18)` | Input focus highlights |

### Gradients

| Token | Value | Usage |
|---|---|---|
| Blue Gradient | `linear-gradient(135deg, #788AE0 0%, #CFD6FA 100%)` | Blue tiles, hero accents |
| Peach Gradient | `linear-gradient(135deg, #F39E7C 0%, #FFD6C6 100%)` | Peach tiles, decorative areas |
| Soft Surface | `linear-gradient(180deg, #FFFFFF 0%, #F7F8FF 100%)` | Cards and panels |
| Hero | `linear-gradient(135deg, #F0F2FA 0%, #FFFFFF 55%, #FFD6C6 100%)` | Landing/hero backgrounds |

---

## 3. Semantic Colors

| State | Text | Base | Background | Usage |
|---|---:|---:|---:|---|
| Success | `#027A48` | `#12B76A` | `#ECFDF3` | Approved, delivered, payout completed |
| Warning | `#B54708` | `#F79009` | `#FFFAEB` | Needs fix, waiting, file warning |
| Danger | `#B42318` | `#F04438` | `#FEF3F2` | Rejected, failed, suspended |
| Info | `#175CD3` | `#2E90FA` | `#EFF8FF` | Submitted, processing |
| Pending | `#475467` | `#667085` | `#F2F4F7` | Draft, pending review |
| Published | `#5B6FD8` | - | `#EEF1FF` | Listing published |
| Film Enabled | `#C85F35` | - | `#FFF1E8` | DTF/UV-DTF permissions active |

---

## 4. Typography

Recommended font family:

```css
font-family: "Inter", "SF Pro Display", "Segoe UI", system-ui, sans-serif;
```

| Token | Size | Line Height | Weight | Usage |
|---|---:|---:|---:|---|
| Display | 56px | 64px | 700 | Landing hero |
| H1 | 36px | 44px | 700 | Page titles |
| H2 | 28px | 36px | 700 | Major sections |
| H3 | 22px | 30px | 600 | Card headers |
| Section Title | 18px | 26px | 600 | Dashboard/card section titles |
| Body Large | 16px | 26px | 400 | Descriptions |
| Body | 14px | 22px | 400 | Default UI text |
| Caption | 12px | 18px | 400 | Helper text, metadata |
| Button | 14px | 20px | 600 | Buttons |
| Price | 24px | 32px | 700 | Product prices |

---

## 5. Spacing

Use a 4px-based spacing system.

| Token | Value |
|---|---:|
| 1 | 4px |
| 2 | 8px |
| 3 | 12px |
| 4 | 16px |
| 5 | 20px |
| 6 | 24px |
| 8 | 32px |
| 10 | 40px |
| 12 | 48px |
| 16 | 64px |
| 20 | 80px |
| 24 | 96px |

---

## 6. Border Radius

| Token | Value | Usage |
|---|---:|---|
| XS | 8px | Small controls |
| SM | 12px | Inputs, small badges |
| MD | 16px | Buttons, medium controls |
| LG | 20px | Small cards |
| XL | 24px | Cards |
| 2XL | 32px | Large panels, modals |
| Pill | 999px | Buttons, badges, toggles |
| Product Card | 28px | Product cards |
| Category Tile | 24px | Storefront category cards |

---

## 7. Shadows

| Token | Value | Usage |
|---|---|---|
| XS | `0 1px 2px rgba(16, 24, 40, 0.05)` | Tiny controls |
| SM | `0 4px 12px rgba(16, 24, 40, 0.06)` | Basic cards |
| MD | `0 12px 28px rgba(16, 24, 40, 0.08)` | Hover cards |
| LG | `0 20px 48px rgba(16, 24, 40, 0.12)` | Modals |
| Product | `0 18px 40px rgba(16, 24, 40, 0.12)` | Product cards |
| FAB | `0 10px 24px rgba(243, 158, 124, 0.38)` | Add buttons |
| Blue Glow | `0 18px 44px rgba(120, 138, 224, 0.26)` | Blue CTA |
| Peach Glow | `0 18px 44px rgba(243, 158, 124, 0.28)` | Peach CTA |

---

## 8. Layout Tokens

### Breakpoints

| Token | Width | Usage |
|---|---:|---|
| SM | 640px | Mobile landscape |
| MD | 768px | Tablet |
| LG | 1024px | Small laptop |
| XL | 1280px | Desktop |
| 2XL | 1440px | Widescreen |

### Storefront

| Token | Value |
|---|---:|
| Max Width | 1280px |
| Header Height | 76px |
| Section Gap | 72px |
| Grid Gap | 24px |
| Product Grid Minimum | 240px |

### Dashboard

| Token | Value |
|---|---:|
| Max Width | 1440px |
| Sidebar Width | 260px |
| Topbar Height | 76px |
| Page Padding | 32px |
| Card Gap | 24px |

---

## 9. Z-Index and Opacities

### Z-Index Scale

| Token | Value | Usage |
|---|---:|---|
| Base | 0 | Default content |
| Dropdown | 10 | Menus, popovers |
| Sticky | 20 | Headers, sticky sidebars |
| Overlay | 40 | Modal backdrops |
| Modal | 50 | Dialogs, modals |
| Toast | 100 | Notifications, alerts |

### Opacities

| Token | Value | Usage |
|---|---:|---|
| Hover | 0.08 | Light interaction |
| Active | 0.12 | Pressed state |
| Overlay | 0.48 | Backdrops |
| Disabled | 0.50 | Disabled elements |
| Muted | 0.65 | Low priority text/icons |

---

## 10. Component Tokens

### Buttons

Base button:

| Property | Value |
|---|---:|
| Height | 48px |
| Horizontal Padding | 24px |
| Radius | 999px |
| Font | Button token |
| Transition | 180ms |

Variants:

| Variant | Background | Text | Usage |
|---|---:|---:|---|
| Primary Blue | `#788AE0` | White | Main brand action |
| Primary Peach | `#F39E7C` | White | Purchase/add/order action |
| Secondary Outline | Transparent | `#788AE0` | Secondary action |
| Ghost | Transparent | `#20243A` | Low-priority actions |
| Danger | `#F04438` | White | Destructive action |

### Product Cards

| Type | Key Rules |
|---|---|
| Large Product Card | 320px width, 28px radius, 18px padding, product shadow |
| Compact Product Card | 280px width, 24px radius, 220px image height, floating peach add button |
| Marketplace Tile | Square image, price bold, rating row, heart button |

### Category Tiles

Use the current big tile language from the screenshots.

| Variant | Background | Label | Title |
|---|---:|---:|---:|
| Blue Tile | `#788AE0` | Peach | White |
| Peach Tile | `#F39E7C` | Blue | Ink |

Rules:

- Radius: 24px
- Padding: 28px
- Minimum height: 240px
- Product image should float with soft shadow
- Button should be pill-shaped

### Form Inputs

| Property | Value |
|---|---:|
| Height | 48px |
| Radius | 14px |
| Border | `1px solid #E5E7EB` |
| Focus Ring | `0 0 0 4px rgba(120, 138, 224, 0.18)` |

### Selectors

| Component | Value |
|---|---:|
| Color Swatch | 44px |
| Selected Color Ring | `3px solid #F39E7C` |
| Size Pill Height | 32px |
| Selected Size Background | `#EEF1FF` |
| Selected Size Text | `#788AE0` |

---

## 11. Status Badge System

| Status | Background | Text |
|---|---:|---:|
| Draft | `#F2F4F7` | `#475467` |
| Submitted | `#EFF8FF` | `#175CD3` |
| Approved | `#ECFDF3` | `#027A48` |
| Rejected | `#FEF3F2` | `#B42318` |
| Needs Fix | `#FFFAEB` | `#B54708` |
| Published | `#EEF1FF` | `#5B6FD8` |
| Film Enabled | `#FFF1E8` | `#C85F35` |

---

## 12. User Types and Dashboards

| User Type | Dashboard | Accent | Main Modules |
|---|---|---:|---|
| Customer | Customer Dashboard | Blue | Orders, wishlist, addresses, support |
| Designer | Designer Dashboard | Peach | Uploads, moderation, mockups, listings, film consent, bids, royalties |
| Corporate Client | Corporate Dashboard | Blue | Requests, offers, approvals, bulk orders, billing |
| Production Staff | Production Dashboard | Green | POD queue, DTF queue, UV-DTF queue, QC, packing, delivery |
| Moderator | Moderator Dashboard | Warning | Design review, listing review, policy logs |
| Operations/Admin | Admin Dashboard | Ink | Catalog, templates, pricing, offers, marketplace sync, payouts |
| Super Admin | Super Admin Dashboard | Ink | Users, roles, system config, AI settings, email templates, audit logs |

---

## 13. Designer Commercial Rights UX

Important rule:

```text
Design approved for product sales does not automatically mean approved for DTF/UV-DTF film sales.
```

Each design/version should support these permissions:

| Field | Type | Meaning |
|---|---|---|
| `allowProductSales` | boolean | Can be sold as RashPOD products |
| `allowMarketplacePublishing` | boolean | Can be published to external marketplaces |
| `allowFilmSales` | boolean | Can be sold as DTF/UV-DTF film |
| `allowCorporateBidding` | boolean | Can be offered for corporate work |
| `filmConsentGrantedAt` | Date/null | When film-sale permission was granted |
| `filmConsentRevokedAt` | Date/null | When film-sale permission was revoked |
| `filmConsentVersionId` | string/null | Design version tied to the consent |
| `filmRoyaltyRate` | number/null | Royalty rate for film sales |

UX copy:

```text
Allow RashPOD to sell this design as DTF/UV-DTF film.
```

Warning copy:

```text
If you turn off film sales, future DTF/UV-DTF film orders will stop. Existing paid orders may still be fulfilled.
```

---

## 14. Workflow Statuses

### Design Statuses

```text
DRAFT
SUBMITTED
NEEDS_FIX
APPROVED
REJECTED
SUSPENDED
READY_FOR_MOCKUP
READY_TO_PUBLISH
PUBLISHED
```

### Production Statuses

```text
ORDERED
FILE_CHECK
READY_FOR_PRINT
PRINTING
QC
PACKING
READY_FOR_PICKUP
DELIVERED
```

---

## 15. Decorative Assets

Use the geometric assets from the screenshots as brand texture.

| Area | Density |
|---|---|
| Hero sections | Medium |
| Storefront backgrounds | Medium |
| Dashboard pages | Low |
| Modals | None |
| Product cards | None |
| Empty states | Medium |
| Upload success screens | Medium |

Rules:

- Use blue/peach assets only.
- Keep opacity low in background usage.
- Do not place decorative assets inside production-critical dashboard tables.
- Do not overload product cards with decoration.

---

## 16. Icon Style

| Property | Value |
|---|---|
| Style | Thin outline |
| Stroke Width | 1.75px |
| Default Color | `#20243A` |
| Active Color | `#788AE0` |
| Small | 16px |
| Medium | 20px |
| Large | 24px |
| XL | 32px |

Recommended icon concepts:

```text
home, search, heart, user, cart, bag, calendar, upload, download,
image, edit, trash, check, close, bell, wallet, settings, globe,
truck, tag, share
```

---

## 17. Framer Motion Tokens

### Motion Principle

Motion should make RashPOD feel responsive and premium. Avoid heavy animation in admin, production, and finance screens.

### Durations

| Token | Seconds | Usage |
|---|---:|---|
| Instant | 0.12 | Tiny feedback |
| Micro | 0.18 | Button/card hover |
| Normal | 0.24 | Default component state |
| Page | 0.32 | Page transitions |
| Slow | 0.45 | Large modals/drawers |

### Easing

```ts
standard: [0.22, 1, 0.36, 1]
soft: [0.16, 1, 0.3, 1]
sharp: [0.4, 0, 0.2, 1]
```

### Recommended Variants

#### Page

```ts
{
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] }
}
```

#### Card

```ts
{
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  hover: { y: -4, scale: 1.01 },
  tap: { scale: 0.985 }
}
```

#### Upload Dropzone

```ts
{
  idle: { scale: 1, borderColor: "#E5E7EB" },
  dragOver: { scale: 1.01, borderColor: "#788AE0" },
  success: { scale: 1, borderColor: "#12B76A" },
  error: { scale: 1, borderColor: "#F04438" }
}
```

#### Floating Add Button

```ts
{
  hover: { scale: 1.06, rotate: 4 },
  tap: { scale: 0.94 }
}
```

### Performance Rules

- Animate `transform` and `opacity` where possible.
- Avoid layout-heavy animations in large tables.
- Disable decorative motion in dense production views.
- Respect `prefers-reduced-motion`.
- Use `LazyMotion` from Framer Motion to reduce bundle impact.

---

## 18. Charting (Recharts)

Principle: Keep charts clean, minimal, using brand colors and rounded bars/points.

| Element | Color |
|---|---|
| Primary Data | `#788AE0` |
| Secondary Data | `#F39E7C` |
| Tertiary Data | `#A3AFE5` |
| Success Metric | `#12B76A` |
| Warning Metric | `#F79009` |

---

## 19. AI Surfaces

OpenAI should be used as an assistive layer, not an uncontrolled publisher.

| Area | AI Actions | Rule |
|---|---|---|
| Listing Generation | Title, description, tags, translation | Designer/admin reviews |
| Moderation Assist | Policy hints, quality hints, trademark risk hints | Admin decides |
| Corporate Offers | Draft offer text, summarize bids, translate offer | Admin approves before sending |

---

## 20. Email Templates

Provider: **ZeptoMail**

Recommended templates:

```text
account_verification
designer_design_submitted
design_approved
design_rejected
mockups_ready
film_sale_enabled
film_sale_disabled
order_confirmation
production_status_update
corporate_request_received
designer_bid_received
commercial_offer_sent
payout_processed
```

---

## 21. Accessibility Rules

- Use high contrast for text on blue/peach tiles.
- Do not rely only on color for status; include labels/icons.
- All icon buttons need `aria-label`.
- Keyboard support is required for mockup placement controls.
- Respect `prefers-reduced-motion`.
- Keep production/admin workflows dense but readable.

---

## 22. Implementation Notes

### Tailwind

Map the TypeScript tokens into `tailwind.config.ts`:

- `colors` (use nested structure: `brand`, `semantic`, etc.)
- `borderRadius`
- `boxShadow`
- `fontFamily`
- `spacing`
- `zIndex`
- `screens` (breakpoints)

### Framer Motion & Recharts

Keep shared motion variants in:

```text
src/ui/motion.ts
```

Configure default Recharts styles/colors in a wrapper component or theme file.

### Suggested Files

```text
src/ui/rashpod.tokens.ts
src/ui/rashpod.tokens.md
src/ui/motion.ts
src/ui/components/Button.tsx
src/ui/components/ProductCard.tsx
src/ui/components/CategoryTile.tsx
src/ui/components/StatusBadge.tsx
src/ui/components/PermissionToggleGroup.tsx
src/ui/components/UploadDropzone.tsx
src/ui/components/MockupCanvas.tsx
src/ui/components/ChartWrapper.tsx
```
