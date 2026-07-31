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
 * Admin-side equivalents. The admin area is deliberately monolingual (English),
 * and its failure mode is almost always the database, so it says so.
 */
export const adminSystemContent = {
  error: {
    title: "Couldn't reach the database",
    body: "The operations data didn't load. This is usually a brief connection problem — try again, and if it keeps happening let the team know.",
    retry: "Try again",
    dashboard: "Back to dashboard",
  },
  notFound: {
    title: "Page not found",
    body: "That admin page doesn't exist. It may have been renamed or is not built yet.",
    dashboard: "Back to dashboard",
  },
} as const;
