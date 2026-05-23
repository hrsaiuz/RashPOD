import type { Config } from "tailwindcss";
import { buildRashpodTailwindExtend } from "./build-tailwind-theme";

const preset: Omit<Config, "content"> = {
  theme: {
    extend: buildRashpodTailwindExtend(),
  },
  plugins: [],
};

export default preset;
