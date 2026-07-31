import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Unit tests for the pure server-side logic — session tokens, secret comparison
 * and rate limiting. No React/DOM tests yet, so no environment or setup files;
 * everything runs in plain Node.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // The admin auth module requires both of these at call time. Fixed values so
    // signatures are reproducible across runs.
    env: {
      ADMIN_PASSWORD: "test-admin-password",
      ADMIN_SESSION_SECRET: "test-session-secret",
    },
  },
});
