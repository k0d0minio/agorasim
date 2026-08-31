import { t, type Locale, type Localized } from "@/i18n/config";
import { formatPrice } from "@/lib/money";
import { fromPrice, type AdultTier, type ExperiencePricing } from "@/lib/pricing";

/**
 * Copy for the public price tables — the experience pages and the cards.
 *
 * The numbers are never here. They come from the catalogue's `pricing` (see
 * `lib/pricing.ts`), which is the same data the checkout charges from, so a
 * price the site quotes and a price Stripe takes cannot drift apart. This file
 * is only the words around them.
 *
 * The two modes are named as the booking form names them — "per person" and
 * "per group", not "shared" and "private". Since AGORA-012 nobody is put in a
 * car with strangers, so the difference a guest is choosing between really is
 * how the price is counted, and the page has to say the same thing the form
 * does.
 */
export const pricingContent = {
  heading: { pt: "Preços", en: "Prices" } as Localized,

  /**
   * The answer-first line above the tables — assembled from whichever of these
   * the price list actually has, so it states a real figure rather than a
   * promise about one (GEO).
   */
  leadPerPerson: {
    pt: "Desde {price} por pessoa.",
    en: "From {price} per person.",
  } as Localized,
  leadPerGroup: {
    pt: "Grupo privado desde {price}.",
    en: "Private group from {price}.",
  } as Localized,
  leadChildren: {
    pt: "Crianças dos 4 aos 12 anos desde {price}; bebés com menos de 4 anos não pagam.",
    en: "Children aged 4–12 from {price}; infants under 4 go free.",
  } as Localized,

  perPersonTitle: { pt: "Preço por pessoa", en: "Per person" } as Localized,
  perPersonHint: {
    pt: "Paga-se por pessoa. O carro é sempre só do vosso grupo.",
    en: "Priced per person. The car is still yours alone.",
  } as Localized,
  perGroupTitle: { pt: "Preço por grupo", en: "Per group" } as Localized,
  perGroupHint: {
    pt: "Um valor único para o grupo — e é aqui que os complementos entram.",
    en: "One figure for the whole group — and where the add-ons come in.",
  } as Localized,

  /** Column headings, and the caption a screen reader hears instead of them. */
  columnParty: { pt: "Grupo", en: "Group" } as Localized,
  columnPrice: { pt: "Preço", en: "Price" } as Localized,
  captionPerPerson: {
    pt: "Preços por pessoa de {experience}",
    en: "Per-person prices for {experience}",
  } as Localized,
  captionPerGroup: {
    pt: "Preços por grupo de {experience}",
    en: "Per-group prices for {experience}",
  } as Localized,

  /** Row labels. A tier is matched on adults, so that is what the row says. */
  adultsOne: { pt: "1 adulto", en: "1 adult" } as Localized,
  adultsExactly: { pt: "{n} adultos", en: "{n} adults" } as Localized,
  adultsRange: { pt: "{min}–{max} adultos", en: "{min}–{max} adults" } as Localized,
  childrenRow: { pt: "Crianças (4–12 anos)", en: "Children (aged 4–12)" } as Localized,
  infantsRow: { pt: "Bebés (menos de 4 anos)", en: "Infants (under 4)" } as Localized,
  free: { pt: "Grátis", en: "Free" } as Localized,

  perAdultUnit: { pt: "por adulto", en: "per adult" } as Localized,
  perGroupUnit: { pt: "pelo grupo", en: "for the group" } as Localized,
  perChildUnit: { pt: "por criança", en: "per child" } as Localized,

  /** Óbidos does not run a per-person departure for a single adult. */
  minAdultsNote: {
    pt: "Mínimo {min} adultos por partida.",
    en: "Minimum {min} adults per departure.",
  } as Localized,

  /**
   * The table goes to twelve adults; the checkout stops at the biggest car.
   * Above it the price is still real — it is a phone call rather than a
   * payment until AGORA-019 says who drives the third car.
   */
  bigGroupNote: {
    pt: "Grupos até {max} pessoas reservam online. Acima disso, organizamos consigo —",
    en: "Groups of up to {max} book online. Above that we arrange it with you —",
  } as Localized,
  bigGroupLink: { pt: "fale connosco.", en: "get in touch." } as Localized,

  /** The full group table, folded away on a phone (its summary keeps the range). */
  groupTableSummary: {
    pt: "Ver todos os tamanhos de grupo ({low} a {high})",
    en: "See every group size ({low} to {high})",
  } as Localized,

  addOnsTitle: { pt: "Complementos", en: "Add-ons" } as Localized,
  addOnsHint: {
    pt: "Paragens extra de sabores da região, só em partidas privadas desta rota.",
    en: "Extra stops for regional flavours, on private departures of this route only.",
  } as Localized,
  addOnNoChildPrice: {
    pt: "As crianças não pagam nesta paragem.",
    en: "No charge for children at this stop.",
  } as Localized,
  addOnMinAdults: { pt: "Mínimo {min} adultos.", en: "Minimum {min} adults." } as Localized,
  addOnMinGuests: {
    pt: "Mínimo {min} pessoas à mesa.",
    en: "Minimum {min} at the table.",
  } as Localized,
  addOnClosedMonday: {
    pt: "Encerra à segunda-feira.",
    en: "Closed on Mondays.",
  } as Localized,

  /** On an add-on's own page: what it is, and what it cannot be bought without. */
  addOnGatedNamed: {
    pt: "Vende-se apenas como complemento de uma partida privada da {tour}, nunca à parte.",
    en: "Sold only as an add-on to a private {tour} departure, never on its own.",
  } as Localized,
  addOnGated: {
    pt: "Vende-se apenas como complemento de uma partida privada, nunca à parte.",
    en: "Sold only as an add-on to a private departure, never on its own.",
  } as Localized,

  /** The card line. Honest about which unit the figure is counted in. */
  cardFromPerPerson: { pt: "desde {price} por pessoa", en: "from {price} per person" } as Localized,
  cardFromPerGroup: { pt: "desde {price} por grupo", en: "from {price} per group" } as Localized,
  cardAddOn: { pt: "+{price} por adulto", en: "+{price} per adult" } as Localized,
};

/** `"{min}–{max} adultos"` with the placeholders filled in. */
export function fill(
  template: Localized,
  locale: Locale,
  values: Record<string, string | number>,
): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    t(template, locale),
  );
}

/** How one tier's band of adults reads in a table row. */
export function tierLabel(tier: AdultTier, locale: Locale): string {
  const { minAdults, maxAdults } = tier;
  if (minAdults !== maxAdults) {
    return fill(pricingContent.adultsRange, locale, { min: minAdults, max: maxAdults });
  }
  return minAdults === 1
    ? t(pricingContent.adultsOne, locale)
    : fill(pricingContent.adultsExactly, locale, { n: minAdults });
}

/**
 * The "from" line a card carries, or `null` for an experience with no price
 * list — which is the same silence the checkout falls back to.
 */
export function fromPriceLabel(
  pricing: ExperiencePricing | null | undefined,
  locale: Locale,
): string | null {
  const from = fromPrice(pricing);
  if (!from) return null;
  const price = formatPrice(from.cents, locale);

  // An add-on's figure is not a "from": it is the one price it charges, and it
  // is charged on top of a tour, so it reads as the addition it is.
  if (pricing?.type === "addon") return fill(pricingContent.cardAddOn, locale, { price });

  return fill(
    from.perGroup ? pricingContent.cardFromPerGroup : pricingContent.cardFromPerPerson,
    locale,
    { price },
  );
}
