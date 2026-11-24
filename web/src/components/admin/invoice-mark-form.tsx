"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { CheckCircle2 } from "lucide-react";

import {
  markInvoiced,
  unmarkInvoiced,
  type InvoiceMarkState,
} from "@/app/admin/sales/faturar/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function Submit({ label, pending: pendingLabel, variant }: {
  label: string;
  pending: string;
  variant: "default" | "ghost";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant={variant} disabled={pending} className="min-h-11">
      {pending ? pendingLabel : label}
    </Button>
  );
}

/**
 * The mark of one line of "Para faturar" (JAM-528): the document number and
 * "Fatura emitida", or, once marked, the number and "Retirar marca".
 *
 * No confirmation dialog: the mark moves no money and tells nobody anything,
 * and the same line takes it off again.
 */
export function InvoiceMarkForm({
  entryKey,
  documentNumber,
  isRefund,
}: {
  entryKey: string;
  documentNumber: string | null;
  isRefund: boolean;
}) {
  const router = useRouter();
  const [markState, markAction] = useActionState<InvoiceMarkState, FormData>(markInvoiced, {});
  const [unmarkState, unmarkAction] = useActionState<InvoiceMarkState, FormData>(
    unmarkInvoiced,
    {},
  );

  // The line moves between the lists: read the page again.
  useEffect(() => {
    if (markState.ok || unmarkState.ok) router.refresh();
  }, [markState, unmarkState, router]);

  const error = markState.error ?? unmarkState.error;

  if (documentNumber) {
    return (
      <form action={unmarkAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="entryKey" value={entryKey} />
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="size-4" />
          {isRefund ? "Nota de crédito" : "Fatura"} {documentNumber}
        </span>
        <Submit label="Retirar marca" pending="A guardar…" variant="ghost" />
        {error ? (
          <p role="alert" className="w-full text-xs font-medium text-destructive">
            {error}
          </p>
        ) : null}
      </form>
    );
  }

  const inputId = `doc-${entryKey}`;
  return (
    <form action={markAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="entryKey" value={entryKey} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <label htmlFor={inputId} className="text-xs text-muted-foreground">
          {isRefund ? "N.º da nota de crédito" : "N.º da fatura"}
        </label>
        <Input
          id={inputId}
          name="documentNumber"
          required
          maxLength={60}
          autoComplete="off"
          placeholder={isRefund ? "NC 2027/1" : "FR 2027/1"}
          className="min-h-11"
        />
      </div>
      <Submit label="Fatura emitida" pending="A guardar…" variant="default" />
      {error ? (
        <p role="alert" className="w-full text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
