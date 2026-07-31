import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  FileText,
  Inbox,
  KanbanSquare,
  Lightbulb,
  Mail,
  MessageSquareShare,
  Newspaper,
  Share2,
  Users,
} from "lucide-react";
import { count, inArray, eq } from "drizzle-orm";
import {
  db,
  tourRequests,
  featureRequests,
  geoContentDrafts,
  blogPostDrafts,
  socialPostDrafts,
  emailCampaignDrafts,
} from "@/db";
import type { ContentStatus, FeatureRequestStatus } from "@/db/schema";
import { AdminShell } from "@/components/admin/admin-shell";
import { InDevLegend, InDevMarker } from "@/components/admin/in-dev-marker";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// Reads live counts — never prerender at build time.
export const dynamic = "force-dynamic";

/** Every operations area. `dev` areas show their final design with example data. */
const SECTIONS = [
  {
    href: "/admin/submissions",
    icon: Inbox,
    title: "Form submissions",
    description:
      "Booking enquiries and contact requests will land here for triage and follow-up.",
    dev: false,
  },
  {
    href: "/admin/crm",
    icon: KanbanSquare,
    title: "CRM pipeline",
    description:
      "Every lead on one board — Lead → Contacted → Quoted → Booked — so nothing falls through.",
    dev: true,
  },
  {
    href: "/admin/bookings",
    icon: CalendarCheck,
    title: "Bookings",
    description:
      "Paid tour and wedding bookings, with deposits, balances and payment status at a glance.",
    dev: true,
  },
  {
    href: "/admin/blog",
    icon: Newspaper,
    title: "Blog studio",
    description:
      "AI-drafted articles in your voice, waiting for a one-click review before publishing.",
    dev: true,
  },
  {
    href: "/admin/social",
    icon: Share2,
    title: "Social studio",
    description:
      "A generated posting calendar for Instagram & Facebook — approve, and it posts itself.",
    dev: true,
  },
  {
    href: "/admin/email",
    icon: Mail,
    title: "Email marketing",
    description:
      "Segments and bilingual campaigns that bring past and archived guests back for more.",
    dev: true,
  },
  {
    href: "/admin/referrals",
    icon: Users,
    title: "Referrals",
    description:
      "Personal links for happy guests, tracked bookings, and the rewards you owe your fans.",
    dev: true,
  },
  {
    href: "/admin/notifications",
    icon: MessageSquareShare,
    title: "Notifications",
    description:
      "Automatic confirmations, reminders and thank-yous for guests — instant alerts for you.",
    dev: true,
  },
  {
    href: "/admin/content",
    icon: FileText,
    title: "Generated content",
    description:
      "Review GEO/marketing drafts produced by the workspaces before publishing them to the site.",
    dev: false,
  },
  {
    href: "/admin/feature-requests",
    icon: Lightbulb,
    title: "Feature requests",
    description:
      "Capture and triage ideas and asks for the toolkit — a free-form backlog for the team.",
    dev: false,
  },
];

export default async function AdminDashboardPage() {
  const review: ContentStatus[] = ["draft", "in_review"];
  const published: ContentStatus[] = ["published"];
  const openFeature: FeatureRequestStatus[] = ["new", "planned", "in_progress"];

  const [
    [newSubmissions],
    [openFeatureRequests],
    [geoReview],
    [blogReview],
    [socialReview],
    [emailReview],
    [geoPublished],
    [blogPublished],
    [socialPublished],
    [emailPublished],
  ] = await Promise.all([
    db.select({ n: count() }).from(tourRequests).where(eq(tourRequests.status, "new")),
    db
      .select({ n: count() })
      .from(featureRequests)
      .where(inArray(featureRequests.status, openFeature)),
    db.select({ n: count() }).from(geoContentDrafts).where(inArray(geoContentDrafts.status, review)),
    db.select({ n: count() }).from(blogPostDrafts).where(inArray(blogPostDrafts.status, review)),
    db.select({ n: count() }).from(socialPostDrafts).where(inArray(socialPostDrafts.status, review)),
    db
      .select({ n: count() })
      .from(emailCampaignDrafts)
      .where(inArray(emailCampaignDrafts.status, review)),
    db
      .select({ n: count() })
      .from(geoContentDrafts)
      .where(inArray(geoContentDrafts.status, published)),
    db.select({ n: count() }).from(blogPostDrafts).where(inArray(blogPostDrafts.status, published)),
    db
      .select({ n: count() })
      .from(socialPostDrafts)
      .where(inArray(socialPostDrafts.status, published)),
    db
      .select({ n: count() })
      .from(emailCampaignDrafts)
      .where(inArray(emailCampaignDrafts.status, published)),
  ]);

  const draftsToReview =
    (geoReview?.n ?? 0) + (blogReview?.n ?? 0) + (socialReview?.n ?? 0) + (emailReview?.n ?? 0);
  const publishedCount =
    (geoPublished?.n ?? 0) +
    (blogPublished?.n ?? 0) +
    (socialPublished?.n ?? 0) +
    (emailPublished?.n ?? 0);

  const STATS = [
    {
      label: "New submissions",
      value: String(newSubmissions?.n ?? 0),
      hint: "Awaiting first contact",
    },
    {
      label: "Drafts to review",
      value: String(draftsToReview),
      hint: "Across all content pipelines",
    },
    { label: "Published", value: String(publishedCount), hint: "Content pushed live" },
    {
      label: "Open feature requests",
      value: String(openFeatureRequests?.n ?? 0),
      hint: "In the toolkit backlog",
    },
  ];

  return (
    <AdminShell title="Dashboard">
      <div className="flex flex-col gap-8">
        <section>
          <h2 className="sr-only">Overview</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((stat) => (
              <Card key={stat.label} size="sm">
                <CardHeader>
                  <CardDescription>{stat.label}</CardDescription>
                  <CardTitle className="text-3xl">{stat.value}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{stat.hint}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Areas
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {SECTIONS.map(({ href, icon: Icon, title, description, dev }) => (
              <Link
                key={href}
                href={href}
                className="group/section rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <Card className="h-full transition-colors group-hover/section:ring-foreground/20">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-4.5" />
                      </div>
                      {/*
                        The same dot used in both navs, not a third signal: an
                        area in development is marked here and banners itself.
                      */}
                      {dev && <InDevMarker className="mt-3" />}
                    </div>
                    <CardTitle className="mt-2 flex items-center gap-1">
                      {title}
                      <ArrowRight className="size-4 -translate-x-1 opacity-0 transition-all group-hover/section:translate-x-0 group-hover/section:opacity-100" />
                    </CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
          <InDevLegend />
        </section>
      </div>
    </AdminShell>
  );
}
