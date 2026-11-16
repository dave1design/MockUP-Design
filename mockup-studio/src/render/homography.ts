import type { Point, Quad } from '../types';

export interface Projective {
  a: number; b: number; c: number;
  d: number; e: number; f: number;
  g: number; h: number;
}

/**
 * Projective map from the unit square to a quad (Heckbert's closed form).
 * (0,0)->q[0], (1,0)->q[1], (1,1)->q[2], (0,1)->q[3].
 */
export function squareToQuad(q: Quad): Projective {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const sx = x0 - x1 + x2 - x3;
  const sy = y0 - y1 + y2 - y3;
  if (Math.abs(sx) < 1e-9 && Math.abs(sy) < 1e-9) {
    return { a: x1 - x0, b: x3 - x0, c: x0, d: y1 - y0, e: y3 - y0, f: y0, g: 0, h: 0 };
  }
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / den;
  const h = (dx1 * sy - sx * dy1) / den;
  return {
    a: x1 - x0 + g * x1,
    b: x3 - x0 + h * x3,
    c: x0,
    d: y1 - y0 + g * y1,
    e: y3 - y0 + h * y3,
    f: y0,
    g,
    h,
  };
}

export const applyProjective = (m: Projective, u: number, v: number): Point => {
  const w = m.g * u + m.h * v + 1;
  return [(m.a * u + m.b * v + m.c) / w, (m.d * u + m.e * v + m.f) / w];
};

export const isAffine = (m: Projective) => Math.abs(m.g) < 1e-9 && Math.abs(m.h) < 1e-9;

/** Affine matrix [a,b,c,d,e,f] (canvas order) taking triangle s onto triangle t. */
export function triangleAffine(s: [Point, Point, Point], t: [Point, Point, Point]) {
  const [[sx0, sy0], [sx1, sy1], [sx2, sy2]] = s;
  const [[tx0, ty0], [tx1, ty1], [tx2, ty2]] = t;
  const det = sx0 * (sy1 - sy2) + sx1 * (sy2 - sy0) + sx2 * (sy0 - sy1);
  const a = (tx0 * (sy1 - sy2) + tx1 * (sy2 - sy0) + tx2 * (sy0 - sy1)) / det;
  const c = (tx0 * (sx2 - sx1) + tx1 * (sx0 - sx2) + tx2 * (sx1 - sx0)) / det;
  const e =
    (tx0 * (sx1 * sy2 - sx2 * sy1) + tx1 * (sx2 * sy0 - sx0 * sy2) + tx2 * (sx0 * sy1 - sx1 * sy0)) / det;
  const b = (ty0 * (sy1 - sy2) + ty1 * (sy2 - sy0) + ty2 * (sy0 - sy1)) / det;
  const d = (ty0 * (sx2 - sx1) + ty1 * (sx0 - sx2) + ty2 * (sx1 - sx0)) / det;
  const f =
    (ty0 * (sx1 * sy2 - sx2 * sy1) + ty1 * (sx2 * sy0 - sx0 * sy2) + ty2 * (sx0 * sy1 - sx1 * sy0)) / det;
  return [a, b, c, d, e, f] as const;
}
