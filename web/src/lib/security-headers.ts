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
 * request's own CSP header, and a page served from the prerender cache has no
 * request of its own to read. The public site is prerendered and revalidated
 * hourly rather than rendered per request (ISR — see `AGENTS.md`), so one piece
 * of HTML is written once and served to everyone; a nonce there would mean
 * making every marketing page dynamic to harden a surface that renders no user
 * input at all. That is the wrong trade, so the public policy keeps
 * `'unsafe-inline'` for scripts and earns its keep through the directives that
 * do not depend on it — `object-src 'none'`, `base-uri`, `form-action`,
 * `frame-ancestors`, and a closed list of third-party origins.
 *
 * `/reservar/confirmacao` is the one public route that *is* dynamic, and it
 * could carry a nonce. It does not, because the public policy is a single
 * `next.config.ts` header over every non-admin path: one page's worth of
 * hardening is not worth a second public policy to keep in step with this one.
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
 * CSP for the public site.
 *
 * `frame-ancestors 'none'` and `frame-src 'none'` both: nothing on agorasim.pt
 * is meant to be embedded anywhere, and the site embeds nothing in return —
 * except Stripe's payment form on the booking page, which gets its own policy
 * ({@link PAYMENT_CSP}) rather than a hole in this one. The one third-party
 * origin left here is the blob host the uploaded experience photos are served
 * from, and it is an image source only.
 */
const PUBLIC_DIRECTIVES: Record<string, string[] | null> = {
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
};

export const PUBLIC_CSP = policy(PUBLIC_DIRECTIVES);

/**
 * What Stripe's embedded Checkout needs on the page that shows it, per
 * directive: Stripe's published lists for Stripe.js (which loads the form) and
 * for Checkout (which is the form), unioned — docs.stripe.com/security/guide,
 * "Content Security Policy". Nothing optional rides along: no Google Maps (we
 * use no Address Element), no Link origins (Link runs inside Checkout's own
 * frame, under Stripe's policy rather than ours).
 *
 * `*.js.stripe.com` is Stripe's own recommendation — it starts frames on
 * sibling origins for speed — and `hooks.stripe.com` is where 3-D Secure and
 * redirect-based methods (iDEAL, Bancontact) put their challenge frame.
 */
const STRIPE_EMBEDDED_CHECKOUT: Record<string, string[]> = {
  "script-src": ["https://js.stripe.com", "https://*.js.stripe.com", "https://checkout.stripe.com"],
  "frame-src": [
    "https://js.stripe.com",
    "https://*.js.stripe.com",
    "https://hooks.stripe.com",
    "https://checkout.stripe.com",
  ],
  "connect-src": ["https://api.stripe.com", "https://checkout.stripe.com"],
  "img-src": ["https://*.stripe.com"],
};

/**
 * The public policy plus Stripe's embedded Checkout — served only on the two
 * routes that take a card on the site's own pages, the booking page
 * (`/:locale/reservar` and below) and a quote page (`/:locale/orcamento/<token>`),
 * see `next.config.ts` and {@link PAYMENT_ROUTE_SOURCES}.
 *
 * Derived from {@link PUBLIC_DIRECTIVES} rather than written out again, so the
 * two can only ever differ by the Stripe origins: a directive tightened on the
 * public policy is tightened here by the same edit. `frame-src 'none'` is the
 * one value *replaced* rather than extended — `'none'` next to a source is
 * invalid, and the whole point of this policy is that the page frames Stripe.
 *
 * Still no nonce: the booking page is prerendered like every public page (ISR,
 * `AGENTS.md`), so the reasoning in the module note holds here unchanged. The
 * quote page is dynamic and could carry one, but one policy for both routes is
 * the narrower thing to reason about.
 */
export const PAYMENT_CSP = policy(
  Object.fromEntries(
    Object.entries(PUBLIC_DIRECTIVES).map(([name, values]): [string, string[] | null] => {
      const extra = STRIPE_EMBEDDED_CHECKOUT[name];
      if (!extra || values === null) return [name, values];
      const base = values.filter((value) => value !== "'none'");
      return [name, [...base, ...extra]];
    }),
  ),
);

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
  { key: "Permissions-Policy", value: permissionsPolicy("payment=()") },
] as const;

/** The site's feature policy, with only the `payment` entry left to the caller. */
function permissionsPolicy(payment: string): string {
  return `camera=(), microphone=(), geolocation=(), ${payment}, usb=()`;
}

/**
 * The payment routes' feature policy: the baseline, except that the Payment
 * Request API may be used by the page and delegated to Stripe's frames — which
 * is what lets Apple Pay and Google Pay appear inside embedded Checkout. Every
 * other feature stays off. Served by `next.config.ts` on the same paths as
 * {@link PAYMENT_CSP}, after the baseline, so it is the value that survives.
 */
export const PAYMENT_PERMISSIONS_POLICY = permissionsPolicy(
  'payment=(self "https://js.stripe.com" "https://checkout.stripe.com")',
);

/**
 * The paths that serve {@link PAYMENT_CSP} and
 * {@link PAYMENT_PERMISSIONS_POLICY}: the booking page in each locale and
 * everything below it (the confirmation page), and every quote page. One source
 * of truth for `next.config.ts` and for the payment forms' check that the
 * document they run in was loaded under this policy (`lib/payment-route.ts`).
 */
export const PAYMENT_ROUTE_SOURCES = [
  "/:locale(pt|en)/reservar",
  "/:locale(pt|en)/reservar/:path*",
  "/:locale(pt|en)/orcamento/:path*",
] as const;
