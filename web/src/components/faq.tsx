import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { Locale } from "@/i18n/config";
import { t } from "@/i18n/config";
import type { Faq } from "@/content/experiences";

export function FaqList({
  faqs,
  locale,
  heading,
}: {
  faqs: Faq[];
  locale: Locale;
  heading: string;
}) {
  if (faqs.length === 0) return null;
  return (
    <div>
      <h2 className="text-2xl font-semibold sm:text-3xl">{heading}</h2>
      <Accordion type="single" collapsible className="mt-6 w-full">
        {faqs.map((faq, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger className="text-left text-base">
              {t(faq.question, locale)}
            </AccordionTrigger>
            <AccordionContent className="text-base text-muted-foreground">
              {t(faq.answer, locale)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
