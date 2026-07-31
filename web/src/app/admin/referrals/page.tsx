import { Gift, Trophy } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminInDevBanner } from "@/components/admin/in-dev-banner";
import { previewReferralStats, previewReferrers } from "@/lib/admin-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
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
export default function AdminReferralsPage() {
  return (
    <AdminShell title="Referrals">
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

      <Card className="overflow-x-auto p-0">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead>Guest</TableHead>
              <TableHead>Personal link</TableHead>
              <TableHead>Shares</TableHead>
              <TableHead>Bookings</TableHead>
              <TableHead>Reward</TableHead>
              <TableHead />
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
                    <Button size="sm" variant="outline" disabled>
                      Mark fulfilled
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        A friendly “share your experience” email goes out after each tour — see Notifications.
      </p>
    </AdminShell>
  );
}
