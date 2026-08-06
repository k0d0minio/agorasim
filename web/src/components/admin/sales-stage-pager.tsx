"use client";

import { useCallback, useRef, useState } from "react";
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
 * The board's layout: a horizontal snap rail of stage columns.
 *
 * On a phone each stage is a full-width slide and a chip rail sits on top —
 * the board used to stack all five stages vertically there, so triaging a
 * Booked lead meant scrolling past every card in New, Contacted and Quoted
 * first. Now any stage costs one tap (its chip) or one swipe, and every
 * stage's count is visible at all times (spec §9 L4). From `md` up the same
 * rail shows several columns at once and the chips disappear — the columns
 * are their own overview.
 *
 * Plain CSS scroll-snap does the paging; the only JavaScript is keeping the
 * active chip in step with the scroll position and scrolling a tapped chip's
 * slide into view. Slides are fixed-width, which is the case `mandatory`
 * snapping is safe for.
 */
export function SalesStagePager({ stages }: { stages: StageSlide[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const frame = useRef(0);

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
        mid-triage. Phone only — the desktop rail shows the columns themselves.
      */}
      <nav
        aria-label="Pipeline stages"
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
              aria-label={`${stage.count} ${stage.count === 1 ? "record" : "records"}`}
            >
              {stage.count}
            </Badge>
          </button>
        ))}
      </nav>

      <div
        ref={scroller}
        onScroll={syncActive}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-px-4 px-4 pb-4 sm:-mx-6 sm:scroll-px-6 sm:px-6"
      >
        {stages.map((stage) => (
          <div
            key={stage.key}
            data-stage-slide
            className="w-full shrink-0 snap-start md:w-76"
          >
            {stage.content}
          </div>
        ))}
      </div>
    </div>
  );
}
