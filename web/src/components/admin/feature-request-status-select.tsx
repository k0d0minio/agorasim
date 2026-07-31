"use client";

import { useActionState, useRef } from "react";
import type { FeatureRequestStatus } from "@/db/schema";
import { FEATURE_REQUEST_STATUSES, featureRequestStatusMeta } from "@/lib/admin-format";
import {
  updateFeatureRequestStatus,
  type StatusUpdateState,
} from "@/app/admin/actions";
import { Select } from "@/components/ui/select";

/**
 * Inline status picker for a feature request. Submits the enclosing form as soon
 * as the operator changes the value, so triage is a single click with no save
 * step — mirrors the Submissions table's status select, including how it surfaces
 * a failed write instead of leaving the new value showing.
 */
export function FeatureRequestStatusSelect({
  id,
  status,
}: {
  id: string;
  status: FeatureRequestStatus;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState<StatusUpdateState, FormData>(
    updateFeatureRequestStatus,
    {},
  );

  return (
    <form
      ref={formRef}
      action={formAction}
      className="inline-flex flex-col items-start gap-1 sm:items-end"
    >
      <input type="hidden" name="id" value={id} />
      <Select
        name="status"
        size="xs"
        className="w-auto"
        defaultValue={status}
        onChange={() => formRef.current?.requestSubmit()}
        aria-label="Update status"
      >
        {FEATURE_REQUEST_STATUSES.map((value) => (
          <option key={value} value={value}>
            {featureRequestStatusMeta[value].label}
          </option>
        ))}
      </Select>
      {state.error ? (
        <p className="text-xs text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
