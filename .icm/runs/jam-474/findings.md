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

## 2. Tickets de seguimento (2026-11-23)

Em 2026-11-23 o Jamie disse: "we don't need to give them read only view over linear with a
built in module that is crazy. Let's just set checkpoints where we checktest then create a
film for them to review." Antes, no mesmo dia: "forget about milestones that is too complex a
feature to be used with such a simple build".

| Key | Título | Estado |
|---|---|---|
| JAM-543 | agorasim · Checkpoint 1: the checktest of the UAT batch and its film for Diogo and Rita | Triage, related JAM-474 |
| JAM-534 | agorasim · The admin console shows the build status on a Progresso page | Canceled, com comentário |
| JAM-535 | BAXTER · The ticket stage writes a pt-PT title line and a feature line in each agorasim ticket | Canceled, com comentário |
| JAM-536 | agorasim · Each open client question of seats-and-holds is a Linear ticket that waits on the client | Canceled, com comentário |

Não há duplicados na lista dos tickets abertos de JAM. O email semanal não foi criado.

## 3. JAM-536 · agorasim · Each open client question of seats-and-holds is a Linear ticket that waits on the client

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
