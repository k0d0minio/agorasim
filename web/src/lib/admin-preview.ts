/**
 * Example data for the admin design-preview pages (blog studio, social studio,
 * email marketing, referrals, notifications) and for the paid bookings the Sales
 * screen shows next to real enquiries. Each preview page renders its final
 * layout with this data until the feature behind it is wired up — every one of
 * them carries an `AdminInDevBanner` saying so, and every example booking is
 * marked as an example on the row itself.
 *
 * Nothing here touches the database; delete entries freely as features go live.
 *
 * The CRM pipeline's example leads used to live here too. They don't any more:
 * the board is fed by the `tour_requests` table, so its columns are the real
 * lead lifecycle rather than a mock of it.
 */

// ---------------------------------------------------------------------------
// Bookings & payments (Features 3 + 4)
// ---------------------------------------------------------------------------

/**
 * A confirmed, paid booking. Example data until Stripe ships — the Sales screen
 * renders these alongside real enquiries so the merged list can be seen working,
 * and marks every one of them as an example.
 *
 * `experienceSlug`/`addOns` are catalogue slugs, not prose, so a booking draws
 * the same icons as an enquiry for the same experience.
 */
export type PreviewBooking = {
  ref: string;
  name: string;
  /** The booked day, as it reads on the card. */
  date: string;
  experienceSlug: string;
  addOns: string[];
  party: number;
  total: string;
  payment: "Paid in full" | "Deposit paid" | "Awaiting payment";
  kind: "tour" | "wedding";
};

export const previewBookings: PreviewBooking[] = [
  { ref: "AG-2041", name: "Laura Bianchi", date: "Sat 15 Aug", experienceSlug: "rural-saloia", addOns: [], party: 2, total: "€290", payment: "Paid in full", kind: "tour" },
  { ref: "AG-2042", name: "The Nakamura family", date: "Sat 22 Aug", experienceSlug: "rural-saloia", addOns: ["tasco-galapito"], party: 4, total: "€720", payment: "Deposit paid", kind: "tour" },
  { ref: "AG-2043", name: "Carter wedding", date: "Sat 5 Sep", experienceSlug: "rural-saloia", addOns: [], party: 2, total: "€650", payment: "Deposit paid", kind: "wedding" },
  { ref: "AG-2044", name: "Anna Keller", date: "Sun 30 Aug", experienceSlug: "rural-saloia", addOns: ["manzwine"], party: 2, total: "€340", payment: "Awaiting payment", kind: "tour" },
];

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
// Email marketing (Feature 9)
// ---------------------------------------------------------------------------

export const previewSegments = [
  { name: "Past guests", count: 128, note: "Toured in the last 24 months" },
  { name: "Archived guests", count: 64, note: "Older bookings & quiet leads" },
  { name: "Newsletter", count: 213, note: "Signed up on the site" },
  { name: "Wedding enquiries", count: 19, note: "Asked about car hire" },
];

export type PreviewCampaign = {
  name: string;
  subject: string;
  segment: string;
  status: "Sent" | "Scheduled" | "Draft";
  stats?: string;
};

export const previewCampaigns: PreviewCampaign[] = [
  { name: "Summer evenings", subject: "The countryside is at its best right now", segment: "Past guests", status: "Sent", stats: "58% opened · 12% clicked" },
  { name: "Come back this autumn", subject: "Harvest season in the Saloia hills", segment: "Archived guests", status: "Scheduled", stats: "Sends 1 Sep · 09:00" },
  { name: "Wedding season 2027", subject: "Your classic car, your date — locked", segment: "Wedding enquiries", status: "Draft" },
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
  { name: "Laura Bianchi", link: "agorasim.pt/r/laura-600", shares: 5, bookings: 1, reward: "Olaria MZ visit", rewardDue: true },
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
