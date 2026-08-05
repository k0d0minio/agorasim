/**
 * Reset an existing admin account's password from the command line — the
 * break-glass path for an operator who is locked out of `/admin`.
 *
 *   cd web
 *   ADMIN_RESET_EMAIL=diogo@agorasim.pt \
 *   ADMIN_RESET_PASSWORD='a long passphrase' \
 *   pnpm db:reset-password
 *
 * Deliberately *not* part of `db:seed-owner`. Seeding runs on every deploy and
 * is idempotent precisely so it can never rewrite a live operator's credentials;
 * folding a reset into it would turn that guarantee into a backdoor. This is a
 * separate command a human has to run on purpose, against an account that must
 * already exist — it will not create one, so a typo'd address fails loudly
 * instead of quietly minting a second admin.
 *
 * Resetting signs the account out everywhere (`setAdminUserPassword` bumps
 * `sessions_valid_from`) and writes an `admin_user.password_changed` audit entry
 * with a null actor, the same shape the retention cron uses: the change really
 * did happen without a signed-in operator behind it, and the log should say so.
 *
 * Run via `tsx` for the same two reasons as `seed-owner.ts` — `@/…` path
 * resolution, and `--conditions=react-server` so the `server-only` marker
 * resolves to its empty build outside a React Server Component.
 */
import { config } from "dotenv";

import { recordAudit } from "@/lib/audit";
import { normalizeEmail, resetAdminUserPasswordByEmail } from "@/lib/admin-users";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";

config({ path: ".env.local" });
config({ path: ".env" });

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — nothing to reset against.");
  }

  const email = normalizeEmail(process.env.ADMIN_RESET_EMAIL ?? "");
  const password = process.env.ADMIN_RESET_PASSWORD ?? "";

  if (!email) throw new Error("ADMIN_RESET_EMAIL is not set.");
  if (!password) throw new Error("ADMIN_RESET_PASSWORD is not set.");
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `ADMIN_RESET_PASSWORD is shorter than ${MIN_PASSWORD_LENGTH} characters.`,
    );
  }

  const result = await resetAdminUserPasswordByEmail(email, password);
  if (!result.ok) {
    throw new Error(
      result.reason === "unknown"
        ? `No admin account for ${email}. This command resets an existing ` +
          "account; use `pnpm db:seed-owner` to create the first one."
        : `Could not reset the password: ${result.reason}`,
    );
  }

  const { user } = result;

  // `ipAddress: null` explicitly — there is no request here, and the helper
  // would otherwise go looking for a client IP that cannot exist in a CLI.
  await recordAudit({
    actorUserId: null,
    action: "admin_user.password_changed",
    entityType: "admin_user",
    entityId: user.id,
    after: { reset: "cli", email: user.email },
    ipAddress: null,
  });

  console.info(
    `[reset] password updated for ${user.email} — all existing sessions revoked.`,
  );
  if (user.disabledAt) {
    console.warn(
      `[reset] note: ${user.email} is disabled and still cannot sign in. ` +
        "Re-enable it from /admin/settings/users with another owner account.",
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
