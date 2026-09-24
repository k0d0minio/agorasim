"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { CalendarX, Undo2 } from "lucide-react";

import {
  cancelLeadHeldQuote,
  refundLeadQuotePayment,
  type QuoteActionState,
} from "@/app/admin/sales/actions";
import { EVENT_CANCEL_CONFIRMATION, REFUND_CONFIRMATION } from "@/lib/admin-format";
import { formatPrice, parseAmountInput, priceInputValue } from "@/lib/money";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ArmedSubmit({
  armed,
  label,
  pending: pendingLabel,
}: {
  armed: boolean;
  label: string;
  pending: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending || !armed}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

/** The action's answer, under the button that asked for it. */
function Outcome({ state }: { state: QuoteActionState }) {
  if (state.error) {
    return (
      <p className="text-xs text-destructive" role="alert">
        {state.error}
      </p>
    );
  }
  if (state.ok && state.message) {
    return (
      <p className="text-xs text-muted-foreground" role="status">
        {state.message}
      </p>
    );
  }
  return null;
}

/**
 * "Reembolsar" on one instalment of a quote — the deposit, the balance or an
 * extra, in full or in part.
 *
 * Built like the tour's cancel-and-refund dialog, for the same reasons: the
 * amount is a field because the team's judgement is the policy, and the typed
 * {@link REFUND_CONFIRMATION} is what stands between a mis-tap and the money.
 *
 * **"Cancelar também o evento"** follows the amount until the operator touches
 * it: ticked when this refund leaves the deposit fully refunded — the date is
 * then no longer paid for, and an event left held would still have its balance
 * asked for — unticked otherwise, because a partial refund is usually goodwill
 * on an event that is still happening. Hidden on a quote already cancelled.
 */
export function RefundQuotePaymentDialog({
  payment,
  quote,
}: {
  payment: {
    id: string;
    /** "Sinal", "Saldo" — for the title and the read-back. */
    label: string;
    kind: "deposit" | "balance" | "other";
    amountCents: number;
    refundedAmountCents: number;
  };
  quote: {
    ref: string;
    currency: string;
    eventDateLabel: string;
    cancelled: boolean;
    /** Whether the deposit is already all back, before this refund. */
    depositRefundedInFull: boolean;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const refundable = Math.max(0, payment.amountCents - payment.refundedAmountCents);
  const [amount, setAmount] = useState(() => priceInputValue(refundable));
  // `null` until the operator touches the box — until then it follows the amount.
  const [cancelChoice, setCancelChoice] = useState<boolean | null>(null);
  const [state, formAction] = useActionState<QuoteActionState, FormData>(
    refundLeadQuotePayment,
    {},
  );

  // Refresh once the refund lands: the card, the badges and the audit history
  // all read the rows that just changed. The dialog closes on `state.ok`.
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  const parsed = parseAmountInput(amount);
  const amountValid = parsed !== null && parsed > 0 && parsed <= refundable;
  const money = (cents: number) => formatPrice(cents, "pt", quote.currency);

  const emptiesDeposit =
    quote.depositRefundedInFull || (payment.kind === "deposit" && amountValid && parsed === refundable);
  const cancelEvent = !quote.cancelled && (cancelChoice ?? emptiesDeposit);

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label={`Reembolsar o ${payment.label.toLowerCase()} do orçamento ${quote.ref}`}
      >
        <Undo2 className="size-4" />
        Reembolsar
      </Button>
      <Outcome state={state} />

      <Dialog open={open && !state.ok} onOpenChange={setOpen}>
        <DialogContent>
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="paymentId" value={payment.id} />
            <DialogHeader>
              <DialogTitle>
                Reembolsar o {payment.label.toLowerCase()} do orçamento {quote.ref}?
              </DialogTitle>
              <DialogDescription>
                O valor volta ao cartão ou método com que o cliente pagou, e a comissão de 6%
                volta na mesma proporção. O cliente recebe um email a dizer quanto lhe foi
                devolvido. Não há como voltar atrás.
              </DialogDescription>
            </DialogHeader>

            {state.error ? (
              <p className="text-sm text-destructive" role="alert">
                {state.error}
              </p>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`quote-refund-${payment.id}`}>Valor a reembolsar (€)</Label>
              <Input
                id={`quote-refund-${payment.id}`}
                name="refundAmount"
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Pago: {money(payment.amountCents)}
                {payment.refundedAmountCents > 0
                  ? ` · já reembolsado: ${money(payment.refundedAmountCents)}`
                  : ""}{" "}
                · máximo agora: {money(refundable)}.
              </p>
              <p className="text-xs" role="status">
                {amountValid && parsed !== null
                  ? `Vão ser devolvidos ${money(parsed)}.`
                  : `Indique um valor entre 0,01 € e ${money(refundable)}.`}
              </p>
            </div>

            {quote.cancelled ? null : (
              <label className="flex min-h-11 items-start gap-2.5 rounded-lg border border-border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  name="cancelEvent"
                  checked={cancelEvent}
                  onChange={(event) => setCancelChoice(event.target.checked)}
                  className="mt-0.5 size-4 rounded border-border accent-primary"
                />
                <span>
                  Cancelar também o evento
                  <span className="block text-xs text-muted-foreground">
                    O evento de {quote.eventDateLabel} deixa de estar marcado e o saldo já não é
                    pedido. Deixe por marcar se o evento se mantém.
                  </span>
                </span>
              </label>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`confirm-quote-refund-${payment.id}`}>
                Escreva {REFUND_CONFIRMATION} para confirmar
              </Label>
              <Input
                id={`confirm-quote-refund-${payment.id}`}
                name="confirm"
                autoComplete="off"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Voltar
              </Button>
              <ArmedSubmit
                armed={amountValid && typed === REFUND_CONFIRMATION}
                label={cancelEvent ? "Reembolsar e cancelar evento" : "Reembolsar"}
                pending="A reembolsar…"
              />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * "Cancelar evento" — offered only on a quote whose deposit has gone back in
 * full and which is still held: a refund made in the Stripe dashboard, or one
 * whose dialog left the event on. Moves no money and sends no email.
 */
export function CancelHeldQuoteDialog({
  quote,
}: {
  quote: { id: string; ref: string; eventDateLabel: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [state, formAction] = useActionState<QuoteActionState, FormData>(
    cancelLeadHeldQuote,
    {},
  );

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <CalendarX className="size-4" />
        Cancelar evento
      </Button>
      <Outcome state={state} />

      <Dialog open={open && !state.ok} onOpenChange={setOpen}>
        <DialogContent>
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="quoteId" value={quote.id} />
            <DialogHeader>
              <DialogTitle>Cancelar o evento do orçamento {quote.ref}?</DialogTitle>
              <DialogDescription>
                O evento de {quote.eventDateLabel} deixa de estar marcado e o saldo já não é
                pedido. O link do cliente deixa de funcionar. Não é devolvido nenhum valor e o
                cliente não recebe email. Não há como voltar atrás.
              </DialogDescription>
            </DialogHeader>

            {state.error ? (
              <p className="text-sm text-destructive" role="alert">
                {state.error}
              </p>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`confirm-cancel-quote-${quote.id}`}>
                Escreva {EVENT_CANCEL_CONFIRMATION} para confirmar
              </Label>
              <Input
                id={`confirm-cancel-quote-${quote.id}`}
                name="confirm"
                autoComplete="off"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Voltar
              </Button>
              <ArmedSubmit
                armed={typed === EVENT_CANCEL_CONFIRMATION}
                label="Cancelar evento"
                pending="A cancelar…"
              />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
