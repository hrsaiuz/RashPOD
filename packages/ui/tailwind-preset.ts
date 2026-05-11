import type { Config } from "tailwindcss";

const preset: Omit<Config, "content"> = {
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#788AE0",
          blueSecondary: "#A3AFE5",
          blueLight: "#CFD6FA",
          peach: "#F39E7C",
          peachSecondary: "#EBB7A2",
          peachLight: "#FFD6C6",
          ink: "#1F2937",
          muted: "#6B7280",
          bg: "#F0F2FA",
        },
        surface: {
          card: "#FFFFFF",
          border: "#E5E7EB",
          borderSoft: "#EEF0F6",
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
        },
      },
      borderRadius: {
        xl: "16px",
        "2xl": "24px",
        pill: "9999px",
      },
      boxShadow: {
        soft: "0 2px 8px rgba(31, 41, 55, 0.06)",
        lift: "0 8px 24px rgba(31, 41, 55, 0.08)",
        blueGlow: "0 18px 44px rgba(120, 138, 224, 0.26)",
        peachGlow: "0 18px 44px rgba(243, 158, 124, 0.28)",
      },
      fontFamily: {
        rash: ['var(--font-dm-sans)', 'var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default preset;
