# Spec: agorasim · Each booking and enquiry records where the guest came from, with no cookie

- ticket: JAM-506
- touches: `web/src/db/schema.ts`, `web/drizzle/0042_*.sql` e `web/drizzle/meta/`, `web/src/lib/booking-source.ts` (novo), `web/src/lib/checkout-draft.ts`, `web/src/app/[locale]/layout.tsx`, `web/src/components/booking-checkout-form.tsx` e os formulários de pedido, `web/src/app/[locale]/reservar/actions.ts`, `web/src/app/[locale]/reservar/checkout-actions.ts`, `web/src/app/[locale]/quote-actions.ts`, `web/src/lib/booking-checkout.ts`, `web/src/lib/sales.ts`, `web/src/components/admin/sales-board.tsx`, `web/src/app/admin/sales/page.tsx`, `web/src/app/admin/sales/[id]/page.tsx`, a exportação dos dados de um titular, `web/src/content/privacy.ts`
- complexity: standard

## Problem

A proposta de 2026-07-23 diz que o site é feito para ser encontrado e citado pelo Google e pela
pesquisa com IA, e que isso traz reservas. Hoje nada junta um resultado de pesquisa a uma
reserva. O Agorasim não tem analytics e não põe cookies além da sessão da consola (decisão de
2026-09-18). A medida M4 de `.icm/docs/geo-baseline.md` é a única que liga a pesquisa à
comissão, e não está construída (F5 de `.icm/archive/jam-478/findings.md`).

## Proposed change

Decisão do Jamie, 2026-11-23, no chat: "implement".

**O que o site regista.** Quando um visitante entra no site, a página lê dois valores:

- o `utm_source` do endereço de entrada (o ChatGPT põe `utm_source=chatgpt.com` nas ligações),
- o host do referrer (por exemplo `www.google.com`). Só o host: nunca o caminho, nunca a
  pesquisa.

Quando o visitante envia uma reserva ou um pedido de orçamento (passeio, casamento, evento), o
formulário envia estes dois valores com ele. O servidor valida-os e guarda-os no pedido e na
reserva. Um valor que não é válido é ignorado, e a reserva continua.

**Onde o navegador guarda os valores até ao envio.** No `sessionStorage` do separador, numa
chave própria, ao lado do rascunho da reserva. O site escreve a chave uma vez, na primeira página
do separador, e não a muda depois. A chave tem só o `utm_source` e o host do referrer. Morre
quando o visitante fecha o separador. O site não escreve cookie nem `localStorage` para a
origem. Efeito: a origem fica depois de um recarregamento.

**O que Diogo e Rita veem na consola (em português, primeiro no telemóvel).**

- Cada cartão do Sales board e a página de cada registo mostram "Origem: …".
- A origem é o `utm_source`, em minúsculas (por exemplo `chatgpt.com`). Sem `utm_source`, é o
  host do referrer sem `www.` (por exemplo `perplexity.ai`). Cada host do Google (`google.com`,
  `google.pt`) mostra `google`, como o ticket diz.
- Sem `utm_source` e sem referrer: "Direta ou desconhecida".
- Um registo de antes desta mudança, ou feito na consola: "Sem registo".
- Uma secção "Origem das reservas" na página Sales: para cada um dos últimos 6 meses, o número
  de reservas pagas de cada origem. O mês é o mês em que a reserva foi feita (hora de Lisboa).

**A política de privacidade (PT e EN)** ganha um parágrafo. Texto proposto em PT, com a versão
EN em sincronia:

> Quando faz uma reserva ou um pedido, guardamos com ele a origem da sua visita: o nome do site
> que o trouxe até nós (por exemplo, google.com) e, quando a ligação a indica, a etiqueta de
> origem (por exemplo, chatgpt.com). Não guardamos o endereço completo da página de onde veio
> nem o que pesquisou. Para isto não usamos cookies. Estes dois valores ficam no separador do
> seu navegador até à reserva, e desaparecem quando fecha o separador. Não o seguimos entre
> visitas. Usamos esta informação para saber que canais trazem reservas
> (interesse legítimo). Fica guardada com a reserva, pelo mesmo prazo.

**A base de dados.** A migração `0042` junta duas colunas de texto, que aceitam vazio, a
`tour_requests` e a `bookings`. Não muda nenhuma coluna que existe. É compatível com o código
que substitui.

**Respostas e decisões, para o Jamie confirmar na aprovação da spec.**

1. "Este registo é compatível com a decisão de 2026-09-18 (sem analytics, sem cookie)?"
   Resposta por omissão: sim. É um campo da reserva, não um tracker. Nenhum script de
   terceiros, nenhum cookie, nenhum identificador do visitante, nada entre visitas.
2. "Onde ficam os valores no navegador até ao envio?" Decidido: no `sessionStorage` do
   separador, como o ticket diz ("com o rascunho da reserva"). Jamie, 2026-11-23, no chat:
   "Use sessionStorage". A sessão disse antes da decisão: a lei dos cookies (Lei 41/2004,
   art. 5.º) aplica-se a qualquer armazenamento no dispositivo que não é estritamente
   necessário, não só a cookies, e a política diz "não há nada a que consentir". Por isso o
   parágrafo novo da política diz que os dois valores ficam no separador. Isto não é um parecer
   jurídico.
3. A contagem por mês conta reservas pagas. Um pedido sem pagamento mostra a sua origem no
   cartão, e não entra na contagem.

## Acceptance criteria

- [ ] Uma reserva feita depois de entrar por `/pt?utm_source=chatgpt.com` mostra "Origem: chatgpt.com" no cartão do Sales board e na página do registo. (verify: operator)
- [ ] Um teste mostra que uma reserva com o referrer `https://www.google.com/` e sem `utm_source` fica com a origem "google". (verify: CI)
- [ ] Um teste mostra que um pedido de orçamento (passeio, casamento, evento) guarda a origem como a reserva. (verify: CI)
- [ ] Um teste mostra que o servidor guarda só o host do referrer, e que o referrer do próprio site é ignorado. (verify: CI)
- [ ] Um teste mostra que um valor de origem que não é válido é ignorado e que a reserva é criada. (verify: CI)
- [ ] Um teste mostra os nomes: sem valores "Direta ou desconhecida", registo antigo "Sem registo", `utm_source` antes do referrer. (verify: CI)
- [ ] A página Sales mostra a secção "Origem das reservas" com o número de reservas pagas de cada origem para cada um dos últimos 6 meses, legível num telemóvel. (verify: operator)
- [ ] Depois de uma visita ao preview com `?utm_source=chatgpt.com` e de navegar até `/pt/reservar`, o navegador não tem cookie novo nem chave nova em `localStorage`, e o `sessionStorage` tem uma chave para a origem com só o `utm_source` e o host do referrer. (verify: agent)
- [ ] Um teste mostra que a primeira página do separador decide a origem, e que um recarregamento ou uma página seguinte não a muda. (verify: CI)
- [ ] A política de privacidade em `/pt/privacidade` e em `/en/privacy` diz o que é registado, com o mesmo conteúdo nas duas línguas. (verify: agent)
- [ ] Um teste mostra que a exportação dos dados de um titular inclui a origem. (verify: CI)
- [ ] A migração `0042` só junta colunas que aceitam vazio, e `db:migrate` e `db:verify` passam no build do preview. (verify: CI)
- [ ] O diff não muda `web/src/lib/fleet.ts`, `web/src/lib/availability.ts` nem `web/src/components/booking-date-picker.tsx`, e não muda a lógica de lugares ou de viaturas. (verify: agent)

## Out of scope

- Analytics, um script de terceiros, um cookie ou um identificador do visitante.
- Os outros parâmetros `utm_*`, o caminho ou a pesquisa do referrer, e a página de entrada.
- A origem de uma reserva feita na consola por Diogo ou Rita: fica "Sem registo".
- Preencher a origem das reservas e dos pedidos de antes desta mudança.
- Um gráfico, um filtro por origem no Sales board, ou uma exportação da contagem.
- A lógica de lugares e de viaturas (JAM-290) e as pipelines de `workspaces/` (JAM-508).
- A migração da produção: corre em `migrate-production.yml`, por palavra do Jamie, na promoção.

## Open questions

- O ticket foi lido no Linear em 2026-11-23 com `baxter_tool run linear get_issue`, por palavra do Jamie no chat. O conector Linear do Claude Code não estava ligado.
- O ramo do Linear é `contact/jam-506-agorasim-each-booking-and-enquiry-records`. O run usa `claude/jam-506-booking-source-e151c6`, o ramo da sessão, porque o pull request #277 já existia quando o ticket foi lido.
- O número `0042` é o seguinte livre em `origin/main` em 2026-11-23. Nenhum pull request aberto tem uma migração. Outro ticket com uma migração espera por este.
- Se uma venda por orçamento (casamento, evento) não cria uma linha em `bookings`, o Build escreve isso em `findings.md` e a contagem conta só as linhas de `bookings`.
