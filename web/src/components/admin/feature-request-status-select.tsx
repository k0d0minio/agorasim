"use client";

import { useRef } from "react";
import type { FeatureRequestStatus } from "@/db/schema";
import { FEATURE_REQUEST_STATUSES, featureRequestStatusMeta } from "@/lib/admin-format";
import { updateFeatureRequestStatus } from "@/app/admin/actions";
import { Select } from "@/components/ui/select";

/**
 * Inline status picker for a feature request. Submits the enclosing form as soon
 * as the operator changes the value, so triage is a single click with no save
 * step — mirrors the Submissions table's status select.
 */
export function FeatureRequestStatusSelect({
  id,
  status,
}: {
  id: string;
  status: FeatureRequestStatus;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={updateFeatureRequestStatus} className="inline-flex">
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
    </form>
  );
}
