/**
 * RashPOD UI Tokens
 * Source: RashPOD Figma screenshots + agreed product structure.
 *
 * Purpose:
 * - Single visual reference for storefront, designer dashboard, admin dashboard,
 *   production dashboard, corporate dashboard, DTF/UV-DTF order flow, and marketplace hub.
 * - Designed for Next.js / React / Tailwind / Framer Motion implementation.
 *
 * Core identity:
 * - Soft blue + peach palette
 * - Rounded product cards
 * - Playful geometric background assets
 * - Thin outline icons
 * - Calm premium motion, not heavy animation
 */

export const rashpodTokens = {
  meta: {
    product: "RashPOD",
    version: "0.1.1",
    stack: {
      frontend: ["Next.js", "React", "Tailwind CSS", "Framer Motion", "Recharts"],
      backendInfra: ["Google Cloud Run", "Google Cloud Storage", "Cloud SQL PostgreSQL"],
      email: "ZeptoMail",
      ai: "OpenAI",
    },
  },

  colors: {
    brand: {
      blue: "#788AE0",
      blueSecond: "#A3AFE5",
      blueLight: "#CFD6FA",

      peach: "#F39E7C",
      peachSecond: "#EBB7A2",
      peachLight: "#FFD6C6",

      background: "#F0F2FA",
      ink: "#0B1020",
      text: "#20243A",
      muted: "#6B7280",
      subtle: "#9CA3AF",
      white: "#FFFFFF",
    },

    gradients: {
      blue: "linear-gradient(135deg, #788AE0 0%, #CFD6FA 100%)",
      peach: "linear-gradient(135deg, #F39E7C 0%, #FFD6C6 100%)",
      softSurface: "linear-gradient(180deg, #FFFFFF 0%, #F7F8FF 100%)",
      hero: "linear-gradient(135deg, #F0F2FA 0%, #FFFFFF 55%, #FFD6C6 100%)",
    },

    semantic: {
      success: "#12B76A",
      successBg: "#ECFDF3",
      successText: "#027A48",
      
      warning: "#F79009",
      warningBg: "#FFFAEB",
      warningText: "#B54708",
      
      danger: "#F04438",
      dangerBg: "#FEF3F2",
      dangerText: "#B42318",
      
      info: "#2E90FA",
      infoBg: "#EFF8FF",
      infoText: "#175CD3",
      
      pending: "#667085",
      pendingBg: "#F2F4F7",
      pendingText: "#475467",

      publishedBg: "#EEF1FF",
      publishedText: "#5B6FD8",

      filmEnabledBg: "#FFF1E8",
      filmEnabledText: "#C85F35",
    },

    surfaces: {
      app: "#F0F2FA",
      page: "#F7F8FC",
      card: "#FFFFFF",
      cardSoft: "#FAFBFF",
      elevated: "#FFFFFF",
      darkShell: "#171717",
      darkPanel: "#242424",
      border: "#E5E7EB",
      borderSoft: "#EEF0F6",
      overlay: "rgba(11, 16, 32, 0.48)",
    },
    
    focusRing: "rgba(120, 138, 224, 0.18)",
  },

  opacities: {
    disabled: 0.5,
    muted: 0.65,
    overlay: 0.48,
    hover: 0.08,
    active: 0.12,
  },

  typography: {
    fontFamily: {
      primary: '"Inter", "SF Pro Display", "Segoe UI", system-ui, sans-serif',
      brand: '"Inter", "SF Pro Display", "Segoe UI", system-ui, sans-serif',
    },

    scale: {
      display: {
        fontSize: "56px",
        lineHeight: "64px",
        fontWeight: 700,
        letterSpacing: "-0.04em",
      },
      h1: {
        fontSize: "36px",
        lineHeight: "44px",
        fontWeight: 700,
        letterSpacing: "-0.03em",
      },
      h2: {
        fontSize: "28px",
        lineHeight: "36px",
        fontWeight: 700,
        letterSpacing: "-0.025em",
      },
      h3: {
        fontSize: "22px",
        lineHeight: "30px",
        fontWeight: 600,
        letterSpacing: "-0.02em",
      },
      sectionTitle: {
        fontSize: "18px",
        lineHeight: "26px",
        fontWeight: 600,
      },
      bodyLarge: {
        fontSize: "16px",
        lineHeight: "26px",
        fontWeight: 400,
      },
      body: {
        fontSize: "14px",
        lineHeight: "22px",
        fontWeight: 400,
      },
      caption: {
        fontSize: "12px",
        lineHeight: "18px",
        fontWeight: 400,
      },
      button: {
        fontSize: "14px",
        lineHeight: "20px",
        fontWeight: 600,
        letterSpacing: "0.02em",
      },
      price: {
        fontSize: "24px",
        lineHeight: "32px",
        fontWeight: 700,
        letterSpacing: "-0.02em",
      },
    },
  },

  spacing: {
    0: "0px",
    1: "4px",
    2: "8px",
    3: "12px",
    4: "16px",
    5: "20px",
    6: "24px",
    8: "32px",
    10: "40px",
    12: "48px",
    16: "64px",
    20: "80px",
    24: "96px",
  },

  radius: {
    xs: "8px",
    sm: "12px",
    md: "16px",
    lg: "20px",
    xl: "24px",
    "2xl": "32px",
    pill: "999px",
    productCard: "28px",
    categoryTile: "24px",
    modal: "32px",
  },

  shadows: {
    none: "none",
    xs: "0 1px 2px rgba(16, 24, 40, 0.05)",
    sm: "0 4px 12px rgba(16, 24, 40, 0.06)",
    md: "0 12px 28px rgba(16, 24, 40, 0.08)",
    lg: "0 20px 48px rgba(16, 24, 40, 0.12)",
    product: "0 18px 40px rgba(16, 24, 40, 0.12)",
    floatingAction: "0 10px 24px rgba(243, 158, 124, 0.38)",
    blueGlow: "0 18px 44px rgba(120, 138, 224, 0.26)",
    peachGlow: "0 18px 44px rgba(243, 158, 124, 0.28)",
  },

  zIndices: {
    base: "0",
    dropdown: "10",
    sticky: "20",
    overlay: "40",
    modal: "50",
    toast: "100",
  },

  breakpoints: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1440px",
  },

  layout: {
    maxWidth: {
      storefront: "1280px",
      dashboard: "1440px",
      content: "1120px",
      form: "720px",
    },
    dashboard: {
      sidebarWidth: "260px",
      topbarHeight: "76px",
      pagePadding: "32px",
      cardGap: "24px",
    },
    storefront: {
      headerHeight: "76px",
      sectionGap: "72px",
      gridGap: "24px",
      productGridMin: "240px",
    },
  },

  components: {
    button: {
      base: {
        height: "48px",
        paddingInline: "24px",
        borderRadius: "999px",
        font: "button",
        transition: "motion.micro",
      },
      sizes: {
        sm: { height: "38px", paddingInline: "16px", fontSize: "13px" },
        md: { height: "48px", paddingInline: "24px", fontSize: "14px" },
        lg: { height: "56px", paddingInline: "30px", fontSize: "16px" },
      },
      variants: {
        primaryBlue: {
          background: "colors.brand.blue",
          color: "colors.brand.white",
          shadow: "shadows.blueGlow",
        },
        primaryPeach: {
          background: "colors.brand.peach",
          color: "colors.brand.white",
          shadow: "shadows.peachGlow",
        },
        secondaryOutline: {
          background: "transparent",
          color: "colors.brand.blue",
          border: "1px solid #788AE0",
        },
        ghost: {
          background: "transparent",
          color: "colors.brand.text",
        },
        danger: {
          background: "colors.semantic.danger",
          color: "colors.brand.white",
        },
      },
    },

    iconButton: {
      size: {
        sm: "36px",
        md: "44px",
        lg: "52px",
      },
      radius: "pill",
      background: "colors.surfaces.card",
      border: "1px solid #EEF0F6",
      shadow: "shadows.sm",
    },

    card: {
      base: {
        background: "colors.surfaces.card",
        border: "1px solid #EEF0F6",
        borderRadius: "24px",
        shadow: "shadows.sm",
      },
      interactive: {
        hoverShadow: "shadows.md",
        hoverY: -4,
      },
    },

    productCard: {
      large: {
        width: "320px",
        borderRadius: "28px",
        imageRadius: "22px",
        padding: "18px",
        shadow: "shadows.product",
      },
      compact: {
        width: "280px",
        borderRadius: "24px",
        imageHeight: "220px",
        padding: "16px",
        addButtonSize: "48px",
      },
      marketplaceTile: {
        imageRatio: "1 / 1",
        titleWeight: 600,
        priceWeight: 700,
        ratingColor: "colors.brand.blue",
      },
    },

    categoryTile: {
      borderRadius: "24px",
      padding: "28px",
      minHeight: "240px",
      titleSize: "44px",
      labelSize: "20px",
      variants: {
        blue: {
          background: "colors.brand.blue",
          labelColor: "colors.brand.peach",
          titleColor: "colors.brand.white",
          buttonBackground: "colors.brand.peach",
        },
        peach: {
          background: "colors.brand.peach",
          labelColor: "colors.brand.blue",
          titleColor: "colors.brand.ink",
          buttonBackground: "colors.brand.white",
        },
      },
    },

    form: {
      inputHeight: "48px",
      inputRadius: "14px",
      inputBorder: "1px solid #E5E7EB",
      focusRing: "colors.focusRing",
      labelFont: "caption",
    },

    selector: {
      colorSwatchSize: "44px",
      colorSwatchSelectedRing: "3px solid #F39E7C",
      sizePillHeight: "32px",
      sizePillRadius: "999px",
      selectedBackground: "#EEF1FF",
      selectedColor: "#788AE0",
    },

    statusBadge: {
      height: "28px",
      radius: "999px",
      paddingInline: "12px",
      fontSize: "12px",
      states: {
        draft: { bg: "colors.semantic.pendingBg", color: "colors.semantic.pendingText" },
        submitted: { bg: "colors.semantic.infoBg", color: "colors.semantic.infoText" },
        approved: { bg: "colors.semantic.successBg", color: "colors.semantic.successText" },
        rejected: { bg: "colors.semantic.dangerBg", color: "colors.semantic.dangerText" },
        needsFix: { bg: "colors.semantic.warningBg", color: "colors.semantic.warningText" },
        published: { bg: "colors.semantic.publishedBg", color: "colors.semantic.publishedText" },
        filmEnabled: { bg: "colors.semantic.filmEnabledBg", color: "colors.semantic.filmEnabledText" },
      },
    },

    dashboardShell: {
      sidebar: {
        background: "colors.surfaces.darkShell",
        activeItemBg: "#2A2A2A",
        itemColor: "#C8CDD6",
        activeItemColor: "#FFFFFF",
        radius: "14px",
      },
      topbar: {
        background: "colors.surfaces.card",
        borderBottom: "1px solid #EEF0F6",
        height: "76px",
      },
    },
  },

  roles: {
    customer: {
      dashboard: "Customer Dashboard",
      accent: "colors.brand.blue",
      primaryModules: ["Orders", "Wishlist", "Addresses", "Support"],
    },
    designer: {
      dashboard: "Designer Dashboard",
      accent: "colors.brand.peach",
      primaryModules: [
        "Design Upload",
        "Moderation Status",
        "Mockup Studio",
        "Product Listings",
        "Film Sale Consent",
        "Corporate Bids",
        "Royalties",
      ],
    },
    corporateClient: {
      dashboard: "Corporate Dashboard",
      accent: "colors.brand.blue",
      primaryModules: ["Requests", "Offers", "Approvals", "Bulk Orders", "Billing"],
    },
    productionStaff: {
      dashboard: "Production Dashboard",
      accent: "colors.semantic.success",
      primaryModules: ["POD Queue", "DTF Queue", "UV-DTF Queue", "QC", "Packing", "Delivery"],
    },
    moderator: {
      dashboard: "Moderator Dashboard",
      accent: "colors.semantic.warning",
      primaryModules: ["Design Review", "Listing Review", "Policy Logs", "Violation History"],
    },
    operationsAdmin: {
      dashboard: "Operations/Admin Dashboard",
      accent: "colors.brand.ink",
      primaryModules: [
        "Catalog",
        "Product Templates",
        "Pricing Rules",
        "Commercial Offers",
        "Marketplace Hub",
        "Payouts",
      ],
    },
    superAdmin: {
      dashboard: "Super Admin Dashboard",
      accent: "colors.brand.ink",
      primaryModules: ["Users", "Roles", "System Config", "AI Settings", "Email Templates", "Audit Logs"],
    },
  },

  workflows: {
    designerDesignCommercialRights: {
      principle: "Product sale approval does not automatically grant film-sale approval.",
      fields: {
        allowProductSales: "boolean",
        allowMarketplacePublishing: "boolean",
        allowFilmSales: "boolean",
        allowCorporateBidding: "boolean",
        filmConsentGrantedAt: "Date | null",
        filmConsentRevokedAt: "Date | null",
        filmConsentVersionId: "string | null",
        filmRoyaltyRate: "number | null",
      },
      uiPattern: "PermissionToggleGroup",
      warningCopy:
        "If you turn off film sales, future DTF/UV-DTF film orders will stop. Existing paid orders may still be fulfilled.",
    },

    designStatuses: [
      "DRAFT",
      "SUBMITTED",
      "NEEDS_FIX",
      "APPROVED",
      "REJECTED",
      "SUSPENDED",
      "READY_FOR_MOCKUP",
      "READY_TO_PUBLISH",
      "PUBLISHED",
    ],

    productionStatuses: [
      "ORDERED",
      "FILE_CHECK",
      "READY_FOR_PRINT",
      "PRINTING",
      "QC",
      "PACKING",
      "READY_FOR_PICKUP",
      "DELIVERED",
    ],
  },

  decorativeAssets: {
    usage:
      "Use geometric assets lightly in storefront backgrounds, empty states, hero sections, upload success states, and category headers.",
    density: {
      hero: "medium",
      dashboards: "low",
      modals: "none",
      productCards: "none",
      emptyStates: "medium",
    },
    colors: ["#788AE0", "#A3AFE5", "#CFD6FA", "#F39E7C", "#EBB7A2", "#FFD6C6"],
    opacity: {
      background: 0.18,
      decorative: 0.45,
      active: 1,
    },
  },

  icons: {
    style: "thin-outline",
    strokeWidth: 1.75,
    color: "#20243A",
    activeColor: "#788AE0",
    sizes: {
      sm: "16px",
      md: "20px",
      lg: "24px",
      xl: "32px",
    },
    recommendedSets: [
      "home",
      "search",
      "heart",
      "user",
      "cart",
      "bag",
      "calendar",
      "upload",
      "download",
      "image",
      "edit",
      "trash",
      "check",
      "close",
      "bell",
      "wallet",
      "settings",
      "globe",
      "truck",
      "tag",
      "share",
    ],
  },

  motion: {
    library: "framer-motion",
    principle:
      "Motion should make the platform feel responsive and premium. Avoid heavy animation on dashboards or production screens.",
    durations: {
      instant: 0.12,
      micro: 0.18,
      normal: 0.24,
      page: 0.32,
      slow: 0.45,
    },
    easing: {
      standard: [0.22, 1, 0.36, 1],
      soft: [0.16, 1, 0.3, 1],
      sharp: [0.4, 0, 0.2, 1],
    },
    spring: {
      soft: { type: "spring", stiffness: 260, damping: 24 },
      card: { type: "spring", stiffness: 320, damping: 28 },
      drag: { type: "spring", stiffness: 420, damping: 34 },
    },
    variants: {
      page: {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
      },
      card: {
        initial: { opacity: 0, y: 10, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        hover: { y: -4, scale: 1.01 },
        tap: { scale: 0.985 },
      },
      modal: {
        initial: { opacity: 0, y: 24, scale: 0.96 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 16, scale: 0.98 },
      },
      uploadDropzone: {
        idle: { scale: 1, borderColor: "#E5E7EB" },
        dragOver: { scale: 1.01, borderColor: "#788AE0" },
        success: { scale: 1, borderColor: "#12B76A" },
        error: { scale: 1, borderColor: "#F04438" },
      },
      mockupObject: {
        drag: { scale: 1.02 },
        selected: { boxShadow: "0 0 0 4px rgba(120, 138, 224, 0.18)" },
      },
      fab: {
        hover: { scale: 1.06, rotate: 4 },
        tap: { scale: 0.94 },
      },
    },
    performanceRules: [
      "Animate transform and opacity only where possible.",
      "Avoid layout-heavy animations in large dashboard tables.",
      "Disable decorative motion in production dashboard dense views.",
      "Respect prefers-reduced-motion.",
      "Use LazyMotion from Framer Motion for bundle control.",
    ],
  },

  charts: {
    library: "recharts",
    principle: "Keep charts clean, minimal, using brand colors and rounded bars/points.",
    colors: [
      "#788AE0", // Blue
      "#F39E7C", // Peach
      "#A3AFE5", // Blue Second
      "#EBB7A2", // Peach Second
      "#12B76A", // Success
      "#F79009", // Warning
    ],
  },

  aiSurfaces: {
    listingGeneration: {
      actions: ["Generate title", "Generate description", "Generate tags", "Translate listing"],
      tone: "commercial, clear, marketplace-safe",
    },
    moderationAssist: {
      actions: ["Policy hint", "Trademark risk hint", "Quality checklist"],
      rule: "AI can assist, but admin decides.",
    },
    corporateOffer: {
      actions: ["Draft offer text", "Summarize designer bids", "Translate offer"],
      rule: "Admin must approve before sending.",
    },
  },

  emailTemplates: {
    provider: "ZeptoMail",
    templates: [
      "account_verification",
      "designer_design_submitted",
      "design_approved",
      "design_rejected",
      "mockups_ready",
      "film_sale_enabled",
      "film_sale_disabled",
      "order_confirmation",
      "production_status_update",
      "corporate_request_received",
      "designer_bid_received",
      "commercial_offer_sent",
      "payout_processed",
    ],
  },

  implementationNotes: {
    tailwind:
      "Map these tokens into tailwind.config.ts theme.extend for colors, spacing, borderRadius, boxShadow, fontFamily, and animation utilities.",
    framer:
      "Keep variants in a shared motion.ts file and import them into cards, modals, upload flows, and mockup editor components.",
    accessibility: [
      "Use high contrast for text on blue/peach tiles.",
      "Do not rely only on color for status; include labels/icons.",
      "All icon buttons need aria-label.",
      "Keyboard support is required for mockup placement controls.",
      "Respect prefers-reduced-motion.",
    ],
  },
} as const;

export type RashpodTokens = typeof rashpodTokens;
export type BrandColor = keyof typeof rashpodTokens.colors.brand;
export type SemanticStatus = keyof typeof rashpodTokens.colors.semantic;
export type TypographyScale = keyof typeof rashpodTokens.typography.scale;
export type Spacing = keyof typeof rashpodTokens.spacing;

/**
 * Framer Motion quick exports.
 * Usage:
 * import { rashpodMotion } from "@/ui/rashpod.tokens";
 */
export const rashpodMotion = rashpodTokens.motion.variants;

/**
 * Suggested Tailwind theme mapping.
 * Copy into tailwind.config.ts theme.extend if desired.
 */
export const rashpodTailwindTheme = {
  colors: {
    brand: {
      blue: rashpodTokens.colors.brand.blue,
      "blue-second": rashpodTokens.colors.brand.blueSecond,
      "blue-light": rashpodTokens.colors.brand.blueLight,
      peach: rashpodTokens.colors.brand.peach,
      "peach-second": rashpodTokens.colors.brand.peachSecond,
      "peach-light": rashpodTokens.colors.brand.peachLight,
      bg: rashpodTokens.colors.brand.background,
      ink: rashpodTokens.colors.brand.ink,
      text: rashpodTokens.colors.brand.text,
      muted: rashpodTokens.colors.brand.muted,
      subtle: rashpodTokens.colors.brand.subtle,
      white: rashpodTokens.colors.brand.white,
    },
    semantic: {
      success: rashpodTokens.colors.semantic.success,
      "success-bg": rashpodTokens.colors.semantic.successBg,
      "success-text": rashpodTokens.colors.semantic.successText,
      warning: rashpodTokens.colors.semantic.warning,
      "warning-bg": rashpodTokens.colors.semantic.warningBg,
      "warning-text": rashpodTokens.colors.semantic.warningText,
      danger: rashpodTokens.colors.semantic.danger,
      "danger-bg": rashpodTokens.colors.semantic.dangerBg,
      "danger-text": rashpodTokens.colors.semantic.dangerText,
      info: rashpodTokens.colors.semantic.info,
      "info-bg": rashpodTokens.colors.semantic.infoBg,
      "info-text": rashpodTokens.colors.semantic.infoText,
      pending: rashpodTokens.colors.semantic.pending,
      "pending-bg": rashpodTokens.colors.semantic.pendingBg,
      "pending-text": rashpodTokens.colors.semantic.pendingText,
    },
    surface: {
      app: rashpodTokens.colors.surfaces.app,
      page: rashpodTokens.colors.surfaces.page,
      card: rashpodTokens.colors.surfaces.card,
      "card-soft": rashpodTokens.colors.surfaces.cardSoft,
      elevated: rashpodTokens.colors.surfaces.elevated,
      border: rashpodTokens.colors.surfaces.border,
      "border-soft": rashpodTokens.colors.surfaces.borderSoft,
    },
    focus: rashpodTokens.colors.focusRing,
  },
  opacity: {
    disabled: String(rashpodTokens.opacities.disabled),
    muted: String(rashpodTokens.opacities.muted),
    overlay: String(rashpodTokens.opacities.overlay),
  },
  zIndex: {
    dropdown: rashpodTokens.zIndices.dropdown,
    sticky: rashpodTokens.zIndices.sticky,
    overlay: rashpodTokens.zIndices.overlay,
    modal: rashpodTokens.zIndices.modal,
    toast: rashpodTokens.zIndices.toast,
  },
  screens: {
    sm: rashpodTokens.breakpoints.sm,
    md: rashpodTokens.breakpoints.md,
    lg: rashpodTokens.breakpoints.lg,
    xl: rashpodTokens.breakpoints.xl,
    "2xl": rashpodTokens.breakpoints["2xl"],
  },
  borderRadius: {
    sm: rashpodTokens.radius.sm,
    md: rashpodTokens.radius.md,
    lg: rashpodTokens.radius.lg,
    xl: rashpodTokens.radius.xl,
    "2xl": rashpodTokens.radius["2xl"],
    pill: rashpodTokens.radius.pill,
  },
  boxShadow: {
    sm: rashpodTokens.shadows.sm,
    md: rashpodTokens.shadows.md,
    lg: rashpodTokens.shadows.lg,
    product: rashpodTokens.shadows.product,
    fab: rashpodTokens.shadows.floatingAction,
  },
  fontFamily: {
    rash: rashpodTokens.typography.fontFamily.primary,
  },
};
