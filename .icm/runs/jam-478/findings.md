# Findings jam-478

O operador regista estes pontos mais tarde. Uma entrada por ponto. Cada entrada é um ticket
proposto, com o tamanho. O spike não criou nenhum ticket.

## F1 · Redirecionar os URLs antigos que o mapa não cobre (antes do go-live)

- where: `web/src/lib/legacy-redirects.ts`, `.icm/docs/geo-baseline.md` secção 4
- what: 12 URLs antigos não têm regra. No UAT, `/en/rural-oeste` responde 404. As três páginas
  de passeio (`rural-oeste`, `paisagens-de-sintra`, `degustacao-tradicional-saloia`, PT e EN)
  são as páginas que o ChatGPT cita hoje. Os outros: `/home-agorasim/`, `/home-teste/`,
  `/en/home-agorasim/`, `/en/centro-de-arbitragem/`, `/en/politica-de-cookies/`,
  `/en/politica-de-privacidade/`.
- proposed: chore · 0,25 dia · prioridade alta, antes do corte de DNS

## F2 · Verificar o Search Console e o Bing Webmaster Tools por DNS

- where: `.icm/setup/`, `.icm/docs/launch-runbook.md` Track H
- what: o domínio não tem registo TXT `google-site-verification`. O runbook tem uma caixa para
  o Search Console e nenhuma para o Bing. Um ficheiro de setup diz o ato: TXT no Vercel DNS,
  propriedade de domínio, envio do sitemap, importação para o Bing.
- proposed: chore (o ficheiro de setup) · 0,25 dia · o ato é do Jamie, no dia do go-live

## F3 · Perfil Google da empresa: reservas, nome e ligação

- where: o painel "Agorasim Vintage" no Google
- what: as opções de reserva do painel mostram 74 € e 240 €, por um terceiro (provavelmente o
  FareHarbor, não verificado). O site novo vende desde 62 €. O nome difere do site. Depois do
  go-live o painel deve levar a `/pt/reservar`. O perfil é do cliente.
- proposed: question para o Jamie levar ao cliente · 0,25 dia + o cliente

## F4 · JSON-LD: morada, nome e `sameAs`

- where: `web/src/lib/jsonld.ts` `organizationJsonLd`, `web/src/content/site.ts`
- what: o `TravelAgency` não tem `address` (o ponto de encontro de Sintra). `sameAs` não tem o
  perfil Google nem as plataformas de avaliação. O nome deve ser o mesmo do perfil Google
  (depende de F3).
- proposed: tweak · 0,5 dia · prioridade média

## F5 · Origem de cada reserva, sem cookie

- where: `web/src/lib/checkout-draft.ts`, a reserva, o Sales board, `web/src/content/privacy.ts`
- what: nada junta um resultado de pesquisa a uma reserva. Guardar o `utm_source` e o host do
  referrer da página de entrada na reserva e no pedido de orçamento. Mostrar a origem no Sales
  board e uma contagem por mês. O ChatGPT põe `utm_source=chatgpt.com` nas suas ligações. A
  política de privacidade muda em PT e EN no mesmo pull request. Precisa de uma decisão do
  Jamie: é compatível com a decisão de 2026-09-18 (sem analytics, sem cookie)?
- proposed: new ticket · 1 dia · prioridade alta (é a medida que liga a pesquisa à comissão)

## F6 · Publicar o primeiro lote do blog

- where: `workspaces/geo-content/`, `.icm/intake/README.md` (o lote está parado desde 2026-09-18)
- what: as consultas 5, 7, 8 e 9 da linha de base não mostram o Agorasim. São os alvos dos cinco
  artigos já pesquisados. Nenhum artigo está publicado.
- proposed: o ticket do lote já existe no backlog · sem novo ticket · tamanho do ticket existente

## F7 · Pedir ao cliente o acesso aos dados antigos

- where: o site antigo carrega o Google Tag Manager `GTM-N86SBMLL`
- what: o cliente pode ter um GA4 ou um Search Console com dados de consultas passados. Com
  eles a linha de base tem números. O spike não contactou o cliente.
- proposed: question para o Jamie · 0 dias de construção

Total proposto de construção: F1 + F2 + F4 + F5 = 2 dias, mais o lote do blog.

## Rascunho do comentário para JAM-478 (o operador publica-o no Linear)

> Spike done (PR k0d0minio/agorasim#275). Baseline of 2026-11-23, old WordPress site:
> Google shows agorasim.pt on page 1 for 2 of 10 fixed queries (only with the brand or the
> old title). For "agorasim" alone only the business panel shows ("Agorasim Vintage", 5/5, 71
> reviews, booking at €74 through a third party). ChatGPT names Agorasim for 3 of 5 prompts
> (first for the Saloia classic-car tour) but with old prices ("from €30"). Perplexity knows
> almost nothing. New site: robots, sitemap, hreflang, JSON-LD, llms.txt are ready. Gap: 12
> old URLs have no redirect, among them the three tour pages that ChatGPT cites. Measures with
> no cookie: Search Console + Bing (DNS), the monthly ten-query check (Jamie, first working day),
> and a booking-source field (utm_source/referrer). Proposed tickets F1-F7 in
> `.icm/runs/jam-478/findings.md`. Page: `.icm/docs/geo-baseline.md`.
