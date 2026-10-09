import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/*.live.test.ts"],
    setupFiles: ["src/lib/email/__tests__/setup-env.ts"],
    pool: "threads",
    // DB-backed email tests share one test database and clear it between
    // tests, so files must run serially to avoid wiping each other's data.
    maxWorkers: 1,
    hookTimeout: 60_000,
    // DB tests round-trip to the test cluster; Atlas latency needs headroom.
    testTimeout: 60_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // The real `server-only` package throws outside React Server
      // Components; tests run in plain Node so they use an empty shim.
      "server-only": path.resolve(__dirname, "tests/shims/server-only.ts"),
    },
  },
});

