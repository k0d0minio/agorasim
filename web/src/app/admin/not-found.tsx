import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { adminSystemContent } from "@/content/system";

/** 404 inside the admin area — keeps operators in the dashboard, not on the public site. */
export default function AdminNotFound() {
  const c = adminSystemContent.notFound;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Compass className="size-5" />
          </div>
          <div className="max-w-sm space-y-1">
            <p className="font-heading text-base font-medium">{c.title}</p>
            <p className="text-sm text-muted-foreground">{c.body}</p>
          </div>
          <Button asChild>
            <Link href="/admin">{c.dashboard}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
