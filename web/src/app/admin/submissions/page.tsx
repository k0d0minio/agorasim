import { Inbox } from "lucide-react";
import { desc } from "drizzle-orm";
import { db, tourRequests } from "@/db";
import { experiences } from "@/content/experiences";
import { t } from "@/i18n/config";
import { AdminShell } from "@/components/admin/admin-shell";
import { ContactLinks } from "@/components/admin/contact-links";
import { PlaceholderPanel } from "@/components/admin/placeholder-panel";
import { RequestStatusSelect } from "@/components/admin/request-status-select";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatRelativeTime } from "@/lib/admin-format";

// Reads live data — never prerender at build time.
export const dynamic = "force-dynamic";

/** Map experience slugs to a readable (English) label for the admin table. */
const experienceLabel = new Map(experiences.map((e) => [e.slug, t(e.title, "en")]));

function labelFor(slug: string | null): string {
  if (!slug) return "—";
  return experienceLabel.get(slug) ?? slug;
}

/** "3h ago", with the exact timestamp behind it. */
function Received({ at }: { at: Date | string | null }) {
  const date = at instanceof Date ? at : at ? new Date(at) : null;
  const iso = date && !Number.isNaN(date.getTime()) ? date.toISOString() : undefined;
  return (
    <time dateTime={iso} title={formatDateTime(at)} className="whitespace-nowrap">
      {formatRelativeTime(at)}
    </time>
  );
}

export default async function AdminSubmissionsPage() {
  const rows = await db.select().from(tourRequests).orderBy(desc(tourRequests.createdAt));

  if (rows.length === 0) {
    return (
      <AdminShell title="Submissions">
        <PlaceholderPanel
          icon={Inbox}
          title="No submissions yet"
          description="Once customers submit the booking form, their enquiries appear here for the team to review and follow up."
        />
      </AdminShell>
    );
  }

  const countLabel = `${rows.length} ${rows.length === 1 ? "enquiry" : "enquiries"}`;

  return (
    <AdminShell title="Submissions">
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Inbox className="size-4" />
        <span>{countLabel}</span>
      </div>

      {/*
        Below md this is a stack of cards, not a 860px-wide table in a sideways
        scroller: the message reads in full and the status control sits at the
        bottom of the card, where a thumb is — it used to be in the last column
        of a seven-column horizontal scroll.
      */}
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((r) => (
          <li key={r.id}>
            <Card className="gap-3">
              <div className="flex flex-col gap-3 px-(--card-spacing)">
                <div>
                  <p className="font-heading text-base font-medium">{r.name}</p>
                  <p className="text-sm text-muted-foreground">
                    <Received at={r.createdAt} /> · {formatDateTime(r.createdAt)}
                  </p>
                </div>

                <ContactLinks email={r.email} phone={r.phone} />

                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Experience</dt>
                  <dd>
                    {labelFor(r.experienceSlug)}
                    <span className="ml-1.5 text-xs text-muted-foreground uppercase">
                      {r.locale}
                    </span>
                  </dd>

                  {r.addOns.length > 0 ? (
                    <>
                      <dt className="text-muted-foreground">Add-ons</dt>
                      <dd>{r.addOns.map(labelFor).join(", ")}</dd>
                    </>
                  ) : null}

                  <dt className="text-muted-foreground">Party</dt>
                  <dd>{r.partySize ?? "—"}</dd>

                  <dt className="text-muted-foreground">Preferred</dt>
                  <dd>{r.preferredDate ?? "—"}</dd>
                </dl>

                {r.message ? (
                  <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm whitespace-pre-wrap">
                    {r.message}
                  </p>
                ) : null}

                <RequestStatusSelect id={r.id} status={r.status} name={r.name} />
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <Card className="hidden p-0 md:block">
        {/* `relative` matters: without a containing block of its own, the
            table's overflow escapes this scroller and scrolls the whole page
            sideways at widths where the table doesn't fit. */}
        <div className="relative overflow-x-auto">
          <Table>
            <TableCaption>
              Tour enquiries from the website, newest first — {countLabel}.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Add-ons</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Preferred</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="align-top">
                  <TableCell>
                    <div className="font-medium">{r.name}</div>
                    <ContactLinks email={r.email} phone={r.phone} />
                    {r.message ? (
                      <p className="mt-1 max-w-sm text-xs whitespace-pre-wrap text-muted-foreground">
                        {r.message}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {labelFor(r.experienceSlug)}
                    <div className="text-xs text-muted-foreground uppercase">{r.locale}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.addOns.length > 0 ? r.addOns.map(labelFor).join(", ") : "—"}
                  </TableCell>
                  <TableCell>{r.partySize ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.preferredDate ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <Received at={r.createdAt} />
                  </TableCell>
                  <TableCell>
                    <RequestStatusSelect id={r.id} status={r.status} name={r.name} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </AdminShell>
  );
}
