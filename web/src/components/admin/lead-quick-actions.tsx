"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Archive, PhoneCall } from "lucide-react";
import {
  logContactAttempt,
  updateTourRequestStatus,
  type StatusUpdateState,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/admin-format";

/**
 * The two things an operator does to a lead without typing anything: say they
 * reached out, and put it away.
 *
 * Both are one tap because both are things you do while standing next to a car.
 * The status picker can express either one, but "I just rang them" costing three
 * taps through a menu is how a contact log stops being kept.
 */

function PendingButton({
  children,
  idleLabel,
  variant,
}: {
  children: React.ReactNode;
  idleLabel: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {children}
      {pending ? "Saving…" : idleLabel}
    </Button>
  );
}

export function LogContactButton({
  id,
  lastContactedAt,
}: {
  id: string;
  /** ISO string, so this stays serialisable across the server boundary. */
  lastContactedAt: string | null;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<StatusUpdateState, FormData>(
    logContactAttempt,
    {},
  );

  // The page is a server render; refresh it so the new timestamp and the moved
  // status appear without the operator wondering whether the tap registered.
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <div className="flex flex-col gap-1">
      <form action={formAction}>
        <input type="hidden" name="id" value={id} />
        <PendingButton idleLabel="Log contact" variant="outline">
          <PhoneCall className="size-4" />
        </PendingButton>
      </form>

      {state.error ? (
        <p className="text-xs text-destructive" role="alert">
          {state.error}
        </p>
      ) : lastContactedAt ? (
        <p className="text-xs text-muted-foreground">
          Last reached out {formatRelativeTime(new Date(lastContactedAt))}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Nobody has logged reaching out yet</p>
      )}
    </div>
  );
}

/**
 * Archive without going through the status menu. Deliberately not a delete: the
 * row stays, the retention job still owns when its personal data goes.
 */
export function ArchiveLeadButton({ id, archived }: { id: string; archived: boolean }) {
  const router = useRouter();
  const [state, formAction] = useActionState<StatusUpdateState, FormData>(
    // The button carries its own arguments, so the action needs neither the
    // previous state nor a form payload — it is a menu choice with one option.
    async () => updateTourRequestStatus(id, archived ? "new" : "archived"),
    {},
  );

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <div className="flex flex-col gap-1">
      <form action={formAction}>
        <PendingButton idleLabel={archived ? "Reopen" : "Archive"} variant="outline">
          <Archive className="size-4" />
        </PendingButton>
      </form>
      {state.error ? (
        <p className="text-xs text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
