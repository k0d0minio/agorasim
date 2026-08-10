import { Gift, Trophy } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/admin-auth";
import { AdminInDevBanner } from "@/components/admin/in-dev-banner";
import { previewReferralStats, previewReferrers } from "@/lib/admin-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Referrals (proposal Feature 6) — design preview. Each guest gets a personal
 * link; bookings made through it are tracked here, along with the rewards you
 * owe your best ambassadors.
 */
export default async function AdminReferralsPage() {
  // Authorized here, not by `proxy.ts` — see the note at the top of
  // `lib/admin-auth.ts`. The page renders example data today, so this guards
  // the shape of the area rather than the rows; it is the call that has to
  // already be here on the day the preview is wired to real data.
  await requireAdmin();

  return (
    <AdminShell>
      <AdminInDevBanner note="Word of mouth, made measurable: every guest gets a personal link, referred bookings are tracked automatically, and this page shows who to thank (and with what)." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {previewReferralStats.map((stat) => (
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

      <div className="mt-8 mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Trophy className="size-4" />
        <span>Top referrers</span>
      </div>

      {/* Stacked rows until the table's 700px minimum genuinely fits beside
          the sidebar — at `md` it didn't, and the old wrapper answered with a
          two-dimensional scroll (spec §9 L1). */}
      <ul className="flex flex-col gap-3 lg:hidden">
        {previewReferrers.map((r) => (
          <li key={r.name}>
            <Card className="gap-3">
              <div className="flex flex-col gap-3 px-(--card-spacing)">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-heading text-base font-medium">{r.name}</p>
                  <Badge variant={r.rewardDue ? "secondary" : "ghost"}>
                    <Gift className="size-3" />
                    {r.reward}
                  </Badge>
                </div>

                <code className="text-xs break-all text-muted-foreground">{r.link}</code>

                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Shares</dt>
                  <dd>{r.shares}</dd>
                  <dt className="text-muted-foreground">Bookings</dt>
                  <dd className="font-medium text-primary">{r.bookings}</dd>
                </dl>

                {r.rewardDue && (
                  <Button variant="outline" className="w-full" disabled>
                    Mark fulfilled
                  </Button>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <Card className="hidden p-0 lg:block">
        {/* `relative` matters: without a containing block of its own, the
            table's overflow escapes this scroller and scrolls the whole page
            sideways at widths where the table doesn't fit. */}
        <div className="relative overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableCaption>
              Guests with a personal link, ranked by referred bookings — example data.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Personal link</TableHead>
                <TableHead>Shares</TableHead>
                <TableHead>Bookings</TableHead>
                <TableHead>Reward</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewReferrers.map((r) => (
                <TableRow key={r.name}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>
                    <code className="text-xs text-muted-foreground">{r.link}</code>
                  </TableCell>
                  <TableCell>{r.shares}</TableCell>
                  <TableCell className="font-medium text-primary">{r.bookings}</TableCell>
                  <TableCell>
                    <Badge variant={r.rewardDue ? "secondary" : "ghost"}>
                      <Gift className="size-3" />
                      {r.reward}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {r.rewardDue && (
                      <Button variant="outline" disabled>
                        Mark fulfilled
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        A friendly “share your experience” email goes out after each tour — see Notifications.
      </p>
    </AdminShell>
  );
}
