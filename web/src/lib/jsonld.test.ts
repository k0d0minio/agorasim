import { describe, expect, it } from "vitest";

import { serializeJsonLd } from "./jsonld";

/**
 * These are about the *injection* boundary, not about schema.org correctness.
 * The builders above `serializeJsonLd` produce plain objects and are covered by
 * types; what needs asserting is that whatever ends up inside them cannot escape
 * the `<script>` element it is written into.
 */
describe("serializeJsonLd", () => {
  it("round-trips to the original object", () => {
    const item = { "@type": "FAQPage", name: "Rural Saloia", count: 3, nested: { ok: true } };
    expect(JSON.parse(serializeJsonLd(item))).toEqual(item);
  });

  it("cannot be closed out of its script element", () => {
    // The attack: an HTML parser inside <script> stops at the first `</script`
    // it sees, even mid-string, and reads the rest as markup.
    const hostile = { name: "</script><img src=x onerror=alert(1)>" };
    const serialized = serializeJsonLd(hostile);

    expect(serialized).not.toContain("</script");
    expect(serialized).not.toContain("<img");
    expect(serialized).not.toContain("<");
    // Escaped, not mangled — a consumer still reads the string that was written.
    expect(JSON.parse(serialized)).toEqual(hostile);
  });

  it("escapes every tag-open, not just the closing tag", () => {
    const serialized = serializeJsonLd({ a: "<b>", b: "a < b", c: "<!--" });
    expect(serialized).not.toContain("<");
    expect(serialized).toContain("\\u003c");
    expect(JSON.parse(serialized)).toEqual({ a: "<b>", b: "a < b", c: "<!--" });
  });

  it("escapes the JS line terminators that are legal inside JSON", () => {
    const item = { name: "line\u2028break", other: "para\u2029break" };
    const serialized = serializeJsonLd(item);

    expect(serialized).not.toContain("\u2028");
    expect(serialized).not.toContain("\u2029");
    expect(JSON.parse(serialized)).toEqual(item);
  });

  it("leaves ordinary content alone", () => {
    // Portuguese copy is the common case; nothing here should be touched.
    const item = { name: "Sintra · Mafra · Ericeira", desc: "Passeios de carro clássico" };
    expect(serializeJsonLd(item)).toBe(JSON.stringify(item));
  });
});
