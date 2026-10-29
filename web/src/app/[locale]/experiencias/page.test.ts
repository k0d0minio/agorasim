import { describe, expect, it, vi } from "vitest";
import { Fragment, type ReactElement, type ReactNode } from "react";

import { experiences } from "@/content/experiences";

/*
 * On a phone the tour blocks collapse to one column, so the DOM order is the
 * visual order. Feedback round 1 caught two photos back to back there: one
 * block ended with its photo and the next began with one. This pins the fix —
 * text first in every block, with the wide-screen alternation done by CSS
 * order — by walking the element tree the page returns (no DOM here; see the
 * note in /reservar's test).
 */
vi.mock("@/lib/experience-catalogue", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/experience-catalogue")>()),
  listExperiences: vi.fn(async () => experiences),
}));

type Props = { className?: string; children?: ReactNode };

/** Every element in a tree, depth first, with fragments flattened away. */
function elements(node: ReactNode, into: ReactElement<Props>[] = []): ReactElement<Props>[] {
  if (Array.isArray(node)) {
    for (const child of node) elements(child, into);
    return into;
  }
  if (!node || typeof node !== "object" || !("type" in node)) return into;
  const element = node as ReactElement<Props>;
  if (element.type !== Fragment) into.push(element);
  elements(element.props?.children, into);
  return into;
}

/** The direct children of an element, with fragments flattened away. */
function childrenOf(element: ReactElement<Props>): ReactElement<Props>[] {
  const out: ReactElement<Props>[] = [];
  const walk = (node: ReactNode) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object" || !("type" in node)) return;
    const child = node as ReactElement<Props>;
    if (child.type === Fragment) walk(child.props.children);
    else out.push(child);
  };
  walk(element.props.children);
  return out;
}

const isMedia = (e: ReactElement) => typeof e.type === "function" && e.type.name === "Media";

describe("/experiencias tour blocks", () => {
  it("puts the text before the photo in every block, and alternates the photo at lg", async () => {
    const { default: ExperiencesPage } = await import("./page");
    const tree = await ExperiencesPage({ params: Promise.resolve({ locale: "pt" }) });
    const grids = elements(tree).filter((e) =>
      e.props.className?.includes("lg:grid-cols-2"),
    );
    const signatures = experiences.filter((e) => e.kind === "signature");
    expect(grids).toHaveLength(signatures.length);
    expect(grids.length).toBeGreaterThan(1);

    grids.forEach((grid, i) => {
      const [first, second] = childrenOf(grid);
      expect(isMedia(first)).toBe(false);
      expect(isMedia(second)).toBe(true);
      // Even blocks keep the photo on the right; odd blocks pull it left.
      expect(second.props.className?.includes("lg:order-first")).toBe(i % 2 === 1);
    });
  });
});
