"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Plus, Save, Trash2 } from "lucide-react";
import {
  saveExperience,
  type ExperienceFormState,
} from "@/app/admin/experiences/actions";
import { EXPERIENCE_KINDS, experienceKindMeta } from "@/lib/admin-format";
import {
  EXPERIENCE_ICON_KEYS,
  EXPERIENCE_ICONS,
  type ExperienceIconKey,
} from "@/lib/experience-icons";
import { cn } from "@/lib/utils";
import { ExperienceImageField } from "@/components/admin/experience-image-field";
import { FormActionBar } from "@/components/admin/form-action-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/** A catalogue entry as this form edits it — flat, and already stringified. */
export type ExperienceFormValues = {
  id?: string;
  slug: string;
  kind: "signature" | "complement";
  icon: ExperienceIconKey;
  image: string;
  /** Price per person, in euros, as typed. `""` means no price is set. */
  price: string;
  active: boolean;
  sortOrder: number;
  title: { pt: string; en: string };
  tagline: { pt: string; en: string };
  summary: { pt: string; en: string };
  duration: { pt: string; en: string };
  imageAlt: { pt: string; en: string };
  /** Paragraphs, joined by blank lines — how the textarea shows them. */
  description: { pt: string; en: string };
  /** One highlight per line. */
  highlights: { pt: string; en: string };
  faqs: { question: { pt: string; en: string }; answer: { pt: string; en: string } }[];
};

/** What a brand-new entry starts as. */
export const EMPTY_EXPERIENCE: ExperienceFormValues = {
  slug: "",
  kind: "complement",
  icon: "sparkles",
  image: "/images/fleet/citroen-2cv-agorasim-door-detail.jpg",
  price: "",
  active: true,
  sortOrder: 0,
  title: { pt: "", en: "" },
  tagline: { pt: "", en: "" },
  summary: { pt: "", en: "" },
  duration: { pt: "", en: "" },
  imageAlt: { pt: "", en: "" },
  description: { pt: "", en: "" },
  highlights: { pt: "", en: "" },
  faqs: [],
};

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      <Save />
      {pending ? "A guardar…" : editing ? "Guardar experiência" : "Adicionar experiência"}
    </Button>
  );
}

/**
 * A pair of fields for one bilingual value.
 *
 * Portuguese and English sit side by side rather than behind a language tab,
 * because the rule this catalogue lives by is that both exist. A tab makes the
 * other language something you can forget; two boxes make it something you can
 * see is empty. On a phone the pair stacks, PT above EN, each wearing a small
 * language chip — same rule, one column (spec §8 E5).
 */
function LocalizedField({
  name,
  label,
  hint,
  rows,
  defaultValue,
  errorPt,
  errorEn,
  placeholder,
}: {
  /** Base field name — `title` becomes `titlePt` / `titleEn`. */
  name: string;
  label: string;
  hint?: string;
  /** Renders a textarea of this height instead of an input. */
  rows?: number;
  defaultValue: { pt: string; en: string };
  errorPt?: string;
  errorEn?: string;
  placeholder?: { pt: string; en: string };
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
                  placeholder={placeholder?.[locale]}
                />
              ) : (
                <Input
                  id={fieldName}
                  name={fieldName}
                  defaultValue={defaultValue[locale]}
                  placeholder={placeholder?.[locale]}
                />
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

/** The icon this entry wears in every admin list, chosen from a fixed set. */
function IconPicker({ defaultValue }: { defaultValue: ExperienceIconKey }) {
  const [chosen, setChosen] = useState<ExperienceIconKey>(defaultValue);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">Ícone</legend>
      <p className="text-xs text-muted-foreground">
        Como esta experiência aparece no quadro de Vendas.
      </p>
      <div className="flex flex-wrap gap-2">
        {EXPERIENCE_ICON_KEYS.map((key) => {
          const { icon: Icon, label } = EXPERIENCE_ICONS[key];
          const active = chosen === key;
          return (
            <label
              key={key}
              title={label}
              className={cn(
                "flex size-11 cursor-pointer items-center justify-center rounded-lg border transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <input
                type="radio"
                name="icon"
                value={key}
                checked={active}
                onChange={() => setChosen(key)}
                className="sr-only"
              />
              <Icon className="size-5" />
              <span className="sr-only">{label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

type FaqDraft = ExperienceFormValues["faqs"][number];

/**
 * Rows carry a key of their own rather than being keyed by index: removing the
 * second of three rows with index keys leaves React reusing the removed row's
 * DOM node — and its typed-in text — for the row that shifted up.
 */
type KeyedFaq = FaqDraft & { key: string };

/**
 * The FAQ list.
 *
 * These are not decoration: they are what the page's FAQ JSON-LD is built from,
 * which is how this business turns up in an AI answer about tours near Sintra.
 * A row only counts when all four boxes are filled — the schema drops the rest —
 * so a half-written question can be left in place without publishing it.
 */
function FaqEditor({ defaultValue }: { defaultValue: FaqDraft[] }) {
  const prefix = useId();
  const [nextKey, setNextKey] = useState(defaultValue.length);
  const [rows, setRows] = useState<KeyedFaq[]>(
    defaultValue.map((faq, i) => ({ ...faq, key: `${prefix}-${i}` })),
  );

  function addRow() {
    setRows([...rows, { question: { pt: "", en: "" }, answer: { pt: "", en: "" }, key: `${prefix}-${nextKey}` }]);
    setNextKey(nextKey + 1);
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-medium">Perguntas e respostas</legend>
      <p className="text-xs text-muted-foreground">
        Responda às perguntas que os clientes fazem mesmo. Uma pergunta só aparece no site
        com as duas línguas preenchidas.
      </p>

      {rows.map((row, i) => (
        <div key={row.key} className="flex flex-col gap-3 rounded-xl border p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase">
              Pergunta {i + 1}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setRows(rows.filter((existing) => existing.key !== row.key))}
              aria-label={`Remover pergunta ${i + 1}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              name="faqQuestionPt"
              defaultValue={row.question.pt}
              placeholder="Pergunta (PT)"
              aria-label={`Pergunta ${i + 1} em português`}
            />
            <Input
              name="faqQuestionEn"
              defaultValue={row.question.en}
              placeholder="Question (EN)"
              aria-label={`Pergunta ${i + 1} em inglês`}
            />
            <Textarea
              name="faqAnswerPt"
              rows={3}
              defaultValue={row.answer.pt}
              placeholder="Resposta (PT)"
              aria-label={`Resposta ${i + 1} em português`}
            />
            <Textarea
              name="faqAnswerEn"
              rows={3}
              defaultValue={row.answer.en}
              placeholder="Answer (EN)"
              aria-label={`Resposta ${i + 1} em inglês`}
            />
          </div>
        </div>
      ))}

      <div>
        <Button
          type="button"
          variant="outline"
          onClick={addRow}
        >
          <Plus className="size-4" />
          Adicionar uma pergunta
        </Button>
      </div>
    </fieldset>
  );
}

/**
 * The catalogue editor — one experience, every field the website renders.
 *
 * Create and edit are the same form, because they are the same thing with and
 * without an id. On a successful create it navigates to the list, where the new
 * entry is visible in place; on an edit it stays put and says so.
 */
export function ExperienceForm({
  values,
  pricingSummary,
}: {
  values: ExperienceFormValues;
  /** The entry's price list in one sentence, formatted server-side. */
  pricingSummary?: string | null;
}) {
  const router = useRouter();
  const editing = Boolean(values.id);
  const [state, formAction] = useActionState<ExperienceFormState, FormData>(
    saveExperience,
    {},
  );

  // A created entry belongs in the list, next to its neighbours. Editing stays
  // put — the operator usually has another field to fix.
  useEffect(() => {
    if (state.ok && !editing) router.replace("/admin/experiences");
  }, [state.ok, editing, router]);

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Editar experiência" : "Nova experiência"}</CardTitle>
          <CardDescription>
            O que os clientes veem no site e o que o painel desenha para esta entrada.
            Português e inglês são ambos obrigatórios — o site não tem língua de recurso.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="slug">Endereço no site</Label>
              {/* A slug typed on a phone fights autocapitalise and autocorrect
                  — both off, it is an identifier, not prose. */}
              <Input
                id="slug"
                name="slug"
                defaultValue={values.slug}
                placeholder="rural-saloia"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
              />
              <p className="text-xs text-muted-foreground">
                Aparece no endereço da página e fica guardado em todos os pedidos. Se
                mudar, os links antigos deixam de funcionar.
              </p>
              {state.fieldErrors?.slug ? (
                <p className="text-sm text-destructive" role="alert">
                  {state.fieldErrors.slug}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="kind">Tipo</Label>
              <Select id="kind" name="kind" defaultValue={values.kind}>
                {EXPERIENCE_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {experienceKindMeta[kind].label}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">
                {experienceKindMeta[values.kind].hint}
              </p>
            </div>

            <ExperienceImageField
              defaultValue={values.image}
              error={state.fieldErrors?.image}
            />

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Preços</span>
              <p className="rounded-lg border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                {pricingSummary ??
                  "Ainda sem tabela de preços — esta entrada não pode ser reservada e paga online; os clientes recebem o formulário de pedido."}
              </p>
              <p className="text-xs text-muted-foreground">
                A tabela de preços (partilhado/privado, crianças, mínimos) é gerida com o
                Jamie para já — mudar um preço é só mandar mensagem. Um editor está
                previsto.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sortOrder">Ordem</Label>
              <Input
                id="sortOrder"
                name="sortOrder"
                type="number"
                inputMode="numeric"
                defaultValue={values.sortOrder}
              />
              <p className="text-xs text-muted-foreground">
                Números mais baixos aparecem primeiro. A lista também tem setas para isto.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="active">Visível no site</Label>
              <label className="flex min-h-11 items-center gap-2.5 rounded-lg border px-3 text-sm">
                <input
                  id="active"
                  type="checkbox"
                  name="active"
                  defaultChecked={values.active}
                  className="size-4 rounded border-border accent-primary"
                />
                Os clientes podem ver e escolher esta experiência
              </label>
            </div>
          </div>

          <IconPicker defaultValue={values.icon} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Texto</CardTitle>
          <CardDescription>
            O resumo é o parágrafo que os motores de busca e os assistentes de IA citam —
            factual e à volta de 40 palavras.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <LocalizedField
            name="title"
            label="Nome"
            defaultValue={values.title}
            errorPt={state.fieldErrors?.titlePt}
            errorEn={state.fieldErrors?.titleEn}
          />
          <LocalizedField
            name="tagline"
            label="Frase de apresentação"
            hint="Uma linha, por baixo do nome."
            defaultValue={values.tagline}
            errorPt={state.fieldErrors?.taglinePt}
            errorEn={state.fieldErrors?.taglineEn}
          />
          <LocalizedField
            name="summary"
            label="Resumo"
            hint="Direto ao assunto: o que é, onde e quanto tempo."
            rows={3}
            defaultValue={values.summary}
            errorPt={state.fieldErrors?.summaryPt}
            errorEn={state.fieldErrors?.summaryEn}
          />
          <LocalizedField
            name="description"
            label="Descrição"
            hint="A descrição completa. Deixe uma linha em branco entre parágrafos."
            rows={8}
            defaultValue={values.description}
          />
          <LocalizedField
            name="highlights"
            label="Destaques"
            hint="Um por linha — dão origem à lista de pontos."
            rows={5}
            defaultValue={values.highlights}
          />
          <LocalizedField
            name="duration"
            label="Duração"
            defaultValue={values.duration}
            placeholder={{ pt: "Aprox. 2h", en: "Approx. 2h" }}
            errorPt={state.fieldErrors?.durationPt}
            errorEn={state.fieldErrors?.durationEn}
          />
          <LocalizedField
            name="imageAlt"
            label="Descrição da imagem"
            hint="Lida em voz alta pelos leitores de ecrã e usada quando a imagem não carrega."
            defaultValue={values.imageAlt}
            errorPt={state.fieldErrors?.imageAltPt}
            errorEn={state.fieldErrors?.imageAltEn}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <FaqEditor defaultValue={values.faqs} />
        </CardContent>
      </Card>

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="text-sm text-primary" role="status">
          {state.message}
        </p>
      ) : null}

      <FormActionBar>
        <SubmitButton editing={editing} />
        <Button type="button" variant="outline" onClick={() => router.push("/admin/experiences")}>
          Voltar ao catálogo
        </Button>
      </FormActionBar>
    </form>
  );
}
