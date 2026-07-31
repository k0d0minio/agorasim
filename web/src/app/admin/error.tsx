"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { adminSystemContent } from "@/content/system";

/**
 * Recovery screen for the admin area. Every admin page is `force-dynamic` and
 * queries Neon while rendering, so an unset `DATABASE_URL` or a brief outage
 * used to surface Next's raw error screen — including the message, which can
 * carry the connection string.
 *
 * Nothing from `error` is rendered: the operator gets a plain explanation and a
 * retry, and the real cause stays in the server logs (matched by `error.digest`).
 */
export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[admin] render failed", error);
  }, [error]);

  const c = adminSystemContent.error;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <AlertTriangle className="size-5" />
          </div>
          <div className="max-w-sm space-y-1">
            <p className="font-heading text-base font-medium">{c.title}</p>
            <p className="text-sm text-muted-foreground">{c.body}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button type="button" onClick={() => unstable_retry()}>
              {c.retry}
            </Button>
            <Button asChild variant="ghost">
              <Link href="/admin">{c.dashboard}</Link>
            </Button>
          </div>
          {error.digest ? (
            <p className="text-xs text-muted-foreground/70">
              Reference: {error.digest}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
