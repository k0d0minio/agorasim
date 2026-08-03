import { serializeJsonLd } from "@/lib/jsonld";

/**
 * Renders one or more JSON-LD objects as `<script type="application/ld+json">`.
 *
 * The `dangerouslySetInnerHTML` is unavoidable — the block has to reach the
 * browser as script content, not as escaped text — so the escaping that makes it
 * safe lives in {@link serializeJsonLd}, which is where the reasoning and the
 * tests are.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(item) }}
        />
      ))}
    </>
  );
}
