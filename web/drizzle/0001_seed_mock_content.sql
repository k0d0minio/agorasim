-- Seed: mock content drafts + sample leads.
--
-- Populates the generated-content tables with representative bilingual drafts so
-- the admin dashboard has something realistic to render, plus a few inbound
-- tour requests. Facts follow workspaces/_config/business-facts.md.
--
-- Idempotent: rows keyed by a unique slug use ON CONFLICT DO NOTHING; the
-- slug-less tables are guarded so re-applying the migration is harmless.

-- ---------------------------------------------------------------------------
-- GEO content blocks (geo-content pipeline output)
-- ---------------------------------------------------------------------------
INSERT INTO "geo_content_drafts" ("slug", "target_page", "target_query", "status", "date_modified", "pt", "en") VALUES
(
  'rural-saloia-classic-car-tour',
  'experiencias/rural-saloia',
  'classic car countryside tour near Sintra',
  'published',
  '2026-06-20',
  '{
    "intro": "A Rural Saloia e uma experiencia guiada de um dia num carro classico pela regiao Saloia, entre Sintra, Mafra e a Ericeira. Visita monumentos naturais, vinhas, aldeias, o Palacio Nacional de Mafra e a costa atlantica, com paragens gastronomicas pelo caminho.",
    "sections": [
      { "heading": "O que inclui o passeio", "body": ["Um dia completo (cerca de 6 a 7 horas) a bordo de um carro classico: Citroen 2CV, Renault 4L, Fiat 600 ou Volkswagen T3.", "O percurso liga os monumentos naturais entre Sintra e Mafra, atravessa vinhas e aldeias e chega a Ericeira, reserva mundial de surf da UNESCO."] },
      { "heading": "Para quem e", "body": ["Saidas em pequenos grupos para manter um ambiente intimista. Fazemos tambem passeios privados para familias e grupos."] }
    ],
    "faqs": [
      { "question": "Onde comeca e termina a experiencia?", "answer": "O passeio decorre na regiao Saloia, entre Sintra, Mafra e a Ericeira. O ponto de encontro e combinado na reserva." },
      { "question": "E preciso saber conduzir o carro classico?", "answer": "Nao. A experiencia e guiada por um anfitriao local que conduz o carro classico." }
    ]
  }'::jsonb,
  '{
    "intro": "Rural Saloia is a guided full-day experience in a classic car through the Saloia region, from Sintra and Mafra to Ericeira. You visit natural monuments, vineyards, villages, the National Palace of Mafra and the Atlantic coast, with gastronomic stops along the way.",
    "sections": [
      { "heading": "What the tour includes", "body": ["A full day (about 6 to 7 hours) aboard a classic car: Citroen 2CV, Renault 4L, Fiat 600 or Volkswagen T3.", "The route links the natural monuments between Sintra and Mafra, crosses vineyards and villages and reaches Ericeira, a UNESCO World Surfing Reserve."] },
      { "heading": "Who it is for", "body": ["Departures run in small groups to keep an intimate atmosphere. We also run private tours for families and groups."] }
    ],
    "faqs": [
      { "question": "Where does the experience start and end?", "answer": "The tour takes place in the Saloia region, between Sintra, Mafra and Ericeira. The meeting point is arranged at booking." },
      { "question": "Do I need to drive the classic car?", "answer": "No. The experience is led by a local host who drives the classic car." }
    ]
  }'::jsonb
),
(
  'saloia-region-day-trip-lisbon',
  'sobre',
  'day trip from Lisbon to the Saloia countryside',
  'in_review',
  '2026-06-28',
  '{
    "intro": "A regiao Saloia e o campo entre Sintra, Mafra e a Ericeira, a menos de uma hora de Lisboa. Um passeio de dia com a Agorasim troca as multidoes por vinhas, aldeias, gastronomia local e a costa atlantica, ao ritmo de um carro classico.",
    "sections": [
      { "heading": "A que distancia fica de Lisboa", "body": ["A regiao Saloia comeca a cerca de 30 a 45 minutos de carro do centro de Lisboa, o que a torna ideal para uma escapadela de um dia."] }
    ],
    "faqs": [
      { "question": "Vale a pena como bate-volta de Lisboa?", "answer": "Sim. A proximidade a Lisboa e o ritmo sem pressa fazem da regiao Saloia um destino de dia completo, longe das rotas mais turisticas." }
    ]
  }'::jsonb,
  '{
    "intro": "The Saloia region is the countryside between Sintra, Mafra and Ericeira, less than an hour from Lisbon. A day out with Agorasim swaps the crowds for vineyards, villages, local food and the Atlantic coast, at the pace of a classic car.",
    "sections": [
      { "heading": "How far it is from Lisbon", "body": ["The Saloia region starts about 30 to 45 minutes by car from central Lisbon, which makes it ideal for a day trip."] }
    ],
    "faqs": [
      { "question": "Is it worth it as a day trip from Lisbon?", "answer": "Yes. The closeness to Lisbon and the unhurried pace make the Saloia region a full-day destination, away from the busiest tourist routes." }
    ]
  }'::jsonb
),
(
  'mafra-wine-tasting-tour',
  'experiencias/manzwine',
  'wine tasting tour near Mafra and Ericeira',
  'draft',
  '2026-07-01',
  '{
    "intro": "A Manzwine e uma prova de vinhos com contexto historico na regiao de Mafra, com cerca de 1,5 horas. Descubra castas locais e a historia por detras de cada vinho, e combine a prova com o passeio Rural Saloia.",
    "sections": [
      { "heading": "O que prova", "body": ["Uma prova guiada que liga o vinho a historia da regiao, com castas locais e a paisagem que as produz."] }
    ],
    "faqs": [
      { "question": "Posso juntar a prova ao passeio de carro classico?", "answer": "Sim. A Manzwine combina na perfeicao com a experiencia Rural Saloia como paragem do dia." }
    ]
  }'::jsonb,
  '{
    "intro": "Manzwine is a wine tasting with historical context in the Mafra region, lasting about 1.5 hours. Discover local grape varieties and the story behind each wine, and pair the tasting with the Rural Saloia tour.",
    "sections": [
      { "heading": "What you taste", "body": ["A guided tasting that connects wine to the history of the region, with local grape varieties and the landscape that produces them."] }
    ],
    "faqs": [
      { "question": "Can I add the tasting to the classic car tour?", "answer": "Yes. Manzwine pairs perfectly with the Rural Saloia experience as a stop during the day." }
    ]
  }'::jsonb
)
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Blog post drafts
-- ---------------------------------------------------------------------------
INSERT INTO "blog_post_drafts" ("slug", "title", "excerpt", "body", "tags", "hero_image", "status", "date_modified") VALUES
(
  'cinco-razoes-carro-classico-saloia',
  '{ "pt": "Cinco razoes para explorar a regiao Saloia num carro classico", "en": "Five reasons to explore the Saloia region in a classic car" }'::jsonb,
  '{ "pt": "Do ritmo sem pressa as paragens gastronomicas: porque um carro classico e a melhor forma de conhecer o campo entre Sintra e a Ericeira.", "en": "From the unhurried pace to the food stops: why a classic car is the best way to discover the countryside between Sintra and Ericeira." }'::jsonb,
  '{ "pt": ["Viajar devagar muda tudo. Num Citroen 2CV ou num Renault 4L, a paisagem Saloia revela-se ao ritmo certo.", "As paragens fazem a viagem: vinhas, aldeias e docaria regional entre Sintra e a Ericeira.", "E, claro, a costa atlantica ao fim do dia, com a Ericeira e as suas ondas reconhecidas pela UNESCO."], "en": ["Travelling slowly changes everything. In a Citroen 2CV or a Renault 4L, the Saloia landscape reveals itself at the right pace.", "The stops make the journey: vineyards, villages and regional sweets between Sintra and Ericeira.", "And, of course, the Atlantic coast at the end of the day, with Ericeira and its UNESCO-recognised waves."] }'::jsonb,
  '["carros-classicos", "regiao-saloia", "roteiros"]'::jsonb,
  '/images/car.jpg',
  'approved',
  '2026-06-15'
),
(
  'o-que-comer-regiao-saloia',
  '{ "pt": "O que comer na regiao Saloia", "en": "What to eat in the Saloia region" }'::jsonb,
  '{ "pt": "Um pequeno guia dos sabores Saloios, da refeicao de familia no Tasco Galapito aos vinhos de Mafra e Colares.", "en": "A small guide to Saloia flavours, from the family meal at Tasco Galapito to the wines of Mafra and Colares." }'::jsonb,
  '{ "pt": ["A cozinha Saloia e feita de produtos locais e receitas passadas de geracao em geracao.", "No Tasco Galapito sente-se a mesa como em casa de familia; nas provas Manzwine e Ramilo descobre castas de influencia atlantica."], "en": ["Saloia cooking is made of local produce and recipes passed down through generations.", "At Tasco Galapito you sit at the table as in a family home; at the Manzwine and Ramilo tastings you discover Atlantic-influenced grape varieties."] }'::jsonb,
  '["gastronomia", "vinhos", "regiao-saloia"]'::jsonb,
  '/images/picnic.jpeg',
  'draft',
  '2026-07-02'
)
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Social post drafts (no unique slug -> guard against re-seeding)
-- ---------------------------------------------------------------------------
INSERT INTO "social_post_drafts" ("platform", "caption", "hashtags", "experience_slug", "media_url", "scheduled_for", "status")
SELECT * FROM (VALUES
  (
    'instagram'::social_platform,
    '{ "pt": "Um dia classico pelo campo Saloio, de Sintra a Ericeira. Vinhas, aldeias e a costa atlantica ao ritmo de um 2CV.", "en": "A classic day through the Saloia countryside, from Sintra to Ericeira. Vineyards, villages and the Atlantic coast at the pace of a 2CV." }'::jsonb,
    '["agorasim", "saloia", "classiccar", "sintra", "ericeira"]'::jsonb,
    'rural-saloia'::text,
    '/images/car.jpg'::text,
    TIMESTAMPTZ '2026-07-10 09:00:00+01',
    'approved'::content_status
  ),
  (
    'facebook'::social_platform,
    '{ "pt": "Prova de vinhos com historia na regiao de Mafra. Junte a Manzwine ao seu passeio Rural Saloia.", "en": "A wine tasting with history in the Mafra region. Add Manzwine to your Rural Saloia tour." }'::jsonb,
    '["agorasim", "manzwine", "winetasting", "mafra"]'::jsonb,
    'manzwine'::text,
    '/images/picnic-2.jpeg'::text,
    TIMESTAMPTZ '2026-07-12 18:00:00+01',
    'in_review'::content_status
  ),
  (
    'tiktok'::social_platform,
    '{ "pt": "Barro, maos e tradicao. Um workshop de ceramica com um artesao local na regiao Saloia.", "en": "Clay, hands and tradition. A ceramics workshop with a local artisan in the Saloia region." }'::jsonb,
    '["agorasim", "olariamz", "ceramics", "handmade"]'::jsonb,
    'olaria-mz'::text,
    '/images/back-of-car.png'::text,
    NULL::timestamptz,
    'draft'::content_status
  )
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM "social_post_drafts");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Email campaign drafts
-- ---------------------------------------------------------------------------
INSERT INTO "email_campaign_drafts" ("slug", "subject", "preheader", "body", "segment", "scheduled_for", "status") VALUES
(
  'boas-vindas-agorasim',
  '{ "pt": "Bem-vindo a Agorasim: o campo Saloio a sua espera", "en": "Welcome to Agorasim: the Saloia countryside awaits" }'::jsonb,
  '{ "pt": "Passeios sem pressa em carros classicos, entre Sintra e a Ericeira.", "en": "Unhurried tours in classic cars, between Sintra and Ericeira." }'::jsonb,
  '{ "pt": ["Obrigado pelo seu interesse na Agorasim.", "Levamos-lo a conhecer a regiao Saloia a bordo de carros classicos, com paragens de gastronomia, vinho e cultura local.", "Responda a este email para combinarmos a sua saida."], "en": ["Thank you for your interest in Agorasim.", "We take you through the Saloia region aboard classic cars, with stops for food, wine and local culture.", "Reply to this email so we can arrange your departure."] }'::jsonb,
  'newsletter',
  NULL,
  'approved'
),
(
  'verao-saloio-2026',
  '{ "pt": "Verao Saloio: reserve o seu passeio classico", "en": "Saloia summer: book your classic tour" }'::jsonb,
  '{ "pt": "Datas de verao abertas para a experiencia Rural Saloia.", "en": "Summer dates now open for the Rural Saloia experience." }'::jsonb,
  '{ "pt": ["O verao e a melhor altura para descobrir o campo Saloio.", "Reserve a experiencia Rural Saloia e complemente com uma refeicao de familia ou uma prova de vinhos."], "en": ["Summer is the best time to discover the Saloia countryside.", "Book the Rural Saloia experience and add a family meal or a wine tasting."] }'::jsonb,
  'past-guests',
  TIMESTAMPTZ '2026-07-15 08:00:00+01',
  'draft'
)
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Sample inbound tour requests (leads, no unique key -> guard against re-seeding)
-- ---------------------------------------------------------------------------
INSERT INTO "tour_requests" ("name", "email", "phone", "locale", "experience_slug", "add_ons", "party_size", "preferred_date", "message", "status", "source", "created_at")
SELECT * FROM (VALUES
  (
    'Marta Sousa'::text, 'marta.sousa@example.com'::text, '+351 912 000 111'::text, 'pt'::locale,
    'rural-saloia'::text, '["tasco-galapito"]'::jsonb, 2::integer, '2026-08-15'::text,
    'Gostariamos de fazer o passeio com almoco tradicional. Somos um casal.'::text,
    'new'::request_status, 'website'::text, TIMESTAMPTZ '2026-07-01 10:24:00+01'
  ),
  (
    'James Whitfield'::text, 'james.whitfield@example.com'::text, '+44 7700 900123'::text, 'en'::locale,
    'rural-saloia'::text, '["manzwine", "ramilo-wines"]'::jsonb, 4::integer, 'late August'::text,
    'Day trip from Lisbon for four adults, keen on the wine tastings.'::text,
    'contacted'::request_status, 'website'::text, TIMESTAMPTZ '2026-06-28 16:40:00+01'
  ),
  (
    'Sophie Laurent'::text, 'sophie.laurent@example.com'::text, NULL::text, 'en'::locale,
    'olaria-mz'::text, '[]'::jsonb, 3::integer, 'flexible'::text,
    'Interested in the ceramics workshop for a small family group.'::text,
    'quoted'::request_status, 'website'::text, TIMESTAMPTZ '2026-06-20 09:05:00+01'
  ),
  (
    'Pedro Antunes'::text, 'pedro.antunes@example.com'::text, '+351 933 222 444'::text, 'pt'::locale,
    'rural-saloia'::text, '["tasco-galapito", "manzwine"]'::jsonb, 6::integer, '2026-09-05'::text,
    'Passeio para um grupo de amigos, com almoco e prova de vinhos.'::text,
    'booked'::request_status, 'website'::text, TIMESTAMPTZ '2026-06-10 14:12:00+01'
  )
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM "tour_requests");
