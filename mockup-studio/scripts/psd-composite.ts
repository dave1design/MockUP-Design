/**
 * A small PSD layer compositor. Some mockup PSDs ship with a promotional "flattened preview", so the scene has
 * to be rebuilt from the layers. Handles visibility, opacity, common blend modes, clipping masks, layer masks and
 * groups. Not supported (counted in `stats`): adjustment layers, vector masks, layer effects.
 */
import type { Layer } from 'ag-psd';

export interface CompositeStats {
  layers: number;
  skippedAdjustments: number;
  effects: number;
  vectorMasks: number;
}

type Base = { left: number; top: number; w: number; h: number; alpha: Uint8Array } | null;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function to8bit(img: { data: ArrayLike<number> }): Uint8ClampedArray {
  const d = img.data as unknown;
  if (d instanceof Uint8ClampedArray) return d;
  if (d instanceof Uint8Array) return new Uint8ClampedArray(d.buffer, d.byteOffset, d.length);
  const src = d as Uint16Array | Float32Array;
  const out = new Uint8ClampedArray(src.length);
  const is16 = src instanceof Uint16Array;
  for (let i = 0; i < src.length; i++) out[i] = is16 ? src[i] >> 8 : Math.round(src[i] * 255);
  return out;
}

/** Separable blend function B(backdrop, source), both 0..1. */
function blendFn(mode: string | undefined): ((b: number, s: number) => number) | null {
  switch (mode) {
    case undefined:
    case 'normal':
    case 'pass through':
      return null;
    case 'darken':
      return (b, s) => Math.min(b, s);
    case 'multiply':
      return (b, s) => b * s;
    case 'color burn':
      return (b, s) => (b >= 1 ? 1 : s <= 0 ? 0 : 1 - Math.min(1, (1 - b) / s));
    case 'linear burn':
      return (b, s) => Math.max(0, b + s - 1);
    case 'lighten':
      return (b, s) => Math.max(b, s);
    case 'screen':
      return (b, s) => b + s - b * s;
    case 'color dodge':
      return (b, s) => (b <= 0 ? 0 : s >= 1 ? 1 : Math.min(1, b / (1 - s)));
    case 'linear dodge':
      return (b, s) => Math.min(1, b + s);
    case 'overlay':
      return (b, s) => (b <= 0.5 ? 2 * b * s : 1 - 2 * (1 - b) * (1 - s));
    case 'hard light':
      return (b, s) => (s <= 0.5 ? 2 * b * s : 1 - 2 * (1 - b) * (1 - s));
    case 'soft light':
      return (b, s) => {
        if (s <= 0.5) return b - (1 - 2 * s) * b * (1 - b);
        const d = b <= 0.25 ? ((16 * b - 12) * b + 4) * b : Math.sqrt(b);
        return b + (2 * s - 1) * (d - b);
      };
    case 'difference':
      return (b, s) => Math.abs(b - s);
    case 'exclusion':
      return (b, s) => b + s - 2 * b * s;
    case 'subtract':
      return (b, s) => Math.max(0, b - s);
    case 'divide':
      return (b, s) => (s <= 0 ? 1 : Math.min(1, b / s));
    default:
      return null; // hue / saturation / colour / luminosity etc. fall back to normal
  }
}

function maskValue(layer: Layer): ((x: number, y: number) => number) | null {
  const m = layer.mask;
  if (!m || m.disabled) return null;
  const def = (m.defaultColor ?? 255) / 255;
  const img = m.imageData;
  if (!img || m.left === undefined || m.top === undefined) return () => def;
  const data = to8bit(img);
  let aMin = 255;
  let aMax = 0;
  for (let i = 3; i < data.length; i += 4 * 97) {
    aMin = Math.min(aMin, data[i]);
    aMax = Math.max(aMax, data[i]);
  }
  const useAlpha = aMax > aMin; // some readers store the mask in alpha, others in grey RGB
  const left = m.left;
  const top = m.top;
  return (x, y) => {
    const mx = x - left;
    const my = y - top;
    if (mx < 0 || my < 0 || mx >= img.width || my >= img.height) return def;
    const i = (my * img.width + mx) * 4;
    return (useAlpha ? data[i + 3] : data[i]) / 255;
  };
}

interface Src {
  data: Uint8ClampedArray;
  left: number;
  top: number;
  w: number;
  h: number;
}

function drawSrc(
  dst: Uint8ClampedArray,
  W: number,
  H: number,
  src: Src,
  opts: { opacity: number; mode?: string; mask: ((x: number, y: number) => number) | null; base: Base | 'none' | undefined; clip: boolean },
): Base {
  const blend = blendFn(opts.mode);
  const baseAlpha = new Uint8Array(src.w * src.h);
  const x0 = Math.max(0, -src.left);
  const y0 = Math.max(0, -src.top);
  const x1 = Math.min(src.w, W - src.left);
  const y1 = Math.min(src.h, H - src.top);
  const base = opts.clip ? (opts.base as Base) : null;
  for (let y = y0; y < y1; y++) {
    const dy = y + src.top;
    for (let x = x0; x < x1; x++) {
      const s = (y * src.w + x) * 4;
      let a = src.data[s + 3] / 255;
      baseAlpha[y * src.w + x] = src.data[s + 3];
      if (a <= 0) continue;
      const dx = x + src.left;
      a *= opts.opacity;
      if (opts.mask) a *= opts.mask(dx, dy);
      if (opts.clip) {
        if (!base) continue;
        const bx = dx - base.left;
        const by = dy - base.top;
        if (bx < 0 || by < 0 || bx >= base.w || by >= base.h) continue;
        a *= base.alpha[by * base.w + bx] / 255;
      }
      if (a <= 0) continue;
      const d = (dy * W + dx) * 4;
      const ab = dst[d + 3] / 255;
      const ao = a + ab - a * ab;
      for (let c = 0; c < 3; c++) {
        const cs = src.data[s + c] / 255;
        const cb = dst[d + c] / 255;
        const mixed = blend && ab > 0 ? (1 - ab) * cs + ab * clamp01(blend(cb, cs)) : cs;
        dst[d + c] = ((a * mixed + ab * cb * (1 - a)) / ao) * 255;
      }
      dst[d + 3] = ao * 255;
    }
  }
  return { left: src.left, top: src.top, w: src.w, h: src.h, alpha: baseAlpha };
}

type Skip = (layer: Layer) => boolean;

function compose(children: Layer[], dst: Uint8ClampedArray, W: number, H: number, stats: CompositeStats, skip: Skip) {
  let base: Base = null;
  for (const layer of children) {
    if (layer.hidden || skip(layer)) continue;
    const opacity = (layer.opacity ?? 1) * (layer.fillOpacity ?? 1);
    const mask = maskValue(layer);
    if (layer.vectorMask) stats.vectorMasks++;
    if (layer.effects) stats.effects++;

    if (layer.children) {
      const passThrough = !layer.blendMode || layer.blendMode === 'pass through';
      if (passThrough && opacity > 0.999 && !mask) {
        compose(layer.children, dst, W, H, stats, skip);
      } else {
        const tmp = new Uint8ClampedArray(W * H * 4);
        compose(layer.children, tmp, W, H, stats, skip);
        drawSrc(dst, W, H, { data: tmp, left: 0, top: 0, w: W, h: H }, { opacity, mode: layer.blendMode, mask, base: null, clip: false });
      }
      base = null;
      continue;
    }

    if (!layer.imageData) {
      if (layer.adjustment) stats.skippedAdjustments++;
      continue;
    }
    stats.layers++;
    const img = layer.imageData;
    const clip = !!layer.clipping;
    const drawn = drawSrc(
      dst,
      W,
      H,
      { data: to8bit(img), left: layer.left ?? 0, top: layer.top ?? 0, w: img.width, h: img.height },
      { opacity, mode: layer.blendMode, mask, base, clip },
    );
    if (!clip) base = drawn;
  }
}

/** Composites the layer tree onto a transparent canvas of the document size. */
export function compositeLayers(layers: Layer[] | undefined, W: number, H: number, skip: Skip = () => false) {
  const data = new Uint8ClampedArray(W * H * 4);
  const stats: CompositeStats = { layers: 0, skippedAdjustments: 0, effects: 0, vectorMasks: 0 };
  compose(layers ?? [], data, W, H, stats, skip);
  return { data, stats };
}
