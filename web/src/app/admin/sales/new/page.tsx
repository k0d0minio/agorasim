import { requireAdmin } from "@/lib/admin-auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { ScratchQuoteForm } from "@/components/admin/lead-quote-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// The form posts to a server action; nothing here is worth prerendering.
export const dynamic = "force-dynamic";

/**
 * "Novo orçamento" — a quote with no enquiry behind it, for a personalised
 * tour, a wedding or an event (feedback round 1, Diogo: "create these payment
 * links from scratch with all details").
 *
 * One form writes the lead and the draft (`createQuoteFromScratch`), then opens
 * the lead's page, where the draft is sent like any other quote.
 */
export default async function NewQuotePage() {
  await requireAdmin();

  return (
    <AdminShell>
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Novo orçamento</CardTitle>
          <CardDescription>
            Para um passeio personalizado, um casamento ou um evento sem pedido no site. Cria o
            cartão do cliente e o rascunho do orçamento. Depois, envie-o na página do cliente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScratchQuoteForm />
        </CardContent>
      </Card>
    </AdminShell>
  );
}
