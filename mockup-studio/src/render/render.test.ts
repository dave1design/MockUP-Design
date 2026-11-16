import { describe, expect, it } from 'vitest';
import { clampOffset, computePlacement } from './fit';
import { applyProjective, isAffine, squareToQuad, triangleAffine } from './homography';
import { safeScale } from './export';
import type { Quad } from '../types';

const near = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);

describe('squareToQuad', () => {
  it('maps the unit square corners onto a perspective quad', () => {
    const q: Quad = [[10, 20], [210, 5], [190, 310], [30, 280]];
    const m = squareToQuad(q);
    expect(isAffine(m)).toBe(false);
    [[0, 0], [1, 0], [1, 1], [0, 1]].forEach(([u, v], i) => {
      const [x, y] = applyProjective(m, u, v);
      near(x, q[i][0]);
      near(y, q[i][1]);
    });
  });

  it('is affine for a rectangle and maps the centre to the centre', () => {
    const m = squareToQuad([[100, 100], [300, 100], [300, 500], [100, 500]]);
    expect(isAffine(m)).toBe(true);
    const [x, y] = applyProjective(m, 0.5, 0.5);
    near(x, 200);
    near(y, 300);
  });

  it('keeps straight lines straight under perspective', () => {
    const m = squareToQuad([[0, 0], [100, 20], [90, 120], [10, 100]]);
    const [x0, y0] = applyProjective(m, 0, 0);
    const [x1, y1] = applyProjective(m, 0.5, 0.5);
    const [x2, y2] = applyProjective(m, 1, 1);
    near((y1 - y0) * (x2 - x0), (x1 - x0) * (y2 - y0));
  });
});

describe('triangleAffine', () => {
  it('maps source vertices onto target vertices', () => {
    const s: [[number, number], [number, number], [number, number]] = [[0, 0], [10, 0], [0, 10]];
    const t: [[number, number], [number, number], [number, number]] = [[5, 5], [25, 8], [3, 40]];
    const [a, b, c, d, e, f] = triangleAffine(s, t);
    s.forEach(([x, y], i) => {
      near(a * x + c * y + e, t[i][0]);
      near(b * x + d * y + f, t[i][1]);
    });
  });
});

describe('computePlacement', () => {
  it('fill covers the screen, fit contains the image', () => {
    const fill = computePlacement(1000, 500, 400, 800, 'fill', 1, 0, 0);
    expect(fill.h).toBeCloseTo(800);
    expect(fill.w).toBeCloseTo(1600);
    const fit = computePlacement(1000, 500, 400, 800, 'fit', 1, 0, 0);
    expect(fit.w).toBeCloseTo(400);
    expect(fit.h).toBeCloseTo(200);
    expect(fit.y).toBeCloseTo(300);
  });

  it('centres an image with the same aspect ratio exactly', () => {
    const p = computePlacement(800, 1600, 400, 800, 'fill', 1, 0, 0);
    expect(p).toMatchObject({ x: 0, y: 0, w: 400, h: 800 });
  });
});

describe('clampOffset', () => {
  it('allows no movement when the image exactly fills the screen', () => {
    expect(clampOffset(800, 1600, 400, 800, 'fill', 1, 0.3, -0.3)).toEqual({ offsetX: 0, offsetY: 0 });
  });
  it('limits movement to the overflow when zoomed', () => {
    const c = clampOffset(800, 1600, 400, 800, 'fill', 2, 0.9, -0.9);
    expect(c.offsetX).toBeCloseTo(0.5);
    expect(c.offsetY).toBeCloseTo(-0.5);
  });
});

describe('safeScale', () => {
  it('keeps normal exports unchanged and shrinks oversized ones', () => {
    expect(safeScale(1000, 2000, 3)).toBe(3);
    expect(safeScale(5000, 5000, 3)).toBeLessThan(3);
  });
});

import { defaultQuad, guessCategory, isConvex, quadSize } from './quad';

describe('quad helpers', () => {
  it('measures an axis-aligned quad', () => {
    expect(quadSize([[0, 0], [200, 0], [200, 100], [0, 100]])).toEqual({ w: 200, h: 100 });
  });
  it('detects convex and bow-tie quads', () => {
    expect(isConvex(defaultQuad(1000, 800))).toBe(true);
    expect(isConvex([[0, 0], [100, 100], [100, 0], [0, 100]])).toBe(false);
  });
  it('guesses categories from names', () => {
    expect(guessCategory('Free iPhone 16 Pro Mockup')).toBe('phones');
    expect(guessCategory('free-ipad-pro-2024-mockup')).toBe('tablets');
    expect(guessCategory('MacBook Air 2022 Mockup')).toBe('laptops');
    expect(guessCategory('Free iMac 24-inch')).toBe('desktops');
  });
});

import { outputSize } from './render';
import type { Mockup, RenderSettings } from '../types';

describe('outputSize', () => {
  const mockup = { canvas: { width: 1000, height: 2000 } } as Mockup;
  const settings = (ratio: RenderSettings['stage']['ratio'], padding: number) => ({ stage: { ratio, padding } }) as RenderSettings;

  it('adds space around the device and centres it', () => {
    const o = outputSize(mockup, settings('auto', 0.1));
    expect(o).toMatchObject({ width: 1200, height: 2400, ox: 100, oy: 200 });
  });
  it('grows the shorter side to reach the requested shape', () => {
    const o = outputSize(mockup, settings('4:3', 0.1));
    expect(o.width / o.height).toBeCloseTo(4 / 3, 2);
    expect(o.height).toBe(2400);
    expect(o.ox).toBeCloseTo((o.width - 1000) / 2, 1);
  });
  it('leaves photo mockups untouched', () => {
    const photo = { canvas: { width: 3000, height: 2000 }, layer: 'under' } as Mockup;
    expect(outputSize(photo, settings('16:9', 0.3))).toEqual({ width: 3000, height: 2000, ox: 0, oy: 0 });
  });
});
