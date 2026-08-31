import Image from "next/image";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { db, blogPostDrafts } from "@/db";
import { locales, t, type Locale } from "@/i18n/config";
import { requireAdmin } from "@/lib/admin-auth";
import { blogStatusMeta, formatDate } from "@/lib/admin-format";
import { readingMinutes } from "@/lib/blog-format";
import { href } from "@/lib/routes";
import { AdminShell } from "@/components/admin/admin-shell";
import { PublishBlogPostButton } from "@/components/admin/blog-row-actions";
import { BlogPostForm } from "@/components/admin/blog-post-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Reads live data — never prerender at build time.
export const dynamic = "force-dynamic";

/** The article as it will read, in one language. */
function Preview({ locale, body }: { locale: Locale; body: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {locale}
          </span>
          {locale === "pt" ? "Como se lê em português" : "Como se lê em inglês"}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm leading-relaxed text-foreground/90">
        {body.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * One article: read it, fix its headline, publish it.
 *
 * The whole point of the screen is the reading. Publishing puts these exact
 * words on the public site in two languages, and a decision made off a title in
 * a list is not a decision — so both versions are laid out in full, exactly as
 * the article renders, with the publish control at the top and the bottom so it
 * is there whichever end the reader finishes at.
 */
export default async function AdminBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const [row] = await db
    .select()
    .from(blogPostDrafts)
    .where(eq(blogPostDrafts.id, id))
    .limit(1);

  if (!row) notFound();

  const status = blogStatusMeta[row.status];
  const published = row.status === "published";
  // The public page drops a photograph nobody described rather than ship an
  // unlabelled one; narrowing both here lets this screen say the same thing.
  const hero =
    row.heroImage !== null && row.heroImageAlt !== null
      ? { src: row.heroImage, alt: row.heroImageAlt }
      : null;

  return (
    <AdminShell>
      {/* The way back to the list is the app bar's up arrow — derived from the
          route by the shell, not drawn per page. */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={status.variant}>{status.label}</Badge>
            {row.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            /{row.slug} · {readingMinutes(row.body.pt)} min de leitura
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {published && row.publishedAt
              ? `No site desde ${formatDate(row.publishedAt)} · ${href("pt", "blog", row.slug)}`
              : status.hint}
          </p>
        </div>
        <PublishBlogPostButton id={row.id} published={published} />
      </div>

      {hero ? (
        <div className="relative mb-6 aspect-video overflow-hidden rounded-xl">
          <Image
            src={hero.src}
            alt={t(hero.alt, "pt")}
            fill
            sizes="(max-width: 768px) 100vw, 720px"
            className="object-cover"
          />
        </div>
      ) : row.heroImage ? (
        /* An undescribed photograph is dropped by the public page (WCAG 2.2
           AA — D14), so say here that it will be. */
        <div className="mb-6 rounded-xl border border-accent-foreground/20 bg-accent/50 p-4 text-sm">
          <p className="font-semibold text-accent-foreground">
            A fotografia deste artigo não vai aparecer no site
          </p>
          <p className="text-accent-foreground/80">
            Falta a descrição da imagem, que os leitores que usam leitor de ecrã precisam de
            ouvir. O artigo publica-se na mesma, só sem a fotografia — avise o Jamie para a
            repor.
          </p>
        </div>
      ) : null}

      <div className="mb-8 flex flex-col gap-4">
        {locales.map((locale) => (
          <Preview key={locale} locale={locale} body={row.body[locale]} />
        ))}
      </div>

      <div className="border-t pt-6">
        <h2 className="mb-1 font-heading text-lg font-semibold">Título e resumo</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          O texto do artigo vem escrito e revisto, e não se edita aqui. O que pode corrigir
          é o que atrai o leitor: o título e as duas linhas por baixo dele.
        </p>
        <BlogPostForm
          values={{ id: row.id, title: row.title, excerpt: row.excerpt }}
        />
      </div>
    </AdminShell>
  );
}
