-- ---------------------------------------------------------------------------
-- Óbidos tells the truth: the vehicle in the photograph, and the departure hour.
--
-- Two gaps on the one tour that is explicitly *not* driven in the classic cars
-- (info PDF §2.6). `0012_real_prices_two_tours.sql` inserted the row pointing
-- at `/images/hero.webp` — a file that no longer exists, and whose subject was
-- a classic car in the first place. And its FAQs answered where the tour starts
-- without ever answering when: the Saloia hours (10h00 / 14h00) are not this
-- tour's, and Diogo & Rita have not yet given the ones that are.
--
-- So: a photograph of the town itself, and an answer that says the hour is
-- confirmed by email rather than borrowing a number from another route. The
-- same copy ships in `src/content/experiences.ts`, which is what the site
-- renders when this table cannot be read.
--
-- Both statements are guarded rather than blind. The catalogue is edited from
-- /admin/experiences, and a migration that runs months later must not overwrite
-- what Diogo & Rita have since chosen for themselves: the photograph is
-- repointed only where the dead seed path is still in place, and the answer is
-- added only where no answer about the hour exists yet. On an untouched
-- database both apply; on an edited one, neither does.
--
-- When the hours arrive: put them in `src/content/logistics.ts` and add a
-- migration replacing this answer. Nothing else has to change.
-- ---------------------------------------------------------------------------
UPDATE "experiences" SET
  "image" = '/images/obidos-medieval-villages/obidos-street-flowers.jpg',
  "image_alt" = '{"pt":"Rua de calçada dentro das muralhas de Óbidos, com uma porta enfeitada de flores e visitantes a passear","en":"A cobbled street inside the walls of Óbidos, a doorway dressed in flowers and visitors walking through"}'::jsonb,
  "updated_at" = now()
WHERE "slug" = 'obidos-medieval-villages'
  AND "image" = '/images/hero.webp';--> statement-breakpoint
-- Second in the list, directly after "where does it start?" — the order the
-- shipped catalogue uses, and the order the two questions are actually asked in.
UPDATE "experiences" SET
  "faqs" = jsonb_insert("faqs", '{1}', '{"question":{"pt":"A que horas parte a experiência Óbidos e Aldeias Medievais?","en":"What time does the Óbidos & Medieval Villages experience leave?"},"answer":{"pt":"Há uma partida de manhã e outra de tarde. Ao contrário das experiências Saloias, que partem às 10h00 e às 14h00, a hora exata desta rota é confirmada por email ou WhatsApp depois da reserva — o ponto de encontro é sempre o mesmo.","en":"There is one morning and one afternoon departure. Unlike the Saloia experiences, which leave at 10:00 and 14:00, the exact time for this route is confirmed by email or WhatsApp after you book — the meeting point never changes."}}'::jsonb),
  "updated_at" = now()
WHERE "slug" = 'obidos-medieval-villages'
  AND "faqs"::text NOT LIKE '%hora exata%';
