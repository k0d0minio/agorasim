import Link from "next/link";

import { t, type Locale } from "@/i18n/config";
import type { Experience } from "@/content/experiences";
import { fill, pricingContent as copy, tierLabel } from "@/content/pricing";
import { MAX_PARTY_ONLINE } from "@/lib/fleet";
import { formatPrice } from "@/lib/money";
import { maxAdultsOf, type AddOnPricing, type TourModePricing } from "@/lib/pricing";
import { href } from "@/lib/routes";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * The price list, on the page — the whole of what a guest would otherwise only
 * learn by starting a checkout.
 *
 * Everything here is read from the catalogue entry's `pricing`, the same data
 * `priceBooking` charges from, so the tables cannot quote a figure the checkout
 * would not take. An entry with no price list renders nothing at all: that is
 * the same silence the booking flow falls back to, where the enquiry form takes
 * over, and a pricing section that said "price on request" would be inventing a
 * commercial fact.
 *
 * **The rows are bands of adults, not of "pax".** The engine matches tiers on
 * adults (children have their own rate), and the sheet Diogo & Rita wrote says
 * "PAX" — whether that counts children is an open question with the client
 * (`.icm/intake/booking-live/pax-tier-semantics.md`). Until it is answered the
 * page says what the checkout actually does, because a table that promised
 * otherwise would be quoting a price nobody would be charged.
 */
export function ExperiencePrices({
  experience,
  addOns,
  signatureTitle,
  locale,
}: {
  experience: Experience;
  /** The add-on entries, for a tour whose private departures take them. */
  addOns?: Experience[];
  /** The tour an add-on belongs to, named on the add-on's own page. */
  signatureTitle?: string;
  locale: Locale;
}) {
  const pricing = experience.pricing;
  if (!pricing) return null;

  const name = t(experience.title, locale);

  return (
    <section aria-labelledby="precos">
      <h2 id="precos" className="text-2xl font-semibold sm:text-3xl">
        {t(copy.heading, locale)}
      </h2>

      {pricing.type === "addon" ? (
        <AddOnPrice pricing={pricing} signatureTitle={signatureTitle} locale={locale} />
      ) : (
        <>
          {/* Answer-first, before any table: the figures a guest came for. */}
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            {leadFor(experience, locale)}
          </p>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {pricing.public ? (
              <ModePricing
                mode={pricing.public}
                title={t(copy.perPersonTitle, locale)}
                hint={t(copy.perPersonHint, locale)}
                caption={fill(copy.captionPerPerson, locale, { experience: name })}
                locale={locale}
              />
            ) : null}
            {pricing.private ? (
              <ModePricing
                mode={pricing.private}
                title={t(copy.perGroupTitle, locale)}
                hint={t(copy.perGroupHint, locale)}
                caption={fill(copy.captionPerGroup, locale, { experience: name })}
                locale={locale}
              />
            ) : null}
          </div>

          {/* The table sells twelve adults; the biggest car seats eight. */}
          {maxAdultsOf(pricing) > MAX_PARTY_ONLINE ? (
            <p className="mt-4 text-sm text-muted-foreground">
              {fill(copy.bigGroupNote, locale, { max: MAX_PARTY_ONLINE })}{" "}
              <Link href={href(locale, "contactos")} className="underline hover:text-primary">
                {t(copy.bigGroupLink, locale)}
              </Link>
            </p>
          ) : null}

          {pricing.private?.allowsAddOns && addOns && addOns.length > 0 ? (
            <AddOnList addOns={addOns} locale={locale} />
          ) : null}
        </>
      )}
    </section>
  );
}

/**
 * The sentence above the tables, assembled from whichever figures the price
 * list actually has — so it states the real cheapest way in rather than a
 * promise about one.
 */
function leadFor(experience: Experience, locale: Locale): string {
  const pricing = experience.pricing;
  if (!pricing || pricing.type !== "tour") return "";

  const perAdult: number[] = [];
  const perGroup: number[] = [];
  const childRates: number[] = [];
  for (const mode of [pricing.public, pricing.private]) {
    if (!mode) continue;
    childRates.push(mode.childCents);
    for (const tier of mode.tiers) {
      if (typeof tier.perAdultCents === "number") perAdult.push(tier.perAdultCents);
      if (typeof tier.groupCents === "number") perGroup.push(tier.groupCents);
    }
  }

  const sentences: string[] = [];
  if (perAdult.length > 0) {
    sentences.push(
      fill(copy.leadPerPerson, locale, {
        price: formatPrice(Math.min(...perAdult), locale),
      }),
    );
  }
  if (perGroup.length > 0) {
    sentences.push(
      fill(copy.leadPerGroup, locale, { price: formatPrice(Math.min(...perGroup), locale) }),
    );
  }
  if (childRates.length > 0) {
    sentences.push(
      fill(copy.leadChildren, locale, {
        price: formatPrice(Math.min(...childRates), locale),
      }),
    );
  }
  return sentences.join(" ");
}

/** One mode's table: its tiers, then the two age bands that apply to all of them. */
function ModePricing({
  mode,
  title,
  hint,
  caption,
  locale,
}: {
  mode: TourModePricing;
  title: string;
  hint: string;
  caption: string;
  locale: Locale;
}) {
  const groupFigures = mode.tiers
    .map((tier) => tier.groupCents ?? tier.perAdultCents ?? 0)
    .filter((cents) => cents > 0);

  const table = (
    <Table>
      <TableCaption>{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="px-0 py-2">{t(copy.columnParty, locale)}</TableHead>
          <TableHead className="px-0 py-2 text-right">{t(copy.columnPrice, locale)}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {mode.tiers.map((tier) => (
          <PriceRow
            key={`${tier.minAdults}-${tier.maxAdults}`}
            label={tierLabel(tier, locale)}
            cents={tier.groupCents ?? tier.perAdultCents ?? 0}
            unit={t(
              typeof tier.groupCents === "number" ? copy.perGroupUnit : copy.perAdultUnit,
              locale,
            )}
            locale={locale}
          />
        ))}
        <PriceRow
          label={t(copy.childrenRow, locale)}
          cents={mode.childCents}
          unit={t(copy.perChildUnit, locale)}
          locale={locale}
        />
        <PriceRow
          label={t(copy.infantsRow, locale)}
          free={t(copy.free, locale)}
          locale={locale}
        />
      </TableBody>
    </Table>
  );

  return (
    <Card className="px-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      </div>

      {/*
        Twelve group sizes is a wall on a 390px screen, so a table that long
        folds into its own summary — which carries the range, so the collapsed
        state still answers "how much". Short tables stay open: a fold over
        two rows hides more than it saves.
      */}
      {mode.tiers.length > 4 && groupFigures.length > 0 ? (
        <details>
          {/* No `display` utility on the summary: setting one drops the
              disclosure marker in WebKit, and the marker is the affordance. */}
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-primary hover:underline">
            {fill(copy.groupTableSummary, locale, {
              low: formatPrice(Math.min(...groupFigures), locale),
              high: formatPrice(Math.max(...groupFigures), locale),
            })}
          </summary>
          {table}
        </details>
      ) : (
        table
      )}

      {mode.minAdults ? (
        <p className="text-sm text-muted-foreground">
          {fill(copy.minAdultsNote, locale, { min: mode.minAdults })}
        </p>
      ) : null}
    </Card>
  );
}

/** One row: what the band is, and what it costs — or that it costs nothing. */
function PriceRow({
  label,
  cents,
  unit,
  free,
  locale,
}: {
  label: string;
  cents?: number;
  unit?: string;
  free?: string;
  locale: Locale;
}) {
  return (
    <TableRow>
      <TableCell className="px-0 py-2.5">{label}</TableCell>
      <TableCell className="px-0 py-2.5 text-right">
        <span className="font-medium tabular-nums">
          {free ?? formatPrice(cents ?? 0, locale)}
        </span>
        {unit ? (
          <span className="block text-xs text-muted-foreground sm:ml-1.5 sm:inline">
            {unit}
          </span>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

/** The partner stops, on the tour page that can actually take them. */
function AddOnList({ addOns, locale }: { addOns: Experience[]; locale: Locale }) {
  const priced = addOns.flatMap((entry) =>
    entry.pricing?.type === "addon" ? [{ entry, pricing: entry.pricing }] : [],
  );
  if (priced.length === 0) return null;

  return (
    <div className="mt-10">
      <h3 className="text-lg font-semibold text-foreground">{t(copy.addOnsTitle, locale)}</h3>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        {t(copy.addOnsHint, locale)}
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {priced.map(({ entry, pricing }) => (
          <li key={entry.slug}>
            <Card size="sm" className="h-full px-4">
              <div>
                <h4 className="font-medium">
                  <Link
                    href={href(locale, "experiencias", entry.slug)}
                    className="hover:text-primary"
                  >
                    {t(entry.title, locale)}
                  </Link>
                </h4>
                <p className="mt-1 font-medium tabular-nums">
                  +{formatPrice(pricing.perAdultCents, locale)}{" "}
                  <span className="font-normal text-muted-foreground">
                    {t(copy.perAdultUnit, locale)}
                  </span>
                </p>
              </div>
              <AddOnNotes pricing={pricing} locale={locale} />
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The child rate and the partner's own conditions, in words.
 *
 * A stop with no child price is not a stop children are barred from — they come
 * along, nothing is charged for them, and the sentence says so rather than
 * leaving a blank a parent has to interpret.
 */
function AddOnNotes({ pricing, locale }: { pricing: AddOnPricing; locale: Locale }) {
  const notes: string[] = [];
  if (pricing.minAdults) {
    notes.push(fill(copy.addOnMinAdults, locale, { min: pricing.minAdults }));
  }
  if (pricing.minGuests) {
    notes.push(fill(copy.addOnMinGuests, locale, { min: pricing.minGuests }));
  }
  if (pricing.closedWeekdays?.includes(0)) {
    notes.push(t(copy.addOnClosedMonday, locale));
  }

  return (
    <ul className="space-y-1 text-sm text-muted-foreground">
      <li>
        {typeof pricing.childCents === "number"
          ? `${t(copy.childrenRow, locale)}: ${formatPrice(pricing.childCents, locale)} ${t(
              copy.perChildUnit,
              locale,
            )}`
          : t(copy.addOnNoChildPrice, locale)}
      </li>
      {notes.map((note) => (
        <li key={note}>{note}</li>
      ))}
    </ul>
  );
}

/** An add-on's own page: its one price, and what it cannot be bought without. */
function AddOnPrice({
  pricing,
  signatureTitle,
  locale,
}: {
  pricing: AddOnPricing;
  signatureTitle?: string;
  locale: Locale;
}) {
  return (
    <Card className="mt-4 max-w-md px-4">
      <p className="text-2xl font-semibold tabular-nums">
        +{formatPrice(pricing.perAdultCents, locale)}{" "}
        <span className="text-base font-normal text-muted-foreground">
          {t(copy.perAdultUnit, locale)}
        </span>
      </p>
      <AddOnNotes pricing={pricing} locale={locale} />
      <p className="text-sm text-muted-foreground">
        {signatureTitle
          ? fill(copy.addOnGatedNamed, locale, { tour: signatureTitle })
          : t(copy.addOnGated, locale)}
      </p>
    </Card>
  );
}
