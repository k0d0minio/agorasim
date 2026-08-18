import type { Localized } from "@/i18n/config";

/**
 * Privacy / data-protection copy — the policy page, the notice next to the
 * booking form and the marketing opt-in.
 *
 * ⚠️ **DRAFT LEGAL TEXT — NOT REVIEWED.** Everything below was written by an
 * engineer to give the mechanisms something honest to point at. It is not legal
 * advice and it has not been reviewed by anyone qualified. Before this goes
 * live, a human with Portuguese/EU data-protection knowledge must read it and
 * sign it off, and every `TODO(legal)` below must be resolved. The specific open
 * questions are collected in `.icm/docs/data-protection.md`.
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
    pt: "Como a Agorasim recolhe, usa e protege os seus dados pessoais quando pede uma experiência connosco.",
    en: "How Agorasim collects, uses and protects your personal data when you enquire about an experience with us.",
  } as Localized,

  /** Rendered as a prominent banner at the top of the page. Remove on sign-off. */
  draftNotice: {
    pt: "RASCUNHO — este texto ainda não foi revisto juridicamente e não deve ser considerado definitivo.",
    en: "DRAFT — this text has not yet been reviewed by a lawyer and should not be treated as final.",
  } as Localized,

  lastUpdatedLabel: { pt: "Última atualização", en: "Last updated" } as Localized,
  lastUpdated: { pt: "31 de julho de 2026", en: "31 July 2026" } as Localized,

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
          "Não recolhemos dados através do site para além destes. Não usamos ferramentas de análise de tráfego nem publicidade comportamental.",
        ],
      },
      {
        heading: "Porque tratamos os seus dados (fundamento de licitude)",
        body: [
          "Respondemos ao seu pedido e preparamos a sua experiência com base em diligências pré-contratuais a seu pedido (artigo 6.º, n.º 1, alínea b) do RGPD). Sem estes dados não conseguimos contactá-lo nem organizar o passeio.",
          "O envio de comunicações de marketing assenta exclusivamente no seu consentimento (artigo 6.º, n.º 1, alínea a)). É opcional, é dado numa caixa separada e não assinalada, e pode ser retirado a qualquer momento sem afetar o seu pedido.",
          "TODO(legal): confirmar o fundamento indicado para o pedido de experiência e se existe algum tratamento adicional (por exemplo, obrigações fiscais associadas a reservas efetivamente realizadas) que deva ser descrito aqui.",
        ],
      },
      {
        heading: "Durante quanto tempo guardamos os dados",
        body: [
          "Pedidos que não se convertem numa reserva são anonimizados automaticamente ao fim do prazo de conservação definido — os dados que o identificam (nome, email, telefone e mensagem) são apagados e fica apenas informação estatística que não permite identificá-lo.",
          "PROPOSTA, A CONFIRMAR: 24 meses a contar do último contacto. Este prazo ainda não foi decidido — ver a nota em .icm/docs/data-protection.md.",
          "Dados associados a reservas efetivamente realizadas podem ter de ser conservados por prazos mais longos por obrigação legal (por exemplo, fiscal). TODO(legal): confirmar estes prazos.",
        ],
      },
      {
        heading: "Com quem partilhamos os dados",
        body: [
          "Recorremos a prestadores de serviços que tratam dados por nossa conta: a Vercel (alojamento do site e armazenamento das fotografias das experiências) e a Neon (base de dados onde os pedidos ficam guardados).",
          "Não vendemos os seus dados nem os partilhamos para fins de marketing de terceiros.",
          "TODO(legal): confirmar as regiões de alojamento e, quando existam transferências para fora do Espaço Económico Europeu, o mecanismo aplicável (por exemplo, cláusulas contratuais-tipo).",
        ],
      },
      {
        heading: "Cookies e serviços externos",
        body: [
          "O site não usa cookies de análise nem de publicidade, e não coloca cookies de terceiros: a reserva é feita através do nosso próprio formulário, sem sistemas externos incorporados na página. Por isso não verá um aviso de cookies — não há nada a que consentir.",
          "As fontes tipográficas são servidas a partir do nosso próprio domínio, pelo que a sua visita não gera pedidos a servidores da Google.",
          "A área reservada de administração usa um cookie estritamente necessário para manter a sessão iniciada. Não é usado para qualquer outro fim.",
        ],
      },
      {
        heading: "Os seus direitos",
        body: [
          "Tem o direito de aceder aos seus dados, de os retificar, de os apagar, de limitar ou de se opor ao seu tratamento, e de os receber num formato estruturado (portabilidade). Quando o tratamento assenta no consentimento, pode retirá-lo a qualquer momento.",
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
          "We collect nothing else through the site. We do not use web analytics or behavioural advertising.",
        ],
      },
      {
        heading: "Why we process it (lawful basis)",
        body: [
          "We answer your enquiry and prepare your experience on the basis of steps taken at your request prior to entering into a contract (GDPR Art. 6(1)(b)). Without this data we cannot reply to you or arrange the tour.",
          "Marketing email is sent solely on the basis of your consent (Art. 6(1)(a)). It is optional, it is given via a separate, unticked box, and you can withdraw it at any time without affecting your enquiry.",
          "TODO(legal): confirm the basis stated for the enquiry itself, and whether any further processing (for example tax obligations attached to bookings that actually happen) needs describing here.",
        ],
      },
      {
        heading: "How long we keep it",
        body: [
          "Enquiries that never turn into a booking are anonymised automatically once the retention period is reached — the data that identifies you (name, email, phone and message) is erased, leaving only statistical information that cannot identify you.",
          "PROPOSED, NOT YET DECIDED: 24 months from the last contact. This period has not been signed off — see the note in .icm/docs/data-protection.md.",
          "Data attached to bookings that actually took place may have to be kept longer to meet legal obligations (for example tax record-keeping). TODO(legal): confirm those periods.",
        ],
      },
      {
        heading: "Who we share it with",
        body: [
          "We use service providers who process data on our behalf: Vercel (website hosting and storage of the experience photos) and Neon (the database the enquiries are stored in).",
          "We do not sell your data and we do not share it for third-party marketing.",
          "TODO(legal): confirm the hosting regions and, where any transfer outside the European Economic Area occurs, the safeguard relied on (for example standard contractual clauses).",
        ],
      },
      {
        heading: "Cookies and third-party services",
        body: [
          "The site uses no analytics and no advertising cookies, and sets no third-party cookies at all: booking happens through our own form, with no external systems embedded in the page. That is why there is no cookie banner — there is nothing to consent to.",
          "Web fonts are served from our own domain, so visiting the site sends no request to Google's servers.",
          "The admin area uses one strictly necessary cookie to keep an operator signed in. It is used for nothing else.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "You have the right to access your data, to have it corrected or erased, to restrict or object to its processing, and to receive it in a structured format (portability). Where processing is based on consent, you can withdraw that consent at any time.",
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
