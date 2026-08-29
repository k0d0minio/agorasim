# Admin em português — inventário de strings, glossário e reescritas

Working document for epic **admin-portugues**, produced by stub 1 of 4
(`.icm/intake/admin-portugues/admin-i18n-inventory.md`). It is the source that
stubs 2 (`translate-admin-core`) and 3 (`translate-admin-rest`) translate from:
they do not re-decide vocabulary, they apply §3 and §4 and work through §5.

Decision it implements: **D4** — admin is hardcoded Portuguese, mobile-first, no
i18n rig. There is no `Localized<T>` in the admin and no locale toggle; a string
below is replaced in place, not wrapped.

**Register**: European Portuguese, informal-warm, *você* implicit — third-person
verb forms with no pronoun ("Escolha o dia", "Indique o seu nome"), exactly as
`web/src/content/tour-request.ts` writes to guests. **Singular throughout**, even
though the team is two people: a screen is read by one person at a time, so
"os dias que guarda para si", never "que guardam para vocês". PT-PT spelling and
lexis: *registo* (not registro), *definições* (not configurações), *ecrã*,
*telemóvel*, *palavra-passe*, *ligação*.

**Status**: §3 and the flagged items in §9 need Jamie's tick before stub 2 starts.
Everything else is decided.

---

## 1. The three-names problem — flagged

The Sales screen calls one database object three different names, in one
screenful:

| Where | Word used | Same object? |
|---|---|---|
| `admin/sales/page.tsx:48` | `"enquiry" / "enquiries"` (the count line) | yes — `tour_requests` |
| `admin/sales/page.tsx:56` | `"No leads yet"` (empty state) | yes |
| `admin/sales/page.tsx:71` | `"placeholder bookings"` (example note) | yes, plus the example rows |
| `lib/admin-nav.ts:93,98` | `"Enquiries & bookings"`, `"Every enquiry and booking"` | yes |
| `admin/sales/[id]/page.tsx` | `lead` throughout (`AdminLeadPage`, "this lead", "Every change made to this lead") | yes |
| `admin/page.tsx:74` | `"New leads"` | yes |
| `lib/sales.ts:77` | ref prefix `EN-` (from *enquiry*) | yes |

There is exactly **one** object here: a row in `tour_requests`, which starts life
as a website form submission and may end up paid. "Booking" is not a fourth name
for it — it is a *stage* of it (`status: "booked"`), plus the four example rows in
`lib/admin-preview.ts` that stand in for Stripe until it ships.

Translating this as-is would give Portuguese three words for one thing, which is
worse than the English: PT readers will assume three different objects.

### Decision — one name per concept

- **`pedido`** — an enquiry/lead: what arrives from the website form, at any stage
  before money changes hands. Replaces *enquiry*, *lead*, *submission*, *request*
  (in the tour sense), *tour request*.
- **`reserva`** — a booking: a `pedido` that has been paid and confirmed. Not a
  synonym for `pedido`; a `pedido` *becomes* a `reserva`.
- **`orçamento`** — a quote, the proposal sent between the two.

The repo already agrees with this in the two places it writes PT for these
concepts, which is the strongest argument for it:

- `lib/contact-templates.ts:31` — `"Agorasim — o seu pedido"` (the enquiry).
- `content/tour-request.ts:38,101` — `"Enviar pedido"`, `"Pedido enviado!"`.
- `content/emails.ts` — `"Reserva confirmada"` (guest), `"Nova reserva paga"` (team).

So the admin is the only surface that disagrees with itself, and PT is where the
disagreement stops. **Jamie's tick needed** — see §9.

**Consequences to carry through in stubs 2–3:**

- `admin/sales/page.tsx:48` count line: `"N pedido" / "N pedidos"` — the empty
  state (`:56`) says *pedidos* too, not a second word.
- `admin/page.tsx:74` stat: `"Pedidos novos"`.
- `lib/admin-nav.ts:93`: cardTitle `"Pedidos e reservas"` — both words, because
  the board genuinely holds both, and that is now a statement about stages, not
  a drift.
- `admin/sales/[id]/page.tsx`: every "lead" → *pedido*. Route, component and
  variable names (`AdminLeadPage`, `LeadEditForm`, `lead`) are **out of scope** —
  code identifiers stay English, only rendered strings change. Same for the
  `EN-` ref prefix (see §9).
- `feature request` must NOT also become *pedido* — see §3.1.

---

## 2. Second drift: "request" means two things

`feature_requests` and `tour_requests` are both "requests" in English, and the
admin says "request" for both (`admin/feature-requests/page.tsx:89`,
`admin/sales/page.tsx:48`). Mapping both to *pedido* would re-create the exact
problem §1 fixes, one level down.

**Decision**: the toolkit backlog becomes **`sugestão` / `Sugestões`** — which is
also what the screen actually is ("somewhere to write down an idea", per its own
doc comment), and is plainer than *pedido de melhoria*.

This has a grammatical consequence stubs 2–3 must not miss: *sugestão* is
feminine, so every status and priority label agreeing with it changes gender —
`Nova`, `Planeada`, `Em curso`, `Concluída`, `Recusada`; `Baixa`, `Média`, `Alta`,
`Urgente`. See §3.5.

---

## 3. Glossary — one term per concept

### 3.1 Core nouns

| Concept | English today | **Portuguese** | Notes |
|---|---|---|---|
| Website enquiry / lead | enquiry, lead, submission | **pedido** | §1. Already in `contact-templates.ts`, `tour-request.ts` |
| Paid, confirmed booking | booking | **reserva** | Already in `emails.ts` |
| Quote / proposal | quote, proposal | **orçamento** | Feeds the `quote-flow` epic |
| The admin console itself | admin, dashboard, "this admin" | **painel** | `emails.ts:team.cta` already says *Ver no painel* |
| The dashboard *page* | Dashboard | **Início** | Distinct from *painel*, which is the whole console |
| Guest / customer | guest, customer | **cliente** | `emails.ts:team.guestHeading` says *Cliente* |
| Experience | experience | **experiência** | |
| Add-on / complement | add-on, complement | **extra** / **extras** | `emails.ts` says *Extras*; see §9 for the guest-form clash |
| Catalogue | catalogue | **catálogo** | |
| Departure (a sellable slot) | departure, slot | **partida** | `emails.ts` label *Partida* |
| Seat | seat | **lugar** / **lugares** | `tour-request.ts` says *lugares* |
| Party size | party, party size | **pessoas** / **Número de pessoas** | `tour-request.ts` and `emails.ts` both say *Pessoas* |
| Pipeline stage | stage | **fase** | Avoid *etapa* — pick one |
| Status | status | **estado** | |
| Toolkit idea/ask | feature request | **sugestão** | §2 |
| Audit log | audit log | **registo de atividade** | PT-PT *registo* |
| Team member account | account, user | **conta** | |
| The two of them | the team | **a equipa** | |
| Scheduled/automatic job | Scheduled job, retention job | **tarefa automática** | |
| Example/preview data | example data, placeholder | **dados de exemplo** / **Exemplo** | |
| In development | In development | **em construção** | |

### 3.2 Pipeline stages — `requestStatusMeta`, `lib/admin-format.ts:41`

These are board column headers, chips on a phone, and badges. Short wins.

| Key | English | **PT label** | **PT hint** |
|---|---|---|---|
| `new` | New | **Novo** | Sem resposta — ainda ninguém respondeu |
| `contacted` | Contacted | **Contactado** | À espera da resposta do cliente |
| `quoted` | Quoted | **Orçamentado** | Orçamento enviado |
| `booked` | Booked | **Reservado** | Confirmado |
| `archived` | Archived | **Arquivado** | Fechado, ou deixou de responder |

Masculine, agreeing with *pedido*. `Orçamentado` is the one word here that is not
everyday speech; the alternative is the noun `Orçamento`, which reads better alone
but breaks the adjective series. Flagged in §9.

### 3.3 Areas & navigation — `lib/admin-nav.ts`

Groups (`ADMIN_NAV_GROUP_ORDER:32`):

| English | **PT** |
|---|---|
| Overview | **Resumo** |
| Sales | **Vendas** |
| Marketing | **Marketing** |
| System | **Sistema** |
| Settings | **Definições** |

Entries — note the two `studio` labels are engineer-idiom and are simply dropped
(§4.4), not translated:

| `label` | **PT label** | `cardTitle` → **PT** | `shortLabel` → **PT** |
|---|---|---|---|
| Dashboard | **Início** | — | — |
| Sales | **Vendas** | Enquiries & bookings → **Pedidos e reservas** | Sales → **Vendas** |
| Calendar | **Calendário** | Availability → **Disponibilidade** | Calendar → **Calendário** |
| Experiences | **Experiências** | The catalogue → **O catálogo** | Catalogue → **Catálogo** |
| Blog studio | **Blog** | — | — |
| Social studio | **Redes sociais** | — | — |
| Email marketing | **Campanhas de email** | — | — |
| Referrals | **Recomendações** | — | — |
| Notifications | **Mensagens automáticas** | — | — |
| Feature requests | **Sugestões** | — | Requests → **Sugestões** |
| My account | **A minha conta** | My account → **A minha conta** | Account → **Conta** |
| Team accounts | **Equipa** | Team accounts → **Contas da equipa** | Team → **Equipa** |
| Audit log | **Registo de atividade** | Audit log → **Registo de atividade** | Audit → **Registo** |

`adminPageTitle` fallback `"Admin"` (`admin-nav.ts:290`) → **"Painel"**.

### 3.4 Roles — `adminRoleMeta`, `lib/admin-format.ts:88`

| Key | English | **PT** | **PT description** |
|---|---|---|---|
| `owner` | Owner | **Responsável** | Acesso total, incluindo as contas da equipa, o registo de atividade e exportar ou eliminar dados de clientes. |
| `collaborator` | Collaborator | **Colaborador** | Tudo o que é operação. Sem contas da equipa e sem exportar ou eliminar dados de clientes. |

*Responsável* over the literal *Proprietário*: Diogo & Rita are the people
responsible for the business, not shareholders of an account. Flagged in §9.

### 3.5 Other lifecycle vocabularies

`featureRequestStatusMeta` (`admin-format.ts:59`) — **feminine**, agreeing with
*sugestão* (§2):

| Key | English | **PT** |
|---|---|---|
| `new` | New | **Nova** |
| `planned` | Planned | **Planeada** |
| `in_progress` | In progress | **Em curso** |
| `completed` | Completed | **Concluída** |
| `declined` | Declined | **Recusada** |

`featureRequestPriorityMeta` (`:74`) — also feminine (*prioridade*):
Low → **Baixa**, Medium → **Média**, High → **Alta**, Urgent → **Urgente**.

`enquiryKindMeta` (`:150`): Tour → **Passeio**, Wedding → **Casamento**,
Event → **Evento**. (D10 already words the two doors *casamentos* + *eventos*.)

`experienceKindMeta` (`:159`): Signature → **Principal** (matching
`tour-request.ts:30` *Experiência principal*), Add-on → **Extra**.

Availability slot states (`availability-calendar.tsx`): open → **à venda**,
closed → **fechada**, full → **esgotada**, exclusive hold → **reserva privada**,
`null` → **não está à venda**, past → **já passou**.

### 3.6 Verbs and buttons

One verb per action, everywhere:

| English | **PT** | Pending form |
|---|---|---|
| Save / Save changes | **Guardar** / **Guardar alterações** | A guardar… |
| Add | **Adicionar** | A adicionar… |
| Edit | **Editar** | — |
| Cancel | **Cancelar** | — |
| Delete (catalogue entry) | **Eliminar** / **Eliminar definitivamente** | A eliminar… |
| Erase (guest record, GDPR) | **Eliminar** / **Eliminar definitivamente** | A eliminar… |
| Hide / Show (from website) | **Ocultar** / **Mostrar** | — |
| Archive / Reopen | **Arquivar** / **Reabrir** | — |
| Disable / Re-enable (account) | **Desativar** / **Reativar** | A desativar… |
| Sign in / Sign out | **Entrar** / **Sair** | A entrar… / A sair… |
| Sign out everywhere | **Sair de todos os dispositivos** | — |
| Approve | **Aprovar** | — |
| Preview | **Pré-visualizar** | — |
| Publish | **Publicar** | — |
| Export | **Exportar** | A preparar… |
| Upload / Replace / Remove (photo) | **Enviar** / **Substituir** / **Remover** | A enviar… |
| Put on sale / Close (a departure) | **Pôr à venda** / **Fechar** | A guardar… / A fechar… |
| Clear (a departure) | **Limpar** | A limpar… |
| Log contact | **Registar contacto** | A guardar… |
| Back | **Voltar** | — |
| Previous / Next | **Anterior** / **Seguinte** | — |
| Try again | **Tentar novamente** | — |

`Saved.` → **`Guardado.`** — one confirmation word, used by every action.

### 3.7 Register rules for stubs 2–3

1. *Você* implicit, singular, third-person verb: **"Toque num dia"**, never
   "Tu tocas" or "Vocês tocam".
2. Possessive **"a sua"/"o seu"** for the operator's own things
   ("a sua palavra-passe"), matching `content/`.
3. Gerund is European: **"A guardar…"**, never "Guardando…".
4. Titles are sentence case, as today — **"Nova experiência"**, not "Nova Experiência".
5. No exclamation marks in the admin. The guest site earns "Pedido enviado!";
   an operations console does not.
6. Never invent a diminutive or a filler ("Ups!", "Oh não"). The existing tone is
   calm and factual; keep it.
7. Dates and money: `pt-PT` locale (`lib/admin-format.ts:194,200` currently
   hard-code `"en-GB"`) — see §5.3.

---

## 4. Idiom list — English that must not be translated word-for-word

Every entry the copy lens flagged, plus the ones found while inventorying. The
rule for all of them: **say what a tour operator would say**, not what the English
metaphor says.

### 4.1 `admin/notifications/page.tsx:24` — "Set-and-forget"

> Set-and-forget messages: guests get confirmations, reminders and thank-yous at
> the right moment; you get an instant alert the second a booking or hot lead
> arrives.

"Set-and-forget" and "hot lead" are both untranslatable as metaphors ("configurar
e esquecer" reads as negligence; "pedido quente" reads as nonsense).

> **Configura-se uma vez e trabalha sozinho: os clientes recebem confirmações,
> lembretes e agradecimentos na altura certa; e recebe um aviso imediato assim
> que entra uma reserva ou um pedido com valor.**

### 4.2 `lead-edit-form.tsx:245` — "why it went quiet"

> Which car was promised, what was agreed on the phone, why it went quiet…

"Went quiet" has no PT idiom; what it means is *the customer stopped replying*.

> **Que carro foi prometido, o que ficou combinado ao telefone, porque é que o
> cliente deixou de responder…**

### 4.3 `admin/page.tsx:81–87` — ICM-speak in the dashboard hints

| English | Problem | **Portuguese** |
|---|---|---|
| `"Across all content pipelines"` (`:81`) | "pipeline" is a build-system word | **De todas as áreas de conteúdo** |
| `"Content pushed live"` (`:83`) | "pushed live" is a deploy word | **Já publicado no site** |
| `"In the toolkit backlog"` (`:87`) | "backlog" and "toolkit" are both ours, not theirs | **Na lista de melhorias** |
| `"Awaiting first contact"` (`:76`) | fine, but stiff | **À espera do primeiro contacto** |

Stat labels alongside them: `New leads` → **Pedidos novos**; `Drafts to review` →
**Rascunhos por rever**; `Published` → **Publicados**; `Open feature requests` →
**Sugestões em aberto**.

### 4.4 `admin-nav.ts:134,150` — "Blog studio" / "Social studio"

"Studio" is a product-marketing flourish with no PT equivalent that isn't a
recording studio. Drop the word rather than translate it: **Blog** and
**Redes sociais**. The area still says what it is on the card description.

Same treatment for **"Email marketing"** → **Campanhas de email** (the English is
an industry term Rita has no reason to know) and **"Referrals"** →
**Recomendações**.

### 4.5 Everything else that is idiom, not language

| Where | English | **Portuguese** |
|---|---|---|
| `blog/page.tsx:31` | "waiting for your one-click approval before going live" | à espera da sua aprovação antes de ir para o site |
| `blog/page.tsx:36` | "Publishing rhythm: 2 posts / month · next slot 8 Aug" | Ritmo de publicação: 2 artigos por mês · próximo a 8 de agosto |
| `blog/page.tsx:63` | "Review & publish" | Rever e publicar |
| `blog/page.tsx:72` | "Every post ships GEO-ready: structured data, PT + EN in sync…" | Cada artigo sai pronto para os motores de busca e assistentes de IA: dados estruturados, PT e EN em sintonia… |
| `social/page.tsx:43` | "TikTok · YouTube — later" | TikTok · YouTube — mais tarde |
| `social/page.tsx:48` | "Generate this week's posts" | Gerar as publicações desta semana |
| `social/page.tsx:91` | "never bots that put your accounts at risk" | nunca robôs que ponham as suas contas em risco |
| `email/page.tsx:87` | "Re-selling to someone who already loved a tour is far cheaper than finding a new customer" | Voltar a vender a quem já adorou um passeio custa muito menos do que encontrar um cliente novo |
| `referrals/page.tsx:33` | "Word of mouth, made measurable" | O passa-palavra, agora medido |
| `referrals/page.tsx:81` | "Mark fulfilled" | Marcar como entregue |
| `referrals/page.tsx:141` | "A friendly 'share your experience' email goes out after each tour" | Depois de cada passeio sai um email a convidar o cliente a partilhar a experiência |
| `sales/[id]/page.tsx:237` | "In their words" | Nas palavras do cliente |
| `sales/[id]/page.tsx:273` | "this lead has not been touched since it arrived" | ninguém mexeu neste pedido desde que chegou |
| `sales/page.tsx:56` | "Once customers submit the booking form, their enquiries appear here as cards on the board." | Quando alguém preencher o formulário do site, o pedido aparece aqui como cartão no quadro. |
| `availability-calendar.tsx:428` | "This month is behind you — page forward to plan the next one." | Este mês já passou — avance para planear o próximo. |
| `availability-calendar.tsx:435` | "Set the whole month" | Definir o mês inteiro |
| `availability-calendar.tsx:488` | "Sweeps touch both departures of every day…" | Estas ações abrangem as duas partidas de todos os dias a partir de hoje e substituem o que lá estivesse. |
| `calendar/actions.ts:180` | `cleared — back to "not decided"` | limpas — voltam a não estar decididas |
| `availability-calendar.tsx:376` | "Removes the decision entirely — they go back to not being on the calendar at all." | Apaga a decisão por completo — voltam a não existir no calendário. |
| `settings/account/page.tsx:54` | "a phone left in a taxi, a browser on a shared computer" | um telemóvel esquecido num táxi, um navegador num computador partilhado |
| `in-dev-marker.tsx:33` | "marks areas in development — final design, example data." | assinala áreas em construção — desenho final, dados de exemplo. |
| `in-dev-banner.tsx:18` | "In development — design preview" | Em construção — pré-visualização do desenho |
| `experiences/page.tsx:73` | "Showing the shipped catalogue" | A mostrar o catálogo de origem (see §9 — this message also names a `.sql` file at an operator) |
| `experience-form.tsx:458` | "Answer-first: what this is, where, and how long." | Direto ao assunto: o que é, onde e quanto tempo. |
| `experience-form.tsx` (Words card) | "the answer-first paragraph search engines and AI assistants quote" | o parágrafo que os motores de busca e os assistentes de IA citam |
| `admin-format.ts:45` | "Untouched — nobody has replied yet" | Sem resposta — ainda ninguém respondeu |
| `admin-format.ts:49` | "Done, or gone quiet" | Fechado, ou deixou de responder |
| `admin-shell.tsx` | "More" (toolbar), "All areas" (sheet) | Mais · Todas as áreas |
| `experience-form.tsx:169` | "How this experience shows up on the Sales board and table." | **stale** — the table was removed; PT says only *no quadro de Vendas* (§9) |

---

## 5. The inventory

Every user-facing string under `web/src/app/admin/` and
`web/src/components/admin/`, by file, in source order. Line numbers are against
`main` at `d8b5a58`. `—` in the PT column means the string is a proper noun, a
code identifier, an already-Portuguese string, or interpolated data.

Server-action result messages are included: they surface verbatim in
`role="alert"` / `role="status"` paragraphs, so they are UI copy.

### 5.1 `web/src/app/admin/`

#### `page.tsx` — dashboard (6)

| Line | English | **Portuguese** |
|---|---|---|
| 74 | New leads | Pedidos novos |
| 76 | Awaiting first contact | À espera do primeiro contacto |
| 79 | Drafts to review | Rascunhos por rever |
| 81 | Across all content pipelines | De todas as áreas de conteúdo |
| 83 | Published · Content pushed live | Publicados · Já publicado no site |
| 85–87 | Open feature requests · In the toolkit backlog | Sugestões em aberto · Na lista de melhorias |
| 95 | Overview *(sr-only)* | Resumo |
| 113 | Areas | Áreas |

#### `layout.tsx` — document metadata (3)

| Line | English | **Portuguese** |
|---|---|---|
| 16 | `title: "Agorasim Admin"` | Agorasim · Painel |
| 23 | `appleWebApp.title: "Agorasim Ops"` | Agorasim · Painel |
| 59 | `lang="en"` | **`lang="pt"`** — the switch stub 2 must make |

#### `notifications/page.tsx` (7)

| Line | English | **Portuguese** |
|---|---|---|
| 24 | Set-and-forget messages… *(idiom §4.1)* | §4.1 |
| 28 | Message templates | Modelos de mensagem |
| 39 | For you / For guests | Para si / Para os clientes |
| 71 | On / Off *(sr-only)* | Ligado / Desligado |
| 79 | Recently sent | Enviadas recentemente |
| 101 | Reminders cut no-shows; a well-timed thank-you drives reviews and referrals. All messages go out in the guest's language. | Os lembretes reduzem as faltas; um agradecimento na altura certa traz avaliações e recomendações. Todas as mensagens saem na língua do cliente. |

Preview rows behind it live in `lib/admin-preview.ts` — see §5.3.

#### `sales/page.tsx` (7)

| Line | English | **Portuguese** |
|---|---|---|
| 48 | `{n} enquiry / enquiries` | `{n} pedido / {n} pedidos` |
| 55 | No leads yet | Ainda não há pedidos |
| 56 | Once customers submit the booking form… *(idiom §4.5)* | §4.5 |
| 70–72 | `{n} card(s) marked **Example** are placeholder bookings — real ones appear here the moment instant booking and payments go live.` | `{n} cartão marcado / cartões marcados como **Exemplo** são reservas de demonstração — as verdadeiras aparecem aqui assim que a reserva e o pagamento online entrarem em funcionamento.` |
| 84 | Unconverted enquiries are anonymised after {n} days | Os pedidos que não deram reserva são anonimizados ao fim de {n} dias |
| 85 | · {n} due at the next run | · {n} na próxima limpeza |

#### `sales/[id]/page.tsx` — one pedido (20)

| Line | English | **Portuguese** |
|---|---|---|
| 107 | Received | Recebido |
| 112 | via {source} | via {source} |
| 130 | Email *(button)* | Email |
| 136 | Call | Telefonar |
| 149 | WhatsApp | — |
| 169 | Email *(field)* | Email |
| 177 | Phone | Telefone |
| 181 | Experience | Experiência |
| 196 | Party | Pessoas |
| 200 | Preferred date | Data preferida |
| 204 | Stage | Fase |
| 225 | No marketing opt-in — this address is for answering the enquiry only. | Sem autorização de marketing — este endereço serve apenas para responder ao pedido. |
| 231 | Anonymised by the retention job on {date}. | Anonimizado pela limpeza automática a {date}. |
| 237 | In their words *(idiom §4.5)* | Nas palavras do cliente |
| 267 | History | Histórico |
| 268 | Every change made to this lead, newest first. | Todas as alterações a este pedido, da mais recente para a mais antiga. |
| 273 | Nothing yet — this lead has not been touched since it arrived. | Ainda nada — ninguém mexeu neste pedido desde que chegou. |
| 280 | Scheduled job | Tarefa automática |
| 67, 84 | `t(…, "en")` — experience names resolved in **English** | **`"pt"`** — a PT console showing EN experience names is the drift this epic exists to end |

#### `calendar/page.tsx` (2)

| Line | English | **Portuguese** |
|---|---|---|
| 64 | No bookable tours in the catalogue yet — add one under Experiences first. | Ainda não há passeios reserváveis no catálogo — crie um em Catálogo primeiro. |
| 107–109 | Two departures a day — 10:00 and 14:00 — per tour. Tap a day to put its departures on sale, close them, or set how many seats they have. Departures that aren't on the calendar can't be booked at all. | Duas partidas por dia — 10:00 e 14:00 — em cada passeio. Toque num dia para pôr as partidas à venda, fechá-las ou definir quantos lugares têm. Partidas que não estão no calendário não podem ser reservadas. |
| 97, 116, 118 | `formatDay(…, "en")`, `formatMonth(…, "en")`, `WEEKDAY_INITIALS.en` | **`"pt"` / `.pt`** — already exist in `lib/availability.ts` |
| 102 | `entry.title.en \|\| entry.title.pt` (tour tab names) | **`.pt \|\| .en`** |

#### `blog/page.tsx` (10)

| Line | English | **Portuguese** |
|---|---|---|
| 11–14 | Draft / In review / Approved / Published *(status keys of preview data)* | Rascunho / Em revisão / Aprovado / Publicado |
| 31 | The AI pipeline will draft articles in your voice on a schedule (2–4 a month) — each waits here for your one-click approval before going live, in both languages. | A IA escreve artigos no seu tom com regularidade (2 a 4 por mês) — cada um espera aqui pela sua aprovação antes de ir para o site, nas duas línguas. |
| 36 | Publishing rhythm: 2 posts / month · next slot 8 Aug | Ritmo de publicação: 2 artigos por mês · próximo a 8 de agosto |
| 40 | Draft a new article | Escrever um artigo novo |
| 59 | Preview | Pré-visualizar |
| 63 | Edit / Review & publish | Editar / Rever e publicar |
| 72 | Every post ships GEO-ready… *(idiom §4.5)* | §4.5 |

#### `social/page.tsx` (10)

| Line | English | **Portuguese** |
|---|---|---|
| 11–14 | Scheduled / Needs approval / Posted | Agendada / Falta aprovar / Publicada |
| 31 | Captions and a posting calendar are generated for you; once you approve, posts publish automatically through Instagram's and Facebook's official APIs. | As legendas e o calendário de publicações são gerados para si; depois de aprovar, as publicações saem automaticamente pelas vias oficiais do Instagram e do Facebook. |
| 37, 41 | Instagram / Facebook | — |
| 43 | TikTok · YouTube — later | TikTok · YouTube — mais tarde |
| 48 | Generate this week's posts | Gerar as publicações desta semana |
| 53 | Posting queue | Fila de publicação |
| 77 | Approve | Aprovar |
| 81 | Edit | Editar |
| 91 | Only official platform APIs are used — never bots that put your accounts at risk. Other networks join after their per-platform approval. | Usamos apenas as vias oficiais de cada plataforma — nunca robôs que ponham as suas contas em risco. As outras redes entram depois da aprovação de cada uma. |

#### `email/page.tsx` (8)

| Line | English | **Portuguese** |
|---|---|---|
| 11–13 | Sent / Scheduled / Draft | Enviada / Agendada / Rascunho |
| 30 | Bring past guests back with bilingual campaigns drafted in your voice — you review every send, and opens, clicks and unsubscribes are tracked automatically. | Traga antigos clientes de volta com campanhas bilingues escritas no seu tom — revê cada envio, e as aberturas, cliques e cancelamentos são contabilizados automaticamente. |
| 34 | Audience segments | Grupos de clientes |
| 53 | Campaigns | Campanhas |
| 57 | Draft a campaign | Escrever uma campanha |
| 78 | Review & schedule / View report | Rever e agendar / Ver relatório |
| 87 | Re-selling to someone who already loved a tour… *(idiom §4.5)* | §4.5 |

#### `referrals/page.tsx` (12)

| Line | English | **Portuguese** |
|---|---|---|
| 33 | Word of mouth, made measurable: every guest gets a personal link, referred bookings are tracked automatically, and this page shows who to thank (and with what). | O passa-palavra, agora medido: cada cliente recebe um link pessoal, as reservas que vierem por aí são contabilizadas automaticamente, e esta página mostra a quem agradecer (e com quê). |
| 51 | Top referrers | Quem mais recomenda |
| 73, 103 | Shares | Partilhas |
| 75, 104 | Bookings | Reservas |
| 81, 129 | Mark fulfilled | Marcar como entregue |
| 97 | Guests with a personal link, ranked by referred bookings — example data. | Clientes com link pessoal, por ordem das reservas que trouxeram — dados de exemplo. |
| 101 | Guest | Cliente |
| 102 | Personal link | Link pessoal |
| 105 | Reward | Recompensa |
| 107 | Actions *(sr-only)* | Ações |
| 141 | A friendly "share your experience" email goes out after each tour — see Notifications. | Depois de cada passeio sai um email a convidar o cliente a partilhar a experiência — ver Mensagens automáticas. |

#### `experiences/page.tsx` (8)

| Line | English | **Portuguese** |
|---|---|---|
| 60 | Add | Adicionar |
| 66–67 | {n} experience / experiences · {n} shown on the website | {n} experiência / {n} experiências · {n} visível no site / {n} visíveis no site |
| 73 | Showing the shipped catalogue | A mostrar o catálogo de origem |
| 74–77 | The database has no experiences yet, so the website is rendering the copy that came with the code. Run the catalogue migration (`drizzle/0008_…sql`) and these become editable. | A base de dados ainda não tem experiências, por isso o site está a mostrar o texto que veio com o código. **(§9 — this sentence names a `.sql` file at an operator; flagged, not silently rewritten.)** |
| 112 | Hidden | Oculta |
| 129 | No price list — can't be booked online | Sem tabela de preços — não pode ser reservada online |
| 145 | Edit | Editar |
| 155 | Changes go live on the website as soon as they are saved. Hiding an experience takes it off the site but keeps it readable on the enquiries that chose it. | As alterações aparecem no site assim que guardar. Ocultar uma experiência tira-a do site, mas mantém-na legível nos pedidos que a escolheram. |
| 84 | `t(entry.title, "en")` | **`"pt"`** |

#### `experiences/[id]/page.tsx` (1)

| Line | English | **Portuguese** |
|---|---|---|
| 76 | Removing this entry for good leaves enquiries that chose it pointing at a name nothing explains. Hiding it from the website is reversible; this is not. | Apagar esta entrada de vez deixa os pedidos que a escolheram a apontar para um nome que já nada explica. Ocultá-la do site tem volta; isto não tem. |
| 79 | `t(row.title, "en")` | **`"pt"`** |

`experiences/new/page.tsx` — no strings of its own.

#### `feature-requests/page.tsx` (4)

| Line | English | **Portuguese** |
|---|---|---|
| 89 | {n} request / requests | {n} sugestão / {n} sugestões |
| 95 | No feature requests yet. Add the first one above. | Ainda não há sugestões. Escreva a primeira aqui em cima. |
| 127 | Scheduled job | Tarefa automática |
| 154 | Feature request pages *(pagination aria-label)* | Páginas de sugestões |

#### `settings/account/page.tsx` (7)

| Line | English | **Portuguese** |
|---|---|---|
| 33 | Last signed in: {date} | Última entrada: {date} |
| 39 | Change your password | Mudar a palavra-passe |
| 40 | Everything you do in here is recorded against this account, so it should be yours alone. | Tudo o que faz aqui fica registado nesta conta, por isso ela deve ser só sua. |
| 52 | Sign out everywhere | Sair de todos os dispositivos |
| 53 | Ends every session on every device — a phone left in a taxi, a browser on a shared computer. You will need to sign in again here too. | Termina todas as sessões em todos os dispositivos — um telemóvel esquecido num táxi, um navegador num computador partilhado. Também terá de voltar a entrar aqui. |

#### `settings/users/page.tsx` (10)

| Line | English | **Portuguese** |
|---|---|---|
| 41 | {n} account(s). Accounts are disabled rather than deleted, so the audit log always resolves to a real person. | {n} conta / {n} contas. As contas são desativadas em vez de apagadas, para o registo de atividade corresponder sempre a uma pessoa real. |
| 57, 126 | Disabled | Desativada |
| 59, 128 | Active | Ativa |
| 69, 94 | Added | Criada |
| 71, 95 | Last sign-in | Última entrada |
| 93 | Person | Pessoa |
| 94 | Role | Função |
| 97 | Status | Estado |
| 98 | Actions | Ações |

#### `settings/audit/page.tsx` (5)

| Line | English | **Portuguese** |
|---|---|---|
| 50 | Nothing recorded yet | Ainda não há registos |
| 51 | Every change made in this admin — status updates, erasures, account changes — is recorded here with who made it and when. | Todas as alterações feitas no painel — mudanças de estado, eliminações, alterações de contas — ficam aqui registadas, com quem as fez e quando. |
| 62 | {n} entry / entries | {n} registo / {n} registos |
| 72, 92 | Scheduled job · Recorded change, as JSON *(aria-label)* | Tarefa automática · Alteração registada, em JSON |
| 105 | Audit log pages | Páginas do registo |

#### `login/page.tsx` (4)

| Line | English | **Portuguese** |
|---|---|---|
| 30 | Agorasim | — |
| 31 | Operations | Painel |
| 35 | Sign in | Entrar |
| 36 | With your own account — everything in here is recorded against it. | Com a sua própria conta — tudo o que aqui se faz fica registado nela. |

`admin-shell.tsx:1097` sidebar carries the same pair (`Agorasim` / `Operations`) —
translate both to the same words.

#### `forbidden/page.tsx` (3)

| Line | English | **Portuguese** |
|---|---|---|
| 32 | Owner access required | É preciso ser responsável |
| 34 | You are signed in as {name} ({role}). That area is limited to owner accounts — managing team accounts, reading the audit log and exporting or erasing guest data. Ask Diogo or Rita if you need it. | Entrou como {name} ({role}). Essa área é só para responsáveis — gerir as contas da equipa, ler o registo de atividade e exportar ou eliminar dados de clientes. Fale com o Diogo ou a Rita se precisar. |
| 40 | Back to the dashboard | Voltar ao início |
| 34 | `{viewer.role}` renders the **raw enum** (`owner`/`collaborator`) | use `adminRoleMeta[role].label` |

#### `error.tsx` (1) · `loading.tsx` (1) · `not-found.tsx` (0)

| File:line | English | **Portuguese** |
|---|---|---|
| `error.tsx:53` | Reference: {digest} | Referência: {digest} |
| `loading.tsx:14` | Loading *(aria-label)* | A carregar |

The rest of both screens comes from `content/system.ts` → §5.3.

#### `actions.ts` — server-action messages (36)

| Line | English | **Portuguese** |
|---|---|---|
| 76 | Incorrect email or password. | Email ou palavra-passe incorretos. |
| 196, 373 | Couldn't update that status. | Não foi possível mudar o estado. |
| 208, 498 | That submission no longer exists. | Esse pedido já não existe. |
| 211, 290, 345, 383 | Couldn't save — the change was not stored. | Não foi possível guardar — a alteração não ficou registada. |
| 271, 330 | That lead no longer exists. | Esse pedido já não existe. |
| 281 | Nothing to save. | Não havia nada para guardar. |
| 301 | Saved. | Guardado. |
| 320 | Couldn't find that lead. | Não foi possível encontrar esse pedido. |
| 443 | Something went wrong saving the request. Please try again. | Não foi possível guardar a sugestão. Tente novamente. |
| 483 | Type DELETE to confirm the erasure. | Escreva DELETE para confirmar a eliminação. *(token — §9)* |
| 514 | Couldn't record the erasure, so nothing was deleted. Try again. | Não foi possível registar a eliminação, por isso nada foi apagado. Tente novamente. |
| 521 | Couldn't delete that submission. | Não foi possível apagar esse pedido. |
| 524 | Submission erased. | Pedido eliminado. |
| 550 | Enter the email address to export. | Indique o email a exportar. |
| 569 | Couldn't build that export. | Não foi possível preparar a exportação. |
| 613 | That address already has an account. | Esse email já tem conta. |
| 614, 753 | That password is too short. | Essa palavra-passe é demasiado curta. |
| 627 | {name} can now sign in. | {name} já pode entrar. |
| 647, 654, 688, 691 | Couldn't find that account. | Não foi possível encontrar essa conta. |
| 650 | You can't disable your own account. | Não pode desativar a sua própria conta. |
| 655 | That account is already disabled. | Essa conta já está desativada. |
| 658 | That's the last active owner — promote someone else first. | É o último responsável ativo — promova outra pessoa primeiro. |
| 665 | Couldn't disable that account. | Não foi possível desativar essa conta. |
| 677 | {name} can no longer sign in. | {name} já não pode entrar. |
| 697 | Couldn't re-enable that account. | Não foi possível reativar essa conta. |
| 708 | {name} can sign in again. | {name} já pode voltar a entrar. |
| 748 | That isn't your current password. | Essa não é a sua palavra-passe atual. |

#### `calendar/actions.ts` (11)

| Line | English | **Portuguese** |
|---|---|---|
| 67 | Couldn't read which days to change. | Não foi possível perceber que dias mudar. |
| 70, 137 | No days were selected. | Não foi selecionado nenhum dia. |
| 71, 138 | Pick at least one departure. | Escolha pelo menos uma partida. |
| 86, 164 | Couldn't save — the calendar was not changed. | Não foi possível guardar — o calendário não mudou. |
| 105 | {days} on sale ({n} departures), {c} seat(s) each. | {days} à venda ({n} partidas), {c} lugar cada / {c} lugares cada. |
| 106 | {days} closed. | {days} fechados. |
| 134 | Couldn't read which days to clear. | Não foi possível perceber que dias limpar. |
| 147 | Couldn't check for bookings, so nothing was cleared. Try again. | Não foi possível verificar se havia reservas, por isso nada foi limpo. Tente novamente. |
| 153–155 | {days} has/have bookings on it/them, so nothing was cleared. Close the day instead — the bookings stay visible. | {days} tem reservas / têm reservas, por isso nada foi limpo. Feche o dia em vez disso — as reservas continuam visíveis. |
| 180 | {n} departure(s) cleared — back to "not decided". | {n} partida limpa / {n} partidas limpas — voltam a não estar decididas. |

The `days()` helper feeding these must be checked for its own EN wording.

#### `experiences/actions.ts` (13)

| Line | English | **Portuguese** |
|---|---|---|
| 132 | Another experience already uses that address. | Já há outra experiência com esse endereço. |
| 156, 225, 278, 352 | That experience no longer exists. | Essa experiência já não existe. |
| 162, 245 | Couldn't save — the change was not stored. | Não foi possível guardar — a alteração não ficou registada. |
| 193 | Experience updated. / Experience added. | Experiência atualizada. / Experiência adicionada. |
| 214 | Couldn't find that experience. | Não foi possível encontrar essa experiência. |
| 239 | {slug} is back on the website. | {slug} voltou ao site. |
| 240 | {slug} is archived and no longer shown to guests. | {slug} está arquivada e deixou de ser mostrada aos clientes. |
| 263 | Couldn't move that experience. | Não foi possível mover essa experiência. |
| 320 | Couldn't save the new order. | Não foi possível guardar a nova ordem. |
| 340 | Type DELETE to confirm. | Escreva DELETE para confirmar. *(token — §9)* |
| 364 | Couldn't record the deletion, so nothing was deleted. Try again. | Não foi possível registar a eliminação, por isso nada foi apagado. Tente novamente. |
| 371 | Couldn't delete that experience. | Não foi possível apagar essa experiência. |
| 379 | {slug} deleted. | {slug} apagada. |

### 5.2 `web/src/components/admin/`

#### `admin-shell.tsx` (6)

| Line | English | **Portuguese** |
|---|---|---|
| 68 | Sign out | Sair |
| 137 | Admin *(bottom-nav aria-label)* | Painel |
| 154 | More | Mais |
| 172 | All areas | Todas as áreas |
| 227 | Back *(app-bar aria-label)* | Voltar |
| 244–245 | Agorasim / Operations | Agorasim / Painel |

Group titles (`:180`, `:250`) and item labels come from `admin-nav.ts` → §3.3.
`ViewerFooter:59` renders the **raw role enum** under the name — use
`adminRoleMeta[role].label`.

#### `availability-calendar.tsx` (33)

| Line | English | **Portuguese** |
|---|---|---|
| 67 | `SLOT_SHORT` `10h` / `14h` | — |
| 99 | {n} — past | {n} — já passou |
| 108 | {short} not on sale | {short} não está à venda |
| 109 | {short} closed | {short} fechada |
| 110 | {short} private booking | {short} reserva privada |
| 111 | {short} full | {short} esgotada |
| 112 | {short} {n} of {c} seats left | {short} {n} de {c} lugares livres |
| 247 | {short}: not on sale | {short}: não está à venda |
| 248 | {short}: closed | {short}: fechada |
| 249 | {short}: private booking | {short}: reserva privada |
| 250 | {short}: {n} of {c} sold | {short}: {n} de {c} vendidos |
| 264 | Which departures *(group aria-label)* | Que partidas |
| 282 | Morning · 10:00 / Afternoon · 14:00 | Manhã · 10:00 / Tarde · 14:00 |
| 299 | Seats per departure | Lugares por partida |
| 306 | One seat fewer | Menos um lugar |
| 322 | One seat more | Mais um lugar |
| 330 | {n} already sold | {n} já vendidos |
| 337 | Note (only you see this) | Nota (só a equipa vê) |
| 342 | `placeholder="Casamento, revisão do carro…"` | — *(already PT)* |
| 353 | Cancel | Cancelar |
| 359, 362 | Closing… / Close | A fechar… / Fechar |
| 363–364 | Saving… / Put on sale | A guardar… / Pôr à venda |
| 372–373 | Clearing… / Clear these departures | A limpar… / Limpar estas partidas |
| 376 | Removes the decision entirely — they go back to not being on the calendar at all. | Apaga a decisão por completo — voltam a não existir no calendário. |
| 427 | This month is behind you — page forward to plan the next one. | Este mês já passou — avance para planear o próximo. |
| 435 | Set the whole month | Definir o mês inteiro |
| 445, 458, 471 | Opening… / Closing… | A abrir… / A fechar… |
| 446 | Open all {n} | Abrir os {n} dias |
| 459 | Open weekends ({n}) | Abrir fins de semana ({n}) |
| 472 | Close all | Fechar tudo |
| 488–490 | Sweeps touch both departures of every day from today onwards… Seats default to {n} per departure; open a day to adjust one. | Estas ações abrangem as duas partidas de todos os dias a partir de hoje e substituem o que lá estivesse. Ficam com {n} lugares por partida; abra um dia para acertar. |
| 547 | Tour *(tablist aria-label)* | Passeio |
| 570 | Previous month | Mês anterior |
| 588 | Next month | Mês seguinte |
| 649–650 | {n} departure(s) on sale this month · {n} seat(s) still available | {n} partida à venda / {n} partidas à venda este mês · {n} lugar ainda disponível / {n} lugares ainda disponíveis |
| 665 | on sale, seats left | à venda, lugares livres |
| 669 | full | esgotada |
| 673 | private booking | reserva privada |
| 677 | closed by you | fechada por si |
| 681 | not on sale | não está à venda |

`Mês anterior` / `Mês seguinte` already exist verbatim in
`content/tour-request.ts:79–80` — same words, deliberately.

#### `lead-edit-form.tsx` (16)

| Line | English | **Portuguese** |
|---|---|---|
| 47 | Saving… / Save changes | A guardar… / Guardar alterações |
| 88 | Details | Detalhes |
| 89 | Correct what the form got wrong, and keep the team's notes with the lead rather than in a phone. | Corrija o que o formulário trouxe errado e guarde aqui as notas da equipa, em vez de as ter no telemóvel. |
| 100 | Name | Nome |
| 119 | Email | Email |
| 137 | Phone | Telefone |
| 149 | Kind | Tipo |
| 160 | Experience | Experiência |
| 166 | Not decided | Por decidir *(the guest form says "Sem preferência" — different speaker, §9)* |
| 170, 223 | (archived) | (arquivada) |
| 177 | Party size | Número de pessoas |
| 190 | Preferred date | Data preferida |
| 198 | `placeholder="15 August, late summer, flexible…"` | 15 de agosto, fim do verão, flexível… |
| 204 | Add-ons | Extras |
| 232 | What they wrote | O que o cliente escreveu |
| 238 | Team notes *(never shown to the guest)* | Notas da equipa (nunca são mostradas ao cliente) |
| 245 | `placeholder="Which car was promised…"` *(idiom §4.2)* | §4.2 |
| 256 | Saved. | Guardado. |

#### `sales-board.tsx` (4) · `sales-stage-pager.tsx` (2)

| Line | English | **Portuguese** |
|---|---|---|
| board 67 | Nothing in {stage} right now. | Nada em {fase} de momento. *(check the `.toLowerCase()` still reads right in PT)* |
| board 91 | Example | Exemplo |
| board 109 | {n} person / people | {n} pessoa / {n} pessoas |
| board 134 | Scheduled job | Tarefa automática |
| pager 229 | Pipeline stages *(nav aria-label)* | Fases |
| pager 248 | {n} record / records *(badge aria-label)* | {n} registo / {n} registos |

Column labels and hints come from `requestStatusMeta` → §3.2.

#### `status-menu.tsx` (1) · `request-status-select.tsx` (1) · `feature-request-status-select.tsx` (1)

| Line | English | **Portuguese** |
|---|---|---|
| menu 94 | Set status | Mudar o estado |
| request 34 | Status for {name} — currently {label} | Estado de {name} — atualmente {label} |
| feature 33 | Status for "{title}" — currently {label} | Estado de "{title}" — atualmente {label} |

#### `delete-submission-dialog.tsx` (7)

| Line | English | **Portuguese** |
|---|---|---|
| 25 | Erasing… / Erase permanently | A eliminar… / Eliminar definitivamente |
| 75 | Erase the record for {name} *(aria-label)* | Eliminar o registo de {name} |
| 79 | Erase | Eliminar |
| 91 | Erase this person's enquiry? | Eliminar o pedido desta pessoa? |
| 93–96 | The whole record for {name} is deleted from the database — name, email, phone and message. This cannot be undone. The audit log keeps a note that an erasure happened, with no identifying details in it. | Todo o registo de {name} é apagado da base de dados — nome, email, telefone e mensagem. Não há como voltar atrás. O registo de atividade guarda apenas a nota de que houve uma eliminação, sem dados que identifiquem alguém. |
| 101 | Type {DELETE} to confirm | Escreva {DELETE} para confirmar *(token — §9)* |
| 113 | Cancel | Cancelar |

#### `experience-form.tsx` (29)

| Line | English | **Portuguese** |
|---|---|---|
| 74 | Saving… / Save experience / Add experience | A guardar… / Guardar experiência / Adicionar experiência |
| 163 | Icon | Ícone |
| 169 | How this experience shows up on the Sales board **and table**. | Como esta experiência aparece no quadro de Vendas. *(§9 — "and table" is stale)* |
| 231 | Questions & answers | Perguntas e respostas |
| 248 | Remove question {i} | Remover pergunta {i} |
| 258, 271 | `Pergunta (PT)` / `Resposta (PT)` | — *(already PT)* |
| 259, 272 | Question {i} in Portuguese / Answer {i} in Portuguese | Pergunta {i} em português / Resposta {i} em português |
| 264, 278 | `Question (EN)` / `Answer (EN)` | — *(labels the EN field; stays)* |
| 265, 279 | Question {i} in English / Answer {i} in English | Pergunta {i} em inglês / Resposta {i} em inglês |
| 333 | Edit experience / New experience | Editar experiência / Nova experiência |
| 335 | What guests see on the website, and what the admin draws for it. Portuguese and English are both required — the site has no fallback language. | O que os clientes veem no site e o que o painel desenha para esta entrada. Português e inglês são ambos obrigatórios — o site não tem língua de recurso. |
| 342 | Web address | Endereço no site |
| 349 | `placeholder="rural-saloia"` | — |
| 355 | Appears in the page URL and is stored on every enquiry. Changing it breaks existing links. | Aparece no endereço da página e fica guardado em todos os pedidos. Se mudar, os links antigos deixam de funcionar. |
| 367 | Type | Tipo |
| 386 | Prices | Preços |
| 389 | No price list yet — this entry cannot be booked and paid for online; guests get the enquiry form instead. | Ainda sem tabela de preços — esta entrada não pode ser reservada e paga online; os clientes recebem o formulário de pedido. |
| 392 | The price list (shared/private tiers, child rates, minimums) is managed with Jamie for now — changing a price is a message away. An editor for it is on the roadmap. | A tabela de preços (partilhado/privado, crianças, mínimos) é gerida com o Jamie para já — mudar um preço é só mandar mensagem. Um editor está previsto. |
| 399 | Order | Ordem |
| 404 | Lower numbers come first. The list has arrows for this too. | Números mais baixos aparecem primeiro. A lista também tem setas para isto. |
| 413 | Shown on the website | Visível no site |
| 420 | Guests can see and choose this experience | Os clientes podem ver e escolher esta experiência |
| 433 | Words | Texto |
| 435 | The summary is the answer-first paragraph search engines and AI assistants quote — keep it factual and about 40 words. | O resumo é o parágrafo que os motores de busca e os assistentes de IA citam — factual e à volta de 40 palavras. |
| 442 | Name | Nome |
| 449–450 | Tagline · One line, under the name. | Frase de apresentação · Uma linha, por baixo do nome. |
| 457–458 | Summary · Answer-first: what this is, where, and how long. | Resumo · Direto ao assunto: o que é, onde e quanto tempo. |
| 466–467 | Description · The full description. Leave a blank line between paragraphs. | Descrição · A descrição completa. Deixe uma linha em branco entre parágrafos. |
| 473–474 | Highlights · One per line — these become the bulleted list. | Destaques · Um por linha — dão origem à lista de pontos. |
| 480, 482 | Duration · `placeholder {pt: "Aprox. 2h", en: "Approx. 2h"}` | Duração · — |
| 488–489 | Image description · Read aloud by screen readers, and used when the image cannot load. | Descrição da imagem · Lida em voz alta pelos leitores de ecrã e usada quando a imagem não carrega. |

The `pt` / `en` chips on each bilingual field (`:126`) stay as language codes.

#### `experience-image-field.tsx` (7)

| Line | English | **Portuguese** |
|---|---|---|
| 60 | That file isn't a photo. Use a JPEG, PNG, WebP or AVIF image. | Esse ficheiro não é uma fotografia. Use uma imagem JPEG, PNG, WebP ou AVIF. |
| 64 | That photo is too large — the limit is {n} MB. Most phones can export a smaller copy. | Essa fotografia é demasiado grande — o limite é {n} MB. A maioria dos telemóveis consegue guardar uma cópia mais pequena. |
| 84–85 | The upload didn't go through. Check your connection and try again — if it never works, image storage isn't configured for this deployment yet. | O envio não foi por diante. Verifique a ligação e tente outra vez — se nunca funcionar, o armazenamento de imagens ainda não está configurado nesta instalação. |
| 98 | Image | Imagem |
| 117 | The photo currently chosen for this experience *(alt)* | A fotografia escolhida para esta experiência |
| 132, 158 | Uploading… {n}% / Replace / Choose a photo | A enviar… {n}% / Substituir / Escolher uma fotografia |
| 141 | Remove | Remover |
| 165 | Shown on the website next to this experience. JPEG, PNG, WebP or AVIF, up to {n} MB. | Aparece no site junto a esta experiência. JPEG, PNG, WebP ou AVIF, até {n} MB. |

#### `experience-row-actions.tsx` (8)

| Line | English | **Portuguese** |
|---|---|---|
| 89 | Move {name} up | Mover {name} para cima |
| 96 | Move {name} down | Mover {name} para baixo |
| 129 | Hide {name} from the website / Show {name} again | Ocultar {name} do site / Mostrar {name} outra vez |
| 145 | Deleting… / Delete permanently | A apagar… / Apagar definitivamente |
| 178 | Delete {name} *(aria-label)* | Apagar {name} |
| 182 | Delete | Apagar |
| 196 | Delete {name}? | Apagar {name}? |
| 198–201 | The entry is removed from the database. Enquiries that chose it keep the slug on file, but nothing will explain what it was. Hiding it from the website is almost always the better move. | A entrada é removida da base de dados. Os pedidos que a escolheram guardam o endereço, mas deixa de haver nada que explique o que era. Ocultá-la do site é quase sempre a melhor opção. |
| 206 | Type {DELETE} to confirm | Escreva {DELETE} para confirmar *(§9)* |

Note the deliberate split kept in PT: a guest record is **eliminado** (GDPR
erasure), a catalogue entry is **apagado**. Two different acts, two verbs.

#### `feature-request-form.tsx` (9)

| Line | English | **Portuguese** |
|---|---|---|
| 20 | Saving… / Add request | A guardar… / Adicionar sugestão |
| 45 | New feature request | Nova sugestão |
| 47 | Capture an idea or ask for the toolkit. Only a title and description are required. | Escreva uma ideia ou um pedido de melhoria. Só o título e a descrição são obrigatórios. |
| 53 | Title | Título |
| 58 | `placeholder="e.g. Export submissions to CSV"` | ex.: exportar os pedidos para CSV |
| 68 | Description | Descrição |
| 74 | `placeholder="Describe the feature, the problem it solves, and anything that would help us build it."` | Descreva a melhoria, o problema que resolve e tudo o que ajude a construí-la. |
| 92 | Category · `placeholder="e.g. Website, Booking"` | Categoria · ex.: Site, Reservas |
| 101 | Priority | Prioridade |
| 121 | Request added. | Sugestão adicionada. |

#### `login-form.tsx` (3) · `change-password-form.tsx` (7)

| Line | English | **Portuguese** |
|---|---|---|
| login 14 | Signing in… / Sign in | A entrar… / Entrar |
| login 38 | Email | Email |
| login 49 | Password | Palavra-passe |
| pwd 15 | Saving… / Change password | A guardar… / Mudar palavra-passe |
| pwd 37 | Current password | Palavra-passe atual |
| pwd 53 | New password | Nova palavra-passe |
| pwd 70 | Repeat new password | Repetir a nova palavra-passe |
| pwd 91 | Changing your password signs you out on every device, including this one. | Mudar a palavra-passe termina a sessão em todos os dispositivos, incluindo este. |

#### `invite-user-form.tsx` (8)

| Line | English | **Portuguese** |
|---|---|---|
| 17 | Creating… / Create account | A criar… / Criar conta |
| 36 | Add someone to the team | Adicionar alguém à equipa |
| 37 | Set a temporary password and pass it on directly. They change it from their own account screen the first time they sign in. | Defina uma palavra-passe temporária e entregue-a em mão. A pessoa muda-a no ecrã da própria conta quando entrar pela primeira vez. |
| 45 | Name | Nome |
| 57 | Email | Email |
| 74 | Temporary password | Palavra-passe temporária |
| 91 | Role | Função |
| 99 | `adminRoleMeta.collaborator.description` | §3.4 |

#### `sign-out-everywhere-button.tsx` (5)

| Line | English | **Portuguese** |
|---|---|---|
| 21 | Signing out… / Sign out everywhere | A terminar… / Sair de todos os dispositivos |
| 38 | Sign out everywhere | Sair de todos os dispositivos |
| 44 | Sign out of every device? | Terminar a sessão em todos os dispositivos? |
| 45 | Every session for your account ends immediately, including this one. Your password does not change. | Todas as sessões da sua conta terminam de imediato, incluindo esta. A palavra-passe não muda. |
| 52 | Cancel | Cancelar |

#### `subject-export-form.tsx` (6)

| Line | English | **Portuguese** |
|---|---|---|
| 17 | Building… / Export | A preparar… / Exportar |
| 57 | Export someone's data | Exportar os dados de uma pessoa |
| 58 | Answers a subject-access request: every record we hold against one email address, across every table, as a JSON file. The export itself is recorded in the audit log. | Responde a um pedido de acesso a dados: tudo o que temos guardado sobre um email, em todas as tabelas, num ficheiro JSON. A própria exportação fica registada no registo de atividade. |
| 66 | Email address | Endereço de email |
| 85 | Downloaded {filename} | Transferido {filename} |

#### `user-row-actions.tsx` (7)

| Line | English | **Portuguese** |
|---|---|---|
| 53 | Re-enable | Reativar |
| 67 | Disable | Desativar |
| 78 | Disable {name}? | Desativar {name}? |
| 79 | They cannot sign in and every session they have ends now. The account itself is kept, so the audit log still shows what they did. You can re-enable it later. | A pessoa deixa de poder entrar e todas as sessões terminam já. A conta é mantida, para o registo de atividade continuar a mostrar o que fez. Pode reativá-la mais tarde. |
| 86 | Cancel | Cancelar |
| 90 | Disable account / Disabling… | Desativar conta / A desativar… |

#### `lead-quick-actions.tsx` (6)

| Line | English | **Portuguese** |
|---|---|---|
| 37 | Saving… | A guardar… |
| 66 | Log contact | Registar contacto |
| 77 | Last reached out {when} | Último contacto {when} |
| 80 | Nobody has logged reaching out yet | Ainda ninguém registou nenhum contacto |
| 106 | Reopen / Archive | Reabrir / Arquivar |

#### `pagination.tsx` (3)

| Line | English | **Portuguese** |
|---|---|---|
| 36 | {first}–{last} of {total} | {first}–{last} de {total} |
| 43, 49 | Previous | Anterior |
| 59, 65 | Next | Seguinte |

#### `in-dev-banner.tsx` (2) · `in-dev-marker.tsx` (2)

| Line | English | **Portuguese** |
|---|---|---|
| banner 18 | In development — design preview | Em construção — pré-visualização do desenho |
| banner 20 | {note} The data shown is example data so you can see exactly how this will look and work. | {note} Os dados mostrados são de exemplo, para ver exatamente como isto vai ficar e funcionar. |
| marker 20 | In development *(sr-only)* | Em construção |
| marker 33 | marks areas in development — final design, example data. | assinala áreas em construção — desenho final, dados de exemplo. |

#### `record-meta.tsx` (2) · `contact-links.tsx` (1)

| Line | English | **Portuguese** |
|---|---|---|
| meta 40 | Scheduled job | Tarefa automática |
| meta 59 | Consented {date} · text version {version} *(title)* | Consentimento a {date} · versão do texto {version} |
| meta 62 | Marketing opt-in | Autorização de marketing |
| meta 59 | `"unknown"` fallback | desconhecida |
| links 51 | WhatsApp | — |

#### No user-facing strings

`placeholder-panel.tsx`, `experience-icons.tsx`, `form-action-bar.tsx`,
`admin-user-context.tsx` — all render strings passed in as props. They need no
change; their *callers* are listed above.

### 5.3 Adjacent modules the translation must touch

These sit outside the two directories the stub names, but every string in them
renders inside the admin, so stubs 2–3 cannot reach 100% PT without them. Listed
here so nothing is discovered late.

| Module | What it holds | Stub |
|---|---|---|
| `lib/admin-nav.ts` | ~45: group titles, labels, cardTitles, shortLabels, descriptions, `adminPageTitle` fallback | 2 (§3.3) |
| `lib/admin-format.ts` | ~60: all five status/priority/role/kind vocabularies, 26 `auditActionLabels`, 2 retired labels, `en-GB` date formatters (:194, :200) → **`pt-PT`**, relative-time suffixes (`just now`, `Nm ago`, `Nh ago`, `Nd ago`, `Nw ago`, `Nmo ago`, `Ny ago`) | 2 |
| `lib/experience-icons.ts` | 20 icon labels (`Classic car`, `Wine tasting`, …) + 3 `ENQUIRY_KIND_ICONS` labels; render as `title` and sr-only text in the icon picker and on every board card | 3 |
| `lib/admin-preview.ts` | ~60 strings of example data across five preview areas (blog titles, social captions, segment names, campaign names, referrer rewards, notification templates and log) | 3 |
| `lib/password-policy.ts:16` | `At least {n} characters. A short phrase works well.` → **Pelo menos {n} caracteres. Uma frase curta funciona bem.** | 3 |
| `lib/availability.ts` | `formatDay`/`formatMonth`/`WEEKDAY_INITIALS` already take a locale and already have `pt` — callers pass `"en"` | 2 |
| `lib/sales.ts:77` | `EN-` ref prefix (from *enquiry*) | §9 |
| `content/system.ts:39–54` | `adminSystemContent` — the error and 404 screens, 7 strings; **and the doc comment naming the monolingual-EN decision** | **this stub** (comment) + 3 (strings) |

Suggested PT for `adminSystemContent` (stub 3):

| Key | English | **Portuguese** |
|---|---|---|
| `error.title` | Couldn't reach the database | Não foi possível chegar à base de dados |
| `error.body` | The operations data didn't load. This is usually a brief connection problem — try again, and if it keeps happening let the team know. | Os dados não carregaram. Costuma ser um problema passageiro de ligação — tente novamente e, se continuar, avise a equipa. |
| `error.retry` | Try again | Tentar novamente |
| `error.dashboard` | Back to dashboard | Voltar ao início |
| `notFound.title` | Page not found | Página não encontrada |
| `notFound.body` | That admin page doesn't exist. It may have been renamed or is not built yet. | Essa página do painel não existe. Pode ter mudado de nome ou ainda não estar construída. |
| `notFound.dashboard` | Back to dashboard | Voltar ao início |

`notFound.title` and `dashboard` are already written in `systemContent` (the
guest side) as **"Página não encontrada"** and **"Voltar ao início"** — reuse the
exact words rather than inventing a second phrasing.

---

## 6. Strings shared with emails

Asked for by the stub. There is **no shared module** between the admin UI and the
mail copy today — `content/emails.ts` is its own file and `lib/booking-emails.ts`
assembles it. So nothing breaks in the mails when the admin is translated.

What *is* shared is **vocabulary**, and it must not drift:

| Concept | `content/emails.ts` (already PT) | Admin must say |
|---|---|---|
| Booking | `Reserva confirmada`, `Nova reserva paga` | **reserva** |
| Reference | `Referência` | **Referência** |
| Departure | `Partida` | **partida** |
| Experience | `Experiência` | **experiência** |
| Add-ons | `Extras` | **extras** |
| Party | `Pessoas` | **pessoas** |
| Guest/customer | `Cliente` (team mail) | **cliente** |
| The admin | `Ver no painel` | **painel** |
| Language | `Idioma` | **idioma** |

`lib/contact-templates.ts` is the other shared surface: it is already bilingual
and already says **`o seu pedido`** for an enquiry. Its PT half needs no change —
it is the precedent §1 rests on. Its **EN** half stays EN (it writes to
English-speaking guests) and must not be swept up by a global find-and-replace.

Two admin surfaces that *look* like mail but are not: the `mailto:`/`wa.me`
buttons on the lead page (they hand the operator's own app a pre-written message,
from `contact-templates.ts`), and `inviteUser`, which has no mail transport at all
— hence `"{name} can now sign in."` rather than "invitation sent".

---

## 7. Tests that assert on admin strings

Stub 2's acceptance criterion "update string-asserting tests" resolves to a
short list — the admin tests are mostly behavioural:

| File:line | Assertion | Breaks when |
|---|---|---|
| `lib/admin-nav.test.ts:35` | `adminPageTitle("/admin/settings/audit") === "Audit log"` | §3.3 lands → `"Registo de atividade"` |
| `lib/admin-format.test.ts:51,52,66` | `formatRelativeTime(...) === "just now"` | §5.3 relative-time strings land |
| `lib/admin-format.test.ts` (~:79) | completeness test over the label records | no change — it checks every enum key *has* a label, not what it says |
| `lib/sales.test.ts:53` | `enquiryRef(id) === "EN-111111"` | only if the `EN-` prefix changes (§9) |
| `lib/sales.test.ts:94` | `record.payment === "Paid in full"` | when `lib/admin-preview.ts` / `lib/sales.ts:267` payment words are translated (stub 3) |
| `app/admin/actions.test.ts:448,470` | `values.status === "contacted" / "quoted"` | never — these are **database enum values**, not labels. Do not touch. |

The important negative: nothing asserts on an action's error message, so the §5.1
`actions.ts` table can be applied without test churn.

---

## 8. Counts

| Surface | Files | User-facing strings |
|---|---|---|
| `app/admin/**` pages & boundaries | 22 | ~150 |
| `app/admin/**` server actions | 3 | ~60 |
| `components/admin/**` | 29 (23 with strings) | ~190 |
| Adjacent (`lib/`, `content/system.ts`) | 8 | ~190 |
| **Total** | **62** | **~590** |

Of those, roughly 35 are idiom that must be rewritten rather than translated
(§4), and about 60 are already Portuguese or are proper nouns.

---

## 9. Open questions — Jamie's tick needed before stub 2

1. **The unification (§1)** — *pedido* / *reserva* / *orçamento*, one word each,
   across the console. This is the decision the whole epic rests on.
2. **`sugestão` for feature requests (§2)** — avoids a second collision on
   *pedido*, and makes every status/priority label feminine. Alternative:
   *pedido de melhoria*, which reads fine but re-uses *pedido*.
3. **`Responsável` vs `Proprietário`** for the owner role (§3.4).
4. **`Orçamentado`** as a board column (§3.2) — correct, slightly formal.
   Alternative: the noun `Orçamento`, which reads better alone but breaks the
   adjective series with `Novo`/`Contactado`/`Reservado`/`Arquivado`.
5. **`Mensagens automáticas` vs `Notificações`** for the notifications area
   (§3.3). The first says what it does; the second is the shorter nav label.
6. **The typed confirmation token.** `DELETE_CONFIRMATION = "DELETE"`
   (`lib/admin-format.ts:27`) is what an operator must type to erase a guest
   record or a catalogue entry. In a Portuguese console, asking Rita to type an
   English word is exactly the friction this epic removes. Proposal: **`APAGAR`**.
   It is a two-module change (`admin-format.ts` + the `server-only`
   `form-schemas.ts` that validates it) plus `actions.test.ts`, so it belongs in
   stub 3, not as a drive-by. Needs a tick because it is a safety control.
7. **`Extras` vs `Complementos`.** `content/emails.ts` says *Extras*;
   `content/tour-request.ts:31` says *Complementos* for the same list on the
   guest form. The admin should say one of them — proposal *Extras* (shorter on a
   card, and the operator-facing mail already uses it). Whether the **guest** form
   changes to match is a `content-truth` question, not this epic's.
8. **`Não decidido` vs `Sem preferência`.** The lead form's empty experience
   option (`lead-edit-form.tsx:166`) means *the operator has not chosen yet*,
   while the guest form's identical-looking option means *the guest has no
   preference*. Proposal: keep them different — **`Por decidir`** in the admin,
   `Sem preferência` on the site. Confirm that is deliberate, not drift.
9. **The `EN-` enquiry reference prefix** (`lib/sales.ts:77`). It comes from
   *enquiry*. `PD-` would match *pedido*, but the prefix appears on records that
   already exist and possibly in messages already sent to guests. Proposal:
   **leave `EN-` alone** and treat it as an opaque identifier, not a word. Confirm.

### Two defects found while inventorying — not this stub's to fix

Parked rather than swept into the translation, per the epic's own scope:

- **`experiences/page.tsx:74–77`** tells an operator to "Run the catalogue
  migration (`drizzle/0008_seed_experience_catalogue.sql`)". That is a developer
  instruction on a screen Rita uses. Translating it faithfully would make it
  *more* prominent, not less. It wants rewriting into "the catalogue has not been
  set up yet — tell Jamie", which is a copy change, not a translation.
- **`experience-form.tsx:169`** says the icon shows "on the Sales board **and
  table**". The Sales table was removed when the three screens collapsed into one
  board (see the doc comment on `app/admin/sales/page.tsx`). The string is stale
  in English; the PT rendering in §5.2 already drops it.
- **`forbidden/page.tsx:34`** and **`admin-shell.tsx:59`** both render the raw
  role enum (`owner`, `collaborator`) instead of `adminRoleMeta[role].label`.
  Translating the meta record leaves these two spots in English. Both are
  one-line fixes and belong in stub 3 alongside the strings they sit next to.

Both of the first two are copy/HIG work; if they are not folded into stub 4
(`hig-polish-pass`) they should be parked in `.icm/intake/triage/`.
