import { defineConfig } from "vitest/config";
import path from "node:path";

// Isolated config for the live send test only. `npm test` never touches it.
export default defineConfig({
  test: {
    include: ["src/lib/email/__tests__/send.live.test.ts"],
    exclude: [],
    setupFiles: ["src/lib/email/__tests__/setup-env.ts"],
    pool: "threads",
    testTimeout: 120_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "tests/shims/server-only.ts"),
    },
  },
});
