import { defineConfig } from "vitest/config";

/**
 * Unit tests for the pure logic in `src/lib/` — pricing arithmetic and
 * formatting. Node environment, no jsdom: nothing here renders. Async Server
 * Components are not unit-testable, so anything that touches the database is
 * covered by the build and by types instead.
 */
export default defineConfig({
  // Resolves the `@/*` alias from tsconfig.json.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
