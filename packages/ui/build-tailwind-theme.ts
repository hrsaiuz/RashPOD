import { rashpodTokens } from "../../rashpod-ui-tokens";

const { colors, typography, radius, shadows, layout, breakpoints, zIndices } = rashpodTokens;

function typographyEntry(key: keyof typeof typography.scale) {
  const t = typography.scale[key];
  return [
    t.fontSize,
    {
      lineHeight: t.lineHeight,
      fontWeight: String(t.fontWeight),
      ...("letterSpacing" in t && t.letterSpacing ? { letterSpacing: t.letterSpacing } : {}),
    },
  ] as [string, Record<string, string>];
}

/** Single source of truth for Tailwind theme.extend — consumed by tailwind-preset.ts */
export function buildRashpodTailwindExtend() {
  return {
    colors: {
      brand: {
        blue: colors.brand.blue,
        blueSecondary: colors.brand.blueSecond,
        blueLight: colors.brand.blueLight,
        peach: colors.brand.peach,
        peachSecondary: colors.brand.peachSecond,
        peachLight: colors.brand.peachLight,
        ink: colors.brand.ink,
        text: colors.brand.text,
        muted: colors.brand.muted,
        subtle: colors.brand.subtle,
        bg: colors.brand.background,
        line: colors.surfaces.borderSoft,
        surface: colors.surfaces.card,
        white: colors.brand.white,
      },
      surface: {
        card: colors.surfaces.card,
        app: colors.surfaces.page,
        border: colors.surfaces.border,
        borderSoft: colors.surfaces.borderSoft,
        "border-soft": colors.surfaces.borderSoft,
        raised: colors.surfaces.elevated,
        darkShell: colors.surfaces.darkShell,
        darkPanel: colors.surfaces.darkPanel,
      },
      semantic: {
        success: colors.semantic.success,
        successBg: colors.semantic.successBg,
        successText: colors.semantic.successText,
        warning: colors.semantic.warning,
        warningBg: colors.semantic.warningBg,
        warningText: colors.semantic.warningText,
        danger: colors.semantic.danger,
        dangerBg: colors.semantic.dangerBg,
        dangerText: colors.semantic.dangerText,
        info: colors.semantic.info,
        infoBg: colors.semantic.infoBg,
        infoText: colors.semantic.infoText,
        pending: colors.semantic.pending,
        pendingBg: colors.semantic.pendingBg,
        pendingText: colors.semantic.pendingText,
        publishedText: colors.semantic.publishedText,
        publishedBg: colors.semantic.publishedBg,
        filmText: colors.semantic.filmEnabledText,
        filmBg: colors.semantic.filmEnabledBg,
      },
      badge: {
        bestSeller: "#D877CF",
        featured: "#D67AD2",
      },
    },
    backgroundImage: {
      "rash-hero": colors.gradients.hero,
      "rash-surface": colors.gradients.softSurface,
      "rash-blue": colors.gradients.blue,
      "rash-peach": colors.gradients.peach,
    },
    borderRadius: {
      xs: radius.xs,
      sm: radius.sm,
      md: radius.md,
      lg: radius.lg,
      xl: radius.xl,
      "2xl": radius["2xl"],
      "3xl": radius.modal,
      pill: radius.pill,
      product: radius.productCard,
      category: radius.categoryTile,
    },
    boxShadow: {
      xs: shadows.xs,
      soft: shadows.sm,
      lift: shadows.md,
      product: shadows.product,
      lg: shadows.lg,
      fab: shadows.floatingAction,
      blueGlow: shadows.blueGlow,
      peachGlow: shadows.peachGlow,
    },
    maxWidth: {
      storefront: layout.maxWidth.storefront,
      dashboard: layout.maxWidth.dashboard,
      content: layout.maxWidth.content,
      form: layout.maxWidth.form,
    },
    spacing: {
      section: layout.storefront.sectionGap,
      "dashboard-gap": layout.dashboard.cardGap,
    },
    fontSize: {
      display: typographyEntry("display"),
      h1: typographyEntry("h1"),
      h2: typographyEntry("h2"),
      h3: typographyEntry("h3"),
      section: typographyEntry("sectionTitle"),
      bodyLg: typographyEntry("bodyLarge"),
      body: typographyEntry("body"),
      caption: typographyEntry("caption"),
      button: typographyEntry("button"),
      price: typographyEntry("price"),
    },
    fontFamily: {
      rash: [
        "var(--font-google-sans)",
        "var(--font-dm-sans)",
        "var(--font-inter)",
        "Google Sans",
        "DM Sans",
        "Inter",
        "SF Pro Display",
        "Segoe UI",
        "system-ui",
        "sans-serif",
      ],
    },
    zIndex: {
      dropdown: zIndices.dropdown,
      sticky: zIndices.sticky,
      overlay: zIndices.overlay,
      modal: zIndices.modal,
      toast: zIndices.toast,
    },
    screens: {
      sm: breakpoints.sm,
      md: breakpoints.md,
      lg: breakpoints.lg,
      xl: breakpoints.xl,
      "2xl": breakpoints["2xl"],
    },
  };
}
