import type { Localized } from "@/i18n/config";

/**
 * Copy and sample articles for the public blog (`/[locale]/blog`) — proposal
 * Feature 2 (AI-automated blog). While the drafting pipeline is being built,
 * the sample posts below stand in for real output so the index and article
 * layouts can be seen exactly as they will ship. Real posts will come from the
 * `blog_post_drafts` table after review in the admin dashboard.
 */
export const blogContent = {
  title: { pt: "Histórias da região Saloia", en: "Stories from the Saloia region" } as Localized,
  lead: {
    pt: "Guias, segredos locais e ideias para o seu dia entre Sintra, Mafra e a Ericeira — escritos por quem cá vive.",
    en: "Guides, local secrets and ideas for your day between Sintra, Mafra and Ericeira — written by the people who live here.",
  } as Localized,

  inDev: {
    pt: "O blog está a ser construído — os artigos abaixo são exemplos do formato final. Em breve, novas histórias todas as semanas.",
    en: "The blog is being built — the articles below are examples of the final format. Soon, fresh stories every week.",
  } as Localized,

  labels: {
    featured: { pt: "Em destaque", en: "Featured" } as Localized,
    latest: { pt: "Artigos recentes", en: "Latest articles" } as Localized,
    readMore: { pt: "Ler artigo", en: "Read article" } as Localized,
    readingTime: { pt: "min de leitura", en: "min read" } as Localized,
    backToBlog: { pt: "Voltar ao blog", en: "Back to the blog" } as Localized,
    continueReading: { pt: "Continue a ler", en: "Continue reading" } as Localized,
    sampleArticle: {
      pt: "Artigo de exemplo — o formato final dos conteúdos do blog.",
      en: "Sample article — the final format of the blog's content.",
    } as Localized,
    ctaTitle: {
      pt: "Viva estas histórias ao vivo",
      en: "Live these stories for yourself",
    } as Localized,
    ctaBody: {
      pt: "Tudo o que lê aqui faz parte dos nossos passeios em carros clássicos pela região Saloia.",
      en: "Everything you read here is part of our classic-car tours through the Saloia region.",
    } as Localized,
    newsletterTitle: {
      pt: "Receba as novas histórias",
      en: "Get new stories by email",
    } as Localized,
    newsletterBody: {
      pt: "Uma vez por mês, o melhor da região Saloia na sua caixa de correio. Sem spam.",
      en: "Once a month, the best of the Saloia region in your inbox. No spam.",
    } as Localized,
    newsletterPlaceholder: { pt: "O seu email", en: "Your email" } as Localized,
    newsletterButton: { pt: "Subscrever", en: "Subscribe" } as Localized,
    newsletterSoon: {
      pt: "A subscrição fica disponível brevemente.",
      en: "Subscription will be available soon.",
    } as Localized,
  },
} as const;

export type BlogPostPreview = {
  slug: string;
  title: Localized;
  excerpt: Localized;
  body: Localized<string[]>;
  tag: Localized;
  /** ISO date shown on the card and used for ordering. */
  date: string;
  readingMinutes: number;
  image: string;
  imageAlt: Localized;
};

/** Sample posts standing in for pipeline output — newest first. */
export const sampleBlogPosts: BlogPostPreview[] = [
  {
    slug: "um-dia-perfeito-na-ericeira",
    title: {
      pt: "Um dia perfeito na Ericeira, longe das multidões",
      en: "A perfect day in Ericeira, away from the crowds",
    },
    excerpt: {
      pt: "Da primeira bica da manhã ao pôr do sol sobre o Atlântico — o roteiro que fazemos com quem visita a vila pela primeira vez.",
      en: "From the first morning espresso to sunset over the Atlantic — the route we take with first-time visitors to the village.",
    },
    body: {
      pt: [
        "A Ericeira acorda devagar. Antes dos surfistas chegarem às praias, a vila é dos pescadores e dos cafés que abrem cedo — e é aí que começa o nosso dia perfeito, com uma bica e um pastel acabado de fazer numa esplanada com vista para o mar.",
        "A meio da manhã, o segredo é caminhar para sul, pelos passadiços que ligam as praias. A luz sobre a Reserva Mundial de Surf é diferente de tudo o resto na costa portuguesa, e há sempre um recanto sem ninguém.",
        "Para almoçar, escolhemos sempre peixe do dia numa tasca de família — daquelas onde o menu é dito em voz alta e o peixe chegou de manhã. À tarde, o campo Saloio espera a poucos minutos: vinhas, aldeias e moinhos até o sol descer.",
        "O dia acaba onde começou: no mar. O pôr do sol visto das falésias da Ericeira é o fim de tarde mais bonito da região — e a melhor razão para voltar.",
      ],
      en: [
        "Ericeira wakes up slowly. Before the surfers reach the beaches, the village belongs to the fishermen and the early-opening cafés — and that is where our perfect day begins, with an espresso and a fresh pastry on a terrace overlooking the sea.",
        "Mid-morning, the secret is to walk south along the boardwalks linking the beaches. The light over the World Surfing Reserve is unlike anywhere else on the Portuguese coast, and there is always a quiet corner to yourself.",
        "For lunch, we always choose the fish of the day at a family-run tasca — the kind where the menu is spoken aloud and the fish arrived that morning. In the afternoon, the Saloia countryside waits just minutes away: vineyards, villages and windmills until the sun drops.",
        "The day ends where it began: at the sea. Sunset from the Ericeira cliffs is the most beautiful end of day in the region — and the best reason to come back.",
      ],
    },
    tag: { pt: "Roteiros", en: "Itineraries" },
    date: "2026-07-14",
    readingMinutes: 6,
    image: "/images/hero.webp",
    imageAlt: {
      pt: "Fim de tarde sobre a costa da Ericeira",
      en: "Late afternoon over the Ericeira coastline",
    },
  },
  {
    slug: "segredo-mais-bem-guardado-de-portugal",
    title: {
      pt: "Porque é que o campo Saloio é o segredo mais bem guardado de Portugal",
      en: "Why the Saloia countryside is Portugal's best-kept secret",
    },
    excerpt: {
      pt: "A vinte minutos de Sintra existe uma região de vinhas, moinhos e aldeias que quase nenhum visitante conhece. Nós crescemos cá.",
      en: "Twenty minutes from Sintra lies a region of vineyards, windmills and villages that almost no visitor knows. We grew up here.",
    },
    body: {
      pt: [
        "Todos os dias, milhares de visitantes fazem fila para os palácios de Sintra sem saberem que, a vinte minutos, começa uma região onde o tempo anda mais devagar: o campo Saloio.",
        "Saloio era o nome dado aos camponeses que abasteciam Lisboa de pão, fruta e vinho. A herança ficou: vinhas junto ao mar, azenhas, feiras de aldeia e uma cozinha que não mudou por moda — mudou apenas com as estações.",
        "É esta a região que percorremos nos nossos carros clássicos. Não porque fica bem na fotografia (fica), mas porque a velocidade certa para a conhecer é a de um 2CV: devagar, de janela aberta, com tempo para parar.",
        "O melhor do segredo? Continua a ser segredo. Nas estradas entre Sintra, Mafra e a Ericeira raramente encontrará outro turista — apenas quem cá vive, e agora você.",
      ],
      en: [
        "Every day, thousands of visitors queue for the palaces of Sintra without knowing that twenty minutes away begins a region where time moves more slowly: the Saloia countryside.",
        "Saloio was the name given to the farmers who supplied Lisbon with bread, fruit and wine. The heritage remains: vineyards by the sea, watermills, village markets and a cuisine that never changed with fashion — only with the seasons.",
        "This is the region we cross in our classic cars. Not because it photographs beautifully (it does), but because the right speed to know it is a 2CV's: slow, window down, with time to stop.",
        "The best part of the secret? It is still a secret. On the roads between Sintra, Mafra and Ericeira you will rarely meet another tourist — only the people who live here, and now you.",
      ],
    },
    tag: { pt: "Região", en: "The region" },
    date: "2026-06-30",
    readingMinutes: 5,
    image: "/images/car.jpg",
    imageAlt: {
      pt: "Carro clássico numa estrada rural Saloia",
      en: "Classic car on a rural Saloia road",
    },
  },
  {
    slug: "guia-vinhas-de-colares-a-mafra",
    title: {
      pt: "Das vinhas de Colares a Mafra: um guia para provar a região",
      en: "From the Colares vineyards to Mafra: a guide to tasting the region",
    },
    excerpt: {
      pt: "Vinho de areia, pão Saloio, doçaria conventual — o que provar (e onde) num dia de estrada pela região.",
      en: "Wine grown in sand, Saloio bread, convent sweets — what to taste (and where) on a day driving through the region.",
    },
    body: {
      pt: [
        "Poucas regiões do mundo têm vinhas plantadas em areia. Colares é uma delas — e é aí que começa qualquer roteiro de sabores da região Saloia, com castas que sobreviveram à filoxera e um vinho que sabe a mar.",
        "Seguindo para norte, o pão Saloio ainda coze em fornos de lenha, e cada aldeia tem a sua padaria de referência. Compre uma broa quente e perceberá porque é que Lisboa dependeu deste campo durante séculos.",
        "Em Mafra, a doçaria conventual conta a história do Palácio: receitas nascidas nos conventos, com muitas gemas e nomes impossíveis de esquecer. A nossa paragem preferida fica a dois passos do Terreiro.",
        "Termine na Ericeira com o mar à frente e um copo de vinho da região na mão — os ouriços-do-mar são a especialidade local para os mais corajosos.",
      ],
      en: [
        "Few regions in the world grow vines in sand. Colares is one of them — and that is where any tasting route through the Saloia region begins, with grape varieties that survived phylloxera and a wine that tastes of the sea.",
        "Heading north, Saloio bread still bakes in wood-fired ovens, and every village has its go-to bakery. Buy a warm loaf and you will understand why Lisbon depended on this countryside for centuries.",
        "In Mafra, the convent sweets tell the story of the Palace: recipes born in the convents, rich in egg yolks and with names impossible to forget. Our favourite stop is two steps from the main square.",
        "Finish in Ericeira with the sea in front of you and a glass of local wine in hand — sea urchins are the local speciality for the brave.",
      ],
    },
    tag: { pt: "Gastronomia", en: "Food & wine" },
    date: "2026-06-12",
    readingMinutes: 7,
    image: "/images/picnic.jpeg",
    imageAlt: {
      pt: "Piquenique com produtos regionais Saloios",
      en: "Picnic with regional Saloia produce",
    },
  },
];

export function getSamplePost(slug: string): BlogPostPreview | undefined {
  return sampleBlogPosts.find((p) => p.slug === slug);
}
