"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Save } from "lucide-react";
import { updateTourRequest, type TourRequestEditState } from "@/app/admin/actions";
import type { EnquiryKind } from "@/db/schema";
import { ENQUIRY_KINDS, enquiryKindMeta } from "@/lib/admin-format";
import { experienceIcon, type ExperienceIconKey } from "@/lib/experience-icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/** One catalogue entry, reduced to what this form needs to draw a choice. */
export type CatalogueOption = {
  slug: string;
  label: string;
  icon: ExperienceIconKey;
  kind: "signature" | "complement";
  /** Archived entries still appear when the lead already references them. */
  active: boolean;
};

export type LeadValues = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  kind: EnquiryKind;
  experienceSlug: string | null;
  addOns: string[];
  partySize: number | null;
  preferredDate: string | null;
  message: string | null;
  internalNotes: string | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      <Save />
      {pending ? "Saving…" : "Save changes"}
    </Button>
  );
}

/**
 * Editing a lead.
 *
 * Everything the team learns after the form was submitted lands here: the real
 * party size, the date they actually want, the address that was mistyped, and
 * the notes about where the conversation got to. Before this page existed the
 * only editable thing about an enquiry was its status, so those corrections
 * lived in someone's head or in a WhatsApp thread.
 *
 * The message the guest wrote is editable too, which looks odd until you have
 * had to paste in what someone said on the phone. What is *not* editable is the
 * consent record — that has to keep saying what it said at the time.
 */
export function LeadEditForm({
  lead,
  options,
}: {
  lead: LeadValues;
  options: CatalogueOption[];
}) {
  const [state, formAction] = useActionState<TourRequestEditState, FormData>(
    updateTourRequest,
    {},
  );

  const experiences = options.filter(
    (option) => option.active || option.slug === lead.experienceSlug,
  );
  const addOns = options.filter(
    (option) =>
      option.kind === "complement" && (option.active || lead.addOns.includes(option.slug)),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Details</CardTitle>
        <CardDescription>
          Correct what the form got wrong, and keep the team&apos;s notes with the lead
          rather than in a phone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-5" noValidate>
          <input type="hidden" name="id" value={lead.id} />

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={lead.name} required />
              {state.fieldErrors?.name ? (
                <p className="text-sm text-destructive" role="alert">
                  {state.fieldErrors.name}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={lead.email} required />
              {state.fieldErrors?.email ? (
                <p className="text-sm text-destructive" role="alert">
                  {state.fieldErrors.email}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" defaultValue={lead.phone ?? ""} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="kind">Kind</Label>
              <Select id="kind" name="kind" defaultValue={lead.kind}>
                {ENQUIRY_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {enquiryKindMeta[kind].label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="experienceSlug">Experience</Label>
              <Select
                id="experienceSlug"
                name="experienceSlug"
                defaultValue={lead.experienceSlug ?? ""}
              >
                <option value="">Not decided</option>
                {experiences.map((option) => (
                  <option key={option.slug} value={option.slug}>
                    {option.label}
                    {option.active ? "" : " (archived)"}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="partySize">Party size</Label>
              <Input
                id="partySize"
                name="partySize"
                type="number"
                min={1}
                inputMode="numeric"
                defaultValue={lead.partySize ?? ""}
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="preferredDate">Preferred date</Label>
              <Input
                id="preferredDate"
                name="preferredDate"
                defaultValue={lead.preferredDate ?? ""}
                placeholder="15 August, late summer, flexible…"
              />
            </div>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">Add-ons</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {addOns.map((option) => {
                const Icon = experienceIcon(option.icon).icon;
                return (
                  <label
                    key={option.slug}
                    className="flex min-h-11 items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="addOns"
                      value={option.slug}
                      defaultChecked={lead.addOns.includes(option.slug)}
                      className="size-4 rounded border-border accent-primary"
                    />
                    <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    {option.label}
                    {option.active ? null : (
                      <span className="text-xs text-muted-foreground">(archived)</span>
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="message">What they wrote</Label>
            <Textarea id="message" name="message" rows={4} defaultValue={lead.message ?? ""} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="internalNotes">
              Team notes <span className="text-muted-foreground">(never shown to the guest)</span>
            </Label>
            <Textarea
              id="internalNotes"
              name="internalNotes"
              rows={4}
              defaultValue={lead.internalNotes ?? ""}
              placeholder="Which car was promised, what was agreed on the phone, why it went quiet…"
            />
          </div>

          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}
          {state.ok ? (
            <p className="text-sm text-primary" role="status">
              {state.message ?? "Saved."}
            </p>
          ) : null}

          <div>
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
