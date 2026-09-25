import type { Localized } from "@/i18n/config";

/**
 * Privacy / data-protection copy — the policy page, the notice next to the
 * booking form and the marketing opt-in.
 *
 * The recipients section names every processor the site actually uses: Vercel
 * and Neon (hosting, database), Stripe (payment — Checkout is a redirect, card
 * data never touches this app; the client's account is merchant of record and
 * the platform takes an application fee, see `lib/booking-checkout.ts`) and
 * Resend (email, EU-west/Ireland region, see `lib/email.ts` — the booking mail,
 * and the one post-tour thank-you sent under the soft opt-in, D24).
 * When a processor is added or removed, this file changes in the same PR.
 *
 * ⚠️ **DRAFT LEGAL TEXT — NOT REVIEWED.** Everything below was written by an
 * engineer to give the mechanisms something honest to point at. It is not legal
 * advice and it has not been reviewed by anyone qualified. Before this goes
 * live, a human with Portuguese/EU data-protection knowledge must read it and
 * sign it off, and every item in {@link legalOpenItems} must be resolved. The
 * open questions are tracked in `.icm/docs/data-protection.md`; nothing in the
 * rendered `sections` is a note to the engineer — a guest reads the policy, so
 * the notes live in the never-rendered array at the foot of this file.
 *
 * Conventions follow the rest of `src/content/`: `Localized<T>` pairs, PT and EN
 * kept in step.
 */

/**
 * Version stamp stored on every marketing consent (`tour_requests
 * .marketing_consent_version`).
 *
 * **Bump this whenever {@link privacyContent.marketing.label} changes.** The
 * point of storing it is to be able to say, later, exactly what wording a
 * person agreed to; that only works if the identifier moves when the wording
 * does. Date-based so the ordering is obvious.
 */
export const MARKETING_CONSENT_VERSION = "2026-07-31";

/**
 * Who the controller is. Kept next to the copy because the policy has to state
 * it, and a policy whose controller details drift out of date is worse than none.
 *
 * These are Diogo's own answers (agorasim-info PDF, Aug 2026): the business
 * trades as "Agorasim Vintage" under his personal NIF as a *trabalhador
 * independente* — there is no company, so the NIF is the registration number.
 *
 * TODO(legal): RNAAT registration number and liability insurance details are
 * still unanswered — chase before the draft banner comes off.
 */
export const controller = {
  tradingName: "Agorasim Vintage",
  email: "info@agorasim.pt",
  address: "Rua dos Lavadouros 33, Ramilo, 2640-372 Mafra, Portugal",
  /** Diogo Santos Trajano's NIF — sole trader, no separate company number. */
  registrationNumber: "NIF 234840919",
  /** Portugal's supervisory authority. */
  supervisoryAuthority: {
    name: "Comissão Nacional de Proteção de Dados (CNPD)",
    url: "https://www.cnpd.pt",
  },
} as const;

type Section = { heading: string; body: string[] };

export const privacyContent = {
  title: {
    pt: "Política de Privacidade",
    en: "Privacy Policy",
  } as Localized,

  lead: {
    pt: "Como a Agorasim recolhe, usa e protege os seus dados pessoais quando reserva ou pede uma experiência connosco.",
    en: "How Agorasim collects, uses and protects your personal data when you book or enquire about an experience with us.",
  } as Localized,

  /** Rendered as a prominent banner at the top of the page. Remove on sign-off. */
  draftNotice: {
    pt: "RASCUNHO — este texto ainda não foi revisto juridicamente e não deve ser considerado definitivo.",
    en: "DRAFT — this text has not yet been reviewed by a lawyer and should not be treated as final.",
  } as Localized,

  lastUpdatedLabel: { pt: "Última atualização", en: "Last updated" } as Localized,
  lastUpdated: { pt: "24 de setembro de 2026", en: "24 September 2026" } as Localized,

  sections: {
    pt: [
      {
        heading: "Quem somos (responsável pelo tratamento)",
        body: [
          "A Agorasim organiza passeios guiados em carros clássicos pela região Saloia (Sintra, Mafra e Ericeira), em Portugal. Somos o responsável pelo tratamento dos dados pessoais descritos nesta política.",
          "O responsável pelo tratamento é Agorasim Vintage — Diogo Santos Trajano (trabalhador independente), NIF 234840919, com morada na Rua dos Lavadouros 33, Ramilo, 2640-372 Mafra, Portugal.",
          "Para qualquer questão sobre privacidade, contacte-nos por email para info@agorasim.pt.",
        ],
      },
      {
        heading: "Que dados recolhemos",
        body: [
          "Quando preenche o formulário de pedido de experiência recolhemos: o seu nome, o seu email, o seu telefone (opcional), o número de pessoas, a data ou período preferido, a experiência e complementos que lhe interessam, a mensagem que nos escrever e o idioma em que navegava.",
          "Registamos também a data do pedido e, se tiver assinalado a caixa de comunicações de marketing, o facto de o ter feito, o momento e a versão do texto que aceitou.",
          "Quando reserva e paga online recolhemos ainda os dados da reserva: a experiência, a data e a hora de partida, a composição do grupo (adultos, crianças e bebés), o montante pago e o estado do pagamento. O pagamento em si é feito numa página da Stripe, não no nosso site: os dados do cartão são introduzidos aí e nunca passam pelos nossos servidores. Da Stripe recebemos apenas a confirmação de que o pagamento foi feito, o montante e as referências necessárias para o associar à sua reserva.",
          "Para além disto, os únicos dados que saem do site são os necessários para cobrar o pagamento (Stripe) e para lhe enviar os emails sobre o seu pedido ou reserva e o agradecimento depois do passeio (Resend) — ver «Com quem partilhamos os dados». Não usamos ferramentas de análise de tráfego nem publicidade comportamental.",
        ],
      },
      {
        heading: "Porque tratamos os seus dados (fundamento de licitude)",
        body: [
          "Respondemos ao seu pedido e preparamos a sua experiência com base em diligências pré-contratuais a seu pedido (artigo 6.º, n.º 1, alínea b) do RGPD). Sem estes dados não conseguimos contactá-lo nem organizar o passeio.",
          "Quando reserva uma experiência — online, ou connosco por telefone —, o tratamento dos dados da reserva e do pagamento — incluindo os emails sobre a reserva: a confirmação, o lembrete na véspera e o cancelamento — é necessário para a execução do contrato consigo (artigo 6.º, n.º 1, alínea b)).",
          "O envio de comunicações de marketing assenta no seu consentimento (artigo 6.º, n.º 1, alínea a)). É opcional, é dado numa caixa separada e não assinalada, e pode ser retirado a qualquer momento sem afetar o seu pedido.",
          "A única exceção é um email de agradecimento, enviado uma vez na manhã seguinte a uma experiência que fez connosco, com o link para deixar uma avaliação no Google. Enviamo-lo a quem já é cliente, sobre um serviço nosso, com base no nosso interesse legítimo (artigo 6.º, n.º 1, alínea f)) e na regra que permite estes contactos a clientes existentes. Cada um destes emails tem um link para deixar de os receber, e pode opor-se a qualquer momento — também escrevendo-nos.",
        ],
      },
      {
        heading: "Durante quanto tempo guardamos os dados",
        body: [
          "Pedidos que não se convertem numa reserva são anonimizados automaticamente ao fim do prazo de conservação definido — os dados que o identificam (nome, email, telefone e mensagem) são apagados e fica apenas informação estatística que não permite identificá-lo.",
          "Dados associados a reservas efetivamente realizadas podem ter de ser conservados por prazos mais longos por obrigação legal (por exemplo, fiscal).",
          "Se pedir para deixar de receber o agradecimento, guardamos esse pedido sem prazo, para o respeitar sempre — mesmo que volte a reservar ou que os seus outros dados sejam apagados. Guardamos apenas uma impressão cifrada do seu endereço de email, nunca o endereço em si.",
        ],
      },
      {
        heading: "Com quem partilhamos os dados",
        body: [
          "Recorremos a prestadores de serviços que tratam dados por nossa conta: a Vercel (alojamento do site e armazenamento das fotografias das experiências), a Neon (base de dados onde os pedidos e as reservas ficam guardados), a Stripe (processamento de pagamentos) e a Resend (envio de emails).",
          "Stripe — processamento de pagamentos. Quando paga uma reserva é encaminhado para uma página de pagamento da Stripe; os dados do cartão são introduzidos aí e nunca passam pelo nosso site. A Stripe recebe o seu email, a descrição do que está a reservar (experiência, data, número de pessoas) e o montante, e devolve-nos a confirmação do pagamento e as referências para o associar à sua reserva. O pagamento é cobrado na conta Stripe da Agorasim, que é o comerciante registado e a quem o valor pertence; a plataforma que opera este site recebe, através da Stripe, uma comissão de serviço sobre cada pagamento e nunca vê os dados do seu cartão. A política de privacidade da Stripe está em stripe.com/privacy.",
          "Resend — envio de emails: a confirmação da reserva, o lembrete na véspera e o cancelamento, o agradecimento depois do passeio, a resposta ao seu pedido e a cópia que a equipa recebe. Os emails são processados na região europeia da Resend (eu-west, Irlanda). A Resend tem sede nos Estados Unidos; para qualquer tratamento pela empresa-mãe fora do Espaço Económico Europeu, o mecanismo de transferência aplicável são as cláusulas contratuais-tipo aprovadas pela Comissão Europeia.",
          "Usamos ainda a Sentry para monitorização de erros: quando algo falha nos nossos servidores, é-lhe enviado um relatório técnico — o erro, a operação em curso e metadados do pedido (endereço da página, método e cabeçalhos, sem cookies). Não coloca cookies, não corre nada no seu navegador e os endereços IP não são recolhidos.",
          "Não vendemos os seus dados nem os partilhamos para fins de marketing de terceiros.",
        ],
      },
      {
        heading: "Cookies e serviços externos",
        body: [
          "O site não usa cookies de análise nem de publicidade, e não coloca cookies de terceiros. Não há sistemas externos incorporados nas nossas páginas: o pedido e a reserva são feitos através dos nossos próprios formulários e, quando paga, é encaminhado para uma página alojada pela Stripe (checkout.stripe.com), que tem a sua própria política de cookies e de privacidade, regressando ao nosso site no fim. Por isso não verá um aviso de cookies no nosso site — não há nada a que consentir.",
          "As fontes tipográficas são servidas a partir do nosso próprio domínio, pelo que a sua visita não gera pedidos a servidores da Google.",
          "A área reservada de administração usa um cookie estritamente necessário para manter a sessão iniciada. Não é usado para qualquer outro fim.",
        ],
      },
      {
        heading: "Os seus direitos",
        body: [
          "Tem o direito de aceder aos seus dados, de os retificar, de os apagar, de limitar ou de se opor ao seu tratamento, e de os receber num formato estruturado (portabilidade). Quando o tratamento assenta no consentimento, pode retirá-lo a qualquer momento. Para deixar de receber o agradecimento basta o link no próprio email.",
          "Para exercer qualquer destes direitos escreva-nos para info@agorasim.pt. Respondemos no prazo de um mês.",
          "Se considerar que os seus dados não estão a ser tratados corretamente, pode apresentar reclamação junto da Comissão Nacional de Proteção de Dados (www.cnpd.pt).",
        ],
      },
      {
        heading: "Alterações a esta política",
        body: [
          "Se alterarmos esta política, atualizamos a data de última atualização no topo desta página.",
        ],
      },
    ],
    en: [
      {
        heading: "Who we are (the data controller)",
        body: [
          "Agorasim runs guided classic-car tours through the Saloia region (Sintra, Mafra and Ericeira) in Portugal. We are the controller for the personal data described in this policy.",
          "The controller is Agorasim Vintage — Diogo Santos Trajano (sole trader), Portuguese tax number (NIF) 234840919, of Rua dos Lavadouros 33, Ramilo, 2640-372 Mafra, Portugal.",
          "For any privacy question, email us at info@agorasim.pt.",
        ],
      },
      {
        heading: "What we collect",
        body: [
          "When you fill in the experience request form we collect: your name, your email address, your phone number (optional), the number of people, your preferred date or period, the experience and add-ons you are interested in, whatever you write in the message field, and the language you were browsing in.",
          "We also record when the enquiry was made and, if you ticked the marketing box, that you did so, when, and which version of the wording you agreed to.",
          "When you book and pay online we also collect the booking itself: the experience, the date and departure time, who is in your party (adults, children and infants), the amount paid and the payment status. The payment happens on a page hosted by Stripe, not on our site: your card details are entered there and never pass through our servers. From Stripe we receive only confirmation that the payment was made, the amount, and the references needed to match it to your booking.",
          "Beyond this, the only data that leaves the site is what is needed to take your payment (Stripe) and to send you the emails about your enquiry or booking and the thank-you after your tour (Resend) — see \"Who we share it with\". We do not use web analytics or behavioural advertising.",
        ],
      },
      {
        heading: "Why we process it (lawful basis)",
        body: [
          "We answer your enquiry and prepare your experience on the basis of steps taken at your request prior to entering into a contract (GDPR Art. 6(1)(b)). Without this data we cannot reply to you or arrange the tour.",
          "When you book an experience — online, or with us by phone — processing the booking and payment data — including the emails about your booking: the confirmation, the day-before reminder and any cancellation — is necessary to perform the contract with you (Art. 6(1)(b)).",
          "Marketing email is sent on the basis of your consent (Art. 6(1)(a)). It is optional, it is given via a separate, unticked box, and you can withdraw it at any time without affecting your enquiry.",
          "The one exception is a thank-you email, sent once on the morning after an experience you took with us, with a link to leave a Google review. We send it to existing customers, about our own service, on the basis of our legitimate interest (Art. 6(1)(f)) and the rule that allows such messages to existing customers. Every one of these emails carries a link to stop receiving them, and you can object at any time — including by writing to us.",
        ],
      },
      {
        heading: "How long we keep it",
        body: [
          "Enquiries that never turn into a booking are anonymised automatically once the retention period is reached — the data that identifies you (name, email, phone and message) is erased, leaving only statistical information that cannot identify you.",
          "Data attached to bookings that actually took place may have to be kept longer to meet legal obligations (for example tax record-keeping).",
          "If you ask to stop the thank-you, we keep that request without a time limit so we can always honour it — even if you book again or your other data is erased. We keep only a keyed hash of your email address, never the address itself.",
        ],
      },
      {
        heading: "Who we share it with",
        body: [
          "We use service providers who process data on our behalf: Vercel (website hosting and storage of the experience photos), Neon (the database the enquiries and bookings are stored in), Stripe (payment processing) and Resend (email delivery).",
          "Stripe — payment processing. When you pay for a booking you are redirected to a payment page hosted by Stripe; your card details are entered there and never pass through our site. Stripe receives your email address, a description of what you are booking (experience, date, number of people) and the amount, and returns to us confirmation of the payment and the references to match it to your booking. The payment is taken on Agorasim's own Stripe account — Agorasim is the merchant of record and the money is theirs; the platform that operates this site receives, through Stripe, a service fee on each payment and never sees your card details. Stripe's privacy policy is at stripe.com/privacy.",
          "Resend — email delivery: your booking confirmation, the day-before reminder and any cancellation, the thank-you after your tour, the reply to your enquiry, and the copy the team receives. Emails are processed in Resend's European region (eu-west, Ireland). Resend is headquartered in the United States; for any processing by the parent company outside the European Economic Area, the transfer safeguard relied on is the standard contractual clauses approved by the European Commission.",
          "We also use Sentry for error monitoring: when something fails on our servers, a technical report is sent to it — the error, the operation under way and request metadata (page address, method and headers, without cookies). It sets no cookies, runs nothing in your browser, and IP addresses are not collected.",
          "We do not sell your data and we do not share it for third-party marketing.",
        ],
      },
      {
        heading: "Cookies and third-party services",
        body: [
          "The site uses no analytics and no advertising cookies, and sets no third-party cookies. There are no external systems embedded in our pages: enquiries and bookings go through our own forms and, when you pay, you are redirected to a page hosted by Stripe (checkout.stripe.com), which has its own cookie and privacy policies, and returned to our site afterwards. That is why there is no cookie banner on our site — there is nothing to consent to.",
          "Web fonts are served from our own domain, so visiting the site sends no request to Google's servers.",
          "The admin area uses one strictly necessary cookie to keep an operator signed in. It is used for nothing else.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "You have the right to access your data, to have it corrected or erased, to restrict or object to its processing, and to receive it in a structured format (portability). Where processing is based on consent, you can withdraw that consent at any time. To stop the thank-you, the link in the email itself is enough.",
          "To exercise any of these rights, write to info@agorasim.pt. We respond within one month.",
          "If you believe your data is not being handled properly, you can complain to the Portuguese supervisory authority, the Comissão Nacional de Proteção de Dados (www.cnpd.pt).",
        ],
      },
      {
        heading: "Changes to this policy",
        body: [
          "If we change this policy we update the last-updated date at the top of this page.",
        ],
      },
    ],
  } as Localized<Section[]>,

  /**
   * The short notice shown at the point of collection, next to the submit
   * button on the tour-request form. Deliberately short: the long version is one
   * link away, and a wall of text at the submit button is not "concise,
   * transparent, intelligible" (Art. 12(1)) — it is wallpaper.
   */
  formNotice: {
    intro: {
      pt: "Usamos o seu nome, email e telefone apenas para responder a este pedido e organizar o passeio. Guardamos os dados enquanto o pedido estiver ativo e anonimizamos os pedidos que não avançam.",
      en: "We use your name, email and phone only to answer this enquiry and arrange your tour. We keep it while the enquiry is live and anonymise enquiries that do not go ahead.",
    } as Localized,
    /**
     * The same notice on the wedding and event quote forms, which collect one
     * thing more (where the event is) for one purpose more (writing the quote).
     * A notice has to describe the collection it sits under, so "organise your
     * tour" could not simply be reused on a form that arranges neither.
     */
    quoteIntro: {
      pt: "Usamos o seu nome, email, telefone e os detalhes do evento apenas para preparar o orçamento e responder-lhe. Guardamos os dados enquanto o pedido estiver ativo e anonimizamos os pedidos que não avançam.",
      en: "We use your name, email, phone and the details of your event only to prepare your quote and reply to you. We keep it while the enquiry is live and anonymise enquiries that do not go ahead.",
    } as Localized,
    linkPrefix: { pt: "Saiba mais na nossa", en: "Read more in our" } as Localized,
    linkLabel: { pt: "Política de Privacidade", en: "Privacy Policy" } as Localized,
  },

  /** The marketing opt-in. Separate, unticked, never a condition of submitting. */
  marketing: {
    label: {
      pt: "Quero receber ocasionalmente novidades sobre passeios e experiências da Agorasim por email.",
      en: "Send me occasional news about Agorasim tours and experiences by email.",
    } as Localized,
    hint: {
      pt: "Opcional. Não é necessário para enviar o pedido e pode cancelar quando quiser.",
      en: "Optional. Not required to send your enquiry, and you can unsubscribe at any time.",
    } as Localized,
  },

} as const;

/**
 * Open legal items — tracked here, never rendered, on the model of
 * `terms.ts`. Each one gates the draft banner coming off; the register that
 * owns them is `.icm/docs/data-protection.md`. Both locales, so a reviewer of
 * either page sees the same list.
 */
export const legalOpenItems: readonly string[] = [
  "TODO(legal): confirmar o fundamento indicado para o pedido de experiência e se existe algum tratamento adicional (por exemplo, obrigações fiscais associadas a reservas efetivamente realizadas) que deva ser descrito na secção «Porque tratamos os seus dados».",
  "PROPOSTA, A CONFIRMAR: prazo de conservação de 24 meses a contar do último contacto para pedidos não convertidos — ainda não decidido pelo cliente (.icm/docs/data-protection.md).",
  "TODO(legal): confirmar os prazos legais de conservação dos dados de reservas efetivamente realizadas (por exemplo, obrigações fiscais).",
  "TODO(legal): confirmar as regiões de alojamento da Vercel e da Neon, a entidade Stripe contratante (Stripe Payments Europe, Irlanda, para contas em Portugal) e, quando existam transferências para fora do Espaço Económico Europeu, o mecanismo aplicável (por exemplo, cláusulas contratuais-tipo).",
  "TODO(legal): confirmar a redação do fundamento do email de agradecimento (interesse legítimo, artigo 6.º, n.º 1, alínea f), e o regime de contactos a clientes existentes da Lei n.º 41/2004) e se o aviso no momento da recolha deve também constar do email de confirmação da reserva (registo D24).",
  "TODO(legal): confirm the basis stated for the enquiry itself, and whether any further processing (for example tax obligations attached to bookings that actually happen) needs describing under \"Why we process it\".",
  "PROPOSED, NOT YET DECIDED: a 24-month retention period from the last contact for unconverted enquiries — not yet signed off by the client (.icm/docs/data-protection.md).",
  "TODO(legal): confirm the statutory retention periods for data attached to bookings that took place (for example tax record-keeping).",
  "TODO(legal): confirm the wording of the basis for the thank-you email (legitimate interest, Art. 6(1)(f), and the existing-customer rule of Portuguese Law 41/2004) and whether the collection-time notice should also appear in the booking confirmation email (register D24).",
  "TODO(legal): confirm the hosting regions for Vercel and Neon, the contracting Stripe entity (Stripe Payments Europe, Ireland, for Portuguese accounts) and, where any transfer outside the European Economic Area occurs, the safeguard relied on (for example standard contractual clauses).",
];
