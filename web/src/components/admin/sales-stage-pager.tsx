"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type StageSlide = {
  key: string;
  label: string;
  /** The stage's true total, shown on the chip so no stage is out of sight. */
  count: number;
  content: React.ReactNode;
};

/**
 * The board's layout: a horizontal snap rail of stages on a phone, the
 * stages one under the other from `md` up.
 *
 * On a phone each stage is a full-width slide and a chip rail sits on top —
 * the board used to stack all five stages vertically there, so triaging a
 * Booked lead meant scrolling past every card in New, Contacted and Quoted
 * first. Now any stage costs one tap (its chip) or one swipe, and every
 * stage's count is visible at all times (spec §9 L4). From `md` up the chips
 * disappear and the stages stack as full-width sections: five 304px columns
 * side by side made a laptop scroll sideways (Diogo, feedback round 1), and a
 * laptop has the width for a grid of cards in each stage instead.
 *
 * Plain CSS scroll-snap does the paging; the only JavaScript is keeping the
 * active chip in step with the scroll position and scrolling a tapped chip's
 * slide into view. Slides are fixed-width, which is the case `mandatory`
 * snapping is safe for.
 *
 * `initialStage` (a slide's `key`) opens the rail on that stage: its chip is
 * active from the first render, and the rail scrolls to its slide on mount.
 * From `md` up the page scrolls to that stage's section instead.
 */
export function SalesStagePager({
  stages,
  initialStage,
}: {
  stages: StageSlide[];
  initialStage?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const initialIndex = Math.max(
    0,
    stages.findIndex((stage) => stage.key === initialStage),
  );
  const [active, setActive] = useState(initialIndex);
  const frame = useRef(0);

  // Open on the requested stage. The rail's own scrollLeft, not
  // scrollIntoView: on load the board can sit below the fold, and
  // scrollIntoView would scroll the page vertically as well. Instant, so the
  // page does not open with a swipe animation. Minus the scroll padding, to
  // land on the same snap point a swipe would.
  useEffect(() => {
    const el = scroller.current;
    if (!el || initialIndex === 0) return;
    const slide = el.querySelectorAll<HTMLElement>("[data-stage-slide]")[initialIndex];
    if (!slide) return;
    // From `md` up the stages stack, so the requested one is further down
    // the page and the page itself is what scrolls. Tailwind's `md` is 48rem.
    // The html element's scroll padding keeps it clear of the app bar.
    if (window.matchMedia("(min-width: 48rem)").matches) {
      slide.scrollIntoView({ block: "start" });
      return;
    }
    el.scrollLeft = slide.offsetLeft - (parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0);
    // Mount only: a later change of stage is the reader's own swipe or tap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Which slide's left edge sits nearest the scroll position. Measured from
  // the live DOM rather than index arithmetic so the slide gap and scroll
  // padding never drift out of the calculation.
  const syncActive = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const el = scroller.current;
      if (!el) return;
      const slides = el.querySelectorAll<HTMLElement>("[data-stage-slide]");
      let nearest = 0;
      let nearestDistance = Infinity;
      slides.forEach((slide, index) => {
        const distance = Math.abs(slide.offsetLeft - el.scrollLeft);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = index;
        }
      });
      setActive(nearest);
    });
  }, []);

  function jumpTo(index: number) {
    const el = scroller.current;
    if (!el) return;
    const slide = el.querySelectorAll<HTMLElement>("[data-stage-slide]")[index];
    // block: "nearest" keeps the page from scrolling vertically as a side
    // effect; smooth only for people who haven't asked for reduced motion.
    slide?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "nearest",
      inline: "start",
    });
    setActive(index);
  }

  return (
    <div className="flex flex-col gap-3">
      {/*
        The stage rail: one ≥44px chip per stage with its true count. Sticky
        under the app bar so the way to any other stage never scrolls away
        mid-triage. Phone only — from `md` up the stacked stages carry their
        own headings and counts.
      */}
      <nav
        aria-label="Fases"
        className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 flex gap-2 overflow-x-auto bg-background/95 px-4 py-2 backdrop-blur supports-backdrop-filter:bg-background/85 md:hidden"
      >
        {stages.map((stage, index) => (
          <button
            key={stage.key}
            type="button"
            onClick={() => jumpTo(index)}
            aria-current={index === active ? "true" : undefined}
            className={cn(
              "inline-flex min-h-11 shrink-0 touch-manipulation items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              index === active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground",
            )}
          >
            {stage.label}
            <Badge
              variant={index === active ? "secondary" : "outline"}
              aria-label={`${stage.count} ${stage.count === 1 ? "registo" : "registos"}`}
            >
              {stage.count}
            </Badge>
          </button>
        ))}
      </nav>

      <div
        ref={scroller}
        onScroll={syncActive}
        // `relative` is load-bearing: the cards contain absolutely-positioned
        // sr-only spans, and without a positioned ancestor *inside* the scroll
        // container their boxes escape its clip and widen the page itself —
        // horizontal overflow on the html element, the exact thing this
        // layout exists to prevent. From `md` up it is a plain column: no
        // snap, no horizontal scroll, no bleed into the page gutter.
        className="relative -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-px-4 px-4 pb-4 sm:-mx-6 sm:scroll-px-6 sm:px-6 md:mx-0 md:snap-none md:flex-col md:gap-4 md:overflow-x-visible md:px-0"
      >
        {stages.map((stage) => (
          <div
            key={stage.key}
            data-stage-slide
            className="w-full shrink-0 snap-start"
          >
            {stage.content}
          </div>
        ))}
      </div>
    </div>
  );
}
