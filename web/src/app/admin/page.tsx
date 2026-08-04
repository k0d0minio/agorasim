import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { count } from "drizzle-orm";
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
import { requireAdmin } from "@/lib/admin-auth";
import { adminAreas } from "@/lib/admin-nav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// Reads live counts — never prerender at build time.
export const dynamic = "force-dynamic";

const REVIEW: ContentStatus[] = ["draft", "in_review"];
const PUBLISHED: ContentStatus[] = ["published"];
const OPEN_FEATURE: FeatureRequestStatus[] = ["new", "planned", "in_progress"];

/** Total the rows of a `GROUP BY status` result that match one of `statuses`. */
function tally<S extends string>(rows: { status: S; n: number }[], statuses: readonly S[]): number {
  return rows.reduce((total, row) => (statuses.includes(row.status) ? total + row.n : total), 0);
}

export default async function AdminDashboardPage() {
  const viewer = await requireAdmin();

  /*
   * One `GROUP BY status` per table instead of a `count()` per stat. Neon's HTTP
   * driver opens a connection per query, so the old ten stats meant ten round
   * trips on every render of a `force-dynamic` page; `db.batch` sends these six
   * as a single request and the per-status arithmetic happens here.
   */
  const [requests, features, geo, blog, social, email] = await db.batch([
    db
      .select({ status: tourRequests.status, n: count() })
      .from(tourRequests)
      .groupBy(tourRequests.status),
    db
      .select({ status: featureRequests.status, n: count() })
      .from(featureRequests)
      .groupBy(featureRequests.status),
    db
      .select({ status: geoContentDrafts.status, n: count() })
      .from(geoContentDrafts)
      .groupBy(geoContentDrafts.status),
    db
      .select({ status: blogPostDrafts.status, n: count() })
      .from(blogPostDrafts)
      .groupBy(blogPostDrafts.status),
    db
      .select({ status: socialPostDrafts.status, n: count() })
      .from(socialPostDrafts)
      .groupBy(socialPostDrafts.status),
    db
      .select({ status: emailCampaignDrafts.status, n: count() })
      .from(emailCampaignDrafts)
      .groupBy(emailCampaignDrafts.status),
  ]);

  const drafts = [geo, blog, social, email];
  const draftsToReview = drafts.reduce((total, rows) => total + tally(rows, REVIEW), 0);
  const publishedCount = drafts.reduce((total, rows) => total + tally(rows, PUBLISHED), 0);

  const STATS = [
    {
      label: "New leads",
      value: String(tally(requests, ["new"])),
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
      value: String(tally(features, OPEN_FEATURE)),
      hint: "In the toolkit backlog",
    },
  ];

  return (
    <AdminShell>
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
            {adminAreas(viewer.role).map(({ href, icon: Icon, label, cardTitle, description, dev }) => (
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
                      {cardTitle ?? label}
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
