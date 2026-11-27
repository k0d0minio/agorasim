/**
 * Give a role to a test admin account of the BAXTER checktest
 * (`.icm/setup/checktest-accounts.md`, the contract of `seed:test-roles`).
 *
 *   pnpm seed:test-roles -- --email test+agorasim-admin@jamienisbet.com --role owner --target local
 *   UAT_DATABASE_URL="$(…keyring…)" pnpm seed:test-roles -- --email … --role owner --target uat
 *
 * - The roles are the roles of `admin_users`: `owner` and `collaborator`.
 * - The account must exist. The admin has no sign-up: an owner adds the account
 *   in the admin console first. The script never creates an account and never
 *   touches a password.
 * - It runs again with no change when the account already has the role.
 * - The database address comes from the environment of the target, never from the
 *   command line: `local` reads `DATABASE_URL` (`.env.local`), `uat` reads
 *   `UAT_DATABASE_URL` only, for the one command. No variable of production is read.
 * - It refuses an address that is not `test+agorasim-*@jamienisbet.com`, and it
 *   refuses to run in a Vercel production environment.
 *
 * Exit 0: the account has the role. Exit 1: refused or failed, with one line of reason.
 */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

const ROLES = ["owner", "collaborator"] as const;
const TARGETS = ["local", "uat"] as const;
const TEST_ADDRESS = /^test\+agorasim-[a-z0-9._-]+@jamienisbet\.com$/;

type Args = { email: string; role: string; target: string };

function fail(reason: string): never {
  console.error(`seed:test-roles: ${reason}`);
  process.exit(1);
}

function parseArgs(argv: string[]): Args {
  const out: Partial<Args> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--") continue;
    const key = arg.replace(/^--/, "") as keyof Args;
    if (!["email", "role", "target"].includes(key) || argv[i + 1] === undefined) {
      fail(`unknown argument ${arg}. Use --email <address> --role <role> --target local|uat`);
    }
    out[key] = argv[++i];
  }
  if (!out.email || !out.role || !out.target) {
    fail("give --email <address> --role <role> --target local|uat");
  }
  return out as Args;
}

function databaseUrl(target: string): string {
  if (target === "local") {
    config({ path: ".env.local" });
    config({ path: ".env" });
    return process.env.DATABASE_URL ?? fail("DATABASE_URL is not set for the target local");
  }
  return process.env.UAT_DATABASE_URL ?? fail("UAT_DATABASE_URL is not set for the target uat");
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const email = args.email.trim().toLowerCase();
  if (!TEST_ADDRESS.test(email)) fail(`${args.email} is not a test+agorasim-*@jamienisbet.com address`);
  if (!(ROLES as readonly string[]).includes(args.role)) fail(`unknown role ${args.role}. Use ${ROLES.join(" or ")}`);
  if (!(TARGETS as readonly string[]).includes(args.target)) fail(`unknown target ${args.target}. Use local or uat`);
  if (process.env.VERCEL_ENV === "production" || process.env.VERCEL_TARGET_ENV === "production") {
    fail("refused: this is a production environment");
  }

  const sql = neon(databaseUrl(args.target));
  const rows = (await sql`
    UPDATE admin_users SET role = ${args.role}::admin_role
    WHERE email = ${email}
    RETURNING role
  `) as { role: string }[];
  if (rows.length === 0) fail(`no admin account ${email} on ${args.target}. Add it in the admin console first`);
  console.info(`seed:test-roles: ${email} has the role ${args.role} on ${args.target}`);
}

main().catch((err) => fail(err instanceof Error ? err.message.split("\n")[0] : String(err)));
