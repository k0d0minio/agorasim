/**
 * Example data for the admin design-preview pages: blog studio, social studio,
 * referrals, notifications. Each renders its final layout with this data until
 * the feature behind it is wired up, and every one of them carries an
 * `AdminInDevBanner` saying so.
 *
 * Nothing here touches the database; delete entries freely as features go live.
 *
 * The CRM pipeline's example leads used to live here, and so did four example
 * bookings the Sales screen merged in beside real enquiries. Neither does now:
 * Sales is fed by `tour_requests` and `bookings`, so what it shows is what
 * happened.
 */

// ---------------------------------------------------------------------------
// Blog studio (Feature 2)
// ---------------------------------------------------------------------------

export type PreviewBlogDraft = {
  title: string;
  status: "Draft" | "In review" | "Approved" | "Published";
  note: string;
  scheduled: string;
};

export const previewBlogDrafts: PreviewBlogDraft[] = [
  { title: "A perfect day in Ericeira, away from the crowds", status: "Published", note: "PT + EN · Itineraries", scheduled: "Went live 14 Jul" },
  { title: "Why the Saloia countryside is Portugal's best-kept secret", status: "Published", note: "PT + EN · The region", scheduled: "Went live 30 Jun" },
  { title: "From the Colares vineyards to Mafra: a tasting guide", status: "In review", note: "PT + EN · Food & wine", scheduled: "Planned 8 Aug" },
  { title: "Five village festivals worth planning a trip around", status: "Draft", note: "AI draft ready for your read", scheduled: "Planned 22 Aug" },
];

// ---------------------------------------------------------------------------
// Social studio (Feature 5)
// ---------------------------------------------------------------------------

export type PreviewSocialPost = {
  platform: "Instagram" | "Facebook";
  caption: string;
  slot: string;
  status: "Scheduled" | "Needs approval" | "Posted";
};

export const previewSocialPosts: PreviewSocialPost[] = [
  { platform: "Instagram", caption: "Golden hour over the Saloia vineyards, seen from the back seat of a 2CV. 🍇 #sintra #ericeira #classiccars", slot: "Tue 4 Aug · 18:00", status: "Scheduled" },
  { platform: "Facebook", caption: "New on the blog: a perfect day in Ericeira, away from the crowds — the route we take with first-time visitors.", slot: "Thu 6 Aug · 12:30", status: "Scheduled" },
  { platform: "Instagram", caption: "Some entrances are never forgotten. Wedding season in the Fiat 600 has begun. 💐", slot: "Sat 8 Aug · 10:00", status: "Needs approval" },
  { platform: "Instagram", caption: "Bread still warm from the wood-fired oven — the Saloia breakfast our guests talk about for weeks.", slot: "Fri 31 Jul · 09:00", status: "Posted" },
];

// ---------------------------------------------------------------------------
// Referrals (Feature 6)
// ---------------------------------------------------------------------------

export const previewReferralStats = [
  { label: "Active links", value: "37", hint: "Guests with a personal link" },
  { label: "Referred bookings", value: "9", hint: "Since launch" },
  { label: "Referral revenue", value: "€2,610", hint: "From referred bookings" },
  { label: "Rewards to fulfil", value: "3", hint: "Tastings & discounts owed" },
];

export type PreviewReferrer = {
  name: string;
  link: string;
  shares: number;
  bookings: number;
  reward: string;
  rewardDue: boolean;
};

export const previewReferrers: PreviewReferrer[] = [
  { name: "Maria Fernandes", link: "agorasim.pt/r/maria-2cv", shares: 14, bookings: 3, reward: "Manzwine tasting", rewardDue: true },
  { name: "Hans Weber", link: "agorasim.pt/r/hans-t3", shares: 8, bookings: 2, reward: "10% next tour", rewardDue: true },
  { name: "Claire Dubois", link: "agorasim.pt/r/claire-r4l", shares: 6, bookings: 2, reward: "10% next tour", rewardDue: false },
  { name: "Laura Bianchi", link: "agorasim.pt/r/laura-600", shares: 5, bookings: 1, reward: "Manzwine tasting", rewardDue: true },
  { name: "Pedro Santos", link: "agorasim.pt/r/pedro-2cv", shares: 3, bookings: 1, reward: "10% next tour", rewardDue: false },
];

// ---------------------------------------------------------------------------
// Notifications (Feature 7)
// ---------------------------------------------------------------------------

export type PreviewTemplate = {
  name: string;
  trigger: string;
  channels: ("Email" | "SMS" | "WhatsApp")[];
  audience: "Guest" | "Team";
  enabled: boolean;
};

export const previewTemplates: PreviewTemplate[] = [
  { name: "Booking confirmation", trigger: "Immediately after payment", channels: ["Email"], audience: "Guest", enabled: true },
  { name: "Tour reminder", trigger: "1 day before the tour", channels: ["Email", "SMS"], audience: "Guest", enabled: true },
  { name: "Thank you + review request", trigger: "1 day after the tour", channels: ["Email"], audience: "Guest", enabled: true },
  { name: "Wedding deposit received", trigger: "When a deposit is paid", channels: ["Email"], audience: "Guest", enabled: true },
  { name: "New booking alert", trigger: "When a booking is paid", channels: ["Email", "SMS"], audience: "Team", enabled: true },
  { name: "New lead alert", trigger: "When an enquiry arrives", channels: ["Email", "WhatsApp"], audience: "Team", enabled: false },
];

export const previewNotificationLog = [
  { what: "Tour reminder → Laura Bianchi", channel: "Email + SMS", when: "Fri 14 Aug · 09:00", status: "Delivered" },
  { what: "New booking alert → Diogo, Rita", channel: "SMS", when: "Thu 13 Aug · 16:42", status: "Delivered" },
  { what: "Thank you + review → Hans Weber", channel: "Email", when: "Mon 13 Jul · 10:00", status: "Opened" },
];
