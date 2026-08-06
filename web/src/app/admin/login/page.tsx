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
    // dvh + safe-area padding: centred between the status bar and the home
    // indicator of the installed app, at every keyboard state.
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 p-4 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1rem)]">
      <div className="w-full max-w-sm">
        {/* The word mark above the card, so the front door of the installed
            app reads as the app — not as a form on a blank page. */}
        <div className="mb-6 text-center">
          <p className="font-heading text-2xl font-semibold">Agorasim</p>
          <p className="text-sm text-muted-foreground">Operations</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sign in</CardTitle>
            <CardDescription>
              With your own account — everything in here is recorded against it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm next={next} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
