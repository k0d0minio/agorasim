import type { Localized } from "@/i18n/config";

/**
 * Copy for the framework-level boundary screens — `error.tsx`, `loading.tsx`
 * and `not-found.tsx`. These are the only pages a visitor can reach without a
 * page component rendering, so their copy lives here rather than inline, in
 * step with the rest of `src/content/`.
 *
 * Deliberately plain and non-technical: these screens never show the underlying
 * error message or stack (it can carry connection strings and internal paths).
 * Operators get the details from the server logs via the error digest.
 */
export const systemContent = {
  error: {
    title: { pt: "Algo correu mal", en: "Something went wrong" } as Localized,
    body: {
      pt: "Não foi possível carregar esta página. Pode ser temporário — tente novamente dentro de momentos.",
      en: "We couldn't load this page. It may be temporary — please try again in a moment.",
    } as Localized,
    retry: { pt: "Tentar novamente", en: "Try again" } as Localized,
    home: { pt: "Voltar ao início", en: "Back to home" } as Localized,
  },

  notFound: {
    title: { pt: "Página não encontrada", en: "Page not found" } as Localized,
    body: {
      pt: "A página que procura não existe ou mudou de endereço.",
      en: "The page you are looking for doesn't exist or has moved.",
    } as Localized,
    home: { pt: "Voltar ao início", en: "Back to home" } as Localized,
  },

  loading: {
    label: { pt: "A carregar…", en: "Loading…" } as Localized,
  },
} as const;

/**
 * Admin-side equivalents. The admin area is deliberately monolingual — and the
 * language is **Portuguese**: it is Diogo & Rita's console, not a bilingual
 * surface, so there is no `Localized<T>` here and no locale toggle (D4).
 * The vocabulary, register and per-string renderings live in
 * `.icm/docs/admin-pt-inventory.md` — take the words from there rather than
 * translating afresh, so the admin keeps one name per concept.
 *
 * Its failure mode is almost always the database, so it says so.
 */
export const adminSystemContent = {
  error: {
    title: "Não foi possível chegar à base de dados",
    body: "Os dados não carregaram. Costuma ser um problema passageiro de ligação — tente novamente e, se continuar, avise a equipa.",
    retry: "Tentar novamente",
    dashboard: "Voltar ao início",
  },
  notFound: {
    title: "Página não encontrada",
    body: "Essa página do painel não existe. Pode ter mudado de nome ou ainda não estar construída.",
    dashboard: "Voltar ao início",
  },
} as const;
