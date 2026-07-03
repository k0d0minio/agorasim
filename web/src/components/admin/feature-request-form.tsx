"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { submitFeatureRequest, type FeatureRequestState } from "@/app/admin/actions";
import { FEATURE_REQUEST_PRIORITIES, featureRequestPriorityMeta } from "@/lib/admin-format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const inputClass =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const textareaClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

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
            <label htmlFor="title" className="text-sm font-medium">
              Title
            </label>
            <input
              id="title"
              name="title"
              required
              placeholder="e.g. Export submissions to CSV"
              className={inputClass}
            />
            {state.fieldErrors?.title ? (
              <p className="text-sm text-destructive" role="alert">
                {state.fieldErrors.title}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={5}
              required
              placeholder="Describe the feature, the problem it solves, and anything that would help us build it."
              className={textareaClass}
            />
            {state.fieldErrors?.description ? (
              <p className="text-sm text-destructive" role="alert">
                {state.fieldErrors.description}
              </p>
            ) : null}
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="category" className="text-sm font-medium">
                Category <span className="text-muted-foreground">(optional)</span>
              </label>
              <input
                id="category"
                name="category"
                placeholder="e.g. Website, Booking"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="priority" className="text-sm font-medium">
                Priority
              </label>
              <select id="priority" name="priority" defaultValue="medium" className={inputClass}>
                {FEATURE_REQUEST_PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {featureRequestPriorityMeta[value].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="submittedBy" className="text-sm font-medium">
                Your name <span className="text-muted-foreground">(optional)</span>
              </label>
              <input
                id="submittedBy"
                name="submittedBy"
                placeholder="e.g. Diogo"
                autoComplete="name"
                className={inputClass}
              />
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
