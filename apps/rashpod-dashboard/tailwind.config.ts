import type { Config } from "tailwindcss";
import tailwindPreset from "@rashpod/ui/tailwind-preset";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  presets: [tailwindPreset],
};

export default config;
