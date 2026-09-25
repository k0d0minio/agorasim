import Link from "next/link";
import { History, MailCheck, TriangleAlert } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/admin-auth";
import {
  MESSAGE_CARDS,
  MESSAGE_WINDOW_DAYS,
  attentionRows,
  groupByLisbonDay,
  lisbonDayLabel,
  lisbonTime,
  messageBadge,
  messageBadgeMeta,
  messageKindLabel,
  messageRecipientLabel,
  messageTime,
  messageWindowStart,
  sentCountsByKind,
} from "@/lib/admin-messages";
import { bookingRef } from "@/lib/bookings";
import { recentMessages, type LoggedMessage } from "@/lib/message-log";
import { enquiryRef } from "@/lib/sales";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// Reads live data — never prerender at build time.
export const dynamic = "force-dynamic";

/**
 * Mensagens automáticas — what the site has sent by itself, read from
 * `message_log`, which records every automatic email once.
 *
 * Policy-only by decision: there is no switch per message. A message that
 * should stop, or say something else, is a change to the code that sends it,
 * so the page only says what goes out, when, to whom — and what went out.
 */
export default async function AdminNotificationsPage() {
  // Authorized here, not by `proxy.ts` — see the note at the top of
  // `lib/admin-auth.ts`.
  await requireAdmin();

  const now = new Date();
  const rows = await recentMessages(messageWindowStart(now));
  const attention = attentionRows(rows, now);
  const counts = sentCountsByKind(rows);
  const days = groupByLisbonDay(rows);

  return (
    <AdminShell>
      {attention.length > 0 ? (
        <section aria-labelledby="attention-heading" className="mb-8">
          <h2
            id="attention-heading"
            className="mb-3 flex items-center gap-2 text-sm font-medium text-destructive"
          >
            <TriangleAlert className="size-4" />
            Precisa de atenção
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            «Falhou»: a mensagem não saiu. «Por confirmar»: o envio começou e ficou sem resposta
            do serviço de email — pode ter saído ou não; confirme com o cliente antes de voltar a
            escrever.
          </p>
          <Card className="divide-y border-destructive/30 p-0">
            {attention.map((row) => (
              <MessageRow key={row.id} row={row} now={now} withDay />
            ))}
          </Card>
        </section>
      ) : null}

      <section aria-labelledby="messages-heading" className="mb-8">
        <h2
          id="messages-heading"
          className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"
        >
          <MailCheck className="size-4" />
          As mensagens
        </h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {MESSAGE_CARDS.map((card) => (
            <Card key={card.kind}>
              <CardContent className="flex items-start justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="font-medium">{messageKindLabel[card.kind]}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{card.when}</p>
                </div>
                <p className="shrink-0 text-right">
                  <span className="block text-lg font-semibold tabular-nums">
                    {counts[card.kind]}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {counts[card.kind] === 1 ? "enviada" : "enviadas"} em {MESSAGE_WINDOW_DAYS}{" "}
                    dias
                  </span>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="recent-heading">
        <h2
          id="recent-heading"
          className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"
        >
          <History className="size-4" />
          Enviadas recentemente
        </h2>

        {days.length === 0 ? (
          <Card className="px-4 py-6 text-sm text-muted-foreground">
            Ainda não saiu nenhuma mensagem automática nos últimos {MESSAGE_WINDOW_DAYS} dias.
          </Card>
        ) : (
          <div className="space-y-6">
            {days.map((day) => (
              <div key={day.key}>
                <h3 className="mb-2 text-sm font-medium">{day.label}</h3>
                <Card className="divide-y p-0">
                  {day.rows.map((row) => (
                    <MessageRow key={row.id} row={row} now={now} />
                  ))}
                </Card>
              </div>
            ))}
          </div>
        )}
      </section>
    </AdminShell>
  );
}

/**
 * One send: what it was, to whom, about which booking or pedido, how it went.
 * The reference is the booking's where the message is about one — it is the
 * string the guest quotes — and the pedido's otherwise; either opens the
 * pedido in Vendas.
 */
function MessageRow({
  row,
  now,
  withDay = false,
}: {
  row: LoggedMessage;
  now: Date;
  /** The attention block mixes days, so its rows carry their own date. */
  withDay?: boolean;
}) {
  const at = messageTime(row);
  const badge = messageBadgeMeta[messageBadge(row, now)];
  const ref = row.bookingId
    ? bookingRef(row.bookingId)
    : row.tourRequestId
      ? enquiryRef(row.tourRequestId)
      : null;

  return (
    <div className="flex flex-col gap-1 px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{messageKindLabel[row.kind]}</p>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span>{messageRecipientLabel(row.recipient, row.guestName)}</span>
          {ref && row.tourRequestId ? (
            <Link
              href={`/admin/sales/${row.tourRequestId}`}
              className="inline-flex min-h-11 items-center font-mono text-foreground underline-offset-4 hover:underline"
            >
              {ref}
            </Link>
          ) : ref ? (
            <span className="font-mono">{ref}</span>
          ) : null}
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant={badge.variant}>{badge.label}</Badge>
        <time dateTime={at.toISOString()} className="tabular-nums">
          {withDay ? `${lisbonDayLabel(at)} · ` : ""}
          {lisbonTime(at)}
        </time>
      </div>
    </div>
  );
}
