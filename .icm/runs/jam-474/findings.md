# Findings jam-474

## 1. Comentário para JAM-474 (publicado pelo BAXTER em 2026-11-23)

O BAXTER publicou o resumo no JAM-474. Texto do rascunho, em inglês:

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

Estado em 2026-11-23: não criados. A sessão tentou `create_issue` com a ferramenta BAXTER, e a
verificação de permissões do Claude Code recusou a escrita no Linear. Cada ticket deve ter a
relação `related` com JAM-474. Não há duplicados na lista dos tickets abertos de JAM.
O ticket 4 ("Mais tarde": email semanal, tamanho 2) fica fora: é trabalho para depois.

### 1. agorasim · The admin console shows the build status on a Progresso page

projeto agorasim · Triage · prioridade 2 (high) · estimativa 3 · labels Feature, Client work, lane:new

````markdown
* lane: new
* size: 3 (about 1.5 days)
* found-by: spike JAM-474 (`.icm/docs/client-status.md`, PR #269). BAXTER work item w-20261122-005.
* depends on: JAM-474 merged. The prerequisites below.

## Problem

Diogo and Rita cannot see which feature is in build, which is on UAT to test, and what waits on them. The process guide §9 promises "a simple running status". The status exists in Linear, but the client cannot read Linear, and team JAM holds the work of other clients.

## Proposed changes

* A server module reads Linear with GraphQL: the six feature milestones of the project agorasim, their target dates, and their tickets (title, state, labels). Cache: 5 minutes.
* A page `/admin/progresso`, its entry in `web/src/lib/admin-nav.ts`, and the count of "Espera por vocês" on the admin dashboard. pt-PT text only.
* The state map of `.icm/docs/client-status.md`: In Progress, In Review, Changes requested = Em construção. To test = Para testar em UAT. Ready to ship = Aprovado, à espera de publicação. Done in the last 30 days = Concluído. Next up = A seguir. Label Waiting on a client or Waiting on content = Espera por vocês. Triage, Backlog, Canceled, Duplicate are not shown.
* A pt-PT name for each of the six features in the repo. The next date is the target date of the milestone in build, else "Data por confirmar".
* A fault of Linear shows "Estado indisponível" and the time of the last good read. The rest of the admin works.

Prerequisites (not part of this ticket):

* The six feature milestones on the project agorasim, with target dates, and each open agorasim ticket in one milestone.
* A Linear API key with read access to team JAM only, named `LINEAR_API_KEY`, in the Vercel environments UAT and Production. Never in git.

## Acceptance criteria

- [ ] The page shows the six features, "Espera por vocês", the next date and the sections of the state map.
- [ ] A move of a ticket in Linear shows on the page in 5 minutes or less, with no deploy.
- [ ] The page shows no ticket, description or comment outside the project agorasim.
- [ ] The page works at 320 px and 375 px.
- [ ] A Linear fault shows "Estado indisponível", and the other admin pages still load.

## Outcome

The client opens the admin on the phone and sees, in Portuguese, what is in build, what is on UAT to test and what waits on them. Nobody updates the page by hand.
````

### 2. BAXTER · The ticket stage writes a pt-PT title line in each ticket of a pt-PT client

sem projeto · Triage · prioridade 3 (medium) · estimativa 1 · labels Feature, Foundation

````markdown
* size: 1
* found-by: spike JAM-474 (agorasim, `.icm/docs/client-status.md`, PR #269). BAXTER work item w-20261122-005.

## Problem

The agorasim admin page "Progresso" (follow-up of JAM-474) shows Linear ticket titles to the client. The titles are in English. The client reads Portuguese, and the admin console is Portuguese only.

## Proposed changes

* The BAXTER ticket stage writes one line `pt: <title in pt-PT>` at the top of the description of each new ticket of a client whose language is pt-PT (agorasim).
* The line is short, plain and client-facing: no file path, no ticket key, no technical word.

## Acceptance criteria

- [ ] A new agorasim ticket that BAXTER creates has a `pt:` line at the top of its description.
- [ ] A ticket of a project with no pt-PT client has no `pt:` line.
- [ ] The rule is in the BAXTER ticket stage contract, in one place.

## Outcome

The Progresso page shows each ticket in Portuguese, with the English title only as a fallback.
````

### 3. agorasim · Each open client question of seats-and-holds is a Linear ticket that waits on the client

projeto agorasim · Triage · prioridade 2 (high) · estimativa 1 · labels Chore, Client work, lane:chore

````markdown
* lane: chore (no code)
* size: 1
* found-by: spike JAM-474 (`.icm/docs/client-status.md`, PR #269). BAXTER work item w-20261122-005.

## Problem

The open client questions of seats-and-holds (questions 1 to 4 and 6) are only in `.icm/intake/seats-and-holds/breakdown.md`. The Progresso page reads Linear, so the client will not see these questions under "Espera por vocês".

## Proposed changes

* One Linear ticket for each open client question, with the labels Question and Waiting on a client, in the project agorasim.
* Each ticket relates to the seats-and-holds ticket that it blocks (JAM-290 to JAM-294).
* The title says the question in plain words. The cut-off question ("and we also have a …") says that the sentence is incomplete.
* From now on, each new client question is a Linear ticket of this form.

## Acceptance criteria

- [ ] Each open client question of the breakdown has one Linear ticket with the labels Question and Waiting on a client.
- [ ] Each question ticket blocks the seats-and-holds ticket that needs its answer.
- [ ] The breakdown names the key of each question ticket.

## Outcome

The questions that wait on Diogo and Rita are in Linear, so the Progresso page can show them with no manual step.
````

## 3. O caminho do process guide no brief mudou

O ficheiro está em `~/Documents/to organise/Archive/deal-documents/...`, não em
`~/Documents/Archive/deal-documents/...` como dizem o ticket e o brief.
