import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load .env for local drizzle-kit commands (generate/migrate/studio). In CI the
// GitHub Actions workflow injects DATABASE_URL directly into the environment.
config({ path: ".env.local" });
config({ path: ".env" });

if (!process.env.DATABASE_URL) {
  // drizzle-kit `generate` works from the schema alone, but `migrate`/`push`/
  // `studio` need a live connection. Fail loudly so misconfiguration is obvious.
  console.warn(
    "[drizzle] DATABASE_URL is not set — `generate` still works, but `migrate`/`push`/`studio` will fail.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  // Keep migrations readable in review; drizzle stores its bookkeeping in this table.
  migrations: {
    table: "__drizzle_migrations",
    schema: "public",
  },
  strict: true,
  verbose: true,
});
