# Tweak: small-copy-nits

- change: `web/src/components/site-footer.tsx`: footer copyright year literal (`2026`) → derived (`new Date().getFullYear()`)
- change: `web/src/app/admin/sales/[id]/page.tsx`: booking party-size line hardcoded "pessoas" → pluralised with the existing `partySize === 1 ? "pessoa" : "pessoas"` pattern (already used in `sales-board.tsx`, `sales-search-results.tsx`, `availability-calendar.tsx`)
- change: `web/src/components/admin/manual-booking-dialog.tsx`: experience-picker label "Passeio" → "Experiência" (glossary reserves *passeio* for the enquiry kind; the catalogue entry is *experiência* — `.icm/docs/admin-pt-inventory.md:113,209`, `lib/admin-format.ts:204`)
- changelog: not warranted
- learned: none
