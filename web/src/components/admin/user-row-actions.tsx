"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { disableUser, enableUser, type UserAdminState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function ConfirmButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

/**
 * Disable or re-enable one account.
 *
 * Disabling is behind a confirmation because the account is the thing every
 * audit entry points at: getting it wrong locks a colleague out mid-shift. It is
 * still the right verb — accounts are never deleted, so the trail keeps a valid
 * reference to whoever did what.
 */
export function UserRowActions({
  id,
  name,
  disabled,
}: {
  id: string;
  name: string;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<UserAdminState, FormData>(
    disabled ? enableUser : disableUser,
    {},
  );

  if (disabled) {
    return (
      <form action={formAction} className="flex flex-col items-start gap-1">
        <input type="hidden" name="id" value={id} />
        <Button type="submit" variant="outline">
          Reativar
        </Button>
        {state.error ? (
          <p className="text-xs text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}
      </form>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button type="button" variant="ghost" onClick={() => setOpen(true)}>
        Desativar
      </Button>
      {state.error ? (
        <p className="text-xs text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar {name}?</DialogTitle>
            <DialogDescription>
              A pessoa deixa de poder entrar e todas as sessões terminam já. A conta é
              mantida, para o registo de atividade continuar a mostrar o que fez. Pode
              reativá-la mais tarde.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <form action={formAction} onSubmit={() => setOpen(false)}>
              <input type="hidden" name="id" value={id} />
              <ConfirmButton label="Desativar conta" pendingLabel="A desativar…" />
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
