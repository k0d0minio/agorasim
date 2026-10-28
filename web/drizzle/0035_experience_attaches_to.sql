ALTER TABLE "experiences" ADD COLUMN "attaches_to" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
-- ---------------------------------------------------------------------------
-- Data: each add-on names the tours it joins (feedback round 1, Diogo,
-- 2026-10-12: "add the add-ons to the Obidos experience as well").
--
-- Until now an add-on joined whichever private tour had `allowsAddOns` in its
-- price list, which was Rural Saloia alone. The three partner stops now join
-- both tours. A row added later starts empty, and the admin attaches it.
-- ---------------------------------------------------------------------------
UPDATE "experiences" SET "attaches_to" = '["rural-saloia", "obidos-medieval-villages"]'::jsonb, "updated_at" = now() WHERE "slug" IN ('tasco-galapito', 'manzwine', 'ramilo-wines');
