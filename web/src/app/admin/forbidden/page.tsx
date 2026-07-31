import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Where `requireAdmin(role)` sends an operator who is signed in but lacks the
 * role for what they asked for.
 *
 * Deliberately not the login screen: they are already authenticated, and asking
 * them to sign in again would suggest that re-authenticating might help. It
 * would not — their account simply is not an owner.
 */
export const dynamic = "force-dynamic";

export default async function AdminForbiddenPage() {
  // Still requires a session: an anonymous visitor gets the login screen, so
  // this page never becomes a way to probe which admin routes exist.
  const viewer = await requireAdmin();

  return (
    <AdminShell>
      <Card className="mx-auto max-w-lg">
        <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <ShieldAlert className="size-5" />
          </div>
          <div className="space-y-2">
            <p className="font-heading text-lg font-medium">Owner access required</p>
            <p className="text-sm text-muted-foreground">
              You are signed in as {viewer.name} ({viewer.role}). That area is limited to
              owner accounts — managing team accounts, reading the audit log and exporting or
              erasing guest data. Ask Diogo or Rita if you need it.
            </p>
          </div>
          <Link href="/admin" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Back to the dashboard
          </Link>
        </CardContent>
      </Card>
    </AdminShell>
  );
}
