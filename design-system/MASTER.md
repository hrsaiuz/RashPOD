# RashPOD Design System — Master

Source of truth for RashPOD UI/UX. Generated with the `ui-ux-pro-max` skill and
reconciled with the established RashPOD brand (`rashpod-ui-tokens.md`,
`rashpod-ui-tokens.ts`). When building any page or component, read this file
first; for page-specific deviations check `design-system/pages/<page>.md`.

## 1. Product & Pattern

- **Product type:** Creative print-on-demand marketplace (multi-sided: designers,
  customers, corporate, production, moderators, admin).
- **Primary pattern:** Marketplace / Directory + Operations dashboards.
- **Conversion focus on storefront:** Showcase featured designs, reduce browsing
  friction, surface the dual "Shop" vs "Start selling" CTAs in the hero.
- **CTA placement (storefront):** Hero primary peach button (designer CTA) +
  hero secondary blue button (shop CTA) + sticky header peach CTA.
- **Sections (storefront home):** Hero → How it works (designer) → How it works
  (customer) → Featured products → Featured designers → DTF/UV-DTF films →
  Corporate quotes → Trust signals → Testimonials → FAQ.

## 2. Style

- **Style family:** Soft UI evolution — friendly, creative, clean, with subtle
  depth via tokenised shadows (`shadow-soft`, `shadow-lift`, `shadow-product`).
- **Mood:** Playful, friendly, modern, operationally reliable.
- **Mode support:** Light first. Dark mode is reserved for future work — design
  light/dark pairs together when introducing it (do not invert raw hex).
- **Anti-patterns:**
  - Emoji as structural icons. Use `lucide-react` thin-outline icons only.
  - Inverting brand colors for dark mode.
  - Heavy decorative motion in admin, production, or finance tables.
  - Random shadow values — only use the tokenised scale.
  - Raw Tailwind `bg-green-100 text-green-700` for status. Use `<Badge>` with
    a semantic variant (`green`, `red`, `yellow`, `blue`, `peach`, `gray`).
  - Italic block-quote testimonials — prefer attributed cards with role pill.

## 3. Color (from `rashpod-ui-tokens.md`)

| Role            | Token                  | Hex       | Notes |
|-----------------|------------------------|-----------|-------|
| Primary brand   | `brand-blue`           | `#788AE0` | Primary CTA, selected nav |
| Secondary brand | `brand-blueSecondary`  | `#A3AFE5` | Secondary surfaces |
| Light brand     | `brand-blueLight`      | `#CFD6FA` | Soft backgrounds, badges |
| Accent CTA      | `brand-peach`          | `#F39E7C` | "Start selling", add-to-cart |
| Light accent    | `brand-peachLight`     | `#FFD6C6` | Decorative wash |
| Background      | `brand-bg`             | `#F0F2FA` | App background |
| Ink             | `brand-ink`            | `#0B1020` | Primary text |
| Muted           | `brand-muted`          | `#6B7280` | Secondary text |

Semantic colours and the status badge palette: see `rashpod-ui-tokens.md` §3 & §11.

## 4. Typography

- **Heading & body:** Inter (already wired via `next/font/google`).
- **Type scale tokens:** `display`, `h1`, `h2`, `h3`, `section`, `bodyLg`, `body`,
  `caption`, `button`, `price`. Map to Tailwind via the UI preset.
- **Tabular numbers:** Use `tabular-nums` for prices, royalties, currencies and
  timers to prevent column jitter.

## 5. Layout & Responsive

- Breakpoints: 640 / 768 / 1024 / 1280 / 1440 (token scale).
- Storefront max-width: 1280 px. Dashboard: 1440 px, sidebar 260 px, topbar 76 px.
- Mobile-first; verify hero & feature sections at 375 px. No horizontal scroll.

## 6. Motion

- Durations: instant 0.12 / micro 0.18 / normal 0.24 / page 0.32 / slow 0.45 s.
- Easings: standard `[0.22, 1, 0.36, 1]`, soft `[0.16, 1, 0.3, 1]`, sharp `[0.4, 0, 0.2, 1]`.
- **Wrap motion-heavy trees in `<MotionConfig reducedMotion="user">`** so users
  who request reduced motion get static UI.
- Animate `transform` and `opacity` only. Avoid `width`, `height`, `top`, `left`.

## 7. Accessibility (CRITICAL — always pass)

1. Contrast ≥ 4.5:1 for body text; ≥ 3:1 for ≥ 18 px.
2. Visible focus rings on every interactive element.
3. Skip-to-content link on every public layout and dashboard shell.
4. Icon-only buttons must carry `aria-label`.
5. Navigation items use `aria-current="page"` for the active route.
6. Status conveyed by colour must also include text or an icon.
7. Respect `prefers-reduced-motion`.

## 8. Touch & Interaction

- Min touch target 44×44 px.
- 8 px minimum gap between adjacent touch targets.
- Provide pressed feedback ≤ 150 ms (`whileTap={{ scale: 0.98 }}`).
- Never rely on hover for primary actions on mobile.

## 9. Forms & Feedback

- Visible labels per input (no placeholder-only labels).
- Errors adjacent to the field plus an `aria-live="polite"` summary on submit.
- Use `<Button loading />` for async actions.
- Empty / error states must offer a recovery action.

## 10. Navigation

- Storefront: sticky translucent header with blur, mobile drawer.
- Dashboard: persistent left sidebar on `md+`, drawer on mobile, breadcrumbs
  above the main content.
- Active item indicator: `aria-current="page"` + role-accent left bar.

## 11. Charts & Data

- Recharts with rounded bars/points and brand palette (`#788AE0` primary,
  `#F39E7C` secondary, `#A3AFE5` tertiary). Always supply legend, tooltips and
  an empty-data fallback.

## 12. Component Library

Source of truth lives in `packages/ui`:

```
Button, Card, Badge, BadgeNew, Input, Select, Textarea, FormField, Modal,
Drawer, Skeleton, Spinner, EmptyState, ErrorState, KpiTile, ProductCard,
CategoryTile, DecorativeBackground, DashboardShell, DashboardSidebar,
DashboardTopbar, PublicHeader, PublicFooter, DataTable, ChartWrapper,
MetricCard, DashboardPanel, Breadcrumbs, MotionProvider.
```

When extending the system add the component to `packages/ui/src/components`
and export it from `packages/ui/src/index.ts`. Do not implement bespoke
buttons / cards / badges in app code — reach for the primitive first.

## 13. Page Overrides

Page-level deviations go in `design-system/pages/<slug>.md`. When such a file
exists for the current page, prefer its rules over this Master file.
