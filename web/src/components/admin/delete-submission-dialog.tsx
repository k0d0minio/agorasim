"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import { deleteTourRequest, type DataRightsState } from "@/app/admin/actions";
import { DELETE_CONFIRMATION } from "@/lib/admin-format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function ConfirmButton({ armed }: { armed: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending || !armed}>
      {pending ? "Erasing…" : "Erase permanently"}
    </Button>
  );
}

/**
 * Right to erasure (GDPR Art. 17) for one enquiry. Owner-only — the action
 * refuses anyone else regardless of what this renders.
 *
 * The confirmation asks the operator to type DELETE rather than click "yes".
 * There is no undo and no soft-delete flag: the row goes. A one-click version of
 * this button sitting in a table row would eventually be pressed by accident.
 */
export function DeleteSubmissionDialog({
  id,
  name,
  redirectTo,
}: {
  id: string;
  name: string;
  /**
   * Where to go once the record is gone. The list can stay where it is — the
   * row simply disappears on the next render — but a detail page for a deleted
   * record has nothing left to show, so it sends the operator back to the list.
   */
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [state, formAction] = useActionState<DataRightsState, FormData>(
    deleteTourRequest,
    {},
  );

  // Navigate once the erasure lands. The dialog's own visibility is derived
  // below rather than set here: a successful action already means "closed", and
  // an effect that sets state to say so is a second source of truth for it.
  useEffect(() => {
    if (!state.ok) return;
    if (redirectTo) router.replace(redirectTo);
    else router.refresh();
  }, [state.ok, redirectTo, router]);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label={`Erase the record for ${name}`}
       
      >
        <Trash2 className="size-4" />
        Erase
      </Button>

      {state.error ? (
        <p className="text-xs text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Dialog open={open && !state.ok} onOpenChange={setOpen}>
        <DialogContent>
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={id} />
            <DialogHeader>
              <DialogTitle>Erase this person&apos;s enquiry?</DialogTitle>
              <DialogDescription>
                The whole record for {name} is deleted from the database — name, email,
                phone and message. This cannot be undone. The audit log keeps a note that an
                erasure happened, with no identifying details in it.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`confirm-${id}`}>
                Type {DELETE_CONFIRMATION} to confirm
              </Label>
              <Input
                id={`confirm-${id}`}
                name="confirm"
                autoComplete="off"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <ConfirmButton armed={typed === DELETE_CONFIRMATION} />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
