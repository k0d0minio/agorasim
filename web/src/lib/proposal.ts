/**
 * The Agorasim growth-platform catalogue — the productised feature list and
 * add-ons behind the collaboration proposal (see
 * `proposals/2026-07-collaboration-proposal.md`).
 *
 * Kept framework-neutral (no `"use client"`, no server-only imports) so a single
 * source of truth can be shared by:
 *   - the client-side catalogue UI on the admin Feature-requests page, and
 *   - the server action that files a feature request for a chosen item.
 *
 * Prices are one-time build fees in EUR at a friends-and-favour rate. There is
 * no retainer or subscription — future changes are one-off, priced as they come.
 * Edit prices here and every surface updates at once — configure the factory,
 * not the product.
 */

export type CatalogueStatus = "partial" | "new" | "researched";

/** Badge variant used by the admin UI (mirrors `ui/badge.tsx`). */
type BadgeVariant = "default" | "secondary" | "outline";

export const catalogueStatusMeta: Record<
  CatalogueStatus,
  { label: string; variant: BadgeVariant }
> = {
  partial: { label: "Already started", variant: "default" },
  new: { label: "New build", variant: "outline" },
  researched: { label: "Researched", variant: "secondary" },
};

export type Feature = {
  id: string;
  name: string;
  /** One-time build price, EUR. */
  price: number;
  /** Reduced price when its bundle partner (`bundleWith`) is also selected. */
  bundlePrice?: number;
  bundleWith?: string;
  status: CatalogueStatus;
  /** Short line shown under the status badge, overriding the generic label. */
  statusNote?: string;
  summary: string;
  /** Optional honest caveat surfaced on the card. */
  caveat?: string;
};

export type AddOn = { id: string; name: string; price: number; summary: string };

/** Full-suite price — cheaper than buying all nine features individually. */
export const SUITE_PRICE = 7900;

/** Category tag applied to feature requests filed from the proposal catalogue. */
export const PROPOSAL_CATEGORY = "Proposal";

export const FEATURES: Feature[] = [
  {
    id: "web",
    name: "Website + GEO optimization",
    price: 1400,
    status: "partial",
    statusNote: "Foundation built",
    summary:
      "Fast, bilingual PT/EN site that AI search recommends — structured data, hreflang, answer-first copy and clean speed.",
  },
  {
    id: "blog",
    name: "AI-automated blog",
    price: 900,
    status: "partial",
    statusNote: "Database ready",
    summary:
      "On-brand PT/EN articles drafted and scheduled, each reviewed by you in one click before it publishes.",
  },
  {
    id: "tourbook",
    name: "Instant tour booking + Stripe",
    price: 1600,
    status: "new",
    summary:
      "Book-and-pay-now with cards, Apple/Google Pay, Multibanco & MB WAY. You own it — no per-booking commission.",
  },
  {
    id: "wedding",
    name: "Wedding-car-hire booking",
    price: 900,
    bundlePrice: 600,
    bundleWith: "tourbook",
    status: "new",
    summary:
      "A premium event-hire path with a deposit to lock the date, and a landing page that sells the romance.",
    caveat:
      "€600 instead of €900 when taken with Instant tour booking — it reuses the same engine.",
  },
  {
    id: "social",
    name: "Social generator + auto-poster",
    price: 1300,
    status: "researched",
    summary:
      "AI captions and a posting calendar, auto-published to Instagram & Facebook via official APIs after your approval.",
    caveat:
      "Reliable posting uses official platform APIs only. We recommend starting with Instagram + Facebook; others need per-platform approval.",
  },
  {
    id: "referral",
    name: "Referral system",
    price: 800,
    status: "new",
    summary:
      "Personal referral links, automatic reward tracking and a top-referrers view. Turn happy guests into your sales team.",
  },
  {
    id: "notify",
    name: "Email & SMS notifications",
    price: 700,
    status: "new",
    summary:
      "Confirmations, day-before reminders and thank-you + review requests for guests; instant new-lead alerts for you.",
  },
  {
    id: "crm",
    name: "CRM pipeline tracker",
    price: 700,
    status: "partial",
    statusNote: "Live — to upgrade",
    summary:
      "A drag-and-drop Lead → Contacted → Quoted → Booked → Archived board with notes, history and next actions.",
  },
  {
    id: "email",
    name: "Email marketing",
    price: 800,
    status: "partial",
    statusNote: "Database ready",
    summary:
      "Segment past & archived guests; send AI-drafted, bilingual seasonal campaigns with open/click tracking. GDPR-ready.",
  },
];

export const ADD_ONS: AddOn[] = [
  { id: "gift", name: "Gift vouchers / gift cards", price: 700, summary: "Sell experiences as gifts — paid upfront, redeemed later." },
  { id: "reviews", name: "Google reviews wall", price: 400, summary: "Pull Google reviews onto the site automatically as social proof." },
  { id: "analytics", name: "Analytics & revenue dashboard", price: 600, summary: "One screen: bookings, revenue, top experiences, conversion." },
  { id: "whatsapp", name: "WhatsApp Business integration", price: 550, summary: "Let guests book and ask via WhatsApp with templated replies." },
  { id: "lang", name: "Extra language (ES / FR / DE)", price: 350, summary: "Add a language your international guests actually speak." },
  { id: "recovery", name: "Abandoned-booking recovery", price: 400, summary: "Auto-email people who started a booking but didn't finish." },
  { id: "loyalty", name: "Loyalty / repeat-guest program", price: 750, summary: "Reward guests for coming back or trying new add-ons." },
  { id: "partner", name: "Partner / affiliate portal", price: 900, summary: "Let partners and concierges refer bookings and track commission." },
  { id: "gdpr", name: "GDPR & cookie-consent kit", price: 300, summary: "EU-compliant consent, privacy policy and data handling." },
  { id: "audit", name: "Accessibility + speed audit", price: 350, summary: "WCAG + performance pass; also feeds SEO/GEO ranking." },
];

/**
 * Every requestable catalogue item (features + add-ons) keyed by id — used by the
 * server action to validate a request and to build its title/description.
 */
export type CatalogueItem = { id: string; name: string; price: number; summary: string; kind: "feature" | "add-on" };

export const CATALOGUE_ITEMS: Record<string, CatalogueItem> = Object.fromEntries([
  ...FEATURES.map((f) => [f.id, { id: f.id, name: f.name, price: f.price, summary: f.summary, kind: "feature" as const }]),
  ...ADD_ONS.map((a) => [a.id, { id: a.id, name: a.name, price: a.price, summary: a.summary, kind: "add-on" as const }]),
]);

/** Format an integer EUR amount, e.g. 7900 → "7,900". */
export function euro(n: number): string {
  return n.toLocaleString("en-US");
}

/** Effective price of a feature, applying its bundle discount when the partner is selected. */
export function featurePrice(feature: Feature, selectedIds: ReadonlySet<string>): number {
  if (feature.bundlePrice != null && feature.bundleWith && selectedIds.has(feature.bundleWith)) {
    return feature.bundlePrice;
  }
  return feature.price;
}

export type Totals = {
  oneTime: number;
  /** Discount vs. buying every selected item at full list price. */
  savings: number;
  featureCount: number;
  addOnCount: number;
  /** True when all nine features are selected (suite price applies). */
  fullSuite: boolean;
  /** Feature-portion of the one-time total, for the progress gauge. */
  featureTotal: number;
};

export function computeTotals(
  selectedFeatureIds: ReadonlySet<string>,
  selectedAddOnIds: ReadonlySet<string>,
): Totals {
  const selectedFeatures = FEATURES.filter((f) => selectedFeatureIds.has(f.id));
  const listSum = selectedFeatures.reduce((sum, f) => sum + f.price, 0);
  const bundledSum = selectedFeatures.reduce((sum, f) => sum + featurePrice(f, selectedFeatureIds), 0);

  const fullSuite = selectedFeatures.length === FEATURES.length;
  const featureTotal = fullSuite ? SUITE_PRICE : bundledSum;

  const addOnTotal = ADD_ONS.filter((a) => selectedAddOnIds.has(a.id)).reduce((sum, a) => sum + a.price, 0);

  return {
    oneTime: featureTotal + addOnTotal,
    savings: listSum - featureTotal,
    featureCount: selectedFeatures.length,
    addOnCount: ADD_ONS.filter((a) => selectedAddOnIds.has(a.id)).length,
    fullSuite,
    featureTotal,
  };
}
