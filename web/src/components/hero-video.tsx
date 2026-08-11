"use client";

import { useSyncExternalStore } from "react";

/**
 * The decorative background video in the hero, mounted only when the visitor has
 * not asked for reduced motion.
 *
 * **Why this is a client component rather than a `<video>` in the server one.**
 * Two reasons, and the second is the one that matters:
 *
 * 1. An autoplaying, looping background video is exactly the kind of motion
 *    `prefers-reduced-motion` exists for, and hiding it with CSS would not be
 *    honouring the preference — the element would still be there, still playing,
 *    still animating behind `display: none` in some engines.
 * 2. Hiding it with CSS also would not stop the *download*, and the download is
 *    the expensive part. Not rendering the element at all is the only way to
 *    not fetch it.
 *
 * `/images/video.mp4` was 40 MB when this component was written, which made the
 * second point urgent for everyone, not just the reduced-motion minority. It is
 * now 3.2 MB — 1280×720, 30fps, two-pass H.264 at ~780 kbps, audio stripped
 * (the element is `muted`, so the audio track was 470 KB nobody could hear).
 * Re-encode with `ffmpeg`, not by hand, and keep it in that range: this plays
 * behind a dark scrim on rural 4G, and detail spent there is detail wasted.
 *
 * The poster image carries the hero on its own until the video is ready, so
 * deciding after hydration costs nothing visually — and the poster is the LCP
 * element either way.
 */

/**
 * Two reasons not to play it, in one query: the visitor asked for less motion,
 * or they are on a phone.
 *
 * The phone half is a performance decision, measured rather than assumed.
 * Lighthouse mobile on the home page, with the video loading: LCP 7.8s and a
 * performance score of 56 — 1.7 MB of video streaming in parallel with the
 * hero photo that *is* the LCP element, over simulated 4G. The photo is the
 * whole hero on a 390px screen anyway; the pan and drift of a background clip
 * is a wide-screen pleasure. So below `md` the poster stands alone, and the
 * video is a desktop enhancement.
 */
const QUERY = "(prefers-reduced-motion: reduce), (max-width: 767px)";

function subscribe(onChange: () => void): () => void {
  const list = window.matchMedia(QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

function snapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

/**
 * Server snapshot: assume we are not playing it. A static render knows neither
 * the motion preference nor the viewport, and the safe assumption is the one
 * that renders no video and downloads nothing — the alternative starts the
 * fetch for someone who asked us not to animate, and cancels it a moment later.
 */
function serverSnapshot(): boolean {
  return true;
}

export function HeroVideo({ src }: { src: string }) {
  const skip = useSyncExternalStore(subscribe, snapshot, serverSnapshot);

  if (skip) return null;

  return (
    <video
      className="absolute inset-0 h-full w-full object-cover object-center"
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      /*
       * No `poster`: the same photograph is already rendered underneath by the
       * hero's `<Image>`, and it shows through until the first frame paints.
       * Setting it here fetched that photo a second time — 353 KB, straight
       * from `/images/`, bypassing the optimizer that served the `<Image>`.
       */
      // Decorative: the poster already carries an alt, and narrating a looping
      // background clip adds nothing.
      aria-hidden="true"
      tabIndex={-1}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
