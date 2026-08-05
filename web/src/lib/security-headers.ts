/**
 * Response security headers — the policy, in one place, for `next.config.ts`
 * (the public site) and `proxy.ts` (the admin area).
 *
 * The two halves of this app have genuinely different threat models and
 * genuinely different rendering modes, so they get two different policies. They
 * live together here so that "what are we allowed to load?" has one answer to
 * read, and so a third party added to one is a deliberate decision rather than
 * an accident of which file someone happened to edit.
 *
 * **Public site — `'unsafe-inline'` scripts, and why.** Nonce-based CSP requires
 * dynamic rendering: Next injects the nonce during SSR by reading it off the
 * request's own CSP header, and a page prerendered at build time has no request
 * to read. The public site is deliberately, entirely static (see `CLAUDE.md`),
 * so a nonce there would mean making every marketing page dynamic to harden a
 * surface that renders no user input at all. That is the wrong trade, so the
 * public policy keeps `'unsafe-inline'` for scripts and earns its keep through
 * the directives that do not depend on it — `object-src 'none'`, `base-uri`,
 * `form-action`, `frame-ancestors`, and a closed list of third-party origins.
 *
 * **Admin area — nonced, because it can be.** Every `/admin` route is already
 * dynamic (the layout reads cookies), so the nonce costs nothing there. It is
 * also where the guest personal data is, so it gets `'strict-dynamic'` with no
 * `'unsafe-inline'`, and third-party origins only by exception. `proxy.ts`
 * mints the nonce per request.
 *
 * **The admin's one exception is Vercel Blob.** Experience photos upload from
 * the catalogue editor straight to blob storage — client-side, because server
 * actions cap the body below one phone photo — so the browser has to be
 * allowed to `fetch` the Blob API (`connect-src`) and to render the uploaded
 * photo's preview (`img-src`). Both grants are the narrowest that work: the
 * API allowance is path-scoped to `/api/blob/` on vercel.com rather than the
 * whole origin, and the image allowance is our store's public host pattern.
 * Nothing here lets a third party run script in the admin.
 *
 * Styles keep `'unsafe-inline'` in both. Next inlines critical CSS and
 * `next/font` inlines its face declarations; note also that a nonce in
 * `style-src` would make browsers *ignore* `'unsafe-inline'` rather than add to
 * it, so the two cannot be combined as a belt-and-braces measure.
 */

/**
 * Vercel Blob, where experience photos uploaded from `/admin/experiences`
 * live — the only third party either policy admits. The public site only ever
 * *shows* them (`img-src`); the admin also uploads them, via `upload()` from
 * `@vercel/blob/client`, which PUTs to `https://vercel.com/api/blob/…` —
 * hence the path-scoped `connect-src` entry rather than all of vercel.com.
 */
const BLOB_IMAGE_HOST = "https://*.public.blob.vercel-storage.com";
const BLOB_UPLOAD_API = "https://vercel.com/api/blob/";

/**
 * React uses `eval` in development to reconstruct server-side error stacks, and
 * the dev server talks to the browser over a websocket. Neither is true of a
 * production build, so neither is granted in one.
 */
const isDev = process.env.NODE_ENV === "development";

/** Collapse a directive map into a header value. */
function policy(directives: Record<string, string[] | null>): string {
  return Object.entries(directives)
    .map(([name, values]) => (values === null ? name : `${name} ${values.join(" ")}`))
    .join("; ");
}

/**
 * CSP for the public, static site.
 *
 * `frame-ancestors 'none'` and `frame-src 'none'` both: nothing on agorasim.pt
 * is meant to be embedded anywhere, and the site embeds nothing in return —
 * booking is the site's own `/reservar` form, so no booking provider needs
 * framing. The one third-party origin left is the blob host the uploaded
 * experience photos are served from, and it is an image source only.
 */
export const PUBLIC_CSP = policy({
  "default-src": ["'self'"],
  "base-uri": ["'self'"],
  "object-src": ["'none'"],
  "frame-ancestors": ["'none'"],
  "form-action": ["'self'"],
  "script-src": ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "blob:", BLOB_IMAGE_HOST],
  "font-src": ["'self'", "data:"],
  "media-src": ["'self'"],
  "connect-src": ["'self'", ...(isDev ? ["ws:"] : [])],
  "frame-src": ["'none'"],
  "worker-src": ["'self'", "blob:"],
  "manifest-src": ["'self'"],
  "upgrade-insecure-requests": null,
});

/**
 * CSP for `/admin`, given the per-request nonce minted by `proxy.ts`.
 *
 * The only third-party origins are the Vercel Blob pair (see the module note):
 * uploads out through `connect-src`, previews in through `img-src`. Beyond
 * that the operations area talks to nothing but itself. With
 * `'strict-dynamic'`, CSP3 browsers ignore the `'self'` in `script-src` and
 * trust only the nonced bootstrap plus whatever it loads, which is exactly
 * Next's own bundle graph.
 */
export function adminCsp(nonce: string): string {
  return policy({
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", BLOB_IMAGE_HOST],
    "font-src": ["'self'", "data:"],
    "media-src": ["'self'"],
    "connect-src": ["'self'", ...(isDev ? ["ws:"] : []), BLOB_UPLOAD_API],
    "frame-src": ["'none'"],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "upgrade-insecure-requests": null,
  });
}

/**
 * Headers that apply to every response, public and admin alike.
 *
 * `Strict-Transport-Security` deliberately omits `includeSubDomains` and
 * `preload`. Both are commitments made on behalf of hostnames this repo does not
 * control — mail, or anything else under agorasim.pt — and `preload` in
 * particular is baked into browser binaries and slow to undo. Add them once
 * someone has confirmed every subdomain is HTTPS-only.
 */
export const BASELINE_SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Belt and braces with `frame-ancestors`, for anything that predates CSP3.
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
] as const;
