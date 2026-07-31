import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Unit tests for the pure server-side logic — session tokens, password hashing,
 * authorization, the audit writer, rate limiting, retention, pricing arithmetic
 * and formatting. Nothing here renders, so there is no jsdom environment and no
 * setup files; everything runs in plain Node. Async Server Components are not
 * unit-testable, so anything that touches the database is either mocked at the
 * `@/db` boundary or covered by the build and by types instead.
 */
export default defineConfig({
  // Resolves the `@/*` alias from tsconfig.json.
  resolve: {
    tsconfigPaths: true,
    alias: {
      // Next.js resolves this marker package itself; outside its bundler the
      // specifier does not exist. See the stub for why.
      "server-only": fileURLToPath(
        new URL("./vitest.server-only.stub.ts", import.meta.url),
      ),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // The session-token module requires this at call time. A fixed value, so
    // signatures are reproducible across runs.
    env: {
      ADMIN_SESSION_SECRET: "test-session-secret",
    },
  },
});
