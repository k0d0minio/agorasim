/**
 * Create the first owner account, so a fresh deployment is never locked out of
 * its own admin area.
 *
 *   cd web
 *   ADMIN_SEED_EMAIL=diogo@agorasim.pt \
 *   ADMIN_SEED_NAME=Diogo \
 *   ADMIN_SEED_PASSWORD='a long passphrase' \
 *   pnpm db:seed-owner
 *
 * Idempotent, and safe to run on every deploy: if an account with that address
 * already exists it is left completely alone — no password reset, no role
 * change. A seed script that silently rewrote a live operator's credentials
 * would be a backdoor wearing a convenience hat.
 *
 * Run via `tsx` (see the `db:seed-owner` script), for two reasons Node alone
 * cannot cover: `tsx` resolves the `@/…` tsconfig paths the imported modules
 * use, and `--conditions=react-server` makes the `server-only` marker on those
 * modules resolve to its empty build instead of the copy that throws outside a
 * React Server Component. The marker still does its real job in the bundle.
 */
import { config } from "dotenv";

import { ensureSeedOwner } from "@/lib/admin-users";

config({ path: ".env.local" });
config({ path: ".env" });

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — nothing to seed into.");
  }

  const result = await ensureSeedOwner({
    email: process.env.ADMIN_SEED_EMAIL,
    name: process.env.ADMIN_SEED_NAME,
    // Falls back to the shared password for the one release that still carries
    // it. Remove the fallback with the rest of the `ADMIN_PASSWORD` scaffolding.
    password: process.env.ADMIN_SEED_PASSWORD ?? process.env.ADMIN_PASSWORD,
  });

  if (!result.ok) {
    throw new Error(`Could not seed the owner account: ${result.reason}`);
  }

  console.info(
    result.created
      ? `[seed] created owner account ${result.email}`
      : `[seed] ${result.email} already exists — left untouched`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
