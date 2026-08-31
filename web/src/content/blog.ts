import type { Localized } from "@/i18n/config";

/**
 * Chrome for the public blog (`/[locale]/blog`) — the headings and labels
 * around the articles.
 *
 * The articles themselves are no longer here. Three sample posts used to stand
 * in for pipeline output behind a `noindex`, alongside a newsletter box wired to
 * nothing; both are gone. Real posts live in `blog_post_drafts`, are published
 * from `/admin/blog`, and are read through `lib/blog-posts.ts`.
 */
export const blogContent = {
  title: { pt: "Histórias da região Saloia", en: "Stories from the Saloia region" } as Localized,
  lead: {
    pt: "Guias, segredos locais e ideias para o seu dia entre Sintra, Mafra e a Ericeira — escritos por quem cá vive.",
    en: "Guides, local secrets and ideas for your day between Sintra, Mafra and Ericeira — written by the people who live here.",
  } as Localized,

  /**
   * Shown only while nothing is published. It is the truthful state of an empty
   * blog rather than a placeholder for one: there is nothing to read yet, and
   * the page says so and points at the thing there *is* to do.
   */
  empty: {
    pt: "As primeiras histórias estão a ser escritas. Enquanto não chegam, o melhor da região vê-se ao vivo — de carro clássico, entre Sintra, Mafra e a Ericeira.",
    en: "The first stories are being written. Until they arrive, the best of the region is seen in person — by classic car, between Sintra, Mafra and Ericeira.",
  } as Localized,

  labels: {
    featured: { pt: "Em destaque", en: "Featured" } as Localized,
    latest: { pt: "Artigos recentes", en: "Latest articles" } as Localized,
    readMore: { pt: "Ler artigo", en: "Read article" } as Localized,
    readingTime: { pt: "min de leitura", en: "min read" } as Localized,
    backToBlog: { pt: "Voltar ao blog", en: "Back to the blog" } as Localized,
    continueReading: { pt: "Continue a ler", en: "Continue reading" } as Localized,
    updatedOn: { pt: "Atualizado a", en: "Updated on" } as Localized,
    ctaTitle: {
      pt: "Viva estas histórias ao vivo",
      en: "Live these stories for yourself",
    } as Localized,
    ctaBody: {
      pt: "Tudo o que lê aqui faz parte dos nossos passeios em carros clássicos pela região Saloia.",
      en: "Everything you read here is part of our classic-car tours through the Saloia region.",
    } as Localized,
  },
} as const;
