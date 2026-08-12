/**
 * The Agorasim look, in HTML that survives an email client.
 *
 * **Why hand-rolled tables and inline styles.** Mail clients are a decade
 * behind browsers and disagree with each other: Outlook renders through Word,
 * Gmail strips anything it does not recognise, and several clients drop the
 * `<style>` block entirely. Flexbox, grid, custom properties, `oklch()` and
 * external stylesheets — everything `web/src/app/globals.css` is built on — are
 * all off the table. So the design system is re-expressed here in the only
 * subset that renders everywhere: nested tables, `bgcolor`, and styles inlined
 * on every element that needs one. The `<style>` block carries responsive
 * niceties only; the layout is correct without it.
 *
 * **The palette is the site's palette.** The tokens in `globals.css` are
 * authored in oklch for a wide-gamut display; the hex below is each one
 * converted to sRGB. They are duplicated rather than imported because there is
 * no build step that could resolve a CSS custom property into a string at the
 * moment an email is composed — so the comment on each line names its source
 * token, and changing one means changing both.
 *
 * **Escaping is not optional.** Guest names, experience titles and add-on names
 * all come from outside and all land in the middle of markup. Every helper here
 * takes plain text and escapes it; nothing accepts raw HTML from a caller.
 */
import { site } from "@/content/site";

/**
 * `globals.css` `:root`, converted from oklch to sRGB.
 *
 * Contrast against the surfaces they are used on (WCAG 2.1, sRGB): body text
 * 15.0:1, muted text 5.4:1, white-on-green 6.2:1 — all comfortably past AA,
 * which matters more in mail than on the site because a phone reading a
 * confirmation in a car park has no dark-mode escape hatch.
 */
export const emailPalette = {
  /** `--background` — the page behind the card. */
  page: "#fdfaf4",
  /** `--card` */
  card: "#fffdfa",
  /** `--foreground` */
  text: "#2b221a",
  /** `--muted-foreground` */
  textMuted: "#72675c",
  /** `--muted` */
  surfaceMuted: "#f5efe6",
  /** `--border` */
  border: "#e5ddd1",
  /** `--primary` — the countryside green everything green on the site uses. */
  primary: "#3c6642",
  /** A darker step of `--primary`, for the team notification's banner. */
  primaryDark: "#234629",
  /** `--primary-foreground` */
  onPrimary: "#fbf8f0",
  /** `--primary` at `--background` lightness — the tint behind callout panels. */
  primaryTint: "#e3efe4",
  /** `--secondary` — the warm sand the site uses for quiet chips. */
  sand: "#f2e6d4",
  /** `--accent-foreground` */
  onSand: "#452d1c",
} as const;

/**
 * Fraunces first for the two clients that would honour a locally-installed
 * copy, then Georgia — which every desktop and phone has, and which shares
 * Fraunces' high-contrast old-style shape closely enough that the headings
 * still read as the site's headings.
 */
const HEADING_FONT =
  "Fraunces, Georgia, 'Times New Roman', Times, serif";
const BODY_FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** The site's logo, absolute because a mail client has no origin to resolve against. */
const LOGO_URL = `${site.domain}/images/logo.png`;

/** Text → HTML. Applied to every interpolated value, without exception. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** One line of the details table. */
export type DetailRow = {
  label: string;
  value: string;
  /** `tel:`/`mailto:`/`https:` — makes the value tappable on a phone. */
  href?: string;
  /** The total. Bigger, green, and set apart by a heavier rule above it. */
  emphasis?: boolean;
  /** The booking reference. Rendered monospaced, so it can be read aloud. */
  mono?: boolean;
};

/**
 * The facts table — the part of the email a guest actually scans.
 *
 * Two columns on a desktop, stacked on a phone (see the `@media` block in
 * {@link emailDocument}). Labels stay muted and small so the values carry the
 * hierarchy; the total gets its own weight because it is the line people
 * re-read.
 */
export function emailDetails(rows: DetailRow[]): string {
  const cells = rows
    .map((row, index) => {
      const first = index === 0;
      const rule = row.emphasis
        ? `border-top:2px solid ${emailPalette.border};`
        : first
          ? ""
          : `border-top:1px solid ${emailPalette.border};`;
      const padding = row.emphasis ? "14px 0 0" : first ? "0 0 12px" : "12px 0";

      const valueStyle = [
        `font-family:${row.mono ? "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" : BODY_FONT}`,
        `font-size:${row.emphasis ? "20px" : "15px"}`,
        `line-height:${row.emphasis ? "26px" : "22px"}`,
        `font-weight:${row.emphasis ? "700" : "600"}`,
        `color:${row.emphasis ? emailPalette.primary : emailPalette.text}`,
        row.mono ? "letter-spacing:0.06em" : "",
      ]
        .filter(Boolean)
        .join(";");

      const value = escapeHtml(row.value);
      const rendered = row.href
        ? `<a href="${escapeHtml(row.href)}" style="${valueStyle};text-decoration:none">${value}</a>`
        : value;

      return `<tr>
              <td class="stack" style="${rule}padding:${padding};font-family:${BODY_FONT};font-size:12px;line-height:20px;letter-spacing:0.08em;text-transform:uppercase;color:${emailPalette.textMuted};" width="42%" valign="top">${escapeHtml(row.label)}</td>
              <td class="stack stack-value" style="${rule}padding:${padding};${valueStyle};text-align:right;" valign="top">${rendered}</td>
            </tr>`;
    })
    .join("");

  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:collapse;">${cells}</table>`;
}

/** A heading inside the card. Serif, because that is what the site's headings are. */
export function emailHeading(text: string): string {
  return `<h1 style="margin:0 0 8px;font-family:${HEADING_FONT};font-size:26px;line-height:34px;font-weight:600;letter-spacing:-0.01em;color:${emailPalette.text};">${escapeHtml(text)}</h1>`;
}

/** A small all-caps rubric above a block — the site's section eyebrow. */
export function emailEyebrow(text: string): string {
  return `<p style="margin:0 0 10px;font-family:${BODY_FONT};font-size:11px;line-height:16px;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;color:${emailPalette.textMuted};">${escapeHtml(text)}</p>`;
}

/** Body copy. Blank lines in `text` become paragraph breaks. */
export function emailParagraph(
  text: string,
  options: { muted?: boolean; spaceBelow?: number } = {},
): string {
  const color = options.muted ? emailPalette.textMuted : emailPalette.text;
  const margin = options.spaceBelow ?? 16;
  return text
    .split(/\n{2,}/)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 ${margin}px;font-family:${BODY_FONT};font-size:16px;line-height:26px;color:${color};">${escapeHtml(
          paragraph,
        ).replace(/\n/g, "<br />")}</p>`,
    )
    .join("");
}

/**
 * The tinted callout — "what happens next", and the guest's own copy of it.
 *
 * A left rule rather than a full border: it reads as an aside at a glance,
 * and a 4px table cell is one of the few decorations Outlook renders faithfully.
 */
export function emailNote(options: { title: string; body: string }): string {
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:separate;background-color:${emailPalette.primaryTint};border-radius:10px;">
        <tr>
          <td width="4" bgcolor="${emailPalette.primary}" style="width:4px;background-color:${emailPalette.primary};border-radius:10px 0 0 10px;">&nbsp;</td>
          <td style="padding:16px 20px;">
            <p style="margin:0 0 6px;font-family:${BODY_FONT};font-size:13px;line-height:18px;letter-spacing:0.06em;text-transform:uppercase;font-weight:700;color:${emailPalette.primary};">${escapeHtml(options.title)}</p>
            <p style="margin:0;font-family:${BODY_FONT};font-size:15px;line-height:24px;color:${emailPalette.text};">${escapeHtml(options.body).replace(/\n/g, "<br />")}</p>
          </td>
        </tr>
      </table>`;
}

/**
 * A call to action, built the bulletproof way — a table cell with a background
 * and padding, rather than a styled `<a>`, because Outlook ignores padding on
 * inline elements and would render a bare blue link instead of a button.
 */
export function emailButton(options: { label: string; href: string }): string {
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse:separate;">
        <tr>
          <td bgcolor="${emailPalette.primary}" style="background-color:${emailPalette.primary};border-radius:8px;">
            <a href="${escapeHtml(options.href)}" style="display:inline-block;padding:13px 26px;font-family:${BODY_FONT};font-size:15px;line-height:20px;font-weight:600;color:${emailPalette.onPrimary};text-decoration:none;">${escapeHtml(options.label)}</a>
          </td>
        </tr>
      </table>`;
}

/** A contact — name, and a number that dials when it is tapped. */
export type ContactLine = { name: string; display: string; href: string };

/** The two phone numbers, as sand-coloured chips. */
export function emailContacts(contacts: ContactLine[]): string {
  const cells = contacts
    .map(
      (contact) => `<td class="stack" style="padding:0 8px 8px 0;" valign="top">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse:separate;background-color:${emailPalette.sand};border-radius:8px;">
              <tr><td style="padding:10px 16px;font-family:${BODY_FONT};font-size:15px;line-height:22px;color:${emailPalette.onSand};">
                <strong style="font-weight:600;">${escapeHtml(contact.name)}</strong>&nbsp;
                <a href="${escapeHtml(contact.href)}" style="color:${emailPalette.onSand};text-decoration:none;white-space:nowrap;">${escapeHtml(contact.display)}</a>
              </td></tr>
            </table>
          </td>`,
    )
    .join("");

  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>${cells}</tr></table>`;
}

/** A hairline between blocks inside the card. */
export function emailDivider(): string {
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:collapse;"><tr><td height="1" style="height:1px;line-height:1px;font-size:0;background-color:${emailPalette.border};">&nbsp;</td></tr></table>`;
}

/** Vertical space, in a way every client honours. */
export function emailSpacer(height: number): string {
  return `<div style="line-height:${height}px;font-size:${height}px;height:${height}px;">&nbsp;</div>`;
}

/**
 * The shell: logo, card, footer.
 *
 * @param lang  The `lang` attribute — screen readers and Gmail's translate
 *              prompt both use it, so a Portuguese confirmation must not claim
 *              to be English.
 * @param preheader The grey line a phone shows next to the subject. Hidden in
 *              the body itself; without it clients quote the first visible
 *              words, which would be the logo's alt text.
 * @param banner Optional coloured strip across the top of the card.
 * @param content Already-escaped HTML from the helpers above.
 * @param footer One `<p>` per entry. These are the only strings the shell does
 *              not escape for you — a footer line usually has a link in it —
 *              so anything interpolated into one must be escaped by the caller.
 */
export function emailDocument(options: {
  lang: string;
  title: string;
  preheader: string;
  banner?: { text: string; background?: string };
  content: string;
  footer: string[];
}): string {
  const bannerBackground = options.banner?.background ?? emailPalette.primary;
  const banner = options.banner
    ? `<tr>
              <td bgcolor="${bannerBackground}" style="background-color:${bannerBackground};padding:14px 32px;font-family:${BODY_FONT};font-size:12px;line-height:18px;letter-spacing:0.14em;text-transform:uppercase;font-weight:700;color:${emailPalette.onPrimary};border-radius:14px 14px 0 0;">${escapeHtml(options.banner.text)}</td>
            </tr>`
    : "";

  const footer = options.footer
    .map(
      (line) =>
        `<p style="margin:0 0 6px;font-family:${BODY_FONT};font-size:13px;line-height:20px;color:${emailPalette.textMuted};">${line}</p>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="${escapeHtml(options.lang)}" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="x-ua-compatible" content="ie=edge" />
<!-- The palette is warm and light by design; letting a client auto-invert it
     turns the sand and the green into mud. -->
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${escapeHtml(options.title)}</title>
<style>
  :root { color-scheme: light; supported-color-schemes: light; }
  body { margin:0; padding:0; width:100% !important; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table { border-spacing:0; mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
  a { color:${emailPalette.primary}; }
  /* Layout is correct without this block — it only tightens the phone case. */
  @media only screen and (max-width:600px) {
    .shell { width:100% !important; }
    .pad { padding-left:20px !important; padding-right:20px !important; }
    .stack { display:block !important; width:100% !important; text-align:left !important; }
    .stack-value { padding-top:2px !important; border-top:0 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${emailPalette.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(options.preheader)}</div>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:collapse;background-color:${emailPalette.page};">
  <tr>
    <td align="center" style="padding:32px 16px 40px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" class="shell" style="width:600px;max-width:600px;border-collapse:collapse;">

        <!-- Masthead -->
        <tr>
          <td align="center" style="padding:0 0 24px;">
            <img src="${LOGO_URL}" width="56" height="56" alt="${escapeHtml(site.name)}" style="display:block;width:56px;height:56px;margin:0 auto 10px;" />
            <div style="font-family:${HEADING_FONT};font-size:26px;line-height:32px;font-weight:600;letter-spacing:-0.01em;color:${emailPalette.primary};">${escapeHtml(site.name)}</div>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:separate;background-color:${emailPalette.card};border:1px solid ${emailPalette.border};border-radius:14px;">
              ${banner}
              <tr>
                <td class="pad" style="padding:28px 32px 32px;">${options.content}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding:24px 12px 0;">${footer}</td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
