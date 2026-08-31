import type { Localized } from "@/i18n/config";

/**
 * Copy for the paid booking flow on `/[locale]/reservar`.
 *
 * This file used to carry illustrative prices and a hardcoded August 2026
 * calendar so a design preview could read as real. Both are gone: prices come
 * from the catalogue (`experiences.price_cents`, set by the team), the calendar
 * comes from the `availability` table, and nothing here invents a commercial
 * fact any more.
 *
 * What is left is chrome — labels, the reassurances a payment page owes a
 * guest, and the error messages for the four ways a booking can fail between
 * choosing a day and paying for it.
 */
export const bookingContent = {
  title: { pt: "Reserve a sua experiência", en: "Book your experience" } as Localized,
  lead: {
    pt: "Escolha o dia, o grupo e os extras — e pague online em minutos. Sem esperas, sem trocas de emails.",
    en: "Pick your day, your group and your extras — and pay online in minutes. No waiting, no email back-and-forth.",
  } as Localized,

  labels: {
    yourDetails: { pt: "Os seus dados", en: "Your details" } as Localized,
    name: { pt: "Nome", en: "Name" } as Localized,
    email: { pt: "Email", en: "Email" } as Localized,
    phone: { pt: "Telefone (opcional)", en: "Phone (optional)" } as Localized,
    message: { pt: "Alguma nota para nós? (opcional)", en: "Anything we should know? (optional)" } as Localized,
    messagePlaceholder: {
      pt: "Alergias, aniversários, cadeira de bebé…",
      en: "Allergies, birthdays, a child seat…",
    } as Localized,

    experience: { pt: "A sua experiência", en: "Your experience" } as Localized,
    experienceHint: {
      pt: "Duas rotas, dois pontos de partida — escolha a sua.",
      en: "Two routes, two starting points — pick yours.",
    } as Localized,

    /**
     * The two halves of the price list — and no longer a promise about who
     * else is in the car.
     *
     * These used to read "Shared: you join other travellers". Since AGORA-012
     * nobody is put in a car with strangers: whether two parties may share a
     * departure is an open question with the team (AGORA-019), and until it is
     * answered every booking has its own vehicle. The tiers are untouched — one
     * is priced per person, the other per group — so what changed is the
     * sentence, which had stopped being true.
     */
    mode: { pt: "Como querem ir?", en: "How would you like to go?" } as Localized,
    modePublic: { pt: "Preço por pessoa", en: "Per person" } as Localized,
    modePublicHint: {
      pt: "Paga-se por pessoa. O carro é sempre só do vosso grupo.",
      en: "Priced per person. The car is still yours alone.",
    } as Localized,
    modePrivate: { pt: "Preço por grupo", en: "Per group" } as Localized,
    modePrivateHint: {
      pt: "Um valor único para o grupo — e é aqui que os complementos entram.",
      en: "One figure for the whole group — and where the add-ons come in.",
    } as Localized,

    partySize: { pt: "Quem vem?", en: "Who's coming?" } as Localized,
    partyHint: {
      pt: "Todos contam para os lugares do carro — os bebés também. O calendário mostra os dias com carro disponível para o vosso grupo.",
      en: "Everyone counts towards the seats in the car — infants too. The calendar shows the days with a car free for your group.",
    } as Localized,
    /**
     * Under the steppers, where they stop. `{max}` is filled in from the fleet
     * so the sentence cannot drift from the ceiling it explains.
     */
    bigGroupNote: {
      pt: "Grupos até {max} pessoas reservam online.",
      en: "Groups of up to {max} book online.",
    } as Localized,
    bigGroupLink: {
      pt: "Somos mais? Fale connosco.",
      en: "More of you? Get in touch.",
    } as Localized,
    adults: { pt: "Adultos", en: "Adults" } as Localized,
    adultsHint: { pt: "13 anos ou mais", en: "Aged 13 or over" } as Localized,
    children: { pt: "Crianças", en: "Children" } as Localized,
    childrenHint: { pt: "Dos 4 aos 12 anos", en: "Aged 4 to 12" } as Localized,
    infants: { pt: "Bebés", en: "Infants" } as Localized,
    infantsHint: { pt: "Menos de 4 anos — grátis", en: "Under 4 — free" } as Localized,
    fewer: { pt: "Menos um", en: "One fewer" } as Localized,
    more: { pt: "Mais um", en: "One more" } as Localized,

    /**
     * The calendar step's own heading. Every other step on this form has one;
     * without it a guest moving by headings fell from "who's coming" straight
     * into "your details", with the whole calendar in between.
     */
    when: { pt: "Quando querem vir?", en: "When would you like to come?" } as Localized,

    /**
     * Shown to a guest Stripe has sent back after they cancelled: their basket
     * has been put back from the draft their own browser kept, and saying so is
     * what makes a pre-filled form read as helpful rather than uncanny.
     */
    resumed: {
      pt: "Bem-vindo de volta — guardámos a sua escolha. Reveja os dados e conclua quando quiser.",
      en: "Welcome back — we kept your choices. Check them over and finish whenever you're ready.",
    } as Localized,

    slot: { pt: "Escolha a partida", en: "Pick your departure" } as Localized,
    slotHint: {
      pt: "Cada dia tem até duas partidas. Escolha o dia e depois a hora.",
      en: "Each day has up to two departures. Pick the day, then the time.",
    } as Localized,
    slotSoldOut: { pt: "Esgotada", en: "Sold out" } as Localized,

    addOns: { pt: "Complete o seu dia", en: "Complete your day" } as Localized,
    addOnsHint: {
      pt: "Paragens extra de sabores da região — disponíveis nas partidas privadas da Rural Saloia.",
      en: "Extra stops for regional flavours — available on private Rural Saloia departures.",
    } as Localized,
    addOnsPublicNote: {
      pt: "Os complementos juntam-se apenas às partidas privadas — mude para \"Privada\" para os adicionar.",
      en: "Add-ons join private departures only — switch to \"Private\" to add them.",
    } as Localized,
    addOnMinAdults: {
      pt: "mín. {min} adultos",
      en: "min. {min} adults",
    } as Localized,
    addOnMinGuests: {
      pt: "mín. {min} pessoas à mesa",
      en: "min. {min} at the table",
    } as Localized,
    addOnClosedMonday: {
      pt: "encerra à segunda-feira",
      en: "closed on Mondays",
    } as Localized,
    perAdult: { pt: "por adulto", en: "per adult" } as Localized,

    summary: { pt: "Resumo da reserva", en: "Booking summary" } as Localized,
    perPerson: { pt: "por pessoa", en: "per person" } as Localized,
    total: { pt: "Total", en: "Total" } as Localized,
    people: { pt: "pessoas", en: "people" } as Localized,
    person: { pt: "pessoa", en: "person" } as Localized,
    noDate: { pt: "Sem data escolhida", en: "No date selected" } as Localized,
    privateGroup: { pt: "Grupo privado", en: "Private group" } as Localized,
    childrenLine: { pt: "Crianças (4–12)", en: "Children (4–12)" } as Localized,
    infantsLine: {
      pt: "Bebés — grátis, com lugar",
      en: "Infants — free, seat included",
    } as Localized,
    meetingPoint: { pt: "Ponto de encontro", en: "Meeting point" } as Localized,
    freeCancellation: {
      pt: "Cancelamento gratuito até 48h antes da experiência. Com mau tempo, reagendamos — ou reembolsamos em condições extremas.",
      en: "Free cancellation up to 48h before the experience. In bad weather we reschedule — or refund in extreme conditions.",
    } as Localized,

    pay: { pt: "Pagar e confirmar reserva", en: "Pay & confirm booking" } as Localized,
    paying: { pt: "A abrir o pagamento…", en: "Opening payment…" } as Localized,
    securePayment: {
      pt: "Pagamento seguro através da Stripe. Não guardamos os dados do seu cartão.",
      en: "Secure payment through Stripe. We never see or store your card details.",
    } as Localized,
    /** Shown only when the deployment is running against Stripe test keys. */
    testMode: {
      pt: "Modo de teste — nenhum pagamento real será cobrado.",
      en: "Test mode — no real payment will be taken.",
    } as Localized,
    /** How long the car is held while they are on Stripe's page. */
    holdNote: {
      pt: "Guardamos o vosso carro durante 30 minutos enquanto conclui o pagamento.",
      en: "We hold your car for 30 minutes while you complete the payment.",
    } as Localized,
  },

  errors: {
    name: { pt: "Indique o seu nome.", en: "Please enter your name." } as Localized,
    email: {
      pt: "Indique um email válido.",
      en: "Please enter a valid email address.",
    } as Localized,
    chooseDate: {
      pt: "Escolha um dia e uma partida no calendário.",
      en: "Please choose a day and a departure on the calendar.",
    } as Localized,
    partySize: {
      pt: "Indique quem vem — pelo menos um adulto.",
      en: "Tell us who's coming — at least one adult.",
    } as Localized,
    dayGone: {
      pt: "Essa partida deixou de estar disponível. Escolha outra, por favor.",
      en: "That departure is no longer available. Please choose another one.",
    } as Localized,
    /**
     * The car this group needs is already out on that departure — on either
     * tour, since the fleet is shared. A different day or a different
     * departure may well have one, so the message says to pick one rather
     * than sending them away.
     */
    carGone: {
      pt: "O carro para um grupo deste tamanho já está reservado nessa partida. Escolha outro dia ou outra hora, por favor.",
      en: "The car for a group your size is already booked on that departure. Please pick another day or time.",
    } as Localized,
    /**
     * Above the biggest car. Not a refusal — a redirection: bigger groups are
     * real business that needs a third driver (AGORA-019), so they are worth a
     * conversation rather than an error.
     */
    groupTooLarge: {
      pt: "Grupos com mais de 8 pessoas juntam vários carros — fale connosco e organizamos tudo à medida.",
      en: "Groups of more than 8 need several cars — get in touch and we'll arrange it for you.",
    } as Localized,
    minAdults: {
      pt: "Esta opção precisa de mais adultos do que os indicados — veja os mínimos junto de cada escolha.",
      en: "This option needs more adults than you've set — see the minimums shown beside each choice.",
    } as Localized,
    addOnUnavailable: {
      pt: "Um dos complementos escolhidos não está disponível nesta combinação de dia e grupo.",
      en: "One of the chosen add-ons isn't available for this day and group.",
    } as Localized,
    /**
     * Payments are off, or the experience has no price yet. One message for
     * both, because from the guest's side they are the same situation and the
     * same next step: send the enquiry instead and we will arrange it.
     */
    paymentsOff: {
      pt: "Neste momento não é possível pagar online. Envie-nos o pedido e tratamos da sua reserva consigo.",
      en: "Online payment isn't available right now. Send us your request and we'll arrange the booking with you.",
    } as Localized,
    rateLimited: {
      pt: "Recebemos vários pedidos seus. Aguarde alguns minutos antes de tentar novamente.",
      en: "We've had several attempts from you. Please wait a few minutes before trying again.",
    } as Localized,
    generic: {
      pt: "Não foi possível iniciar o pagamento. Tente novamente.",
      en: "We couldn't start the payment. Please try again.",
    } as Localized,
  },

  /** The page the guest lands on after paying. */
  confirmation: {
    title: { pt: "Reserva confirmada", en: "Booking confirmed" } as Localized,
    lead: {
      pt: "Obrigado! O pagamento foi recebido e a sua reserva está confirmada.",
      en: "Thank you! Your payment went through and your booking is confirmed.",
    } as Localized,
    emailNote: {
      pt: "Enviámos a confirmação para o seu email, com a partida e o ponto de encontro. Qualquer dúvida antes do dia, é só responder.",
      en: "We've emailed you the confirmation, with your departure and the meeting point. Any questions before the day, just reply.",
    } as Localized,
    reference: { pt: "Referência", en: "Reference" } as Localized,

    /**
     * Payment taken, confirmation not recorded yet — the webhook is in flight,
     * or the payment method settles later (Multibanco). Never says "failed":
     * their money has left and telling them otherwise would be wrong.
     */
    pendingTitle: { pt: "A confirmar o pagamento", en: "Confirming your payment" } as Localized,
    pendingLead: {
      pt: "Recebemos o seu pedido e estamos a confirmar o pagamento. Receberá um email assim que estiver tudo certo — normalmente em poucos minutos.",
      en: "We've got your booking and we're confirming the payment. You'll get an email as soon as it's done — usually within a few minutes.",
    } as Localized,

    /** Landed here with a session we cannot resolve. */
    unknownTitle: { pt: "Não encontrámos essa reserva", en: "We couldn't find that booking" } as Localized,
    unknownLead: {
      pt: "Se pagou e não recebeu confirmação, fale connosco e resolvemos já.",
      en: "If you paid and haven't had a confirmation, get in touch and we'll sort it out straight away.",
    } as Localized,

    backHome: { pt: "Voltar ao início", en: "Back to the homepage" } as Localized,
    contactUs: { pt: "Falar connosco", en: "Get in touch" } as Localized,
  },
} as const;
