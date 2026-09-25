"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Copy, Pencil, Plus, RotateCw, Send, Trash2, X } from "lucide-react";

import {
  discardQuote,
  newQuoteVersion,
  resendLeadQuote,
  saveQuoteDraft,
  sendLeadQuote,
  type QuoteActionState,
} from "@/app/admin/sales/actions";
import {
  quotePaymentKindLabel,
  quotePaymentStatusMeta,
  quoteStatusMeta,
} from "@/lib/admin-format";
import { formatPrice, parseAmountInput, priceInputValue } from "@/lib/money";
import {
  DEFAULT_DEPOSIT_PERCENT,
  balanceDueKey,
  splitTotal,
  type QuoteLine,
} from "@/lib/quote-math";
import type { QuotePaymentKind, QuotePaymentStatus, QuoteStatus } from "@/db/schema";
import {
  CancelHeldQuoteDialog,
  RefundQuotePaymentDialog,
} from "@/components/admin/quote-refund-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

/**
 * One quote as the card shows it — plain data, formatted on the server where
 * the formatting needs a server module (the event day in words).
 */
export type QuoteCardItem = {
  id: string;
  ref: string;
  status: QuoteStatus;
  /** A cancelled quote a later version replaced — "Substituído". */
  superseded: boolean;
  eventDate: string;
  eventDateLabel: string;
  venue: string | null;
  lineItems: QuoteLine[];
  totalCents: number;
  currency: string;
  depositPercent: number;
  /** ISO — changes on every save, which is what closes an open editor. */
  updatedAt: string;
  /** ISO — the stamp "Reenviar" pins itself to. */
  sentAt: string | null;
  sentAtLabel: string | null;
  termsVersion: string | null;
  /** Whether "Nova versão" is offered — sent, unpaid, and no draft waiting. */
  canNewVersion: boolean;
  /** For a sent quote: whether the email with its current link left. */
  emailState: "sent" | "sending" | "not-sent" | null;
  /**
   * The deposit has all gone back. With the quote not cancelled, the event is
   * still held and its balance still asked for — the card warns and offers
   * "Cancelar evento".
   */
  depositRefundedInFull: boolean;
  /**
   * The T−3 flag: deposit paid, the event three days away or fewer (or past),
   * and the balance neither paid nor written off — `isBalanceFlagged`, the
   * rule the Sales board's "Saldo por pagar" panel shows too.
   */
  balanceUnpaid: boolean;
  payments: {
    id: string;
    kind: QuotePaymentKind;
    amountCents: number;
    /** What has gone back on it, in total — shown beside the amount. */
    refundedAmountCents: number;
    dueDateLabel: string | null;
    status: QuotePaymentStatus;
    /** Paid through Stripe with something left to give back — "Reembolsar". */
    refundable: boolean;
  }[];
};

/**
 * The Orçamento card on a wedding or event lead — build, send and replace the
 * quote without leaving the Sales board.
 *
 * Everything the card does is one server action in `app/admin/sales/actions.ts`
 * over `lib/quote-builder.ts`; the card's own logic is presentation and the live
 * preview of the money, which computes with the very functions the server
 * writes with (`lib/quote-math.ts`). Every control is a default-size button or
 * input — 44px and 48px tall — and nothing is set below 12px, per the admin's
 * phone rules.
 */
export function LeadQuoteCard({
  leadId,
  guestEmail,
  prefill,
  canStart,
  quotes,
}: {
  leadId: string;
  guestEmail: string;
  /** The enquiry's own answers, for a new quote's first draft. */
  prefill: { eventDate: string; venue: string };
  canStart: boolean;
  quotes: QuoteCardItem[];
}) {
  // The number of quotes when "Criar orçamento" was pressed. A saved draft
  // makes it stale, and that — not an effect — is what closes the form.
  const [creatingAt, setCreatingAt] = useState<number | null>(null);
  const creating = creatingAt === quotes.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orçamento</CardTitle>
        <CardDescription>
          O orçamento deste pedido: preparar, enviar ao cliente e, se for preciso, substituir
          por uma nova versão.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {canStart ? (
          creating ? (
            <QuoteForm
              mode={{ kind: "create", leadId }}
              initial={{
                eventDate: prefill.eventDate,
                venue: prefill.venue,
                depositPercent: String(DEFAULT_DEPOSIT_PERCENT),
                lines: [],
              }}
              onCancel={() => setCreatingAt(null)}
            />
          ) : (
            <div>
              <Button type="button" onClick={() => setCreatingAt(quotes.length)}>
                <Plus className="size-4" />
                Criar orçamento
              </Button>
            </div>
          )
        ) : null}

        {quotes.length === 0 && !canStart ? (
          <p className="text-sm text-muted-foreground">Ainda não há orçamento.</p>
        ) : null}

        {quotes.map((quote) => (
          <QuoteEntry key={quote.id} quote={quote} guestEmail={guestEmail} />
        ))}
      </CardContent>
    </Card>
  );
}

/** One quote: its summary, and the actions its state allows. */
function QuoteEntry({ quote, guestEmail }: { quote: QuoteCardItem; guestEmail: string }) {
  // The quote's `updatedAt` when "Editar" was pressed: a save moves it, which
  // closes the editor on the refreshed render without an effect.
  const [editingAt, setEditingAt] = useState<string | null>(null);
  const editing = editingAt === quote.updatedAt;
  const status = quoteStatusMeta[quote.superseded ? "superseded" : quote.status];
  const money = (cents: number) => formatPrice(cents, "pt", quote.currency);

  if (editing && quote.status === "draft") {
    return (
      <div className="flex flex-col gap-3 border-l-2 border-primary pl-3">
        <p className="font-mono text-sm">{quote.ref}</p>
        <QuoteForm
          mode={{ kind: "edit", quoteId: quote.id }}
          initial={{
            eventDate: quote.eventDate,
            venue: quote.venue ?? "",
            depositPercent: String(quote.depositPercent),
            lines: quote.lineItems.map((line) => ({
              label: line.label,
              quantity: String(line.quantity),
              unit: priceInputValue(line.unitCents) || "0",
            })),
          }}
          onCancel={() => setEditingAt(null)}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-3 border-l-2 pl-3 ${
        quote.status === "cancelled" ? "opacity-70" : "border-primary"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="font-mono">{quote.ref}</span>
        <Badge variant={status.variant}>{status.label}</Badge>
        {quote.balanceUnpaid ? <Badge variant="destructive">Saldo por pagar</Badge> : null}
        <span aria-hidden>·</span>
        <span>{quote.eventDateLabel}</span>
      </div>

      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Local</dt>
          <dd>{quote.venue ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Total</dt>
          <dd className="font-medium">{money(quote.totalCents)}</dd>
        </div>
        {quote.sentAtLabel ? (
          <div>
            <dt className="text-muted-foreground">Enviado</dt>
            <dd>
              {quote.sentAtLabel}
              {quote.termsVersion ? (
                <span className="text-muted-foreground"> · termos de {quote.termsVersion}</span>
              ) : null}
            </dd>
          </div>
        ) : null}
      </dl>

      <ul className="flex flex-col gap-1 text-sm">
        {quote.lineItems.map((line, index) => (
          <li key={index} className="flex justify-between gap-3">
            <span>
              {line.quantity > 1 ? `${line.quantity} × ` : ""}
              {line.label}
            </span>
            <span className="shrink-0 tabular-nums">{money(line.unitCents * line.quantity)}</span>
          </li>
        ))}
      </ul>

      <ul className="flex flex-col gap-2 text-sm">
        {quote.payments.map((payment) => {
          const meta = quotePaymentStatusMeta[payment.status];
          return (
            <li key={payment.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-medium">
                {quotePaymentKindLabel[payment.kind]}
                {payment.kind === "deposit" ? ` (${quote.depositPercent}%)` : ""}
              </span>
              <span className="tabular-nums">{money(payment.amountCents)}</span>
              {payment.dueDateLabel ? (
                <span className="text-muted-foreground">até {payment.dueDateLabel}</span>
              ) : null}
              <Badge variant={meta.variant}>{meta.label}</Badge>
              {payment.refundedAmountCents > 0 && payment.status !== "refunded" ? (
                <span className="text-muted-foreground">
                  reembolsado {money(payment.refundedAmountCents)}
                </span>
              ) : null}
              {payment.refundable ? (
                <RefundQuotePaymentDialog
                  // Remounts once the refund lands and the row's total moves, so the
                  // dialog opens again for a second refund with the new maximum.
                  key={`${payment.id}:${payment.refundedAmountCents}`}
                  payment={{
                    id: payment.id,
                    label: quotePaymentKindLabel[payment.kind],
                    kind: payment.kind,
                    amountCents: payment.amountCents,
                    refundedAmountCents: payment.refundedAmountCents,
                  }}
                  quote={{
                    ref: quote.ref,
                    currency: quote.currency,
                    eventDateLabel: quote.eventDateLabel,
                    cancelled: quote.status === "cancelled",
                    depositRefundedInFull: quote.depositRefundedInFull,
                  }}
                />
              ) : null}
            </li>
          );
        })}
      </ul>

      {quote.depositRefundedInFull && quote.status !== "cancelled" ? (
        <div className="flex flex-col gap-2 rounded-lg border border-destructive/40 p-3">
          <p className="text-sm text-destructive" role="status">
            O sinal foi reembolsado na totalidade, mas o evento continua marcado
            {quote.payments.some(
              (payment) =>
                payment.kind === "balance" &&
                (payment.status === "pending" || payment.status === "issued"),
            )
              ? " e o saldo ainda vai ser pedido"
              : ""}
            . Se o evento não se realiza, cancele-o.
          </p>
          <div>
            <CancelHeldQuoteDialog
              quote={{ id: quote.id, ref: quote.ref, eventDateLabel: quote.eventDateLabel }}
            />
          </div>
        </div>
      ) : null}

      {quote.status === "sent" && quote.emailState === "not-sent" ? (
        <p className="text-sm text-destructive" role="status">
          O email não foi enviado. Use «Reenviar» para mandar um novo link ao cliente.
        </p>
      ) : null}
      {quote.status === "sent" && quote.emailState === "sending" ? (
        <p className="text-xs text-muted-foreground" role="status">
          O email está a ser enviado — se não mudar, confirme em Notificações.
        </p>
      ) : null}

      {quote.status === "draft" ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setEditingAt(quote.updatedAt)}>
            <Pencil className="size-4" />
            Editar
          </Button>
          <ConfirmedQuoteAction
            action={sendLeadQuote}
            fields={{ quoteId: quote.id }}
            trigger={{ label: "Enviar orçamento", icon: <Send className="size-4" /> }}
            title={`Enviar o orçamento ${quote.ref}?`}
            description={`O cliente recebe por email, em ${guestEmail}, o orçamento de ${money(quote.totalCents)} com o link para a página onde paga o sinal. Depois de enviado já não pode ser editado — só substituído por uma nova versão.`}
            confirm={{ label: "Enviar", pending: "A enviar…" }}
          />
          <ConfirmedQuoteAction
            action={discardQuote}
            fields={{ quoteId: quote.id }}
            trigger={{ label: "Descartar rascunho", icon: <Trash2 className="size-4" />, variant: "ghost" }}
            title={`Descartar o rascunho ${quote.ref}?`}
            description="O rascunho é posto de parte e o cliente não recebe nada."
            confirm={{ label: "Descartar", pending: "A descartar…", variant: "destructive" }}
          />
        </div>
      ) : null}

      {quote.status === "sent" ? (
        <div className="flex flex-wrap gap-2">
          {quote.canNewVersion ? (
            <ConfirmedQuoteAction
              action={newQuoteVersion}
              fields={{ quoteId: quote.id }}
              trigger={{ label: "Nova versão", icon: <Copy className="size-4" />, variant: "outline" }}
              title={`Nova versão do orçamento ${quote.ref}?`}
              description="Cria um rascunho igual a este para alterar. O orçamento enviado continua válido até enviar a nova versão — nesse momento o link antigo deixa de funcionar."
              confirm={{ label: "Criar nova versão", pending: "A criar…" }}
            />
          ) : null}
          {quote.sentAt ? (
            <ConfirmedQuoteAction
              action={resendLeadQuote}
              fields={{ quoteId: quote.id, sentAt: quote.sentAt }}
              trigger={{ label: "Reenviar", icon: <RotateCw className="size-4" />, variant: "outline" }}
              title={`Reenviar o orçamento ${quote.ref}?`}
              description={`O cliente recebe outra vez o orçamento, em ${guestEmail}, com um link novo. O link anterior deixa de funcionar. Se o email do cliente estava errado, corrija-o primeiro nos dados do pedido.`}
              confirm={{ label: "Reenviar", pending: "A reenviar…" }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type QuoteAction = (state: QuoteActionState, formData: FormData) => Promise<QuoteActionState>;

function SubmitButton({
  label,
  pending: pendingLabel,
  variant,
}: {
  label: string;
  pending: string;
  variant?: "default" | "destructive";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant ?? "default"} disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

/**
 * A button that asks first, then runs one quote action — every action on a
 * quote either emails a couple or changes what they can open, so none of them
 * is a single tap. The result is read back under the button, and the page
 * refreshes so the card shows the quote as it now is.
 */
function ConfirmedQuoteAction({
  action,
  fields,
  trigger,
  title,
  description,
  confirm,
}: {
  action: QuoteAction;
  fields: Record<string, string>;
  trigger: { label: string; icon: ReactNode; variant?: "default" | "outline" | "ghost" };
  title: string;
  description: string;
  confirm: { label: string; pending: string; variant?: "default" | "destructive" };
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<QuoteActionState, FormData>(action, {});
  // The action state the dialog was opened on. A successful answer is a new
  // state object, which closes it; an error keeps it open to say why; opening
  // it again after a success works because it is opened *on* that success.
  const [openedOn, setOpenedOn] = useState<QuoteActionState | null>(null);
  const open = openedOn !== null && (openedOn === state || !state.ok);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant={trigger.variant ?? "default"} onClick={() => setOpenedOn(state)}>
        {trigger.icon}
        {trigger.label}
      </Button>
      {state.error ? (
        <p className="text-xs text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok && state.message ? (
        <p className="text-xs text-muted-foreground" role="status">
          {state.message}
        </p>
      ) : null}

      <Dialog open={open} onOpenChange={(next) => setOpenedOn(next ? state : null)}>
        <DialogContent>
          <form action={formAction} className="flex flex-col gap-4">
            {Object.entries(fields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            {state.error ? (
              <p className="text-sm text-destructive" role="alert">
                {state.error}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenedOn(null)}>
                Voltar
              </Button>
              <SubmitButton {...confirm} />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type LineDraft = { label: string; quantity: string; unit: string };

const EMPTY_LINE: LineDraft = { label: "", quantity: "1", unit: "" };

/** "2026-08-01" → "1 de agosto de 2026", for the live preview. */
function dayLabel(key: string): string {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${key}T00:00:00Z`));
}

/**
 * The builder's form — create a draft, or edit one.
 *
 * The total is not typed: it is the sum of the lines, shown live with the
 * deposit and the balance it splits into and the day the balance falls due, so
 * Rita sees the figures the couple will see before she saves. A line that does
 * not parse yet simply does not count towards the preview; the server says
 * which line is wrong when she saves.
 */
function QuoteForm({
  mode,
  initial,
  onCancel,
}: {
  mode: { kind: "create"; leadId: string } | { kind: "edit"; quoteId: string };
  initial: { eventDate: string; venue: string; depositPercent: string; lines: LineDraft[] };
  /** "Voltar". A successful save closes the form through the refresh instead. */
  onCancel: () => void;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<QuoteActionState, FormData>(saveQuoteDraft, {});
  const [eventDate, setEventDate] = useState(initial.eventDate);
  const [depositPercent, setDepositPercent] = useState(initial.depositPercent);
  const [lines, setLines] = useState<LineDraft[]>(
    initial.lines.length > 0 ? initial.lines : [EMPTY_LINE],
  );

  // The refreshed render carries the saved quote, and the parent closes this
  // form from it (see `creatingAt` / `editingAt`).
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  const totalCents = lines.reduce((sum, line) => {
    const unit = parseAmountInput(line.unit);
    const quantity = Number(line.quantity || "1");
    return unit !== null && Number.isInteger(quantity) && quantity > 0
      ? sum + unit * quantity
      : sum;
  }, 0);
  const percent = Number(depositPercent);
  const split =
    totalCents > 0 && Number.isInteger(percent) && percent >= 1 && percent <= 100
      ? splitTotal(totalCents, percent)
      : null;
  const due = balanceDueKey(eventDate);
  const money = (cents: number) => formatPrice(cents, "pt");
  // Advisory only — the schema is the real refusal of a past date, and this is
  // Rita's own clock, not the business's Europe/Lisbon one; close enough for a
  // hint she can act on before saving.
  const today = new Date().toISOString().slice(0, 10);
  const hasBalance = split !== null && split.balanceCents > 0;
  const balanceAlreadyDue = hasBalance && due !== null && due <= today;

  const update = (index: number, patch: Partial<LineDraft>) =>
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  const id = mode.kind === "create" ? `new-${mode.leadId}` : mode.quoteId;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {mode.kind === "create" ? (
        <input type="hidden" name="leadId" value={mode.leadId} />
      ) : (
        <input type="hidden" name="quoteId" value={mode.quoteId} />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-date`}>Data do evento</Label>
          <Input
            id={`${id}-date`}
            name="eventDate"
            type="date"
            required
            min={today}
            value={eventDate}
            onChange={(event) => setEventDate(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-venue`}>Local</Label>
          <Input
            id={`${id}-venue`}
            name="venue"
            autoComplete="off"
            defaultValue={initial.venue}
          />
        </div>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">Linhas do orçamento</legend>
        {lines.map((line, index) => (
          <div key={index} className="flex flex-col gap-2 rounded-lg border p-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-label-${index}`}>Descrição</Label>
              <Input
                id={`${id}-label-${index}`}
                name="lineLabel"
                autoComplete="off"
                placeholder="Carro clássico com motorista, 6 horas"
                value={line.label}
                onChange={(event) => update(index, { label: event.target.value })}
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex w-24 flex-col gap-1.5">
                <Label htmlFor={`${id}-qty-${index}`}>Qtd.</Label>
                <Input
                  id={`${id}-qty-${index}`}
                  name="lineQuantity"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={line.quantity}
                  onChange={(event) => update(index, { quantity: event.target.value })}
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor={`${id}-unit-${index}`}>Preço unitário (€)</Label>
                <Input
                  id={`${id}-unit-${index}`}
                  name="lineUnit"
                  inputMode="decimal"
                  autoComplete="off"
                  value={line.unit}
                  onChange={(event) => update(index, { unit: event.target.value })}
                />
              </div>
              {lines.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remover a linha ${index + 1}`}
                  onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
                >
                  <X className="size-4" />
                </Button>
              ) : null}
            </div>
          </div>
        ))}
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setLines((current) => [...current, EMPTY_LINE])}
          >
            <Plus className="size-4" />
            Acrescentar linha
          </Button>
        </div>
      </fieldset>

      <div className="flex w-32 flex-col gap-1.5">
        <Label htmlFor={`${id}-deposit`}>Sinal (%)</Label>
        <Input
          id={`${id}-deposit`}
          name="depositPercent"
          type="number"
          inputMode="numeric"
          min={1}
          max={100}
          step={1}
          value={depositPercent}
          onChange={(event) => setDepositPercent(event.target.value)}
        />
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg bg-muted/60 px-3 py-2 text-sm" aria-live="polite">
        <dt className="text-muted-foreground">Total</dt>
        <dd className="text-right font-medium tabular-nums">{money(totalCents)}</dd>
        <dt className="text-muted-foreground">Sinal</dt>
        <dd className="text-right tabular-nums">{split ? money(split.depositCents) : "—"}</dd>
        <dt className="text-muted-foreground">Saldo</dt>
        <dd className="text-right tabular-nums">
          {split ? money(split.balanceCents) : "—"}
          {hasBalance && due ? (
            <span className="block text-xs text-muted-foreground">até {dayLabel(due)}</span>
          ) : null}
        </dd>
      </dl>

      {balanceAlreadyDue ? (
        <p className="text-xs text-primary" role="status">
          A menos de 14 dias do evento, o saldo ficaria devido de imediato — confirme o prazo com o
          cliente antes de enviar.
        </p>
      ) : null}

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <SubmitButton
          label={mode.kind === "create" ? "Criar rascunho" : "Guardar rascunho"}
          pending="A guardar…"
        />
        <Button type="button" variant="outline" onClick={onCancel}>
          Voltar
        </Button>
      </div>
    </form>
  );
}
