"use client";

import type { FeatureRequestStatus } from "@/db/schema";
import { FEATURE_REQUEST_STATUSES, featureRequestStatusMeta } from "@/lib/admin-format";
import { updateFeatureRequestStatus } from "@/app/admin/actions";
import { StatusMenu, type StatusOption } from "@/components/admin/status-menu";

const OPTIONS: StatusOption<FeatureRequestStatus>[] = FEATURE_REQUEST_STATUSES.map(
  (value) => ({ value, ...featureRequestStatusMeta[value] }),
);

/**
 * Triage control for a feature request — the Submissions control, same
 * behaviour, over the backlog's lifecycle states.
 */
export function FeatureRequestStatusSelect({
  id,
  status,
  title,
  className,
}: {
  id: string;
  status: FeatureRequestStatus;
  /** The request's title, so the trigger has a distinguishing name. */
  title: string;
  className?: string;
}) {
  return (
    <StatusMenu
      value={status}
      options={OPTIONS}
      update={(next) => updateFeatureRequestStatus(id, next)}
      triggerLabel={`Status for “${title}” — currently ${featureRequestStatusMeta[status].label}`}
      className={className}
    />
  );
}
