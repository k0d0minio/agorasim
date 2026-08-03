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
 *    the expensive part: `/images/video.mp4` is ~40 MB. Not rendering the
 *    element at all is the only way to not fetch it.
 *
 * ⚠️ **The 40 MB is still a problem for everyone else.** This spares the visitors
 * who opted out of motion; it does nothing for the ones who did not, and they are
 * most of them. The file needs re-encoding (and ideally moving off the repo onto
 * a CDN or Vercel Blob) — a modern two-pass H.264/AV1 encode at 1080p should land
 * this comfortably under 5 MB. It was not done in the commit that added this
 * component because no H.264 encoder was available in that environment, not
 * because the file is acceptable as it is.
 *
 * The poster image carries the hero on its own until the video is ready, so
 * deciding after hydration costs nothing visually — and the poster is the LCP
 * element either way.
 */

/** `prefers-reduced-motion` as an external store, so React can subscribe to it. */
const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const list = window.matchMedia(QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

function snapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

/**
 * Server snapshot: assume reduced motion. A static render cannot know the
 * preference, and the safe assumption is the one that renders no video and
 * downloads nothing — the alternative starts a 40 MB fetch for someone who
 * asked us not to animate, and cancels it a moment later.
 */
function serverSnapshot(): boolean {
  return true;
}

export function HeroVideo({ src, poster }: { src: string; poster: string }) {
  const reducedMotion = useSyncExternalStore(subscribe, snapshot, serverSnapshot);

  if (reducedMotion) return null;

  return (
    <video
      className="absolute inset-0 h-full w-full object-cover object-center"
      autoPlay
      muted
      loop
      playsInline
      poster={poster}
      preload="metadata"
      // Decorative: the poster already carries an alt, and narrating a looping
      // background clip adds nothing.
      aria-hidden="true"
      tabIndex={-1}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
