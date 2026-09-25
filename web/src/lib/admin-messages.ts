/**
 * The "Mensagens automáticas" page's vocabulary and arithmetic — pure, so it
 * is unit-tested without a database and imported by the page alone.
 *
 * The rows come from `message_log` (`recentMessages` in `lib/message-log.ts`),
 * which records every automatic email once. This module says what each kind
 * is called, when it goes out and to whom, which rows need a look, and how the
 * list is cut into Lisbon days. Nothing here switches a message on or off: the
 * page is policy-only, and a message that should stop is a code change.
 */
import type { VariantProps } from "class-variance-authority";

import type { MessageKind, MessageRecipient, MessageStatus } from "@/db/schema";
import type { badgeVariants } from "@/components/ui/badge";

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

/** How far back the page looks — the list and the per-kind counts alike. */
export const MESSAGE_WINDOW_DAYS = 30;

/**
 * How long a `sending` row may stay unsettled before it is shown as a problem.
 *
 * A claim is settled within seconds of Resend answering, so a row still
 * `sending` an hour later belongs to a process that died between the claim and
 * the answer — the mail may or may not have gone, and the claim is kept on
 * purpose (`lib/message-log.ts` module note).
 */
export const STUCK_AFTER_MS = 60 * 60 * 1000;

/**
 * Every kind's name on this page. A `Record` over the enum, so a kind added to
 * `message_kind` without a name here fails `tsc` rather than rendering a slug.
 */
export const messageKindLabel: Record<MessageKind, string> = {
  "booking-confirmation": "Confirmação de reserva",
  "booking-cancellation": "Cancelamento de reserva",
  "booking-moved": "Mudança de data",
  "enquiry-ack": "Pedido recebido",
  "day-before-reminder": "Lembrete da véspera",
  "thank-you-review": "Agradecimento e avaliação",
  "quote-sent": "Orçamento enviado",
  "deposit-received": "Sinal recebido",
  "balance-paid": "Saldo pago",
  "quote-refunded": "Reembolso",
  "balance-request": "Pedido do saldo",
  "balance-reminder": "Lembrete do saldo",
};

/** One card in "As mensagens": when a kind goes out, and to whom. */
export type MessageCard = { kind: MessageKind; when: string };

/**
 * The kinds that have a sender today, in the order a guest meets them.
 *
 * Each "to whom" was read off the `recipient` at that kind's `sendLoggedEmail`
 * call. `balance-request` and `balance-reminder` are absent on purpose: nothing
 * sends them until `quote-flow/balance-scheduler` ships, and that stub adds
 * their cards with their sender.
 */
export const MESSAGE_CARDS: readonly MessageCard[] = [
  {
    kind: "enquiry-ack",
    when: "Quando chega um pedido pelo site — ao cliente e à equipa.",
  },
  {
    kind: "booking-confirmation",
    when: "Assim que o pagamento é aceite — ao cliente e à equipa.",
  },
  {
    kind: "day-before-reminder",
    when: "Na manhã da véspera do passeio, com o ponto de encontro — ao cliente.",
  },
  {
    kind: "thank-you-review",
    when: "Na manhã a seguir ao passeio, com o link para a avaliação no Google — ao cliente.",
  },
  {
    kind: "booking-moved",
    when: "Quando muda a data de uma reserva — ao cliente.",
  },
  {
    kind: "booking-cancellation",
    when: "Quando uma reserva é cancelada — ao cliente; à equipa quando é o cliente a cancelar.",
  },
  {
    kind: "quote-sent",
    when: "Quando envia um orçamento — ao cliente.",
  },
  {
    kind: "deposit-received",
    when: "Quando o sinal de um orçamento é pago — ao cliente e à equipa.",
  },
  {
    kind: "balance-paid",
    when: "Quando o saldo de um orçamento é pago — ao cliente e à equipa.",
  },
  {
    kind: "quote-refunded",
    when: "Quando devolve dinheiro de um orçamento — ao cliente.",
  },
];

/**
 * Where one send got to, as the page says it. `unconfirmed` is not a database
 * status: it is a `sending` row older than {@link STUCK_AFTER_MS}.
 */
export type MessageBadge = "sent" | "failed" | "sending" | "unconfirmed";

export const messageBadgeMeta: Record<MessageBadge, { label: string; variant: BadgeVariant }> = {
  sent: { label: "Enviada", variant: "secondary" },
  failed: { label: "Falhou", variant: "destructive" },
  sending: { label: "A enviar", variant: "outline" },
  unconfirmed: { label: "Por confirmar", variant: "destructive" },
};

/** The fields of a log row this module reads. */
export type MessageRowCore = {
  kind: MessageKind;
  recipient: MessageRecipient;
  status: MessageStatus;
  sentAt: Date | null;
  createdAt: Date;
};

/** A row's badge, `now` deciding whether a `sending` row has been left behind. */
export function messageBadge(row: MessageRowCore, now: Date = new Date()): MessageBadge {
  if (row.status === "sent") return "sent";
  if (row.status === "failed") return "failed";
  return now.getTime() - row.createdAt.getTime() > STUCK_AFTER_MS ? "unconfirmed" : "sending";
}

/** A failed send, or one whose outcome nobody knows — the "Precisa de atenção" rows. */
export function needsAttention(row: MessageRowCore, now: Date = new Date()): boolean {
  const badge = messageBadge(row, now);
  return badge === "failed" || badge === "unconfirmed";
}

/** When a row happened: the provider's acceptance, else the claim. */
export function messageTime(row: Pick<MessageRowCore, "sentAt" | "createdAt">): Date {
  return row.sentAt ?? row.createdAt;
}

/** The first instant the page looks at. */
export function messageWindowStart(now: Date = new Date()): Date {
  return new Date(now.getTime() - MESSAGE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

/** Who a send went to, as a row says it — the guest's name, or the team. */
export function messageRecipientLabel(
  recipient: MessageRecipient,
  guestName: string | null,
): string {
  if (recipient === "team") return "Equipa";
  return guestName?.trim() || "Cliente";
}

const LISBON = "Europe/Lisbon";

// `en-CA` formats as `YYYY-MM-DD`; the time zone is what makes it Lisbon's day.
const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: LISBON,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dayLabelFormatter = new Intl.DateTimeFormat("pt-PT", {
  timeZone: LISBON,
  weekday: "long",
  day: "numeric",
  month: "long",
});

const timeFormatter = new Intl.DateTimeFormat("pt-PT", {
  timeZone: LISBON,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * The Lisbon calendar day an instant falls on, `2026-09-25`. Portugal is UTC+1
 * in summer, so 23:30 UTC on the 24th is already the 25th there.
 */
export function lisbonDayKey(at: Date): string {
  return dayKeyFormatter.format(at);
}

/** "Sexta-feira, 25 de setembro" — a day heading, sentence case. */
export function lisbonDayLabel(at: Date): string {
  const label = dayLabelFormatter.format(at);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** "09:05", Lisbon time. */
export function lisbonTime(at: Date): string {
  return timeFormatter.format(at);
}

/** One day of the list. */
export type MessageDay<T> = { key: string; label: string; rows: T[] };

/**
 * Cut the rows into Lisbon days, newest day first and newest row first within
 * it — whatever order they arrive in.
 */
export function groupByLisbonDay<T extends Pick<MessageRowCore, "sentAt" | "createdAt">>(
  rows: readonly T[],
): MessageDay<T>[] {
  const sorted = [...rows].sort((a, b) => messageTime(b).getTime() - messageTime(a).getTime());
  const days: MessageDay<T>[] = [];
  for (const row of sorted) {
    const at = messageTime(row);
    const key = lisbonDayKey(at);
    const last = days.at(-1);
    if (last?.key === key) last.rows.push(row);
    else days.push({ key, label: lisbonDayLabel(at), rows: [row] });
  }
  return days;
}

/**
 * How many of each kind went out — `sent` rows only, every kind present with 0
 * where nothing was sent. The caller passes the window's rows.
 */
export function sentCountsByKind(
  rows: readonly Pick<MessageRowCore, "kind" | "status">[],
): Record<MessageKind, number> {
  const counts = Object.fromEntries(
    (Object.keys(messageKindLabel) as MessageKind[]).map((kind) => [kind, 0]),
  ) as Record<MessageKind, number>;
  for (const row of rows) {
    if (row.status === "sent") counts[row.kind] += 1;
  }
  return counts;
}
