# Stub: Sandbox end-to-end pass, then the link goes to Diogo & Rita

- feature-slug: sandbox-e2e-handover
- epic: booking-live
- priority: P1
- size: S
- depends-on: checkout-ux-fixes
- sequence: 7 of 8
- status: **verified — open only on Jamie's tick** (see Verification log)
- sources: deal objective 2026-08-27 (DEAL.md, icm-board `workspaces/deals/diogo-rita/`); prices.pdf; info PDF §1.4–1.5

## Problem

The rescoped objective is a first working version for the client's testing at
agorasim.jamienisbet.com: sandbox payments, booking end-to-end. Once the preceding
stubs land, nothing verifies the whole against the source documents before the link
goes out.

## Proposed change

A verification pass on the deployed preview: every price scenario from prices.pdf
priced correctly at checkout (public/private, children, infants, each add-on with its
minimum and the Manzwine Monday closure); availability honours the driver/vehicle
pools; a sandbox card completes payment; the confirmation page and both emails render
with the right meeting point; the enquiry fallback still works with Stripe env unset.
Fix what fails, then draft the WhatsApp handover message for Jamie to send with the
test link and a sandbox card number. **Sending is Jamie's** — the session only drafts.

## Acceptance criteria (rough)

- [x] Priced checkout matches prices.pdf for a written matrix of scenarios
- [x] Sandbox payment → confirmed booking → both emails, verified on the deployment
- [x] Handover message drafted (below)
- [ ] **Jamie sent it** — his tick, and the only thing this stub is still waiting on

## Verification log

**Why this stub outlived its own pass.** The 2026-08-31 pass ran and passed, but its
evidence lived only in a merged PR body and its handover draft only in a chat
transcript. Nothing in `.icm/intake/` recorded either, so the stub read as untouched
work rather than as finished work waiting on a human. This section is that record.

### 2026-08-31 · first pass (PR #49)

30/30 priced scenarios and 11/11 guardrails against prices.pdf; a sandbox payment
completed at **€905** (private Rural Saloia, 4 adults + 1 child + 2 infants, all three
add-ons); both emails delivered. Found and fixed: the confirmation page never said
where or when, and the guest's `BK-…` reference appeared nowhere in the admin. Cut
`.icm/intake/triage/enquiry-fallback-unverified.md` for the Stripe-unset fallback,
which cannot be exercised on a deployment that has the sandbox key set.

### 2026-08-31 · re-verification on today's main (this pass)

Five PRs (#50–#54) landed after that payment, two of them on post-payment surfaces
(#49's own confirmation-page and admin changes, #52's Portuguese Sales board), so the
pass was re-run against the current deployment.

- **Pricing — 52/52.** The pricing payload was read back out of the deployed
  `/pt/reservar` flight response (i.e. the live Neon catalogue, not the repo's
  build-time fallback), parsed through the engine's own `parseExperiencePricing`, and
  priced by `priceBooking` across both tours, both modes, every private countryside
  tier to the online cap of 8, children, infants, each add-on alone and combined, and
  every guardrail — Manzwine min 2 and its Monday closure, Ramilo min 3, Galapito's
  min 2 *at the table* (which 1 adult + 1 child satisfies), add-ons refused on shared
  departures and on Óbidos, Óbidos shared refusing a lone adult, zero adults, and 13
  adults falling off the end of the 12-PAX table. Expected totals were transcribed
  from prices.pdf independently of the engine's own data. All 52 matched.
- **Availability.** 62 open days forward from today, each offering 2 drivers and
  3 classic-small / 1 classic-van / 1 touring — the real fleet, per `lib/fleet.ts`.
  Past days are closed.
- **Emails.** Both messages from the sandbox booking are `delivered` in Resend.
  The guest's carries reference `BK-ABD1AE`, *Manhã · 10h00*, the Sintra meeting
  point with its maps pin, `4 adultos · 1 criança (4–12) · 2 bebés`, all three extras
  and **905 €** — matching the priced scenario exactly. The team's links to
  `agorasim.jamienisbet.com/admin/sales/…`, so its deep link resolves.

**Found and fixed this pass:** both emails loaded their masthead logo from
`https://agorasim.pt/images/logo.png`, and the guest footer linked to `agorasim.pt`.
That domain answers **403** to everyone until Diogo & Rita recover it — so every
confirmation the client sees while testing shipped a broken logo and a dead footer
link. The email layer now resolves both against the origin actually serving the
deployment (`lib/site-origin.ts`, the same answer Stripe's return URLs and the admin
deep link already used), while `site.domain` stays the canonical for SEO. It
self-heals: once `NEXT_PUBLIC_SITE_URL` becomes `https://agorasim.pt`, both follow.

**Not verified here:** a *fresh* browser-driven payment on today's main. Chromium
cannot complete a TLS handshake through this session's egress relay (every host is
cut at the same 39-byte truncation; curl through the same proxy is fine), so Stripe's
hosted checkout page could not be driven. The payment leg above is the one made
earlier today, whose emails are the delivered evidence quoted. The checkout, pricing
and email paths it exercised are unchanged since — but the confirmation page and the
Sales board have changed under it, and Diogo & Rita's own first booking is what will
exercise those. Worth one manual run by Jamie before sending, if he wants belt and
braces.

## The handover message, for Jamie to send

**Not sent.** Sending is the human gate — this stub closes when Jamie has sent it.
Portuguese, for Diogo & Rita:

> Olá Diogo e Rita! 👋
>
> Já está pronta a primeira versão do site nova para experimentarem:
> https://agorasim.jamienisbet.com
>
> Ainda está neste endereço temporário enquanto não recuperamos o agorasim.pt.
>
> Podem fazer uma reserva do início ao fim, como se fossem um cliente — escolher o
> passeio, o dia, a hora, as pessoas e os complementos, e pagar.
>
> ⚠️ **Os pagamentos são de teste — não sai dinheiro nenhum a ninguém.** Para pagar,
> usem este cartão de teste:
>
> Número: 4242 4242 4242 4242
> Validade: qualquer data futura (ex.: 12/30)
> CVC: quaisquer 3 dígitos (ex.: 123)
> Código postal: qualquer um (ex.: 2710-000)
>
> Depois de pagarem recebem o email de confirmação, e a reserva aparece no painel de
> gestão. Reparem sobretudo se os preços batem certo com a vossa tabela, se os textos
> estão como querem, e se falta alguma coisa que os clientes costumam perguntar.
>
> Digam-me tudo o que acharem — mesmo as coisas pequenas. É para isso que serve esta
> fase. 🙂

## Prompt

In the agorasim repo, run the sandbox handover check described in
`.icm/intake/booking-live/sandbox-e2e-handover.md`: on the deployed
agorasim.jamienisbet.com preview, verify checkout pricing against
`.icm/docs/prices.pdf` scenario by scenario, complete a sandbox Stripe payment, and
confirm the emails and admin Sales board reflect it. Fix small failures directly (PR
on a `claude/` branch, CI is the source of truth — no local checks); anything
structural becomes a new stub. Finish by drafting the PT WhatsApp message with the
test link for Jamie to send — never send anything yourself.

**Read the Verification log first** — the pass has run twice and passed. Unless
something has changed on the deployment, the only work left is Jamie sending the
message above.
