-- ---------------------------------------------------------------------------
-- Ericeira is a World Surfing Reserve of the Save The Waves Coalition, not of UNESCO.
--
-- The Rural Saloia description called Ericeira a UNESCO World Surfing Reserve, in pt and
-- in en. World Surfing Reserves are a programme of the Save The Waves Coalition. Ericeira
-- became one in 2011, the first in Europe (JAM-558). The same copy ships in
-- `src/content/experiences.ts`, which the site renders when this table cannot be read.
--
-- The statement changes the two wrong phrases only. Diogo & Rita edit the catalogue in
-- /admin/experiences: a row that no longer has a phrase keeps what they wrote.
-- ---------------------------------------------------------------------------
UPDATE "experiences" SET
  "description" = replace(
    replace(
      "description"::text,
      'chega à vila piscatória da Ericeira — reserva mundial de surf reconhecida pela UNESCO.',
      'chega à vila piscatória da Ericeira — a primeira reserva mundial de surf da Europa.'
    ),
    'reaches the fishing village of Ericeira — a UNESCO World Surfing Reserve.',
    'reaches the fishing village of Ericeira — Europe''s first World Surfing Reserve.'
  )::jsonb,
  "updated_at" = now()
WHERE "slug" = 'rural-saloia' AND "description"::text LIKE '%UNESCO%';
