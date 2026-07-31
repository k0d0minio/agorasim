import { CalendarCheck } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminInDevBanner } from "@/components/admin/in-dev-banner";
import { previewBookings, previewBookingStats } from "@/lib/admin-preview";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
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

      <Card className="overflow-x-auto p-0">
        <Table className="min-w-[760px]">
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
      </Card>

      <p className="mt-3 text-xs text-muted-foreground">
        Confirmations, reminders and review requests are sent automatically for each booking — see
        Notifications.
      </p>
    </AdminShell>
  );
}
