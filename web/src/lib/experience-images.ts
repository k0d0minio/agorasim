/**
 * What an experience image is allowed to be, in one place.
 *
 * The `experiences.image` column holds one of exactly two shapes:
 *
 * - a **legacy site-relative path**
 *   (`/images/fleet/citroen-2cv-agorasim-door-detail.jpg`) — a file a developer
 *   committed to `web/public/` before the editor could upload anything, and
 * - a **Vercel Blob URL** (`https://<store>.public.blob.vercel-storage.com/
 *   experiences/…`) — what the upload field in `/admin/experiences` writes.
 *
 * Both the Zod rule that guards the column and the actions that clean up
 * replaced blobs need to tell the two apart, and they must agree — a predicate
 * that drifted between them would either let junk into the column or point
 * `del()` at a path that was never a blob. So the predicates live here, once.
 *
 * Client-safe on purpose: the upload field imports the size/type limits so the
 * operator hears "that file is too big" before the bytes leave their phone,
 * not after.
 */

/** The formats the upload endpoint mints tokens for. Photos, not documents. */
export const EXPERIENCE_IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

/**
 * ~5 MB. Enough for any phone photo worth showing; small enough that a guest
 * on hotel wifi is not asked to download a 40 MB original through
 * `next/image`'s cache misses.
 */
export const EXPERIENCE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** Every uploaded experience image lands under this blob path prefix. */
export const EXPERIENCE_IMAGE_PATH_PREFIX = "experiences/";

/**
 * A committed file under `web/public/images/`. These predate the upload field;
 * nothing writes new ones, but existing rows keep working forever.
 */
export function isLegacyImagePath(value: string): boolean {
  return /^\/images\/[\w./-]+$/.test(value);
}

/**
 * A blob URL minted by our own upload endpoint: our store's public host, under
 * the `experiences/` prefix. Anything else — another store, another path,
 * plain http — is not something the editor produced and is rejected.
 */
export function isExperienceBlobUrl(value: string): boolean {
  return /^https:\/\/[\w-]+\.public\.blob\.vercel-storage\.com\/experiences\/\S+$/.test(
    value,
  );
}
