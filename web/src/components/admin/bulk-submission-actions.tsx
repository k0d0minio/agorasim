"use client";

import { createContext, useActionState, useCallback, useContext, useState } from "react";
import { Archive, Trash2 } from "lucide-react";
import { bulkTourRequestAction, type DataRightsState } from "@/app/admin/actions";
import { DELETE_CONFIRMATION } from "@/lib/admin-format";
import { cn } from "@/lib/utils";
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
 * The form the row checkboxes and every button below belong to.
 *
 * Everything associates with it through the HTML `form` attribute rather than by
 * being nested inside it. That is not a stylistic choice: the rows already carry
 * their own inline status form, and the erase button lives in a Radix dialog
 * that portals to `<body>`. Nesting would be invalid HTML in one case and
 * impossible in the other.
 */
const FORM_ID = "bulk-submissions";

/** Lets a row checkbox report itself to the toolbar's count. */
const SelectionContext = createContext<((id: string, checked: boolean) => void) | null>(
  null,
);

/** One row's "include in the bulk action" checkbox. */
export function SubmissionCheckbox({
  id,
  label,
  className,
}: {
  id: string;
  label: string;
  className?: string;
}) {
  const onToggle = useContext(SelectionContext);

  return (
    <input
      type="checkbox"
      name="ids"
      value={id}
      form={FORM_ID}
      aria-label={label}
      className={cn("size-4 shrink-0 rounded border-border accent-primary", className)}
      onChange={(event) => onToggle?.(id, event.target.checked)}
    />
  );
}

function SubmitButton({
  operation,
  variant,
  disabled,
  children,
}: {
  operation: "archive" | "delete";
  variant?: "outline" | "ghost" | "destructive";
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    // The submit button's own name/value is what tells the action which
    // operation was asked for, so both buttons can share one form.
    //
    // Pending state comes from `useActionState` in the parent rather than from
    // `useFormStatus`: that hook reads context from an enclosing `<form>`, and
    // these buttons are associated by attribute, not by nesting.
    <Button
      type="submit"
      form={FORM_ID}
      name="operation"
      value={operation}
      size="sm"
      variant={variant}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}

/**
 * Bulk archive or bulk erase, from the checkboxes on the Sales table — the spam
 * sweep the audit flagged as missing, and the only practical way to clear a bot
 * run.
 *
 * The two operations are deliberately asymmetric. Archiving is ordinary triage
 * and any operator can do it; erasing is the same irreversible act as the
 * per-row delete, so it is owner-only (enforced in the action, not by
 * `canErase`) and behind the same typed confirmation, which the schema
 * re-checks server-side.
 */
export function BulkSubmissionActions({
  canErase,
  children,
}: {
  canErase: boolean;
  children: React.ReactNode;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [state, formAction, isPending] = useActionState<DataRightsState, FormData>(
    bulkTourRequestAction,
    {},
  );

  const onToggle = useCallback((id: string, checked: boolean) => {
    setSelected((current) =>
      checked ? [...current, id] : current.filter((value) => value !== id),
    );
  }, []);

  const busy = isPending || selected.length === 0;

  return (
    <SelectionContext.Provider value={onToggle}>
      {/* Empty on purpose — every control is associated by `form={FORM_ID}`. */}
      <form id={FORM_ID} action={formAction} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {selected.length === 0
            ? "Tick leads to archive or erase them together."
            : `${selected.length} selected`}
        </span>

        <SubmitButton operation="archive" variant="outline" disabled={busy}>
          <Archive className="size-4" />
          Archive
        </SubmitButton>

        {canErase ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => setOpen(true)}
          >
            <Trash2 className="size-4" />
            Erase
          </Button>
        ) : null}

        {state.message ? (
          <p className="text-sm text-muted-foreground" role="status">
            {state.message}
          </p>
        ) : null}
        {state.error ? (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}
      </div>

      {children}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Erase {selected.length} lead{selected.length === 1 ? "" : "s"}?
            </DialogTitle>
            <DialogDescription>
              Each selected record is deleted from the database — name, email, phone and
              message. This cannot be undone. The audit log keeps a count and a
              non-identifying note of what was erased.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bulk-confirm">Type {DELETE_CONFIRMATION} to confirm</Label>
            <Input
              id="bulk-confirm"
              name="confirm"
              form={FORM_ID}
              autoComplete="off"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton
              operation="delete"
              variant="destructive"
              disabled={isPending || typed !== DELETE_CONFIRMATION}
            >
              Erase permanently
            </SubmitButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SelectionContext.Provider>
  );
}
