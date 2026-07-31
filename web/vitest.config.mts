import { defineConfig } from "vitest/config";

/**
 * Unit tests for the pure server-side logic — session tokens, secret comparison,
 * rate limiting, pricing arithmetic and formatting. Nothing here renders, so
 * there is no jsdom environment and no setup files; everything runs in plain
 * Node. Async Server Components are not unit-testable, so anything that touches
 * the database is covered by the build and by types instead.
 */
export default defineConfig({
  // Resolves the `@/*` alias from tsconfig.json.
  resolve: { tsconfigPaths: true },
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
