import type { Category, Point, Quad } from '../types';

const dist = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Average width and height of a screen quad (TL, TR, BR, BL). */
export function quadSize(q: Quad) {
  return {
    w: (dist(q[0], q[1]) + dist(q[3], q[2])) / 2,
    h: (dist(q[0], q[3]) + dist(q[1], q[2])) / 2,
  };
}

/** True when the four corners form a non-self-intersecting convex quad. */
export function isConvex(q: Quad) {
  const cross = (a: Point, b: Point, c: Point) => (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
  const signs = q.map((_, i) => Math.sign(cross(q[i], q[(i + 1) % 4], q[(i + 2) % 4])));
  return signs.every((s) => s !== 0 && s === signs[0]);
}

/** A sensible starting screen: a centred rectangle covering the middle of the image. */
export function defaultQuad(width: number, height: number): Quad {
  const x0 = width * 0.3;
  const x1 = width * 0.7;
  const y0 = height * 0.2;
  const y1 = height * 0.8;
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
}

/** Guesses the device category from a file or mockup name. */
export function guessCategory(name: string): Category {
  const n = name.toLowerCase();
  if (/ipad|tablet|\btab\b|yoga tab|surface go/.test(n)) return 'tablets';
  if (/macbook|laptop|notebook|zenbook|elitebook|thinkpad|pixelbook|surface laptop/.test(n)) return 'laptops';
  if (/imac|monitor|display|desktop|\btv\b|mac studio|mac pro|screen/.test(n)) return 'desktops';
  return 'phones';
}
