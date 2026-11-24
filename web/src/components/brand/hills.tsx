import { cn } from "@/lib/utils";

/**
 * The hill curves of the brand, traced from the designer's day scene. In the
 * scene each hill is one flat colour, so the trace is the top edge of each
 * colour: sand, tan, clay and brown, back to front. Each list holds the curves
 * for one layer count, scaled to fill a `0 0 1200 100` box. A curve that goes
 * behind the hill in front of it runs a little below that hill, so no thin
 * line of its colour shows along the shared edge. The designer's vector file
 * replaces this trace when it arrives.
 *
 * Every path runs on to y=120, past the bottom of the box. The box clips it,
 * so the bottom edge of the SVG is a clean cut of the front hill and never an
 * antialiased path edge with the layer behind showing through.
 */
const HILL_PATHS: Record<2 | 3 | 4, readonly string[]> = {
  4: [
    "M0 20.9C12 20.4 50 19.1 75 17.9C100 16.7 125 15.1 150 13.7C175 12.4 200 10.9 225 9.9C250 8.8 275 8.1 300 7.3C325 6.6 350 5.8 375 5.4C400 4.9 425 4.7 450 4.4C475 4.2 500 4.0 525 4.0C550 4.0 575 4.1 600 4.3C625 4.5 650 4.7 675 5.2C700 5.6 725 6.1 750 6.8C775 7.5 800 8.2 825 9.2C850 10.2 875 11.4 900 12.6C925 13.8 950 15.3 975 16.5C1000 17.7 1025 18.9 1050 19.7C1075 20.6 1100 20.8 1125 21.5C1150 22.2 1188 23.8 1200 24.2V120H0Z",
    "M0 40.0C12 40.0 50 40.0 75 40.5C100 40.9 125 41.7 150 42.7C175 43.6 200 44.9 225 46.2C250 47.5 275 49.0 300 50.3C325 51.5 350 53.1 375 53.6C400 54.2 425 53.3 450 53.4C475 53.6 500 54.2 525 54.8C550 55.4 575 57.6 600 57.2C625 56.7 650 54.0 675 52.1C700 50.2 725 47.9 750 45.9C775 43.8 800 41.7 825 39.8C850 37.9 875 36.1 900 34.5C925 32.8 950 31.3 975 29.9C1000 28.5 1025 27.2 1050 26.0C1075 24.7 1100 23.6 1125 22.6C1150 21.6 1188 20.6 1200 20.2V120H0Z",
    "M0 55.0C12 55.5 50 57.8 75 58.2C100 58.6 125 58.0 150 57.3C175 56.5 200 54.6 225 53.6C250 52.6 275 51.8 300 51.1C325 50.5 350 49.9 375 49.6C400 49.4 425 49.3 450 49.4C475 49.6 500 50.2 525 50.8C550 51.4 575 52.3 600 53.2C625 54.1 650 55.1 675 56.1C700 57.1 725 58.2 750 59.4C775 60.5 800 61.7 825 62.8C850 63.9 875 65.1 900 66.1C925 67.2 950 68.1 975 69.0C1000 69.9 1025 70.9 1050 71.7C1075 72.4 1100 72.8 1125 73.5C1150 74.2 1188 75.6 1200 76.0V120H0Z",
    "M0 51.0C12 51.5 50 52.9 75 54.2C100 55.4 125 57.0 150 58.6C175 60.1 200 61.9 225 63.6C250 65.2 275 67.0 300 68.7C325 70.5 350 72.3 375 73.9C400 75.6 425 77.1 450 78.5C475 79.9 500 81.2 525 82.3C550 83.3 575 84.2 600 84.9C625 85.6 650 86.2 675 86.7C700 87.2 725 87.7 750 87.9C775 88.1 800 88.1 825 87.8C850 87.5 875 86.8 900 86.0C925 85.2 950 84.2 975 83.0C1000 81.9 1025 80.5 1050 79.1C1075 77.8 1100 76.0 1125 74.8C1150 73.7 1188 72.5 1200 72.0V120H0Z",
  ],
  3: [
    "M0 28.5C12 28.6 50 28.6 75 29.2C100 29.7 125 30.7 150 31.9C175 33.1 200 34.7 225 36.3C250 37.8 275 39.9 300 41.3C325 42.7 350 44.0 375 44.5C400 45.0 425 44.1 450 44.3C475 44.5 500 45.2 525 46.0C550 46.8 575 49.3 600 48.9C625 48.5 650 45.7 675 43.6C700 41.4 725 38.4 750 35.9C775 33.3 800 30.7 825 28.4C850 26.0 875 23.8 900 21.8C925 19.7 950 17.9 975 16.1C1000 14.4 1025 12.7 1050 11.2C1075 9.7 1100 8.3 1125 7.1C1150 5.9 1188 4.6 1200 4.1V120H0Z",
    "M0 46.2C12 46.9 50 49.5 75 50.1C100 50.8 125 50.8 150 50.0C175 49.2 200 46.7 225 45.4C250 44.2 275 43.2 300 42.4C325 41.6 350 40.9 375 40.5C400 40.2 425 40.1 450 40.3C475 40.5 500 41.2 525 42.0C550 42.8 575 43.8 600 44.9C625 46.0 650 47.2 675 48.5C700 49.8 725 51.2 750 52.6C775 53.9 800 55.4 825 56.8C850 58.2 875 59.7 900 60.9C925 62.2 950 63.4 975 64.5C1000 65.7 1025 66.9 1050 67.8C1075 68.7 1100 69.3 1125 70.1C1150 70.8 1188 71.8 1200 72.2V120H0Z",
    "M0 42.2C12 42.9 50 44.6 75 46.1C100 47.7 125 49.7 150 51.6C175 53.5 200 55.7 225 57.8C250 59.8 275 62.0 300 64.2C325 66.3 350 68.6 375 70.6C400 72.6 425 74.5 450 76.2C475 77.9 500 79.6 525 80.9C550 82.2 575 83.3 600 84.2C625 85.1 650 85.7 675 86.4C700 87.0 725 87.7 750 87.9C775 88.1 800 88.2 825 87.8C850 87.4 875 86.6 900 85.6C925 84.6 950 83.3 975 81.8C1000 80.4 1025 78.7 1050 77.0C1075 75.4 1100 73.2 1125 71.7C1150 70.2 1188 68.8 1200 68.2V120H0Z",
  ],
  2: [
    "M0 28.5C12 28.6 50 28.6 75 29.2C100 29.7 125 30.7 150 31.9C175 33.1 200 34.7 225 36.3C250 37.8 275 40.6 300 41.3C325 42.0 350 40.6 375 40.5C400 40.3 425 40.0 450 40.2C475 40.5 500 41.1 525 41.9C550 42.7 575 44.6 600 44.9C625 45.1 650 45.1 675 43.6C700 42.1 725 38.4 750 35.9C775 33.3 800 30.7 825 28.4C850 26.0 875 23.8 900 21.8C925 19.7 950 17.9 975 16.1C1000 14.4 1025 12.7 1050 11.2C1075 9.7 1100 8.3 1125 7.1C1150 5.9 1188 4.6 1200 4.1V120H0Z",
    "M0 42.2C12 42.9 50 44.6 75 46.1C100 47.7 125 49.7 150 51.6C175 53.5 200 55.7 225 57.8C250 59.8 275 62.0 300 64.2C325 66.3 350 68.6 375 70.6C400 72.6 425 74.5 450 76.2C475 77.9 500 79.6 525 80.9C550 82.2 575 83.3 600 84.2C625 85.1 650 85.7 675 86.4C700 87.0 725 87.7 750 87.9C775 88.1 800 88.2 825 87.8C850 87.4 875 86.6 900 85.6C925 84.6 950 83.3 975 81.8C1000 80.4 1025 78.7 1050 77.0C1075 75.4 1100 73.2 1125 71.7C1150 70.2 1188 68.8 1200 68.2V120H0Z",
  ],
};

/** The colours a section can have. A hill edge needs each one opaque. */
export const SURFACE = {
  background: "var(--background)",
  /**
   * The opaque twin of `bg-secondary/30` on the page background. A hill in
   * front of another hill cannot be translucent: the hill behind would show
   * through it.
   */
  muted: "color-mix(in srgb, var(--secondary) 30%, var(--background))",
} as const;

export type HillLayer = {
  /** A CSS colour made from the tokens of `globals.css`. Never a hex. */
  color: string;
  opacity?: number;
};

/**
 * A band of 2 to 4 layered hills, back to front. The last layer takes the
 * colour of what comes below the band, so the hill becomes that section.
 *
 * Decorative: hidden from assistive technology and never focusable. The height
 * comes from `className` and is fixed in CSS, and the SVG is in the server
 * HTML, so the band moves nothing when the page loads. The band overlaps its
 * neighbours by one pixel on each side: a sub-pixel gap would show the page
 * behind as a hairline.
 */
export function Hills({
  layers,
  mirror = false,
  className,
  style,
}: {
  layers: readonly HillLayer[];
  /** Mirrors the curves left to right, so two bands on one page differ. */
  mirror?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (layers.length < 2 || layers.length > 4) return null;
  const paths = HILL_PATHS[layers.length as 2 | 3 | 4];
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 1200 100"
      preserveAspectRatio="none"
      className={cn("pointer-events-none -my-px block w-full", mirror && "-scale-x-100", className)}
      style={style}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} style={{ fill: layers[i].color }} fillOpacity={layers[i].opacity} />
      ))}
    </svg>
  );
}
