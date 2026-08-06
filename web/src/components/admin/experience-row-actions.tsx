"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { ArrowDown, ArrowUp, Eye, EyeOff, Trash2 } from "lucide-react";
import {
  deleteExperience,
  moveExperience,
  setExperienceActive,
  type ExperienceActionState,
} from "@/app/admin/experiences/actions";
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

/**
 * The catalogue list's per-row controls: move it, hide it, delete it.
 *
 * All three are forms rather than menu items, so each is one tap on a phone and
 * each refreshes the list it changed. Reordering is arrows, not drag-and-drop:
 * the order matters to guests, the operators are usually on a phone, and a drag
 * handle has no touch story worth the code.
 */

function IconSubmit({
  label,
  children,
  disabled,
}: {
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      disabled={disabled || pending}
    >
      {children}
    </Button>
  );
}

/** Refresh the list after any of these writes, so the row moves where it went. */
function useRefreshOnSuccess(ok: boolean | undefined) {
  const router = useRouter();
  useEffect(() => {
    if (ok) router.refresh();
  }, [ok, router]);
}

export function MoveExperienceButtons({
  id,
  isFirst,
  isLast,
  name,
}: {
  id: string;
  isFirst: boolean;
  isLast: boolean;
  name: string;
}) {
  const [state, formAction] = useActionState<ExperienceActionState, FormData>(
    moveExperience,
    {},
  );
  useRefreshOnSuccess(state.ok);

  return (
    <div className="flex items-center">
      <form action={formAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="direction" value="up" />
        <IconSubmit label={`Move ${name} up`} disabled={isFirst}>
          <ArrowUp className="size-4" />
        </IconSubmit>
      </form>
      <form action={formAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="direction" value="down" />
        <IconSubmit label={`Move ${name} down`} disabled={isLast}>
          <ArrowDown className="size-4" />
        </IconSubmit>
      </form>
    </div>
  );
}

/**
 * Hide from the website / put back. This is the delete an operator should reach
 * for: enquiries reference experiences by slug, so a removed row turns last
 * month's "Manzwine" into a dangling name.
 */
export function ToggleExperienceButton({
  id,
  active,
  name,
}: {
  id: string;
  active: boolean;
  name: string;
}) {
  const [state, formAction] = useActionState<ExperienceActionState, FormData>(
    setExperienceActive,
    {},
  );
  useRefreshOnSuccess(state.ok);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      {/* The icon is the action, not the state: an active entry offers "hide". */}
      <IconSubmit label={active ? `Hide ${name} from the website` : `Show ${name} again`}>
        {active ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </IconSubmit>
      {state.error ? (
        <p className="text-xs text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

function ConfirmDeleteButton({ armed }: { armed: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending || !armed}>
      {pending ? "Deleting…" : "Delete permanently"}
    </Button>
  );
}

/**
 * Delete outright. Owner-only (the action enforces it regardless of what this
 * renders) and behind the same typed confirmation as erasing a guest record,
 * because it is equally irreversible and equally easy to mis-tap.
 */
export function DeleteExperienceDialog({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [state, formAction] = useActionState<ExperienceActionState, FormData>(
    deleteExperience,
    {},
  );

  // The entry is gone, so the page it was edited on is too — go back to the
  // list. Closing the dialog is derived from `state.ok`, not set here.
  useEffect(() => {
    if (!state.ok) return;
    router.push("/admin/experiences");
    router.refresh();
  }, [state.ok, router]);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label={`Delete ${name}`}
       
      >
        <Trash2 className="size-4" />
        Delete
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
              <DialogTitle>Delete {name}?</DialogTitle>
              <DialogDescription>
                The entry is removed from the database. Enquiries that chose it keep the
                slug on file, but nothing will explain what it was. Hiding it from the
                website is almost always the better move.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`confirm-experience-${id}`}>
                Type {DELETE_CONFIRMATION} to confirm
              </Label>
              <Input
                id={`confirm-experience-${id}`}
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
              <ConfirmDeleteButton armed={typed === DELETE_CONFIRMATION} />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
