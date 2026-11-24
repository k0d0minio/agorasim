import type { Localized } from "@/i18n/config";

/**
 * The optional tax-number field for the fatura (JAM-527), shared by the
 * booking checkout, the enquiry form and the quote payment step, so the three
 * say the same thing. The rule behind the error is in `lib/tax-id.ts`.
 */
export const taxIdContent = {
  label: {
    pt: "NIF para a fatura (opcional)",
    en: "Tax number for the invoice (optional)",
  } as Localized,
  hint: {
    pt: "Só se quiser o seu NIF na fatura. Aceitamos também números fiscais estrangeiros.",
    en: "Only if you want your tax number on the invoice. Foreign tax numbers are welcome too.",
  } as Localized,
  error: {
    pt: "Este NIF não é válido. Confirme os nove dígitos.",
    en: "This Portuguese tax number (NIF) is not valid. Please check the nine digits.",
  } as Localized,
};
