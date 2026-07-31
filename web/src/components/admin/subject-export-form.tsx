"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Download } from "lucide-react";
import { exportSubject, type SubjectExportState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Download className="size-4" />
      {pending ? "Building…" : "Export"}
    </Button>
  );
}

/**
 * Subject-access export (GDPR Art. 15): everything held about one email address,
 * as JSON the owner can hand over.
 *
 * The action returns the JSON rather than streaming a file, and the browser
 * turns it into a download here. That keeps the whole thing inside the audited
 * server action — a route handler serving the same data would be a second,
 * separate path to guest PII, and the point of this feature is that there is one.
 */
export function SubjectExportForm() {
  const [state, formAction] = useActionState<SubjectExportState, FormData>(
    exportSubject,
    {},
  );
  const downloaded = useRef<string | null>(null);

  useEffect(() => {
    if (!state.json || !state.filename) return;
    // Guard against re-downloading on an unrelated re-render.
    if (downloaded.current === state.filename) return;
    downloaded.current = state.filename;

    const url = URL.createObjectURL(
      new Blob([state.json], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = state.filename;
    link.click();
    URL.revokeObjectURL(url);
  }, [state.json, state.filename]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export someone&apos;s data</CardTitle>
        <CardDescription>
          Answers a subject-access request: every record we hold against one email address,
          across every table, as a JSON file. The export itself is recorded in the audit log.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-64 flex-col gap-1.5">
            <Label htmlFor="export-email">Email address</Label>
            <Input id="export-email" name="email" type="email" required />
          </div>
          <SubmitButton />
          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}
          {state.filename ? (
            <p className="text-sm text-muted-foreground" role="status">
              Downloaded {state.filename}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
