"use client";

import { useRef } from "react";
import type { RequestStatus } from "@/db/schema";
import { REQUEST_STATUSES, requestStatusMeta } from "@/lib/admin-format";
import { updateTourRequestStatus } from "@/app/admin/actions";

/**
 * Inline status picker for a tour request. Submits the enclosing form as soon as
 * the operator changes the value, so triage is a single click with no save step.
 */
export function RequestStatusSelect({
  id,
  status,
}: {
  id: string;
  status: RequestStatus;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={updateTourRequestStatus} className="inline-flex">
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        onChange={() => formRef.current?.requestSubmit()}
        aria-label="Update status"
        className="h-7 rounded-lg border border-border bg-background px-2 text-xs font-medium outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {REQUEST_STATUSES.map((value) => (
          <option key={value} value={value}>
            {requestStatusMeta[value].label}
          </option>
        ))}
      </select>
    </form>
  );
}
