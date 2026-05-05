import type { Config } from "tailwindcss";
import { rashpodTailwindTheme } from "../../rashpod-ui-tokens";

const config: Omit<Config, "content"> = {
  theme: {
    extend: rashpodTailwindTheme,
  },
  plugins: [],
};

export default config;
