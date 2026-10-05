/**
 * Byte ↔ text encodings the token modules share (`admin-session.ts`,
 * `cancellation-token.ts`, `quote-token.ts`, `email-opt-out-token.ts`).
 *
 * Web APIs only — no `node:`, no `next/*`, no database — so it runs in the
 * edge runtime, a route handler or a plain test unchanged.
 */

/** Unpadded base64url of `bytes`. */
export function base64UrlEncode(bytes: Uint8Array | ArrayBuffer): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const binary = String.fromCharCode(...view);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** The bytes of a base64url string, padded or not. Throws on malformed input. */
export function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

/** Lowercase hex of `bytes`, two characters per byte. */
export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** The bytes of a hex string. */
export function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
