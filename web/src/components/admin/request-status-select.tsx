"use client";

import type { RequestStatus } from "@/db/schema";
import { REQUEST_STATUSES, requestStatusMeta } from "@/lib/admin-format";
import { updateTourRequestStatus } from "@/app/admin/actions";
import { StatusMenu, type StatusOption } from "@/components/admin/status-menu";

const OPTIONS: StatusOption<RequestStatus>[] = REQUEST_STATUSES.map((value) => ({
  value,
  ...requestStatusMeta[value],
}));

/**
 * Triage control for a tour request: the status badge, tappable, opening the
 * five lifecycle states. See `StatusMenu` for the optimistic/error behaviour.
 */
export function RequestStatusSelect({
  id,
  status,
  name,
  className,
}: {
  id: string;
  status: RequestStatus;
  /** Whose enquiry this is, so the trigger has a distinguishing name. */
  name: string;
  className?: string;
}) {
  return (
    <StatusMenu
      value={status}
      options={OPTIONS}
      update={(next) => updateTourRequestStatus(id, next)}
      triggerLabel={`Status for ${name} — currently ${requestStatusMeta[status].label}`}
      className={className}
    />
  );
}
