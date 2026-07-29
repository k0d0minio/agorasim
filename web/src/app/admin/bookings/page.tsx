import { CalendarCheck } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminInDevBanner } from "@/components/admin/in-dev-banner";
import { previewBookings, previewBookingStats } from "@/lib/admin-preview";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    <AdminShell title="Bookings">
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
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">Ref</th>
              <th className="px-4 py-3 font-medium">Guest</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Experience</th>
              <th className="px-4 py-3 font-medium">Party</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Payment</th>
            </tr>
          </thead>
          <tbody>
            {previewBookings.map((b) => (
              <tr key={b.ref} className="border-b last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{b.ref}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{b.name}</div>
                  <Badge variant={b.kind === "Wedding" ? "secondary" : "ghost"} className="mt-1">
                    {b.kind}
                  </Badge>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{b.date}</td>
                <td className="px-4 py-3 text-muted-foreground">{b.what}</td>
                <td className="px-4 py-3">{b.party}</td>
                <td className="px-4 py-3 font-medium">{b.total}</td>
                <td className="px-4 py-3">
                  <Badge variant={paymentVariant[b.payment]}>{b.payment}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <p className="mt-3 text-xs text-muted-foreground">
        Confirmations, reminders and review requests are sent automatically for each booking — see
        Notifications.
      </p>
    </AdminShell>
  );
}
