# Go-live legal — the legal items and the fatura rule

- status: **research, not legal advice.** An engineer wrote this page in the spike JAM-473
  on 2026-11-23. Nobody qualified has read it. The accountant (contabilista certificado)
  and a lawyer must confirm each item that has the owner "accountant" or "lawyer".
- source of the questions: the info request of 2026-08-10 §1.1, the runbook answers Q23, Q24
  and Q25 (`launch-runbook.md` §4a), and the `TODO(legal)` lines in
  `web/src/content/terms.ts` and `web/src/content/privacy.ts`.
- related pages: `launch-runbook.md` §4b (RNAAT and insurance), `data-protection.md` (the
  privacy register).

## The answer in short

1. **RNAAT is a condition to sell, not only a line on the site.** Only a business that is in
   the RNAAT can "exercer e comercializar" tours (DL 108/2009, art. 5.º, n.º 1). The site must
   show the RNAAT number and the location of the seat in all external activity, online too
   (art. 8.º, n.º 2). The insurance comes first: the RNAAT inscription needs the policies
   (art. 11.º, n.º 1, b)). Thus the site cannot take paid bookings until the business has
   the number. A "registo em curso" line does not obey art. 8.º.
2. **Each paid booking needs a fatura, on the day of the payment.** The law requires a fatura
   for each service, also when the guest does not ask for one (CIVA art. 29.º, n.º 1, b)).
   The guest pays in full before the tour, so the fatura is due on the date of the payment
   (CIVA art. 36.º, n.º 1, c)). A Stripe receipt is not a fatura. A refund needs a credit
   note.
3. **The fatura decision, until the accountant answers: by hand.** Diogo or the accountant
   issues each fatura in the tool that they use today (the Portal das Finanças or a
   certified program). The platform does not issue faturas at go-live. An automatic
   integration is a new request, outside the deal (size below).

## The items

Status words: **done** (the site has it), **open** (an answer is missing), **check** (an
expert must confirm), **n/a** (the law does not apply). "Date" is the date of the answer,
or the date by which the answer is necessary.

### A. Licence and insurance

| # | Item | Law | Status | Owner | Date |
|---|---|---|---|---|---|
| A1 | RNAAT inscription of the business (a sole trader can register: art. 2.º, n.º 1, a)). The tours are "turismo cultural" activities, "pedestres ou transportadas" (art. 3.º, n.º 2, b)) | DL 108/2009 arts. 5.º, 11.º | **open** — no number known (Q23). Search the public register: `https://rnt.turismodeportugal.pt/RNT/Pesquisa_AAT.aspx` | Diogo | before go-live: **blocks paid bookings** |
| A2 | RNAAT number and seat on the site, in contracts and in emails | DL 108/2009 art. 8.º, n.º 2 | **open** — `seller.rnaat` is `null`. The terms page prints "pending" | Jamie, after A1 | with A1 |
| A3 | Personal-accident insurance for the guests | DL 108/2009 art. 27.º, n.º 1, a) | **open** — insurer and policy unknown | Diogo | before go-live |
| A4 | Civil-liability insurance | DL 108/2009 art. 27.º, n.º 1, c) | **open** — insurer and policy unknown | Diogo | before go-live |
| A5 | Assistance insurance: only for guests who travel abroad | DL 108/2009 art. 27.º, n.º 1, b) | **n/a** — all tours are in Portugal | — | — |
| A6 | Minimum capitals of the policies: set by portaria, updated each year on the Turismo de Portugal portal | DL 108/2009 art. 27.º, n.os 2 and 9 | **check** — not read in this spike | Diogo's insurer | with A3, A4 |
| A7 | Transport in own cars: permitted without a transport licence when the car has 9 seats or fewer (driver included) and the business owns or leases it | DL 108/2009 art. 26.º, n.º 3 | **check** — the 2CV, the 4L and the VW T3 seem to obey. Confirm the seats of the T3 and who owns each car | Diogo | before go-live |
| A8 | The driver carries a document with the business, the event, the date, the time and the places of departure and arrival. A missing document is an offence (art. 31.º, n.º 1, l)) | DL 108/2009 art. 26.º, n.º 4 | **open** — the admin console can show it for each departure (a proposed ticket) | Jamie, Diogo | before go-live |
| A9 | Activities off the public roads inside a protected area (the Sintra-Cascais natural park) need recognition as "turismo de natureza" | DL 108/2009 art. 4.º, n.º 1, a) | **check** — on public roads it does not apply. Ask if a stop is off the road network | Diogo | before go-live |
| A10 | Information before the contract: the risks, the physical aptitude, the minimum and maximum age, the services and the prices | DL 108/2009 art. 6.º, n.º 1 | **check** — the prices and the services are on the experience pages. The age limits and the physical aptitude are not | Jamie, Diogo | before go-live |

The fines: an offence of A1, A2, A3, A4 or A8 is €300 to €3,740 for a natural person
(DL 108/2009 art. 31.º, n.º 2).

### B. Consumer law on the site

| # | Item | Law | Status | Owner | Date |
|---|---|---|---|---|---|
| B1 | A visible link to the Livro de Reclamações Eletrónico | DL 156/2005 art. 5.º-B, n.º 2 (DL 74/2017); DL 108/2009 art. 37.º | **done** — footer and terms (`consumer-law.ts`) | — | — |
| B2 | Registration of the business on `livroreclamacoes.pt`, so that a complaint reaches it | DL 156/2005 as amended by DL 74/2017 | **open** — unknown (Q24) | Diogo | before go-live |
| B3 | The alternative dispute resolution entity (CACCL, CNIACC) | Lei 144/2015 art. 18.º | **done** — footer and terms | — | — |
| B4 | Seller identity: name, address, email, tax number | DL 7/2004 art. 10.º; DL 24/2014 art. 4.º | **done** — the terms page "Quem vende" | — | — |
| B5 | No 14-day withdrawal for leisure services on a fixed date | DL 24/2014 art. 17.º, n.º 1, l) | **done** — the terms say it | lawyer to confirm | at sign-off |
| B6 | Prices with tax included. The wording depends on the VAT regime (C2): "incluem IVA" is wrong if the business is exempt under art. 53.º | CIVA arts. 53.º and 57.º | **open** — the terms say "incluem IVA à taxa legal em vigor" | accountant | with C2 |
| B7 | Package-travel law: a day tour of less than 24 hours with no night stay is not a package. Thus no travel-agency licence (RNAVT) is necessary | Directive (EU) 2015/2302 art. 2.º, n.º 2, a); DL 17/2018 | **n/a** for the current tours. A tour with a night stay changes this | lawyer to confirm | at sign-off |
| B8 | The "sinal" of weddings and events. Under the Civil Code, if the party that received a sinal fails, it pays back double | Código Civil arts. 440.º–442.º | **check** — `TODO(legal)` in `terms.ts`. The events section has no rule for a cancellation by Agorasim | lawyer | at sign-off |
| B9 | The draft banners on `/termos` and `/privacidade` | — | **open** — they stay until a lawyer signs off | lawyer, then Jamie | at sign-off |
| B10 | Accessibility (European Accessibility Act): a microenterprise that supplies services is exempt | DL 82/2022 | **check** — confirm that the business has fewer than 10 persons | Jamie | not a go-live blocker |

### C. Faturas and tax

| # | Item | Law | Status | Owner | Date |
|---|---|---|---|---|---|
| C1 | A fatura for each paid booking and each wedding or event instalment (sinal, saldo), also when the guest does not ask | CIVA art. 29.º, n.º 1, b) | **open** — the fatura decision, below | accountant, Diogo | before go-live |
| C2 | The VAT regime: exempt under art. 53.º (turnover of the previous year up to €15,000; the fatura then says "IVA — regime de isenção"), or the normal regime | CIVA arts. 53.º and 57.º (DL 35/2025) | **open** | accountant | before go-live |
| C3 | The VAT rate of a guided classic-car tour. Tax opinions treat a tourist circuit as more than transport (23%, not the 6% of passenger transport). The add-ons (lunch, wine, pottery) can have other rates | CIVA art. 18.º and Lista I | **check** | accountant | before go-live |
| C4 | The add-ons from partners (Tasco Galapito, Manzwine, Ramilo Wines, Olaria MZ). If Agorasim sells them in its own name, the fatura shows the full amount, and the margin scheme of travel agencies can apply | DL 221/85 | **check** — who sells the add-on is not known | Diogo, accountant | before go-live |
| C5 | The date of the fatura: on the date of the payment for a prepayment. In other cases, by the 5th working day after the service | CIVA art. 36.º, n.º 1, a) and c) | **open** — the platform has the payment date of each booking | accountant | before go-live |
| C6 | The content of a fatura: date, number, the names and the tax number of the seller, the service, the price without tax, the rate and the tax. The guest's NIF only when the guest asks for it | CIVA art. 36.º, n.os 5 and 16 | **open** — the booking flow does not ask for a NIF (a proposed ticket) | Jamie | before go-live |
| C7 | A simplified fatura is permitted for a service only up to €100. A tour costs more, so a full fatura is necessary | CIVA art. 40.º, n.º 1, b) | **n/a** for the tours | — | — |
| C8 | A refund or a cancellation needs a credit note (nota de crédito) that cancels the fatura | CIVA art. 29.º and art. 78.º | **check** | accountant | before go-live |
| C9 | The tool: a program certified by the AT, or the free "Faturas e Recibos" of the Portal das Finanças. A certified program is obligatory above €50,000 of turnover. ATCUD and QR code on each fatura | Portaria 363/2010; DL 28/2019; Portaria 195/2020 | **check** — the threshold and the current rules | accountant | before go-live |
| C10 | A fatura sent as a PDF counts as electronic until 2026-12-31. From 2027-01-01 an electronic fatura needs a qualified electronic signature | DL 28/2019 and its extensions | **check** — the date of the extension is from vendor sources, not from the law | accountant | before 2027-01-01 |
| C11 | Keep the faturas and the documents that support them for 10 years | CIVA art. 52.º, n.º 1 | **open** — the retention of booking rows (`data-protection.md` item 2) waits for this answer | accountant, lawyer | before go-live |
| C12 | The documents that the accountant needs from Stripe: the payout reports and Stripe's invoices for its fees | — | **check** | accountant | before go-live |

### D. Privacy items that are already in the register

These items are in `data-protection.md` and the `TODO(legal)` lines of `privacy.ts`. This spike
did not answer them. They need a lawyer: the lawful basis wording (item 5), the hosting
regions and transfers (item 6), the retention of enquiries (item 1, Diogo and Rita decide)
and the sign-off (item 7).

## The fatura decision

- **Decision:** by hand at go-live. This is the default until the accountant answers C1, C2,
  C9 and C11.
- **The date for the answer:** the questions go to Diogo in one batch. The answer is
  necessary before go-live. The go-live date is in JAM-471.
- **By hand means:** after each payment, Diogo, Rita or the accountant issues a fatura-recibo
  in their own tool on the date of the payment. After each refund, they issue a credit note.
  Today the platform does not help. Two proposed tickets help: a list of the payments to
  invoice in the admin console, and an optional NIF field in the booking flow.
- **The limit of "by hand":** one fatura for each booking, on the day of the payment. At a
  few bookings each week this is a few minutes each day. At many bookings each day the
  work and the risk of a late fatura grow. Then the integration is the better choice.
- **The integration (if the accountant or the volume asks for it):** a new request, outside
  the deal. The proposal of 2026-07-23 has six features. None of them issues faturas
  (process guide §8, "a new request"). Size: **M, 4 to 6 days.** The work:
  1. The client opens an account, with API access, on a certified program (for example
     InvoiceXpress, Moloni or Vendus). The client pays its monthly plan. The API key goes in
     Vercel settings, never in git.
  2. On each successful payment (tour booking, sinal, saldo) the platform issues a
     fatura-recibo through the API, once (idempotent on the Stripe payment id), and keeps the
     document number and its link.
  3. On each refund the platform issues a credit note against that fatura.
  4. The guest gets the PDF by email (`pt-PT` and `en`).
  5. The admin console shows the status of each document and retries a failed one.
  6. The privacy policy names the program as a processor.

## Still unknown when the time box ended

- The RNAAT status, the policies and the Livro de Reclamações registration (A1, A3, A4, B2).
- The VAT regime, the rate, the add-on model and the invoicing tool (C2, C3, C4, C9).
- The exact minimum capitals of the insurance (A6). The portaria was not read.
- The current text of DL 156/2005 art. 5.º-B and its fines. This spike read secondary sources
  only.
- Whether the business stays a sole trader at go-live. The runbook (§0) names "the company"
  as the registrant of the domain. All other sources say sole trader. A company changes the
  seller, the NIF, the RNAAT inscription and the Stripe account.

## Sources

- DL 108/2009, consolidated in the annex II of DL 186/2015, Diário da República, 1.ª série,
  n.º 172, 2015-09-03: `https://files.diariodarepublica.pt/1s/2015/09/17200/0694706982.pdf`
- Turismo de Portugal, RNAAT guidance:
  `https://business.turismodeportugal.pt/pt/Planear_Iniciar/Licenciamento_Registo_da_Atividade/Agentes_Animacao_Turistica/Paginas/default.aspx`
- CIVA on the Portal das Finanças, arts. 29.º, 36.º, 40.º, 52.º, 53.º:
  `https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/iva36.aspx`
  (and `iva29`, `iva40`, `iva52`, `artigo-53-o-do-civa`)
- DL 221/85 (margin scheme of travel agencies):
  `https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/legislacao/diplomas_legislativos/Documents/decreto-lei_221-85_de_3_de_julho.pdf`
- Portaria 363/2010 (certified programs):
  `https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/legislacao/diplomas_legislativos/Documents/Portaria_363_2010.pdf`
- AMT, the Livro de Reclamações Eletrónico and DL 74/2017:
  `https://www.amt-autoridade.pt/media/1405/decreto-lei-nº-74_2017-de-21-de-junho.pdf`
- OCC, ATCUD and QR code: `https://occ.pt/pt-pt/noticias/procedimentos-de-faturacao-qr-code-atcud-e-comunicacao-das-series`
- The PDF fatura until 2026-12-31 (vendor source):
  `https://invoicexpress.com/blog/assinatura-digital-nas-faturas-adiada-para-2027/`
- Deal documents (outside the repo, read only): the proposal of 2026-07-23, the Commission &
  Payments Agreement, the process guide, the info request of 2026-08-10.
