import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/ui-setup.ts"],
    include: ["apps/rashpod-web/**/*.test.tsx", "apps/rashpod-dashboard/**/*.test.ts", "packages/ui/**/*.test.tsx"],
    clearMocks: true,
  },
});
