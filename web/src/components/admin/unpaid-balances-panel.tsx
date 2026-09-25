import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** One unpaid balance as the panel shows it — plain data, formatted on the server. */
export type UnpaidBalanceItem = {
  quoteId: string;
  /** The lead's page, or null when the enquiry behind the quote is gone. */
  href: string | null;
  ref: string;
  couple: string;
  eventDateLabel: string;
  /** "Hoje", "Amanhã", "Daqui a 3 dias", "Há 2 dias". */
  whenLabel: string;
  venue: string | null;
  amountLabel: string;
  /** What has gone to the couple: "Lembrete enviado a …", "Pedido enviado a …", "Pedido não enviado". */
  messagesLabel: string;
};

/**
 * "Saldo por pagar" — the team's T−3 flag (`quote-flow/balance-scheduler`).
 *
 * Every deposit-paid event three days away or fewer, or already past, whose
 * balance has not come in and has not been written off. It is computed on each
 * render (`isBalanceFlagged` / `listUnpaidBalancesDue`), so paying the balance
 * or writing it off clears the row by itself; rendered only when there is one.
 * What to do about it — phone the couple, release the date — is the team's,
 * and nothing here does it for them.
 */
export function UnpaidBalancesPanel({ items }: { items: UnpaidBalanceItem[] }) {
  if (items.length === 0) return null;

  return (
    <Card className="mb-6 border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-destructive" aria-hidden />
          Saldo por pagar
        </CardTitle>
        <CardDescription>
          Eventos com sinal pago a três dias ou menos, e o saldo ainda por receber.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y">
          {items.map((item) => (
            <li key={item.quoteId} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="font-mono">{item.ref}</span>
                {item.href ? (
                  <Link href={item.href} className="font-medium underline-offset-4 hover:underline">
                    {item.couple}
                  </Link>
                ) : (
                  <span className="font-medium">{item.couple}</span>
                )}
                <Badge variant="destructive">{item.whenLabel}</Badge>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span>{item.eventDateLabel}</span>
                {item.venue ? <span>{item.venue}</span> : null}
                <span className="font-medium text-foreground tabular-nums">{item.amountLabel}</span>
                <span>{item.messagesLabel}</span>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
