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

/** Tailwind's `md`: from here up the board shows one stage, not a rail. */
const WIDE = "(min-width: 48rem)";

/**
 * The board's layout: a chip per stage on top at every width, and under it a
 * horizontal snap rail of stages on a phone, the one selected stage from
 * `md` up.
 *
 * On a phone each stage is a full-width slide — the board used to stack all
 * five stages vertically there, so triaging a Booked lead meant scrolling
 * past every card in New, Contacted and Quoted first. Now any stage costs one
 * tap (its chip) or one swipe, and every stage's count is visible at all
 * times (spec §9 L4).
 *
 * From `md` up only the selected stage is on the page, with its cards in a
 * grid. Five 304px columns side by side made a laptop scroll sideways (Diogo,
 * feedback round 1); the stages stacked one under the other after that put
 * "Reservado" some 2,270px down the page at 1024px (Rita, feedback round 2,
 * JAM-318). The chips that solved the same problem on the phone solve it
 * here: one tap, no scroll past the other stages.
 *
 * Plain CSS does the work in both layouts — scroll-snap pages the rail, and
 * `md:hidden` takes the other stages out from `md` up. The only JavaScript is
 * keeping the active chip in step with the rail's scroll position and
 * bringing a tapped chip's stage into view. Slides are fixed-width, which is
 * the case `mandatory` snapping is safe for.
 *
 * `initialStage` (a slide's `key`) opens the board on that stage: its chip is
 * active from the first render, so from `md` up the server already renders
 * that stage, and on a phone the rail scrolls to its slide on mount.
 */
export function SalesStagePager({
  stages,
  initialStage,
}: {
  stages: StageSlide[];
  initialStage?: string;
}) {
  const board = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const initialIndex = Math.max(
    0,
    stages.findIndex((stage) => stage.key === initialStage),
  );
  const [active, setActive] = useState(initialIndex);
  const frame = useRef(0);

  // The selected stage for the listeners below, which outlive a render.
  const activeIndex = useRef(initialIndex);
  useEffect(() => {
    activeIndex.current = active;
  }, [active]);

  // Put the rail on a stage's slide. The rail's own scrollLeft, not
  // scrollIntoView: the board can sit below the fold, and scrollIntoView
  // would scroll the page vertically as well. Instant, so the page does not
  // open with a swipe animation. Minus the scroll padding, to land on the
  // same snap point a swipe would.
  const placeRail = useCallback((index: number) => {
    const el = scroller.current;
    const slide = el?.querySelectorAll<HTMLElement>("[data-stage-slide]")[index];
    if (!el || !slide) return;
    el.scrollLeft = slide.offsetLeft - (parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0);
  }, []);

  // Open the rail on the requested stage, and put it back on the selected
  // one when the window narrows below `md` — while the board was wide the
  // other slides were out of the layout, so the rail's position means
  // nothing. From `md` up there is nothing to place: the selected stage is
  // the only one on the page.
  useEffect(() => {
    const wide = window.matchMedia(WIDE);
    if (!wide.matches) placeRail(activeIndex.current);
    const onChange = () => {
      if (!wide.matches) placeRail(activeIndex.current);
    };
    wide.addEventListener("change", onChange);
    return () => wide.removeEventListener("change", onChange);
  }, [placeRail]);

  // Which slide's left edge sits nearest the scroll position. Measured from
  // the live DOM rather than index arithmetic so the slide gap and scroll
  // padding never drift out of the calculation.
  const syncActive = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const el = scroller.current;
      // From `md` up the rail does not page, and the hidden slides all
      // measure 0: a stray scroll event there must not pick a stage.
      if (!el || window.matchMedia(WIDE).matches) return;
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
    if (window.matchMedia(WIDE).matches) {
      // One stage at a time: the chip swaps which stage is on the page. If
      // the reader was part-way down a long stage the chips are stuck under
      // the app bar — go back to the top of the board, so the new stage
      // starts at its first card and not wherever the old one was left. The
      // html element's scroll padding keeps the board clear of the app bar.
      const top = board.current;
      const chips = rail.current;
      if (top && chips && chips.getBoundingClientRect().top - top.getBoundingClientRect().top > 1) {
        top.scrollIntoView({ block: "start" });
      }
      setActive(index);
      return;
    }
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
    <div ref={board} className="flex flex-col gap-3">
      {/*
        The stage rail: one ≥44px chip per stage with its true count, the
        same at every width. Sticky under the app bar so the way to any other
        stage never scrolls away mid-triage.
      */}
      <nav
        ref={rail}
        aria-label="Fases"
        className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 flex gap-2 overflow-x-auto bg-background/95 px-4 py-2 backdrop-blur supports-backdrop-filter:bg-background/85"
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
        // layout exists to prevent. From `md` up it is a plain block holding
        // the one selected stage: no snap, no horizontal scroll, no bleed
        // into the page gutter.
        className="relative -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-px-4 px-4 pb-4 sm:-mx-6 sm:scroll-px-6 sm:px-6 md:mx-0 md:snap-none md:flex-col md:gap-4 md:overflow-x-visible md:px-0"
      >
        {stages.map((stage, index) => (
          <div
            key={stage.key}
            data-stage-slide
            // From `md` up only the selected stage is on the page. On a
            // phone every slide stays in the rail, for the swipe.
            className={cn("w-full shrink-0 snap-start", index !== active && "md:hidden")}
          >
            {stage.content}
          </div>
        ))}
      </div>
    </div>
  );
}
