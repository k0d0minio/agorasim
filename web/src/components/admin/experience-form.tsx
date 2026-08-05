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
  image: "/images/car.jpg",
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
      {pending ? "Saving…" : editing ? "Save experience" : "Add experience"}
    </Button>
  );
}

/**
 * A pair of fields for one bilingual value.
 *
 * Portuguese and English sit side by side rather than behind a language tab,
 * because the rule this catalogue lives by is that both exist. A tab makes the
 * other language something you can forget; two boxes make it something you can
 * see is empty.
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
  const capitalized = `${name[0]?.toUpperCase()}${name.slice(1)}`;

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
              <Label htmlFor={fieldName} className="text-xs text-muted-foreground uppercase">
                {locale}
                <span className="sr-only"> — {capitalized}</span>
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
      <legend className="text-sm font-medium">Icon</legend>
      <p className="text-xs text-muted-foreground">
        How this experience shows up on the Sales board and table.
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
      <legend className="text-sm font-medium">Questions & answers</legend>
      <p className="text-xs text-muted-foreground">
        Answer the questions guests actually ask. Both languages are needed for a question to
        appear on the site.
      </p>

      {rows.map((row, i) => (
        <div key={row.key} className="flex flex-col gap-3 rounded-xl border p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase">
              Question {i + 1}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRows(rows.filter((existing) => existing.key !== row.key))}
              aria-label={`Remove question ${i + 1}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              name="faqQuestionPt"
              defaultValue={row.question.pt}
              placeholder="Pergunta (PT)"
              aria-label={`Question ${i + 1} in Portuguese`}
            />
            <Input
              name="faqQuestionEn"
              defaultValue={row.question.en}
              placeholder="Question (EN)"
              aria-label={`Question ${i + 1} in English`}
            />
            <Textarea
              name="faqAnswerPt"
              rows={3}
              defaultValue={row.answer.pt}
              placeholder="Resposta (PT)"
              aria-label={`Answer ${i + 1} in Portuguese`}
            />
            <Textarea
              name="faqAnswerEn"
              rows={3}
              defaultValue={row.answer.en}
              placeholder="Answer (EN)"
              aria-label={`Answer ${i + 1} in English`}
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
          Add a question
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
export function ExperienceForm({ values }: { values: ExperienceFormValues }) {
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
          <CardTitle>{editing ? "Edit experience" : "New experience"}</CardTitle>
          <CardDescription>
            What guests see on the website, and what the admin draws for it. Portuguese and
            English are both required — the site has no fallback language.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="slug">Web address</Label>
              <Input
                id="slug"
                name="slug"
                defaultValue={values.slug}
                placeholder="rural-saloia"
                required
              />
              <p className="text-xs text-muted-foreground">
                Appears in the page URL and is stored on every enquiry. Changing it breaks
                existing links.
              </p>
              {state.fieldErrors?.slug ? (
                <p className="text-sm text-destructive" role="alert">
                  {state.fieldErrors.slug}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="kind">Type</Label>
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
              <Label htmlFor="sortOrder">Order</Label>
              <Input
                id="sortOrder"
                name="sortOrder"
                type="number"
                defaultValue={values.sortOrder}
              />
              <p className="text-xs text-muted-foreground">
                Lower numbers come first. The list has arrows for this too.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="active">Shown on the website</Label>
              <label className="flex min-h-11 items-center gap-2.5 rounded-lg border px-3 text-sm">
                <input
                  id="active"
                  type="checkbox"
                  name="active"
                  defaultChecked={values.active}
                  className="size-4 rounded border-border accent-primary"
                />
                Guests can see and choose this experience
              </label>
            </div>
          </div>

          <IconPicker defaultValue={values.icon} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Words</CardTitle>
          <CardDescription>
            The summary is the answer-first paragraph search engines and AI assistants quote —
            keep it factual and about 40 words.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <LocalizedField
            name="title"
            label="Name"
            defaultValue={values.title}
            errorPt={state.fieldErrors?.titlePt}
            errorEn={state.fieldErrors?.titleEn}
          />
          <LocalizedField
            name="tagline"
            label="Tagline"
            hint="One line, under the name."
            defaultValue={values.tagline}
            errorPt={state.fieldErrors?.taglinePt}
            errorEn={state.fieldErrors?.taglineEn}
          />
          <LocalizedField
            name="summary"
            label="Summary"
            hint="Answer-first: what this is, where, and how long."
            rows={3}
            defaultValue={values.summary}
            errorPt={state.fieldErrors?.summaryPt}
            errorEn={state.fieldErrors?.summaryEn}
          />
          <LocalizedField
            name="description"
            label="Description"
            hint="The full description. Leave a blank line between paragraphs."
            rows={8}
            defaultValue={values.description}
          />
          <LocalizedField
            name="highlights"
            label="Highlights"
            hint="One per line — these become the bulleted list."
            rows={5}
            defaultValue={values.highlights}
          />
          <LocalizedField
            name="duration"
            label="Duration"
            defaultValue={values.duration}
            placeholder={{ pt: "Aprox. 2h", en: "Approx. 2h" }}
            errorPt={state.fieldErrors?.durationPt}
            errorEn={state.fieldErrors?.durationEn}
          />
          <LocalizedField
            name="imageAlt"
            label="Image description"
            hint="Read aloud by screen readers, and used when the image cannot load."
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

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton editing={editing} />
        <Button type="button" variant="outline" onClick={() => router.push("/admin/experiences")}>
          Back to the catalogue
        </Button>
      </div>
    </form>
  );
}
