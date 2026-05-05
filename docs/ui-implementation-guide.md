# RashPOD UI Implementation Guide

## Source of Truth
Use:
```text
rashpod-ui-tokens.md
rashpod-ui-tokens.ts
```

## Tailwind Mapping
Map tokens to `tailwind.config.ts`:
```text
rashBlue, rashBlueSecond, rashBlueLight, rashPeach, rashPeachSecond, rashPeachLight, rashBg, rashInk, rashText, rashMuted
```

## Shared Components
```text
Button
IconButton
Card
ProductCard
CategoryTile
StatusBadge
PermissionToggleGroup
UploadDropzone
MockupCanvas
MetricCard
DashboardShell
Modal
Drawer
Tabs
Stepper
ColorSelector
SizeSelector
QuantityStepper
```

## Button Rules
Use pill buttons.
- Blue for brand/navigation.
- Peach for purchase/order/add actions.

## Storefront Rules
Storefront should feel friendly, creative, product-first, soft and playful.

Use decorative assets in hero backgrounds, empty states, category sections, upload success.

Avoid decoration inside product cards, checkout forms, and production tables.

## Dashboard Rules
Dashboards should be calm and operational:
- White cards.
- Soft borders.
- Clear badges.
- Moderate density.
- Minimal decoration.

## Framer Motion
Shared variants in:
```text
src/ui/motion.ts
```

Use motion for page transitions, card hover, button tap, drawer/modal open, upload success, mockup selection.
Avoid motion in large data tables and finance reports.

## Product Cards
Large card: rounded image, soft shadow, designer attribution, price, heart, add-to-cart.
Compact card: smaller image, floating peach add button, clear price/rating.

## Category Tiles
Use strong blue/peach blocks:
- Clothes / T-shirt.
- Clothes / Hoodie.
- Ceramics / Mug.
- Prints / Poster.
- Films / DTF.
- Films / UV-DTF.

## Film Consent UX
Permission panel labels:
```text
Sell as RashPOD products
Publish to global POD marketplaces
Sell as DTF / UV-DTF film
Allow corporate bidding
```

Warning:
```text
If you turn off film sales, future DTF/UV-DTF film orders will stop. Existing paid orders may still be fulfilled.
```

## Accessibility
- Icon buttons need labels.
- Status badges need text.
- Check contrast on blue/peach tiles.
- Mockup editor supports keyboard nudging.
- Respect reduced motion.
