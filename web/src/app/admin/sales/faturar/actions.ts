"use server";

import { eq } from "drizzle-orm";

import { db, invoiceMarks } from "@/db";
import { requireAdmin } from "@/lib/admin-auth";
import { recordAuditOrWarn } from "@/lib/audit";
import { INVOICE_ENTRY_KEY_RE } from "@/lib/invoicing";

/** The longest document number kept. A real one is far shorter. */
const DOCUMENT_NUMBER_MAX = 60;

export type InvoiceMarkState = { ok?: boolean; error?: string };

/**
 * "Fatura emitida" on one line of "Para faturar" (JAM-528), with the number of
 * the document that was issued by hand. A second mark of the same line
 * replaces the number: the person corrects a typo by marking again.
 *
 * `requireAdmin()`: invoicing is the day job, like a refund. No
 * `revalidatePath`: the admin pages are dynamic (`app/admin/actions.ts`).
 */
export async function markInvoiced(
  _prevState: InvoiceMarkState,
  formData: FormData,
): Promise<InvoiceMarkState> {
  const actor = await requireAdmin();

  const entryKey = String(formData.get("entryKey") ?? "");
  const documentNumber = String(formData.get("documentNumber") ?? "").trim();
  if (!INVOICE_ENTRY_KEY_RE.test(entryKey)) return { error: "Esta linha já não existe." };
  if (!documentNumber) return { error: "Escreva o número do documento." };
  if (documentNumber.length > DOCUMENT_NUMBER_MAX) {
    return { error: `O número tem no máximo ${DOCUMENT_NUMBER_MAX} caracteres.` };
  }

  const now = new Date();
  await db
    .insert(invoiceMarks)
    .values({ entryKey, documentNumber, markedByUserId: actor.id, markedAt: now })
    .onConflictDoUpdate({
      target: invoiceMarks.entryKey,
      set: { documentNumber, markedByUserId: actor.id, markedAt: now },
    });

  await recordAuditOrWarn({
    actorUserId: actor.id,
    action: "invoice.marked",
    entityType: "invoice",
    entityId: entryKey,
    after: { documentNumber },
  });

  return { ok: true };
}

/** Take the mark off one line: it was put on the wrong line. */
export async function unmarkInvoiced(
  _prevState: InvoiceMarkState,
  formData: FormData,
): Promise<InvoiceMarkState> {
  const actor = await requireAdmin();

  const entryKey = String(formData.get("entryKey") ?? "");
  if (!INVOICE_ENTRY_KEY_RE.test(entryKey)) return { error: "Esta linha já não existe." };

  const [removed] = await db
    .delete(invoiceMarks)
    .where(eq(invoiceMarks.entryKey, entryKey))
    .returning({ documentNumber: invoiceMarks.documentNumber });

  if (removed) {
    await recordAuditOrWarn({
      actorUserId: actor.id,
      action: "invoice.unmarked",
      entityType: "invoice",
      entityId: entryKey,
      before: { documentNumber: removed.documentNumber },
    });
  }

  return { ok: true };
}
