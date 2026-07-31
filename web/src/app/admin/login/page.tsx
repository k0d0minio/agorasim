import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/admin/login-form";
import { currentSession } from "@/lib/admin-auth";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // Already signed in — there is nothing to log into. Send them on, following
  // `next` only when it is a same-origin admin path that isn't this page (no
  // open redirects, no redirect loop).
  if (await currentSession()) {
    const destination =
      next?.startsWith("/admin") && !next.startsWith("/admin/login") ? next : "/admin";
    redirect(destination);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">Agorasim Admin</CardTitle>
          <CardDescription>
            Enter the team password to access the operations area.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm next={next} />
        </CardContent>
      </Card>
    </div>
  );
}
