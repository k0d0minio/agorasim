# Client status — what Diogo and Rita see about the build

> Spike JAM-474, 2026-11-23, time box 0.5 day. Source: process guide §9 ("a simple running
> status": which feature is in build, which waits on your review, which is signed off).
> This page is a recommendation. The merge of its pull request records Jamie's decision.
> Until then, nothing on this page is built.

## The question

What is the cheapest way to give the client a status that stays true by itself?

## What is true today (2026-11-23)

- Linear team `JAM` already holds the status. The states are Triage, Backlog, Next up,
  In Progress, In Review, To test, Changes requested, Ready to ship, Done.
- A merge to `main` deploys UAT, and BAXTER moves the ticket to **To test**. Thus
  "To test" means "on `uat.agorasim.pt`, waits for the client's test". Example: JAM-293
  merged in #263 and is in To test.
- The labels **Waiting on a client** and **Waiting on content** exist. JAM-485 (the drawing of each car) has
  Waiting on a client. The team also has the views "To test" and "Waiting on J".
- The client cannot open Linear or GitHub. The team `JAM` also holds the work of other
  clients and of BAXTER (for example JAM-148, label group `Area/HUD`). A guest seat on the
  team shows that work.
- Linear titles are in English ("agorasim · The booking calendar shows the seats left now").
- The client signs in to the admin console on UAT. The console is in Portuguese, mobile
  first. Its areas come from one list, `web/src/lib/admin-nav.ts`.
- The release pull request (#214, v1.1.0) lists what is on UAT and not in production. Its
  lines are technical English commit titles, grouped by code area, not by the six features.
- The Linear project agorasim exists. Nothing in Linear maps a ticket to one of the six
  features of the guide.
- The client questions of seats-and-holds are in `.icm/intake/seats-and-holds/breakdown.md`,
  not in Linear.

## The options

| Option | Stays true by itself | Client can read it | Cost | Verdict |
|---|---|---|---|---|
| A. Shared Linear view (guest seat) | Yes | No: English, technical, and it shows other clients' work | Linear plan change, a guest seat | Rejected |
| B. "Progresso" page in the admin console, read from Linear | Yes, at each page load | Yes: Portuguese, on the phone, where they test | About 1.5 days | **Recommended** |
| C. Weekly email from BAXTER | No: true only on the day it is sent, and each send is a message on Jamie's behalf | Yes | About 1 day, and a weekly approval | Later, as a link to B |
| D. Page fed from the release pull request and `CHANGELOG.md` | Partly: only "on UAT" and "in production" | No: commit titles in English | About 1 day | Rejected |

## The decision (recommended)

**One channel: a page "Progresso" in the admin console.** The server reads Linear at each
page load (with a cache of 5 minutes). Nobody edits the page.

It stays true with no manual step because the page has no data of its own. BAXTER already
moves each ticket through the Linear states. The page shows those states in Portuguese:

| Linear | Section on the page |
|---|---|
| In Progress, In Review, Changes requested | Em construção |
| To test | Para testar em UAT |
| Ready to ship | Aprovado, à espera de publicação |
| Done, in the last 30 days | Concluído |
| Next up | A seguir |
| Label Waiting on a client or Waiting on content, in an open state | Espera por vocês |
| Triage, Backlog, Canceled, Duplicate | Not shown |

Jamie said on 2026-11-23: "forget about milestones that is too complex a feature to be used
with such a simple build". Thus the page needs no new Linear setting:

- **The six features:** BAXTER writes one line `feature: <1 to 6>` at the top of each agorasim
  ticket description (JAM-535). The state of a feature is the state of its tickets. A
  ticket with no `feature:` line shows in the lists, not in the six features.
- **The next date:** the earliest due date of an open agorasim ticket in Next up or in build.
  With no due date, the page shows "Data por confirmar".

The page shows only the tickets of the project agorasim. It shows the title, the state
and the date. It never shows the rest of a description, a comment or a ticket of another project. Thus
the other work of team `JAM` stays private.

## Mock-up (375 px, Portuguese)

The values come from Linear on 2026-11-23 (JAM-291 In Progress, JAM-293, JAM-486 and JAM-487
in To test, JAM-485 with Waiting on a client). The date is the estimate of the status report
of 2026-11-22. The two questions are examples from seats-and-holds. They show the form, not a promise.

```
┌───────────────────────────────────────┐
│ ☰  Progresso                          │
│ Atualizado há 2 min · dados do Linear │
├───────────────────────────────────────┤
│ ESPERA POR VOCÊS (4)                  │
│ ● Testar 3 alterações em UAT  [Abrir] │
│ ● Responder: a VW T3 partilhada no    │
│   grupo aberto                        │
│ ● Responder: um orçamento sem carro   │
│   segura a partida?                   │
│ ● Enviar os desenhos dos carros       │
├───────────────────────────────────────┤
│ PRÓXIMA DATA                          │
│ Lugares e reservas em UAT             │
│ 4 dez 2026 · depende das respostas    │
├───────────────────────────────────────┤
│ AS SEIS FUNCIONALIDADES               │
│ 1 Site + GEO          ✓ Para testar   │
│ 2 Reserva de tours    ◐ Em construção │
│ 3 Links de pagamento  ✓ Para testar   │
│ 4 Email e SMS         ◐ Email testar  │
│                         SMS a seguir  │
│ 5 Blog automático     ○ A seguir      │
│ 6 Redes sociais       ○ A seguir      │
├───────────────────────────────────────┤
│ EM CONSTRUÇÃO (1)                     │
│ · Só uma reserva paga ocupa lugar     │
│ PARA TESTAR EM UAT (3)                │
│ · O calendário mostra os lugares      │
│   que restam                          │
│ · O formulário de orçamento guarda    │
│   o que o cliente escreveu            │
│ · O quadro de Vendas mostra a data    │
│   por extenso                         │
│ CONCLUÍDO (últimos 30 dias)           │
│ · …                                   │
└───────────────────────────────────────┘
```
"Abrir" opens `https://uat.agorasim.pt`. The dashboard card of the admin also shows the
count of "Espera por vocês".

## The build ticket (JAM-534)

- **Title:** agorasim · The admin console shows the build status on a Progresso page
- **Lane:** `new`. **Size:** 3 (Fibonacci), about 1.5 days.
- **Scope:**
  1. A server module reads Linear with GraphQL: the tickets of the project agorasim (title,
     state, labels, due date, and the `pt:` and `feature:` lines of the description).
     Cache: 5 minutes. About 0.5 day.
  2. The page `/admin/progresso`, its entry in `web/src/lib/admin-nav.ts`, and the count on
     the dashboard. pt-PT text only (the admin is Portuguese only). About 0.5 day.
  3. The six features: a pt-PT name for each number 1 to 6. About 0.1 day.
  4. A fault of Linear shows "Estado indisponível" and the time of the last good read.
     The rest of the admin works. About 0.1 day.
  5. Tests of the state map and of the filter (no ticket of another project). About 0.3 day.
- **Acceptance criteria:**
  - The page shows the six features, "Espera por vocês", the next date and the sections
    of the state table above.
  - A move of a ticket in Linear shows on the page in 5 minutes or less, with no deploy.
  - The page shows no ticket, description or comment outside the project agorasim.
  - The page works at 320 px and 375 px.
- **Before the build (acts of a person, not of the ticket):**
  1. BAXTER adds the `feature:` line and a due date to each open agorasim ticket (JAM-535).
  2. Jamie makes a Linear API key with read access to team `JAM` only. Its name is
     `LINEAR_API_KEY`. Its value goes in the Vercel environments UAT and Production, never
     in git.
  3. Each client question becomes a Linear ticket with the labels Question and Waiting on
     a client. The seats-and-holds questions are the first ones.

## Follow-up tickets

| Ticket | Scope | Size |
|---|---|---|
| JAM-534 | The build ticket above | 3 |
| JAM-535 | The BAXTER ticket stage writes the `pt:` and `feature:` lines in each agorasim ticket. The page shows `pt:`, else the English title | 1 |
| JAM-536 | Each client question of seats-and-holds is a Linear ticket with Waiting on a client | 1 |
| Not filed | Later: a weekly email with the count of "Espera por vocês" and a link to the page, sent on Jamie's yes | 2 |

## Questions for Jamie

1. Do Diogo and Rita each have an account on the UAT admin console? Default: yes. If not,
   the build ticket adds the two accounts as a setup act.
2. English titles until the `pt:` line exists? Default: yes. The client reads the six
   features and "Espera por vocês" in Portuguese from the start, because the page writes
   those names itself.

## Still unknown at the end of the time box

- If a Linear API key can be limited to read access and to one team. Linear has key
  permissions. This spike did not test them.
- When BAXTER moves a ticket to Done: at the client's sign-off, at the release or at the
  promotion. The section "Concluído" means "signed off" only if Done comes at the sign-off.
- If the agorasim tickets have due dates in Linear. The BAXTER adapter does not return them.
  The adapter can set one (`due`).
- If the client wants a push (an email or WhatsApp) as well as the page.
