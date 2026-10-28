# Stub: The About page shows Diogo and Rita under "Quem somos"

- lane: tweak
- found-by: PR about-page-hosts-and-cars, question 1, Jamie · 2026-10-28
- complexity: low
- priority: P2
- blocked: the photo of Diogo and Rita. Diogo sends one landscape photo over WhatsApp.

## Problem

`/sobre` has no photo of its hosts. The repo holds no photo of only Diogo and Rita. The ticket
`site-copy-and-photos/about-page-hosts-and-cars` shipped the cars section and left this part out.

## Proposed change

Commit the photo under `web/public/images/`. Add a section "Quem somos" / "Who we are" to `/sobre`:
the photo beside the two paragraphs of `about.body` in `web/src/content/pages.ts`.

## Acceptance criteria

- [ ] `/sobre` shows a hosts section with a photo of Diogo and Rita and a short text, in PT and EN.
- [ ] The hosts text is the two paragraphs of `about.body`, under the heading "Quem somos" / "Who we are".
- [ ] The photo has an alt text in PT and EN.
- [ ] The photo is under 5 MB and no crop goes through a face at 320 px width.
