"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { submitFeatureRequest, type FeatureRequestState } from "@/app/admin/actions";
import { FEATURE_REQUEST_PRIORITIES, featureRequestPriorityMeta } from "@/lib/admin-format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      <Plus />
      {pending ? "Saving…" : "Add request"}
    </Button>
  );
}

/**
 * Free-form feature-request form for the admin dashboard. On success the form
 * resets so the operator can jot down the next idea straight away; the list
 * below revalidates via the server action.
 */
export function FeatureRequestForm() {
  const [state, formAction] = useActionState<FeatureRequestState, FormData>(
    submitFeatureRequest,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the fields after a successful insert so the next request starts fresh.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>New feature request</CardTitle>
        <CardDescription>
          Capture an idea or ask for the toolkit. Only a title and description are required.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="flex flex-col gap-5" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              required
              placeholder="e.g. Export submissions to CSV"
            />
            {state.fieldErrors?.title ? (
              <p className="text-sm text-destructive" role="alert">
                {state.fieldErrors.title}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={5}
              required
              placeholder="Describe the feature, the problem it solves, and anything that would help us build it."
            />
            {state.fieldErrors?.description ? (
              <p className="text-sm text-destructive" role="alert">
                {state.fieldErrors.description}
              </p>
            ) : null}
          </div>

          {/*
            "Your name" used to be a text box here, because the admin was a
            shared login and the app had no idea who you were. It does now, so
            the request is filed against the signed-in account instead.
          */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">
                Category <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="category"
                name="category"
                placeholder="e.g. Website, Booking"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="priority">Priority</Label>
              <Select id="priority" name="priority" defaultValue="medium">
                {FEATURE_REQUEST_PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {featureRequestPriorityMeta[value].label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}
          {state.ok ? (
            <p className="text-sm text-primary" role="status">
              Request added.
            </p>
          ) : null}

          <div>
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
