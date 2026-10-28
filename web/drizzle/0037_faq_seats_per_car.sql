-- ---------------------------------------------------------------------------
-- "Quantas pessoas podem participar?" gives the seats of each car.
--
-- Feedback round 1 (Diogo, 2026-10-12): the answer said "small groups" and
-- gave no number. It now names the four classic cars and their seats, the
-- figures `FLEET` holds in `src/lib/fleet.ts`, and sends groups above 8 to the
-- team. The same copy ships in `src/content/experiences.ts`, which is what the
-- site renders when this table cannot be read. `src/content/experiences.test.ts`
-- holds the two equal.
--
-- Guarded, as `0014_obidos_truth.sql` is: the answer is replaced only where the
-- seeded "small groups" answer is still in place. An answer that Diogo & Rita
-- have since rewritten at /admin/experiences stays as they wrote it. The other
-- questions keep their order.
-- ---------------------------------------------------------------------------
UPDATE "experiences" SET
  "faqs" = (
    SELECT jsonb_agg(
      CASE
        WHEN "faq" -> 'question' ->> 'pt' = 'Quantas pessoas podem participar?'
        THEN jsonb_set("faq", '{answer}', '{"pt":"Depende do carro. O Citroën 2CV leva até 3 pessoas, o Renault 4L até 3, o Fiat 600 até 3 e a carrinha Volkswagen T3 até 8. Todos contam para os lugares, incluindo bebés. Para grupos com mais de 8 pessoas, fale connosco.","en":"It depends on the car. The Citroën 2CV seats up to 3 guests, the Renault 4L up to 3, the Fiat 600 up to 3 and the Volkswagen T3 van up to 8. Everyone counts towards the seats, infants included. For groups of more than 8, contact us."}'::jsonb)
        ELSE "faq"
      END
      ORDER BY "position"
    )
    FROM jsonb_array_elements("experiences"."faqs") WITH ORDINALITY AS "item"("faq", "position")
  ),
  "updated_at" = now()
WHERE "slug" = 'rural-saloia'
  AND "faqs"::text LIKE '%pequenos grupos para manter o ambiente intimista%';
