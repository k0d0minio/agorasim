/**
 * Password hashing for admin accounts — scrypt, from Node's own `crypto`.
 *
 * **Why this is a separate module from `admin-session.ts`.** That module is
 * documented as Web Crypto only so the same code runs in `proxy.ts` and in
 * Server Functions. Web Crypto has no memory-hard KDF: `crypto.subtle` gives you
 * PBKDF2, which is deliberately *not* memory-hard and so is the weaker choice
 * against GPU/ASIC cracking. Rather than weaken the hash to preserve the
 * constraint, password verification moved to where a Node API is fine.
 *
 * The split holds because the proxy never verifies passwords — it only checks an
 * HMAC signature on a cookie, which is still pure Web Crypto. Concretely:
 *
 *   proxy.ts → admin-session.ts                (Web Crypto, no node:, no db)
 *   server actions → admin-auth.ts → this file (node:crypto + database)
 *
 * scrypt over argon2id because it is memory-hard, in the standard library, and
 * therefore adds no dependency and no WASM build step to a project that
 * currently has neither. Argon2id would be a defensible upgrade; it is not worth
 * a native/WASM dependency here.
 *
 * **Digest format** — self-describing, so cost parameters can be raised later
 * without invalidating existing hashes:
 *
 *   scrypt$<N>$<r>$<p>$<salt base64>$<derived key base64>
 *
 * `verifyPassword` reads the parameters out of the stored digest, so an old hash
 * keeps verifying with the parameters it was created with, while new hashes use
 * the current {@link SCRYPT_PARAMS}.
 */
import "server-only";

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * Cost parameters for **new** hashes. N=2^15 with r=8 costs roughly 32 MB and
 * ~100 ms per hash on the serverless runtimes this deploys to — enough to make
 * offline cracking expensive without making a login feel slow.
 */
export const SCRYPT_PARAMS = { N: 32768, r: 8, p: 1 } as const;

const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const PREFIX = "scrypt";

/** `maxmem` must clear 128 * N * r, or Node refuses to run. */
function maxmem({ N, r }: { N: number; r: number }): number {
  return 256 * N * r;
}

/** Hash a password with the current {@link SCRYPT_PARAMS}. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scrypt(normalize(password), salt, KEY_LENGTH, {
    ...SCRYPT_PARAMS,
    maxmem: maxmem(SCRYPT_PARAMS),
  });

  const { N, r, p } = SCRYPT_PARAMS;
  return [
    PREFIX,
    N,
    r,
    p,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

/**
 * Check a candidate password against a stored digest.
 *
 * Returns `false` — never throws — for a digest that is malformed, truncated, or
 * in an unknown format, so a corrupt row locks one account out instead of
 * taking the login screen down.
 */
export async function verifyPassword(
  candidate: string,
  digest: string | null | undefined,
): Promise<boolean> {
  const parsed = parseDigest(digest);
  if (!parsed) return false;

  let derived: Buffer;
  try {
    derived = await scrypt(normalize(candidate), parsed.salt, parsed.hash.length, {
      N: parsed.N,
      r: parsed.r,
      p: parsed.p,
      maxmem: maxmem(parsed),
    });
  } catch {
    // Absurd cost parameters in a tampered digest — treat as a failed check.
    return false;
  }

  return timingSafeEqual(derived, parsed.hash);
}

/**
 * Whether a digest was produced with weaker parameters than we use today, so a
 * successful login can transparently re-hash it. Nothing calls this yet; it is
 * the reason the parameters are stored in the digest at all.
 */
export function needsRehash(digest: string | null | undefined): boolean {
  const parsed = parseDigest(digest);
  if (!parsed) return true;
  return (
    parsed.N < SCRYPT_PARAMS.N ||
    parsed.r < SCRYPT_PARAMS.r ||
    parsed.p < SCRYPT_PARAMS.p
  );
}

type ParsedDigest = { N: number; r: number; p: number; salt: Buffer; hash: Buffer };

function parseDigest(digest: string | null | undefined): ParsedDigest | null {
  if (!digest) return null;

  const parts = digest.split("$");
  if (parts.length !== 6) return null;

  const [prefix, rawN, rawR, rawP, rawSalt, rawHash] = parts;
  if (prefix !== PREFIX) return null;

  const N = Number.parseInt(rawN ?? "", 10);
  const r = Number.parseInt(rawR ?? "", 10);
  const p = Number.parseInt(rawP ?? "", 10);
  if (![N, r, p].every((n) => Number.isInteger(n) && n > 0)) return null;
  // N must be a power of two; scrypt throws otherwise.
  if ((N & (N - 1)) !== 0) return null;

  const salt = Buffer.from(rawSalt ?? "", "base64");
  const hash = Buffer.from(rawHash ?? "", "base64");
  if (salt.length === 0 || hash.length === 0) return null;

  return { N, r, p, salt, hash };
}

/**
 * Unicode-normalize before hashing so a password typed on a Mac and the same
 * password typed on Windows produce the same bytes (é as one code point vs. two).
 */
function normalize(password: string): string {
  return password.normalize("NFKC");
}
