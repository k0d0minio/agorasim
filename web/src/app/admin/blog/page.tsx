import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { FileText } from "lucide-react";

import { db, blogPostDrafts } from "@/db";
import { t } from "@/i18n/config";
import { requireAdmin } from "@/lib/admin-auth";
import { blogStatusMeta, formatDate, formatRelativeTime } from "@/lib/admin-format";
import { readingMinutes } from "@/lib/blog-format";
import { AdminShell } from "@/components/admin/admin-shell";
import { PublishBlogPostButton } from "@/components/admin/blog-row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Reads live data — never prerender at build time.
export const dynamic = "force-dynamic";

/**
 * The Blog studio — where an article written by the pipeline becomes a page on
 * the website, or does not.
 *
 * The whole feature is one decision, made here: Jamie runs the content pipeline
 * and loads the reviewed markdown (`pnpm blog:load`), and every article then
 * waits on this screen until Diogo or Rita taps **Publicar**. Nothing publishes
 * itself, and nothing the pipeline does can put words on the website that
 * neither of them has seen.
 *
 * Published first, deliberately: the list is read far more often to check what
 * the site currently says than to work through a queue, and "what is live" is
 * the question an owner opens this page with.
 */
export default async function AdminBlogPage() {
  await requireAdmin();

  const rows = await db
    .select()
    .from(blogPostDrafts)
    .orderBy(
      // Live articles first, then the queue — newest work at the top of each.
      sql`case when ${blogPostDrafts.status} = 'published' then 0 else 1 end`,
      desc(sql`coalesce(${blogPostDrafts.publishedAt}, ${blogPostDrafts.updatedAt})`),
    )
    // An unreachable database is a broken screen, not an empty blog: say so
    // rather than implying the pipeline has produced nothing.
    .catch(() => null);

  if (rows === null) {
    return (
      <AdminShell>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-semibold text-destructive">Não foi possível ler os artigos</p>
          <p className="text-muted-foreground">
            A base de dados não respondeu. O site continua a mostrar o que já lá está —
            volte a abrir esta página daqui a pouco, e avise o Jamie se continuar assim.
          </p>
        </div>
      </AdminShell>
    );
  }

  const live = rows.filter((row) => row.status === "published").length;

  return (
    <AdminShell>
      <p className="mb-1 text-sm text-muted-foreground">
        {rows.length} {rows.length === 1 ? "artigo" : "artigos"} ·{" "}
        {live === 1 ? "1 publicado no site" : `${live} publicados no site`}
      </p>
      <p className="mb-4 text-sm text-muted-foreground">
        Os artigos são escritos no seu tom e revistos antes de chegarem aqui. Leia,
        corrija o título se quiser, e publique quando estiver à vontade — sai em
        português e em inglês ao mesmo tempo, e pode retirá-lo a qualquer momento.
      </p>

      {rows.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <FileText className="size-8 text-muted-foreground" />
          <p className="font-heading text-base font-semibold">Ainda não há artigos</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Assim que a primeira leva de artigos for escrita e revista, aparece aqui à
            espera da sua aprovação. Nada vai para o site sem passar por este ecrã.
          </p>
        </Card>
      ) : (
        <Card className="divide-y p-0">
          {rows.map((row) => {
            const status = blogStatusMeta[row.status];
            const published = row.status === "published";
            const minutes = readingMinutes(row.body.pt);

            return (
              <div
                key={row.id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/blog/${row.id}`}
                      // Full-height touch target, not a text-sized sliver
                      // (spec §2 T1) — same as the catalogue's rows.
                      className="inline-flex min-h-11 items-center font-medium hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      {t(row.title, "pt")}
                    </Link>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{t(row.excerpt, "pt")}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    /{row.slug} · {minutes} min de leitura
                    {row.tags.length > 0 ? ` · ${row.tags.join(" · ")}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {published && row.publishedAt
                      ? `No site desde ${formatDate(row.publishedAt)}`
                      : `${status.hint} · atualizado ${formatRelativeTime(row.updatedAt)}`}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start">
                  <Button asChild variant="outline">
                    <Link href={`/admin/blog/${row.id}`}>Ler</Link>
                  </Button>
                  <PublishBlogPostButton id={row.id} published={published} />
                </div>
              </div>
            );
          })}
        </Card>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        Publicar coloca o artigo no site de imediato, com a data de hoje. Retirar tira-o do
        site e devolve-o a esta lista — o texto não se perde.
      </p>
    </AdminShell>
  );
}
