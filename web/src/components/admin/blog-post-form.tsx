"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Save } from "lucide-react";

import { saveBlogPost, type BlogPostFormState } from "@/app/admin/blog/actions";
import { FormActionBar } from "@/components/admin/form-action-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** The half of an article this form owns — the shop window, not the prose. */
export type BlogPostFormValues = {
  id: string;
  title: { pt: string; en: string };
  excerpt: { pt: string; en: string };
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      <Save />
      {pending ? "A guardar…" : "Guardar alterações"}
    </Button>
  );
}

/**
 * Both languages side by side, never behind a tab — the same rule, and the same
 * reason, as the catalogue editor: a tab makes the other language something you
 * can forget, two boxes make it something you can see is empty.
 */
function LocalizedField({
  name,
  label,
  hint,
  rows,
  defaultValue,
  errorPt,
  errorEn,
}: {
  /** Base field name — `title` becomes `titlePt` / `titleEn`. */
  name: string;
  label: string;
  hint?: string;
  /** Renders a textarea of this height instead of a single-line input. */
  rows?: number;
  defaultValue: { pt: string; en: string };
  errorPt?: string;
  errorEn?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">{label}</legend>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {(["pt", "en"] as const).map((locale) => {
          const fieldName = `${name}${locale === "pt" ? "Pt" : "En"}`;
          const error = locale === "pt" ? errorPt : errorEn;
          return (
            <div key={locale} className="flex flex-col gap-1.5">
              <Label
                htmlFor={fieldName}
                className="inline-flex w-fit items-center rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >
                {locale}
                <span className="sr-only"> — {label}</span>
              </Label>
              {rows ? (
                <Textarea
                  id={fieldName}
                  name={fieldName}
                  rows={rows}
                  defaultValue={defaultValue[locale]}
                />
              ) : (
                <Input id={fieldName} name={fieldName} defaultValue={defaultValue[locale]} />
              )}
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * Correct the headline and the summary of one article.
 *
 * Deliberately narrow. The body belongs to the pipeline — it is reviewed as
 * markdown and re-loaded from `src/content/generated/blog/`, and anything typed
 * over it here would be lost by the next load without ever saying so. The
 * title and the excerpt are different: they are what a reader sees on the card
 * and what Google quotes, they need fixing the moment somebody spots a typo,
 * and a load restoring them is the correct outcome rather than a surprise.
 */
export function BlogPostForm({ values }: { values: BlogPostFormValues }) {
  const router = useRouter();
  const [state, formAction] = useActionState<BlogPostFormState, FormData>(saveBlogPost, {});

  // The page's own heading and the list behind it both show the title this
  // form just changed, so the route is re-read rather than patched in place.
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="id" value={values.id} />

      <LocalizedField
        name="title"
        label="Título"
        hint="O que aparece no cartão do artigo e nos resultados de pesquisa."
        defaultValue={values.title}
        errorPt={state.fieldErrors?.titlePt}
        errorEn={state.fieldErrors?.titleEn}
      />

      <LocalizedField
        name="excerpt"
        label="Resumo"
        hint="Uma ou duas frases: convence a abrir o artigo, e é o que o Google mostra por baixo do título."
        rows={3}
        defaultValue={values.excerpt}
        errorPt={state.fieldErrors?.excerptPt}
        errorEn={state.fieldErrors?.excerptEn}
      />

      <FormActionBar>
        <SubmitButton />
        {state.error ? (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.ok && state.message ? (
          <p className="text-sm text-muted-foreground" role="status">
            {state.message}
          </p>
        ) : null}
      </FormActionBar>
    </form>
  );
}
