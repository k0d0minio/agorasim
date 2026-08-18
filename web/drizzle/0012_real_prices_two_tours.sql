CREATE TYPE "public"."booking_mode" AS ENUM('public', 'private');--> statement-breakpoint
DROP INDEX "availability_date_slot_key";--> statement-breakpoint
DROP INDEX "availability_date_idx";--> statement-breakpoint
ALTER TABLE "availability" ALTER COLUMN "slot" SET DEFAULT 'morning';--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "slot" SET DEFAULT 'morning';--> statement-breakpoint
ALTER TABLE "availability" ADD COLUMN "experience_slug" text DEFAULT 'rural-saloia' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "mode" "booking_mode" DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "adults" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "children" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "infants" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "exclusive" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "experiences" ADD COLUMN "pricing" jsonb;--> statement-breakpoint
CREATE UNIQUE INDEX "availability_experience_date_slot_key" ON "availability" USING btree ("experience_slug","date","slot");--> statement-breakpoint
CREATE INDEX "availability_experience_date_idx" ON "availability" USING btree ("experience_slug","date");--> statement-breakpoint
-- ---------------------------------------------------------------------------
-- Data: the real offer lands (AGORA-002).
--
-- Everything below is Diogo & Rita's own answers (agorasim-info + prices PDFs,
-- Aug 2026): two departures a day instead of one, a second tour, tiered
-- public/private prices, Olaria MZ retired, and the mock content that must not
-- reach production removed. The catalogue statements are generated from
-- src/content/experiences.ts so the seed and the shipped fallback agree.
-- ---------------------------------------------------------------------------
-- The launch-era single daily departure becomes the 10:00 one.
UPDATE "availability" SET "slot" = 'morning' WHERE "slot" = 'full_day';--> statement-breakpoint
UPDATE "bookings" SET "slot" = 'morning' WHERE "slot" = 'full_day';--> statement-breakpoint
-- Rows priced before the adult/child bands existed were all counted as adults.
UPDATE "bookings" SET "adults" = "party_size" WHERE "adults" = 1 AND "party_size" <> 1;--> statement-breakpoint
-- Olaria MZ is no longer a partner. Archived, not deleted: old leads name it.
UPDATE "experiences" SET "active" = false, "updated_at" = now() WHERE "slug" = 'olaria-mz';--> statement-breakpoint
-- Óbidos takes sort slot 1, after Rural Saloia; the add-ons shuffle down.
UPDATE "experiences" SET "sort_order" = 2, "updated_at" = now() WHERE "slug" = 'tasco-galapito';--> statement-breakpoint
UPDATE "experiences" SET "sort_order" = 3, "updated_at" = now() WHERE "slug" = 'manzwine';--> statement-breakpoint
UPDATE "experiences" SET "sort_order" = 4, "updated_at" = now() WHERE "slug" = 'ramilo-wines';--> statement-breakpoint
-- The 0001 mock seed must not survive in production (AGORA-002): the sample
-- leads are recognisable by their reserved example.com addresses, and the four
-- draft tables are only ever read by design previews that render their own
-- examples — nothing real has ever been written to them.
DELETE FROM "tour_requests" WHERE "email" LIKE '%@example.com';--> statement-breakpoint
DELETE FROM "geo_content_drafts";--> statement-breakpoint
DELETE FROM "blog_post_drafts";--> statement-breakpoint
DELETE FROM "social_post_drafts";--> statement-breakpoint
DELETE FROM "email_campaign_drafts";--> statement-breakpoint
UPDATE "experiences" SET
  "summary" = '{"pt":"Rural Saloia é uma experiência guiada de 4h30 num carro clássico pela região Saloia, entre Sintra e Mafra até à Ericeira. Visita monumentos naturais, vinhas, aldeias, o Palácio Nacional de Mafra e a costa atlântica, com paragens gastronómicas pelo caminho.","en":"Rural Saloia is a guided 4.5-hour experience in a classic car through the Saloia region, from Sintra and Mafra to Ericeira. You visit natural monuments, vineyards, villages, the National Palace of Mafra and the Atlantic coast, with gastronomic stops along the way."}'::jsonb,
  "duration" = '{"pt":"Aprox. 4h30","en":"Approx. 4.5h"}'::jsonb,
  "faqs" = '[{"question":{"pt":"Onde começa a experiência Rural Saloia?","en":"Where does the Rural Saloia experience start?"},"answer":{"pt":"O ponto de encontro é na Av. Mário Firmino Miguel, em Sintra (Portela de Sintra). Há duas partidas por dia, às 10h00 e às 14h00 — escolhe a sua ao reservar, e a confirmação inclui o mapa exato.","en":"The meeting point is Av. Mário Firmino Miguel in Sintra (Portela de Sintra). There are two departures a day, at 10:00 and 14:00 — you pick yours when booking, and your confirmation includes the exact map link."}},{"question":{"pt":"Qual é a política de cancelamento?","en":"What is the cancellation policy?"},"answer":{"pt":"Cancelamento gratuito até 48 horas antes da experiência, com reembolso total. Em caso de mau tempo tentamos sempre reagendar por email; em condições extremas, reembolsamos.","en":"Free cancellation up to 48 hours before the experience, with a full refund. In bad weather we always try to reschedule by email; in extreme conditions, we refund."}},{"question":{"pt":"As crianças pagam?","en":"Do children pay?"},"answer":{"pt":"Crianças dos 4 aos 12 anos têm preço reduzido; bebés com menos de 4 anos não pagam. Todos contam para os lugares do carro — indique o grupo completo ao reservar.","en":"Children aged 4–12 pay a reduced rate; infants under 4 go free. Everyone counts towards the seats in the car, so tell us your full group when booking."}},{"question":{"pt":"Quantas pessoas podem participar?","en":"How many people can join?"},"answer":{"pt":"As saídas são em pequenos grupos para manter o ambiente intimista. Fazemos também passeios privados para famílias e grupos — fale connosco para grupos maiores.","en":"Departures are in small groups to keep the atmosphere intimate. We also run private tours for families and groups — contact us for larger parties."}},{"question":{"pt":"É preciso saber conduzir o carro clássico?","en":"Do I need to drive the classic car?"},"answer":{"pt":"Não. A experiência é guiada por um anfitrião local que conduz o carro clássico. Basta relaxar e desfrutar da paisagem.","en":"No. The experience is led by a local host who drives the classic car. You just relax and enjoy the scenery."}}]'::jsonb,
  "pricing" = '{"type":"tour","public":{"tiers":[{"minAdults":1,"maxAdults":3,"perAdultCents":6200},{"minAdults":4,"maxAdults":12,"perAdultCents":5800}],"childCents":3500},"private":{"tiers":[{"minAdults":1,"maxAdults":3,"groupCents":22000},{"minAdults":4,"maxAdults":4,"groupCents":29000},{"minAdults":5,"maxAdults":5,"groupCents":35000},{"minAdults":6,"maxAdults":6,"groupCents":40000},{"minAdults":7,"maxAdults":7,"groupCents":45000},{"minAdults":8,"maxAdults":8,"groupCents":50000},{"minAdults":9,"maxAdults":9,"groupCents":55000},{"minAdults":10,"maxAdults":10,"groupCents":60000},{"minAdults":11,"maxAdults":11,"groupCents":65000},{"minAdults":12,"maxAdults":12,"groupCents":70000}],"childCents":3000,"allowsAddOns":true}}'::jsonb,
  "updated_at" = now()
WHERE "slug" = 'rural-saloia';--> statement-breakpoint
UPDATE "experiences" SET
  "faqs" = '[{"question":{"pt":"É possível adaptar o menu a restrições alimentares?","en":"Can the menu be adapted to dietary requirements?"},"answer":{"pt":"Sim. Indique as suas preferências ou restrições no momento da reserva e adaptamos a refeição sempre que possível.","en":"Yes. Let us know your preferences or restrictions when booking and we adapt the meal whenever possible."}}]'::jsonb,
  "pricing" = '{"type":"addon","perAdultCents":6000,"childCents":2500,"minGuests":2}'::jsonb,
  "updated_at" = now()
WHERE "slug" = 'tasco-galapito';--> statement-breakpoint
UPDATE "experiences" SET
  "faqs" = '[{"question":{"pt":"A prova Manzwine está disponível todos os dias?","en":"Is the Manzwine tasting available every day?"},"answer":{"pt":"A Manzwine encerra à segunda-feira. Nos restantes dias, a prova junta-se à experiência privada Rural Saloia com um mínimo de 2 adultos.","en":"Manzwine closes on Mondays. On other days, the tasting joins the private Rural Saloia experience with a minimum of 2 adults."}}]'::jsonb,
  "pricing" = '{"type":"addon","perAdultCents":3500,"childCents":null,"minAdults":2,"closedWeekdays":[0]}'::jsonb,
  "updated_at" = now()
WHERE "slug" = 'manzwine';--> statement-breakpoint
UPDATE "experiences" SET
  "faqs" = '[{"question":{"pt":"Qual é o mínimo de pessoas para a visita Ramilo Wines?","en":"What is the minimum group for the Ramilo Wines visit?"},"answer":{"pt":"A visita realiza-se com um mínimo de 3 adultos, como complemento da experiência privada Rural Saloia.","en":"The visit runs with a minimum of 3 adults, as an add-on to the private Rural Saloia experience."}}]'::jsonb,
  "pricing" = '{"type":"addon","perAdultCents":4500,"childCents":null,"minAdults":3}'::jsonb,
  "updated_at" = now()
WHERE "slug" = 'ramilo-wines';--> statement-breakpoint
INSERT INTO "experiences" (
  "slug", "kind", "icon",
  "title", "tagline", "summary", "description", "duration", "highlights", "faqs",
  "image", "image_alt", "pricing", "sort_order"
) VALUES (
  'obidos-medieval-villages',
  'signature',
  'heritage',
  '{"pt":"Óbidos e Aldeias Medievais","en":"Óbidos & Medieval Villages"}'::jsonb,
  '{"pt":"Uma rota gastronómica por Óbidos e aldeias com séculos de história","en":"A food tour through Óbidos and villages with centuries of history"}'::jsonb,
  '{"pt":"Óbidos e Aldeias Medievais é uma rota guiada de cerca de 5 horas com partida de Lisboa, por Óbidos e aldeias medievais menos conhecidas, com uma pausa de comida e vinho tradicionais pelo caminho.","en":"Óbidos & Medieval Villages is a guided tour of about 5 hours departing from Lisbon, through Óbidos and lesser-known medieval villages, with a traditional food and wine break along the way."}'::jsonb,
  '{"pt":["Uma viagem alternativa a lugares menos conhecidos: a vila amuralhada de Óbidos e aldeias medievais que guardam a história como poucas, longe das multidões.","Pelo caminho há uma pausa de sabores tradicionais — comida e vinho da região — e histórias contadas por quem cresceu por perto.","A partida é no centro de Lisboa. Ao contrário das experiências Saloias, esta rota não é feita nos carros clássicos."],"en":["An alternative road trip to lesser-known places: the walled town of Óbidos and medieval villages that hold their history like few others, away from the crowds.","Along the way there is a stop for traditional flavours — regional food and wine — and stories told by hosts who grew up nearby.","Departure is from central Lisbon. Unlike the Saloia experiences, this route is not driven in the classic cars."]}'::jsonb,
  '{"pt":"Aprox. 5h","en":"Approx. 5h"}'::jsonb,
  '{"pt":["Vila medieval de Óbidos","Aldeias históricas fora das rotas habituais","Pausa de comida e vinho tradicionais","Partida do centro de Lisboa"],"en":["The medieval town of Óbidos","Historic villages off the usual routes","Traditional food and wine break","Departs from central Lisbon"]}'::jsonb,
  '[{"question":{"pt":"Onde começa a experiência Óbidos e Aldeias Medievais?","en":"Where does the Óbidos & Medieval Villages experience start?"},"answer":{"pt":"O ponto de encontro é na Alameda Cardeal Cerejeira, em Lisboa. A confirmação da reserva inclui o mapa exato do ponto de encontro.","en":"The meeting point is Alameda Cardeal Cerejeira in Lisbon. Your booking confirmation includes the exact map link for the meeting point."}},{"question":{"pt":"Esta experiência é feita em carros clássicos?","en":"Is this experience in the classic cars?"},"answer":{"pt":"Não — os carros clássicos ficam reservados para as experiências na região Saloia. Esta rota é feita em viatura confortável, pensada para a distância até Óbidos.","en":"No — the classic cars are reserved for the Saloia-region experiences. This route uses a comfortable vehicle suited to the distance to Óbidos."}},{"question":{"pt":"Qual é a política de cancelamento?","en":"What is the cancellation policy?"},"answer":{"pt":"Cancelamento gratuito até 48 horas antes da experiência, com reembolso total. Em caso de mau tempo tentamos sempre reagendar por email; em condições extremas, reembolsamos.","en":"Free cancellation up to 48 hours before the experience, with a full refund. In bad weather we always try to reschedule by email; in extreme conditions, we refund."}}]'::jsonb,
  '/images/hero.webp',
  '{"pt":"Paisagem rural a caminho de Óbidos e das aldeias medievais","en":"Countryside landscape on the way to Óbidos and the medieval villages"}'::jsonb,
  '{"type":"tour","public":{"tiers":[{"minAdults":2,"maxAdults":12,"perAdultCents":10000}],"childCents":4000,"minAdults":2},"private":{"tiers":[{"minAdults":1,"maxAdults":3,"groupCents":36000},{"minAdults":4,"maxAdults":12,"perAdultCents":11000}],"childCents":4000}}'::jsonb,
  1
) ON CONFLICT ("slug") DO NOTHING;
