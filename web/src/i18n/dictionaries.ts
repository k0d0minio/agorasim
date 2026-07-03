import type { Locale } from "./config";

type Dict = {
  nav: {
    home: string;
    sobre: string;
    experiencias: string;
    eventos: string;
    contactos: string;
    reservar: string;
  };
  cta: {
    book: string;
    learnMore: string;
    bookExperience: string;
    viewExperiences: string;
    contactUs: string;
  };
  labels: {
    duration: string;
    highlights: string;
    complement: string;
    faq: string;
    getInTouch: string;
    openMenu: string;
    closeMenu: string;
    switchLanguage: string;
  };
  footer: { tagline: string; contacts: string; explore: string; rights: string };
};

/** UI chrome strings (navigation, buttons, labels). Page content lives in src/content. */
const dictionaries: Record<Locale, Dict> = {
  pt: {
    nav: {
      home: "Início",
      sobre: "Sobre",
      experiencias: "Experiências",
      eventos: "Eventos",
      contactos: "Contactos",
      reservar: "Reservar",
    },
    cta: {
      book: "Reservas",
      learnMore: "Saber mais",
      bookExperience: "Reservar experiência",
      viewExperiences: "Ver experiências",
      contactUs: "Fale connosco",
    },
    labels: {
      duration: "Duração",
      highlights: "Destaques",
      complement: "Complemente a sua experiência",
      faq: "Perguntas frequentes",
      getInTouch: "Entre em contacto",
      openMenu: "Abrir menu",
      closeMenu: "Fechar menu",
      switchLanguage: "Mudar idioma",
    },
    footer: {
      tagline: "Experiências rurais Saloias em carros clássicos, entre Sintra e a Ericeira.",
      contacts: "Contactos",
      explore: "Explorar",
      rights: "Todos os direitos reservados.",
    },
  },
  en: {
    nav: {
      home: "Home",
      sobre: "About",
      experiencias: "Experiences",
      eventos: "Events",
      contactos: "Contact",
      reservar: "Book a tour",
    },
    cta: {
      book: "Book now",
      learnMore: "Learn more",
      bookExperience: "Book this experience",
      viewExperiences: "View experiences",
      contactUs: "Get in touch",
    },
    labels: {
      duration: "Duration",
      highlights: "Highlights",
      complement: "Complement your experience",
      faq: "Frequently asked questions",
      getInTouch: "Get in touch",
      openMenu: "Open menu",
      closeMenu: "Close menu",
      switchLanguage: "Switch language",
    },
    footer: {
      tagline: "Rural Saloia experiences in classic cars, between Sintra and Ericeira.",
      contacts: "Contact",
      explore: "Explore",
      rights: "All rights reserved.",
    },
  },
};

export type Dictionary = Dict;

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
