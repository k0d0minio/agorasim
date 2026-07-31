import { CalendarCheck } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminInDevBanner } from "@/components/admin/in-dev-banner";
import { previewBookings, previewBookingStats } from "@/lib/admin-preview";
import { Badge } from "@/components/ui/badge";
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

const paymentVariant = {
  "Paid in full": "default",
  "Deposit paid": "secondary",
  "Awaiting payment": "outline",
} as const;

/**
 * Bookings & payments (proposal Features 3 + 4) — design preview. Once Stripe
 * ships, every paid tour and wedding hire lands here with its payment state.
 */
export default function AdminBookingsPage() {
  return (
    <AdminShell>
      <AdminInDevBanner note="When instant booking goes live, every paid tour and wedding hire appears here the moment the guest pays — no more copying between inboxes." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {previewBookingStats.map((stat) => (
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

      <div className="mt-6 mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarCheck className="size-4" />
        <span>Upcoming — next 30 days</span>
      </div>

      {/* Same card-below-md / table-at-md pattern as Submissions. */}
      <ul className="flex flex-col gap-3 md:hidden">
        {previewBookings.map((b) => (
          <li key={b.ref}>
            <Card className="gap-3">
              <div className="flex flex-col gap-3 px-(--card-spacing)">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-heading text-base font-medium">{b.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{b.ref}</p>
                  </div>
                  <Badge variant={paymentVariant[b.payment]}>{b.payment}</Badge>
                </div>

                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Date</dt>
                  <dd>{b.date}</dd>
                  <dt className="text-muted-foreground">Experience</dt>
                  <dd>{b.what}</dd>
                  <dt className="text-muted-foreground">Party</dt>
                  <dd>{b.party}</dd>
                  <dt className="text-muted-foreground">Total</dt>
                  <dd className="font-medium">{b.total}</dd>
                </dl>

                <Badge variant={b.kind === "Wedding" ? "secondary" : "ghost"} className="w-fit">
                  {b.kind}
                </Badge>
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
          <Table className="min-w-[760px]">
            <TableCaption>Bookings starting in the next 30 days — example data.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Ref</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewBookings.map((b) => (
                <TableRow key={b.ref}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{b.ref}</TableCell>
                  <TableCell>
                    <div className="font-medium">{b.name}</div>
                    <Badge variant={b.kind === "Wedding" ? "secondary" : "ghost"} className="mt-1">
                      {b.kind}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{b.date}</TableCell>
                  <TableCell className="text-muted-foreground">{b.what}</TableCell>
                  <TableCell>{b.party}</TableCell>
                  <TableCell className="font-medium">{b.total}</TableCell>
                  <TableCell>
                    <Badge variant={paymentVariant[b.payment]}>{b.payment}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <p className="mt-3 text-xs text-muted-foreground">
        Confirmations, reminders and review requests are sent automatically for each booking — see
        Notifications.
      </p>
    </AdminShell>
  );
}
