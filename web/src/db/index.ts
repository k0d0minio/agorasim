import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Drizzle client backed by Neon's serverless HTTP driver.
 *
 * The HTTP driver runs anywhere a `fetch` exists (Node server, serverless,
 * edge) with no connection pool to manage, which suits Next.js server actions
 * and server components. Import `db` only from server code — `server-only`
 * guarantees a build error if it ever leaks into a client bundle.
 *
 * The client is created lazily on first use so that importing this module (e.g.
 * while Next.js collects Server Actions at build time) never requires
 * `DATABASE_URL` — only actually running a query does.
 */
type Database = NeonHttpDatabase<typeof schema>;

let client: Database | null = null;

function getDb(): Database {
  if (client) return client;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set — the database is unavailable. " +
        "Set it in .env.local (see .env.example) or the deployment environment.",
    );
  }

  client = drizzle(neon(url), { schema });
  return client;
}

/**
 * Lazily-initialized Drizzle instance. Property access is forwarded to the real
 * client, which is constructed on first touch — so this can be imported freely
 * without a live `DATABASE_URL`.
 */
export const db = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    const real = getDb();
    const value = Reflect.get(real as object, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
}) as Database;

export * from "./schema";
