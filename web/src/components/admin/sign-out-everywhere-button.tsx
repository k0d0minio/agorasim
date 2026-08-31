"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { LogOut } from "lucide-react";
import { signOutEverywhere } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? "A terminar…" : "Sair de todos os dispositivos"}
    </Button>
  );
}

/**
 * "Sign out everywhere", behind a confirmation — it is not destructive, but it
 * does log the operator out of the device they are standing at, which is a
 * surprise if the button was a mis-tap.
 */
export function SignOutEverywhereButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <LogOut className="size-4" />
        Sair de todos os dispositivos
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminar a sessão em todos os dispositivos?</DialogTitle>
            <DialogDescription>
              Todas as sessões da sua conta terminam de imediato, incluindo esta. A
              palavra-passe não muda.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <form action={signOutEverywhere}>
              <ConfirmButton />
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
