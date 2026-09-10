import type { Localized } from "@/i18n/config";
import { controller } from "@/content/privacy";
import { site } from "@/content/site";

/**
 * Terms of sale — the page a prepaying guest is owed, and the one line at the
 * pay button that points to it.
 *
 * ⚠️ **DRAFT LEGAL TEXT — NOT REVIEWED.** Written by an engineer so that a
 * checkout taking full prepayment has a seller, a cancellation procedure and a
 * withdrawal statement to point at. It is not legal advice and nobody qualified
 * has read it. The [LAWYER] pass rides the privacy sign-off; every
 * `TODO(legal)` below has to be resolved before the draft banner comes off.
 *
 * What the copy is anchored to, so it cannot drift from the product:
 * - the cancellation rule is the one the checkout summary and the confirmation
 *   email already promise (`booking.ts` `labels.freeCancellation`, `emails.ts`
 *   `confirmation.cancellationNote` / `cancelLink`): free up to 48 hours before,
 *   reschedule in bad weather, refund in extreme conditions, self-serve link;
 * - seller identity is {@link controller} from `privacy.ts` — one place for the
 *   trading name, NIF and address;
 * - the weddings deposit terms are decision D9 (`.icm/project.md`): 30%
 *   deposit, non-refundable inside 30 days, free date change subject to
 *   availability — the default until the client confirms.
 *
 * Conventions follow the rest of `src/content/`: `Localized<T>` pairs, PT and EN
 * kept in step.
 */

/**
 * Who is selling. The trading facts come from the privacy controller so that
 * name, NIF and address are stated once; what is specific to selling tours is
 * the tourism registration, which the client has not supplied.
 *
 * TODO(legal): RNAAT (Registo Nacional dos Agentes de Animação Turística)
 * number and liability-insurance policy details are still unanswered (info PDF
 * §1.1 blanks). Fill `rnaat` with the number and drop the pending copy when it
 * arrives.
 */
export const seller = {
  tradingName: controller.tradingName,
  legalName: "Diogo Santos Trajano",
  registrationNumber: controller.registrationNumber,
  address: controller.address,
  email: controller.email,
  phones: site.contacts,
  /** `null` until the client supplies it; the page prints the pending line. */
  rnaat: null as string | null,
} as const;

type Section = { heading: string; body: string[] };

export const termsContent = {
  title: {
    pt: "Termos de Venda",
    en: "Terms of Sale",
  } as Localized,

  lead: {
    pt: "As condições em que reserva e paga uma experiência com a Agorasim: quem somos, o que compra, como paga, como cancela e o que acontece com mau tempo.",
    en: "The conditions under which you book an experience with Agorasim: who we are, what you are buying, how you pay, how you cancel and what happens in bad weather.",
  } as Localized,

  /** Rendered as a prominent banner at the top of the page. Remove on sign-off. */
  draftNotice: {
    pt: "RASCUNHO — este texto ainda não foi revisto juridicamente e não deve ser considerado definitivo.",
    en: "DRAFT — this text has not yet been reviewed by a lawyer and should not be treated as final.",
  } as Localized,

  lastUpdatedLabel: { pt: "Última atualização", en: "Last updated" } as Localized,
  lastUpdated: { pt: "10 de setembro de 2026", en: "10 September 2026" } as Localized,

  /**
   * The seller block, rendered as a definition list under its own heading so
   * the identity facts are scannable rather than buried in a paragraph.
   */
  sellerHeading: { pt: "Quem vende", en: "Who is selling" } as Localized,
  sellerLabels: {
    tradingName: { pt: "Nome comercial", en: "Trading name" } as Localized,
    legalName: { pt: "Titular", en: "Proprietor" } as Localized,
    registrationNumber: { pt: "Contribuinte", en: "Tax number" } as Localized,
    address: { pt: "Morada", en: "Address" } as Localized,
    email: { pt: "Email", en: "Email" } as Localized,
    phone: { pt: "Telefone", en: "Phone" } as Localized,
    rnaat: { pt: "Registo RNAAT", en: "RNAAT registration" } as Localized,
  },
  legalNameNote: {
    pt: "trabalhador independente",
    en: "sole trader",
  } as Localized,
  /** Printed while {@link seller.rnaat} is `null`. */
  rnaatPending: {
    pt: "número de registo pendente — será publicado aqui assim que estiver disponível",
    en: "registration number pending — it will be published here as soon as it is available",
  } as Localized,

  sections: {
    pt: [
      {
        heading: "A quem se aplicam estes termos",
        body: [
          "Estes termos aplicam-se a todas as reservas de experiências feitas através do site da Agorasim e pagas online. Ao concluir o pagamento, aceita estes termos. A versão que se aplica à sua reserva é a que estava publicada no momento em que pagou.",
          "As experiências são passeios guiados em carros clássicos pela região Saloia (Sintra, Mafra e Ericeira), operados pela Agorasim Vintage, identificada acima.",
        ],
      },
      {
        heading: "O que compra",
        body: [
          "Compra um lugar — ou o carro inteiro, se escolher o preço por grupo — numa partida com dia e hora definidos, na experiência que selecionou, com os complementos que tiver adicionado. Tudo o que está incluído está descrito na página da experiência e no resumo da reserva antes de pagar.",
          "Cada dia tem até duas partidas (10:00 e 14:00), e o ponto de encontro é o indicado na página da experiência e no email de confirmação.",
          "A sua reserva fica confirmada quando o pagamento é aceite. Recebe então um email de confirmação com todos os detalhes. Enquanto conclui o pagamento, guardamos o vosso carro durante 30 minutos; se o pagamento não for concluído nesse período, a partida volta a ficar disponível.",
        ],
      },
      {
        heading: "Preços e pagamento",
        body: [
          "Todos os preços são apresentados em euros e incluem IVA à taxa legal em vigor. O preço que paga é o que aparece no resumo da reserva antes de confirmar — não há custos adicionais depois.",
          "O pagamento é feito na totalidade no momento da reserva, através da Stripe. Não guardamos os dados do seu cartão.",
        ],
      },
      {
        heading: "Cancelamento e reembolso",
        body: [
          "Cancelamento gratuito até 48h antes da experiência. Com mau tempo, reagendamos — ou reembolsamos em condições extremas.",
          "Como cancelar: o email de confirmação inclui um link para cancelar a reserva. Se precisar de cancelar, pode fazê-lo aí até 48 horas antes da partida — sem custos e com devolução do valor total. Também pode escrever-nos para info@agorasim.pt ou telefonar-nos; nesse caso, o pedido conta a partir do momento em que o recebemos.",
          "Devolvemos o reembolso para o mesmo cartão ou método com que pagou. O valor costuma aparecer em 5 a 10 dias úteis, consoante o banco.",
          "A menos de 48 horas da partida, o cancelamento gratuito online já não está disponível e o valor pago não é reembolsado automaticamente. Ligue-nos ou mande mensagem — falamos consigo e vemos o que é possível. Não comparecer à partida sem aviso equivale a um cancelamento fora do prazo.",
        ],
      },
      {
        heading: "Mau tempo",
        body: [
          "Os passeios acontecem ao ar livre, em carros clássicos, e o tempo faz parte da experiência. Com mau tempo, tentamos sempre reagendar — e reembolsamos em condições extremas.",
          "Se tivermos de mudar a sua partida, contactamo-lo pelo email e telefone que nos deu, com uma nova data proposta. Se essa data não lhe servir, procuramos outra — e se preferir cancelar, o cancelamento continua gratuito até 48 horas antes da nova data.",
          "A decisão de reagendar ou de reembolsar por condições extremas é nossa, tomada com a segurança do grupo em primeiro lugar.",
        ],
      },
      {
        heading: "Se formos nós a cancelar",
        body: [
          "Se, por motivo nosso — um carro indisponível, um condutor doente ou outra causa que não seja o tempo —, não pudermos realizar a experiência na data reservada, propomos-lhe uma nova data ou devolvemos o valor total, à sua escolha.",
        ],
      },
      {
        heading: "Direito de livre resolução (os 14 dias)",
        body: [
          "Quando compra à distância, a lei dá-lhe normalmente 14 dias para desistir sem justificação. Esse direito não se aplica às nossas experiências: a lei exclui os serviços de lazer contratados para uma data ou período específico (artigo 16.º, alínea l), da Diretiva 2011/83/UE; artigo 17.º, n.º 1, alínea l), do Decreto-Lei n.º 24/2014). Em vez dos 14 dias, aplica-se a política de cancelamento descrita acima — que lhe permite cancelar sem custos até 48 horas antes da partida.",
        ],
      },
      {
        heading: "Casamentos e eventos",
        body: [
          "Casamentos e outros eventos são orçamentados caso a caso e não se reservam através da página de reservas online. As condições abaixo aplicam-se a esses orçamentos, salvo indicação diferente no orçamento aceite.",
          "A data fica reservada com o pagamento de um sinal de 30% do valor orçamentado. O sinal não é reembolsável em caso de cancelamento a menos de 30 dias do evento. Até essa altura, o sinal é devolvido na totalidade se cancelar.",
          "A mudança de data é gratuita, sujeita à nossa disponibilidade. O restante valor é pago nas condições indicadas no orçamento.",
        ],
      },
      {
        heading: "Durante a experiência",
        body: [
          "Os carros são clássicos, conduzidos por nós. Pedimos que siga as indicações do condutor, use o cinto de segurança quando existir e não fume dentro dos carros. Crianças viajam com os sistemas de retenção adequados, que nos deve indicar na reserva.",
          "Reservamo-nos o direito de recusar ou interromper a experiência, sem reembolso, a quem ponha em risco a segurança do grupo ou danifique os carros. Danos causados intencionalmente ou por negligência grave são da responsabilidade de quem os causar.",
        ],
      },
      {
        heading: "Reclamações e lei aplicável",
        body: [
          "Se algo não correr bem, fale connosco primeiro — info@agorasim.pt ou os telefones indicados acima. Respondemos rapidamente.",
          "Pode também apresentar reclamação no Livro de Reclamações Eletrónico (www.livroreclamacoes.pt). Em caso de litígio de consumo, pode recorrer à entidade de resolução alternativa de litígios competente (Lei n.º 144/2015): o Centro de Arbitragem de Conflitos de Consumo de Lisboa — CACCL (www.centroarbitragemlisboa.pt) ou, a nível nacional, o CNIACC (www.cniacc.pt). A lista atualizada de entidades autorizadas é publicada pela DGPJ (dgpj.justica.gov.pt).",
          "Estes termos regem-se pela lei portuguesa. Em caso de litígio, são competentes os tribunais portugueses, sem prejuízo dos direitos que a lei lhe confere como consumidor.",
        ],
      },
      {
        heading: "Alterações a estes termos",
        body: [
          "Se alterarmos estes termos, atualizamos a data de última atualização no topo desta página. As alterações não se aplicam a reservas já pagas.",
        ],
      },
    ],
    en: [
      {
        heading: "Who these terms apply to",
        body: [
          "These terms apply to every experience booked through the Agorasim website and paid for online. By completing payment you accept them. The version that applies to your booking is the one published at the moment you paid.",
          "The experiences are guided classic-car tours through the Saloia region (Sintra, Mafra and Ericeira), run by Agorasim Vintage, identified above.",
        ],
      },
      {
        heading: "What you are buying",
        body: [
          "You are buying a seat — or the whole car, if you choose the per-group price — on a departure with a set day and time, on the experience you selected, with any add-ons you included. Everything that is included is described on the experience page and in the booking summary before you pay.",
          "Each day has up to two departures (10:00 and 14:00), and the meeting point is the one shown on the experience page and in your confirmation email.",
          "Your booking is confirmed when the payment is accepted. You then receive a confirmation email with every detail. We hold your car for 30 minutes while you complete the payment; if the payment is not completed in that time, the departure becomes available again.",
        ],
      },
      {
        heading: "Prices and payment",
        body: [
          "All prices are shown in euros and include VAT at the legal rate in force. The price you pay is the one shown in the booking summary before you confirm — there are no additional charges afterwards.",
          "Payment is made in full at the time of booking, through Stripe. We never see or store your card details.",
        ],
      },
      {
        heading: "Cancellation and refunds",
        body: [
          "Free cancellation up to 48h before the experience. In bad weather we reschedule — or refund in extreme conditions.",
          "How to cancel: your confirmation email includes a link to cancel the booking. If you need to cancel, you can do it there up to 48 hours before departure — free of charge, with the full amount returned. You can also write to info@agorasim.pt or call us; in that case the request counts from the moment we receive it.",
          "We return the refund to the same card or method you paid with. It usually appears within 5 to 10 working days, depending on your bank.",
          "Less than 48 hours before departure, free online cancellation is no longer available and the amount paid is not refunded automatically. Call or message us — we'll talk it through and see what we can do. Not turning up for the departure without notice counts as a late cancellation.",
        ],
      },
      {
        heading: "Bad weather",
        body: [
          "The tours happen outdoors, in classic cars, and the weather is part of the experience. In bad weather we always try to reschedule — and refund in extreme conditions.",
          "If we have to move your departure, we contact you at the email and phone you gave us with a proposed new date. If that date does not work for you, we look for another — and if you would rather cancel, cancellation stays free up to 48 hours before the new date.",
          "Whether to reschedule or to refund for extreme conditions is our call, made with the group's safety first.",
        ],
      },
      {
        heading: "If we have to cancel",
        body: [
          "If, for a reason on our side — a car out of action, a driver unwell or any other cause that is not the weather — we cannot run the experience on the date you booked, we offer you a new date or return the full amount, whichever you prefer.",
        ],
      },
      {
        heading: "Right of withdrawal (the 14 days)",
        body: [
          "When you buy at a distance, the law normally gives you 14 days to change your mind without giving a reason. That right does not apply to our experiences: the law excludes leisure services booked for a specific date or period (Article 16(l) of Directive 2011/83/EU; Article 17(1)(l) of Portuguese Decree-Law 24/2014). In place of the 14 days, the cancellation policy above applies — and it lets you cancel free of charge up to 48 hours before departure.",
        ],
      },
      {
        heading: "Weddings and events",
        body: [
          "Weddings and other events are quoted case by case and are not booked through the online booking page. The conditions below apply to those quotes unless the accepted quote says otherwise.",
          "The date is reserved on payment of a deposit of 30% of the quoted amount. The deposit is non-refundable if you cancel less than 30 days before the event. Until then, the deposit is returned in full if you cancel.",
          "Changing the date is free, subject to our availability. The balance is paid on the conditions set out in the quote.",
        ],
      },
      {
        heading: "During the experience",
        body: [
          "The cars are classics, driven by us. We ask you to follow the driver's instructions, wear the seat belt where one is fitted and not smoke inside the cars. Children travel with the appropriate restraints, which you should tell us about when booking.",
          "We reserve the right to refuse or stop the experience, without refund, for anyone who endangers the group's safety or damages the cars. Damage caused intentionally or through gross negligence is the responsibility of whoever causes it.",
        ],
      },
      {
        heading: "Complaints and governing law",
        body: [
          "If something goes wrong, talk to us first — info@agorasim.pt or the phone numbers above. We answer quickly.",
          "You can also file a complaint in the Livro de Reclamações Eletrónico, Portugal's official complaints book (www.livroreclamacoes.pt). For a consumer dispute you can turn to the competent alternative dispute resolution entity (Portuguese Law 144/2015): the Centro de Arbitragem de Conflitos de Consumo de Lisboa — CACCL (www.centroarbitragemlisboa.pt) or, nationally, CNIACC (www.cniacc.pt). The current list of authorised entities is published by the DGPJ (dgpj.justica.gov.pt).",
          "These terms are governed by Portuguese law. Any dispute falls to the Portuguese courts, without prejudice to the rights the law gives you as a consumer.",
        ],
      },
      {
        heading: "Changes to these terms",
        body: [
          "If we change these terms we update the last-updated date at the top of this page. Changes do not apply to bookings already paid for.",
        ],
      },
    ],
  } as Localized<Section[]>,

  /**
   * The one line above the pay button. Deliberately a sentence, not a
   * checkbox: the pay button's label already says what pressing it does
   * (`booking.ts` `labels.pay`), and a pre-ticked or mandatory box adds a tap
   * without adding consent. The link is the whole point — the terms are one
   * tap away from the moment they matter.
   */
  checkoutNotice: {
    prefix: { pt: "Ao pagar aceita os", en: "By paying you accept the" } as Localized,
    linkLabel: { pt: "termos de venda", en: "terms of sale" } as Localized,
  },
} as const;

/**
 * Open legal items — tracked here, never rendered. Each one gates the draft
 * banner coming off; see `.icm/docs/launch-runbook.md` § 4b and
 * `.icm/docs/data-protection.md`.
 */
export const legalOpenItems: readonly string[] = [
  "TODO(legal): confirmar o regime de IVA aplicável (taxa e eventual isenção) e o emissor da fatura. Se a Agorasim estiver obrigada a emitir fatura com o número de contribuinte do cliente, acrescentar aqui como e quando é pedido.",
  "TODO(legal): confirmar o prazo de 30 dias com o cliente (decisão D9, valor por defeito) e verificar o enquadramento do sinal no regime legal português.",
  "TODO(legal): confirmar a cobertura do seguro de acidentes pessoais e de responsabilidade civil (obrigatório para agentes de animação turística) e indicar aqui a seguradora e a apólice.",
  "TODO(legal): confirm the VAT regime that applies (rate and any exemption) and who issues the invoice. If Agorasim must issue an invoice carrying the guest's tax number, add here how and when it is requested.",
  "TODO(legal): confirm the 30-day window with the client (decision D9, the default) and check how the deposit sits under the Portuguese sinal regime.",
  "TODO(legal): confirm the personal-accident and civil-liability insurance cover (mandatory for tourism-activity operators) and name the insurer and policy here.",
];
