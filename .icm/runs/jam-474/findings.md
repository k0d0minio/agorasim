# Findings jam-474

## 1. Rascunho do comentário para JAM-474 (o operador publica-o)

A regra do repo diz que uma sessão não escreve no Linear. Texto do comentário, em inglês:

> Spike result: `.icm/docs/client-status.md` (PR #269).
> Recommendation: one channel, a "Progresso" page in the admin console. The server reads
> Linear at each page load (5-minute cache), so the page stays true with no manual step:
> BAXTER already moves each ticket through the states. To test = on UAT, waits for the
> client. Labels Waiting on a client / Waiting on content = "Espera por vocês". The six
> features = six Linear projects; the next date = the target date of the project in build.
> The page shows only the six agorasim projects (team JAM holds other clients' work).
> Rejected: a Linear guest view (English, shows other work), a page from the release PR
> (technical English), a weekly email (stale between sends, each send needs Jamie's yes).
> Build ticket draft: size 3, about 1.5 days. Before it: six Linear projects with target
> dates, a read-only LINEAR_API_KEY in Vercel UAT and Production, client questions as
> Linear tickets.

## 2. Tickets de seguimento propostos (não criados)

1. agorasim · The admin console shows the build status on a Progresso page — lane `new`,
   tamanho 3. Rascunho completo na página.
2. BAXTER · The ticket stage writes a pt-PT title line (`pt:`) in each agorasim ticket —
   tamanho 1.
3. Processo · Each client question of seats-and-holds is a Linear ticket with Waiting on a
   client — tamanho 1, sem código.
4. Mais tarde · BAXTER sends a weekly email with the count of "Espera por vocês" and a link
   to the page, on Jamie's yes — tamanho 2.

## 3. O caminho do process guide no brief mudou

O ficheiro está em `~/Documents/to organise/Archive/deal-documents/...`, não em
`~/Documents/Archive/deal-documents/...` como dizem o ticket e o brief.
