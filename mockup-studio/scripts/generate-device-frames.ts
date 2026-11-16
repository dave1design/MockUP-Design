/**
 * Generates original device frames (SVG) and public/mockups/manifest.json.
 *
 * Every shape is built as a polygon in device space, then pushed through an
 * optional 3D "tilt" projection. That keeps flat and tilted devices on one
 * code path and gives each mockup an exact screen quad for the renderer.
 *
 * Run with: npm run assets
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Category, Manifest, Mockup, Point, Quad } from '../src/types';

const OUT = join(import.meta.dirname, '..', 'public', 'mockups');
const PAD = 70;
const BLEED = 3;
const BRAND = '#E11D2E';

type Proj = (p: Point) => Point;
const flat: Proj = (p) => p;

function tilt(cx: number, cy: number, rotYDeg: number, rotXDeg: number, d: number): Proj {
  const ry = (rotYDeg * Math.PI) / 180;
  const rx = (rotXDeg * Math.PI) / 180;
  return ([x, y]) => {
    const X = x - cx;
    const Y = y - cy;
    const X1 = X * Math.cos(ry);
    const Z1 = -X * Math.sin(ry);
    const Y2 = Y * Math.cos(rx) - Z1 * Math.sin(rx);
    const Z2 = Y * Math.sin(rx) + Z1 * Math.cos(rx);
    const s = d / (d + Z2);
    return [X1 * s, Y2 * s];
  };
}

function rrect(x: number, y: number, w: number, h: number, r: number, steps = 10): Point[] {
  r = Math.min(r, w / 2, h / 2);
  const pts: Point[] = [];
  const arc = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((Math.PI / 2) * i) / steps;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  };
  arc(x + w - r, y + r, -Math.PI / 2);
  arc(x + w - r, y + h - r, 0);
  arc(x + r, y + h - r, Math.PI / 2);
  arc(x + r, y + r, Math.PI);
  return pts;
}

/** Rounded rect with square top corners and rounded bottom corners. */
function bottomRounded(x: number, y: number, w: number, h: number, r: number, steps = 10): Point[] {
  const pts: Point[] = [[x + w, y]];
  const arc = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((Math.PI / 2) * i) / steps;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  };
  arc(x + w - r, y + h - r, 0);
  arc(x + r, y + h - r, Math.PI / 2);
  pts.push([x, y]);
  return pts;
}

/** Rounded rect with rounded top corners and a square bottom edge. */
function topRounded(x: number, y: number, w: number, h: number, r: number, steps = 10): Point[] {
  const pts: Point[] = [];
  const arc = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((Math.PI / 2) * i) / steps;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  };
  arc(x + w - r, y + r, -Math.PI / 2);
  pts.push([x + w, y + h], [x, y + h]);
  arc(x + r, y + r, Math.PI);
  return pts;
}

const hex = (c: string): [number, number, number] => {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (rgb: number[]) =>
  '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (c: string, target: number, t: number) => toHex(hex(c).map((v) => v + (target - v) * t));
const lighten = (c: string, t: number) => mix(c, 255, t);
const darken = (c: string, t: number) => mix(c, 0, t);

interface Layer {
  polys: Point[][];
  fill: string;
  evenodd?: boolean;
  stroke?: { color: string; width: number; opacity: number };
}

/** A device drawn in portrait/native space, optionally rotated and projected. */
class Scene {
  layers: Layer[] = [];
  screen: { x: number; y: number; w: number; h: number; r: number } | null = null;
  private rotate: boolean;
  constructor(
    private devW: number,
    private devH: number,
    opts: { landscape?: boolean } = {},
  ) {
    this.rotate = !!opts.landscape;
  }

  /** Native space to oriented (upright) space. */
  orient = ([x, y]: Point): Point => (this.rotate ? [y, this.devW - x] : [x, y]);

  add(polys: Point[][], fill: string, extra: Partial<Layer> = {}) {
    this.layers.push({ polys, fill, ...extra });
  }

  /** The device body: filled shape with the screen hole punched through. */
  body(outer: Point[], fill: string, hole: Point[], extra: Partial<Layer> = {}) {
    this.add([outer, hole], fill, { evenodd: true, ...extra });
  }

  setScreen(x: number, y: number, w: number, h: number, r: number) {
    this.screen = { x, y, w, h, r };
  }

  /** Screen corners in oriented space (TL, TR, BR, BL), grown by `grow`. */
  private screenCorners(grow = 0): Quad {
    const s = this.screen!;
    const corners: Point[] = [
      [s.x - grow, s.y - grow],
      [s.x + s.w + grow, s.y - grow],
      [s.x + s.w + grow, s.y + s.h + grow],
      [s.x - grow, s.y + s.h + grow],
    ];
    const o = corners.map(this.orient);
    // A rotated device swaps which native corner is visually top-left.
    return (this.rotate ? [o[1], o[2], o[3], o[0]] : o) as Quad;
  }

  private screenSize(grow = 0) {
    const s = this.screen!;
    const [w, h] = this.rotate ? [s.h, s.w] : [s.w, s.h];
    return { w: w + grow * 2, h: h + grow * 2 };
  }

  build(id: string, proj: Proj) {
    const P = (p: Point) => proj(this.orient(p));
    const projected = this.layers.map((l) => ({ ...l, polys: l.polys.map((poly) => poly.map(P)) }));

    // Bounding box over everything, including the screen quad.
    const quadO = this.screenCorners(BLEED);
    const quadP = quadO.map(proj) as Quad;
    const all = [...projected.flatMap((l) => l.polys.flat()), ...quadP];
    const minX = Math.min(...all.map((p) => p[0]));
    const minY = Math.min(...all.map((p) => p[1]));
    const maxX = Math.max(...all.map((p) => p[0]));
    const maxY = Math.max(...all.map((p) => p[1]));
    const ox = PAD - minX;
    const oy = PAD - minY;
    const width = Math.ceil(maxX - minX + PAD * 2);
    const height = Math.ceil(maxY - minY + PAD * 2);
    const sh = (p: Point): Point => [p[0] + ox, p[1] + oy];

    const gradients = new Map<string, string>();
    const gid = (color: string) => {
      if (!gradients.has(color)) gradients.set(color, `g${gradients.size}`);
      return gradients.get(color)!;
    };
    const fillAttr = (f: string) => (f.startsWith('grad:') ? `url(#${gid(f.slice(5))})` : f);

    const d = (poly: Point[]) =>
      poly
        .map(sh)
        .map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
        .join('') + 'Z';

    const layerSvg = (l: (typeof projected)[number]) => {
      const stroke = l.stroke
        ? ` stroke="${l.stroke.color}" stroke-opacity="${l.stroke.opacity}" stroke-width="${l.stroke.width}" stroke-linejoin="round"`
        : '';
      return `<path d="${l.polys.map(d).join('')}" fill="${fillAttr(l.fill)}"${l.evenodd ? ' fill-rule="evenodd"' : ''}${stroke}/>`;
    };

    const frameBody = projected.map(layerSvg).join('\n');
    const sample = this.sampleUi(proj).map((l) => layerSvg({ ...l, polys: l.polys })).join('\n');

    const defs = [...gradients.entries()]
      .map(
        ([color, key]) =>
          `<linearGradient id="${key}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lighten(color, 0.14)}"/><stop offset="1" stop-color="${darken(color, 0.12)}"/></linearGradient>`,
      )
      .join('');

    const svg = (inner: string) =>
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>${defs}</defs>\n${inner}\n</svg>\n`;

    const quad = quadP.map((p) => [Math.round(sh(p)[0] * 10) / 10, Math.round(sh(p)[1] * 10) / 10]) as Quad;
    return {
      width,
      height,
      quad,
      screenSize: this.screenSize(BLEED),
      screenRadius: this.screen!.r + BLEED,
      frameSvg: svg(frameBody),
      thumbSvg: svg(`<g>${sample}</g>\n${frameBody}`),
    };
  }

  /** Placeholder UI drawn under the frame, for gallery thumbnails. */
  private sampleUi(proj: Proj): Layer[] {
    const [tl, tr, , bl] = this.screenCorners(0);
    const { w: sw, h: sh } = this.screenSize();
    const map = ([u, v]: Point): Point =>
      proj([
        tl[0] + (u / sw) * (tr[0] - tl[0]) + (v / sh) * (bl[0] - tl[0]),
        tl[1] + (u / sw) * (tr[1] - tl[1]) + (v / sh) * (bl[1] - tl[1]),
      ]);
    const shape = (pts: Point[], fill: string): Layer => ({ polys: [pts.map(map)], fill });
    const box = (x: number, y: number, w: number, h: number, r: number, fill: string) =>
      shape(rrect(x, y, w, h, r), fill);

    const m = Math.min(sw, sh);
    const rad = this.screen!.r + BLEED;
    const hh = sh * 0.13;
    const gx = sw * 0.06;
    const layers: Layer[] = [
      box(-BLEED, -BLEED, sw + 2 * BLEED, sh + 2 * BLEED, rad, '#F7F7F8'),
      shape(topRounded(-BLEED, -BLEED, sw + 2 * BLEED, hh + BLEED, rad), BRAND),
      box(gx, hh * 0.42, sw * 0.28, hh * 0.2, hh * 0.1, '#FFFFFF'),
      box(gx, hh + sh * 0.035, sw - 2 * gx, sh * 0.27, m * 0.04, '#FDECEE'),
      box(gx + sw * 0.05, hh + sh * 0.07, sw * 0.4, sh * 0.03, sh * 0.015, BRAND),
      box(gx + sw * 0.05, hh + sh * 0.12, sw * 0.28, sh * 0.02, sh * 0.01, '#E7B4BA'),
    ];
    const rowH = sh * 0.075;
    for (let i = 0; i < 4; i++) {
      const y = hh + sh * 0.35 + i * (rowH + sh * 0.025);
      if (y + rowH > sh - 6) break;
      layers.push(box(gx, y, sw - 2 * gx, rowH, m * 0.025, '#ECECEF'));
      layers.push(box(gx + sw * 0.03, y + rowH * 0.3, sw * 0.14, rowH * 0.4, rowH * 0.2, '#D9D9DE'));
    }
    return layers.map((l) => ({ ...l, polys: l.polys }));
  }
}

// --- Device builders --------------------------------------------------------

type PhoneStyle = 'island' | 'notch' | 'punch';

function phone(style: PhoneStyle, color: string, landscape = false): Scene {
  const W = 900;
  const H = 1900;
  const s = new Scene(W, H, { landscape });
  const side = darken(color, 0.28);
  // Buttons sit behind the body.
  s.add([rrect(W - 4, 520, 16, 270, 6)], side);
  s.add([rrect(-12, 270, 16, 80, 6), rrect(-12, 430, 16, 150, 6), rrect(-12, 620, 16, 150, 6)], side);
  const hole = rrect(36, 36, W - 72, H - 72, 100);
  s.body(rrect(0, 0, W, H, 135), `grad:${color}`, hole, {
    stroke: { color: '#ffffff', width: 3, opacity: 0.35 },
  });
  s.body(rrect(14, 14, W - 28, H - 28, 122), '#0B0B0D', hole);
  s.setScreen(36, 36, W - 72, H - 72, 100);
  if (style === 'island') s.add([rrect(W / 2 - 130, 70, 260, 76, 38)], '#050506');
  if (style === 'notch') s.add([rrect(W / 2 - 215, -10, 430, 112, 52)], '#050506');
  if (style === 'punch') s.add([rrect(W / 2 - 26, 76, 52, 52, 26)], '#050506');
  return s;
}

function tablet(color: string, landscape = false): Scene {
  const W = 1640;
  const H = 2200;
  const s = new Scene(W, H, { landscape });
  const side = darken(color, 0.28);
  s.add([rrect(W / 2 + 250, -10, 150, 14, 6)], side);
  const hole = rrect(58, 58, W - 116, H - 116, 40);
  s.body(rrect(0, 0, W, H, 112), `grad:${color}`, hole, {
    stroke: { color: '#ffffff', width: 3, opacity: 0.35 },
  });
  s.body(rrect(10, 10, W - 20, H - 20, 102), '#0B0B0D', hole);
  s.setScreen(58, 58, W - 116, H - 116, 40);
  s.add([rrect(W / 2 - 9, 25, 18, 18, 9)], '#1c1c20');
  return s;
}

function laptop(color: string, notch: boolean): Scene {
  const LW = 1800;
  const LH = 1180;
  const s = new Scene(LW, LH + 56);
  const baseColor = darken(color, 0.06);
  s.add([bottomRounded(-130, LH, LW + 260, 56, 30)], `grad:${baseColor}`);
  s.add([rrect(LW / 2 - 110, LH, 220, 16, 8)], darken(color, 0.3));
  const hole = rrect(48, 48, 1704, 1065, 14);
  s.body(rrect(0, 0, LW, LH, 48), `grad:${color}`, hole, {
    stroke: { color: '#ffffff', width: 3, opacity: 0.35 },
  });
  s.body(rrect(10, 10, LW - 20, LH - 20, 40), '#0B0B0D', hole);
  s.setScreen(48, 48, 1704, 1065, 14);
  if (notch) s.add([rrect(LW / 2 - 140, 30, 280, 54, 22)], '#050506');
  else s.add([rrect(LW / 2 - 7, 22, 14, 14, 7)], '#1c1c20');
  return s;
}

type MonitorStyle = 'standard' | 'slim' | 'ultrawide';

function monitor(style: MonitorStyle, color: string): Scene {
  const wide = style === 'ultrawide';
  const sw = wide ? 2560 : 1920;
  const sh = 1080;
  const inset = style === 'slim' ? 14 : 40;
  const W = sw + inset * 2;
  const H = sh + inset + (style === 'slim' ? 18 : 100);
  const s = new Scene(W, H + 400);
  const dark = ['#111114', '#1c1c20', '#18181b'].includes(color) || color === '#17171a';
  const stand = dark ? '#2a2a30' : darken(color, 0.12);
  const cx = W / 2;
  s.add([[[cx - 100, H - 4], [cx + 100, H - 4], [cx + 130, H + 340], [cx - 130, H + 340]]], `grad:${stand}`);
  s.add([rrect(cx - 320, H + 320, 640, 50, 25)], `grad:${darken(stand, 0.06)}`);
  const hole = rrect(inset, inset, sw, sh, style === 'slim' ? 4 : 8);
  s.body(rrect(0, 0, W, H, 36), `grad:${color}`, hole, {
    stroke: { color: '#ffffff', width: 3, opacity: dark ? 0.15 : 0.4 },
  });
  if (!dark && style !== 'slim') s.body(rrect(12, 12, W - 24, H - 24, 28), '#0B0B0D', hole);
  s.setScreen(inset, inset, sw, sh, style === 'slim' ? 4 : 8);
  return s;
}

// --- Catalogue --------------------------------------------------------------

interface Entry {
  id: string;
  name: string;
  category: Category;
  color: string;
  colorName: string;
  tags: string[];
  scene: Scene;
  proj?: (scene: Scene) => Proj;
}

const around = (rotY: number, rotX: number, dist = 3.2) => (scene: Scene) => {
  const pts = scene.layers.flatMap((l) => l.polys.flat()).map(scene.orient);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  return tilt((Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2, rotY, rotX, Math.max(w, h) * dist);
};

const entries: Entry[] = [
  // Phones
  { id: 'phone-island-midnight', name: 'Phone · Island · Midnight', category: 'phones', color: '#1d1d22', colorName: 'Midnight', tags: ['mobile', 'front', 'dark'], scene: phone('island', '#1d1d22') },
  { id: 'phone-island-silver', name: 'Phone · Island · Silver', category: 'phones', color: '#d8d9dc', colorName: 'Silver', tags: ['mobile', 'front', 'light'], scene: phone('island', '#d8d9dc') },
  { id: 'phone-island-red', name: 'Phone · Island · Red', category: 'phones', color: '#d3202e', colorName: 'Red', tags: ['mobile', 'front', 'color'], scene: phone('island', '#d3202e') },
  { id: 'phone-notch-gold', name: 'Phone · Notch · Gold', category: 'phones', color: '#d9c7a3', colorName: 'Gold', tags: ['mobile', 'front', 'light'], scene: phone('notch', '#d9c7a3') },
  { id: 'phone-notch-blue', name: 'Phone · Notch · Blue', category: 'phones', color: '#3f5f8f', colorName: 'Blue', tags: ['mobile', 'front', 'color'], scene: phone('notch', '#3f5f8f') },
  { id: 'phone-punch-green', name: 'Phone · Punch-hole · Green', category: 'phones', color: '#53695c', colorName: 'Green', tags: ['mobile', 'android', 'front'], scene: phone('punch', '#53695c') },
  { id: 'phone-punch-midnight', name: 'Phone · Punch-hole · Midnight', category: 'phones', color: '#202024', colorName: 'Midnight', tags: ['mobile', 'android', 'front', 'dark'], scene: phone('punch', '#202024') },
  { id: 'phone-landscape-midnight', name: 'Phone · Landscape', category: 'phones', color: '#1d1d22', colorName: 'Midnight', tags: ['mobile', 'landscape', 'game'], scene: phone('island', '#1d1d22', true) },
  { id: 'phone-tilt-midnight', name: 'Phone · Tilted left', category: 'phones', color: '#1d1d22', colorName: 'Midnight', tags: ['mobile', 'angle', 'perspective'], scene: phone('island', '#1d1d22'), proj: around(-24, 6) },
  { id: 'phone-tilt-silver', name: 'Phone · Tilted right', category: 'phones', color: '#d8d9dc', colorName: 'Silver', tags: ['mobile', 'angle', 'perspective'], scene: phone('island', '#d8d9dc'), proj: around(24, -6) },
  // Tablets
  { id: 'tablet-portrait-gray', name: 'Tablet · Portrait · Space gray', category: 'tablets', color: '#45464b', colorName: 'Space gray', tags: ['ipad', 'front', 'dark'], scene: tablet('#45464b') },
  { id: 'tablet-portrait-silver', name: 'Tablet · Portrait · Silver', category: 'tablets', color: '#dcdde0', colorName: 'Silver', tags: ['ipad', 'front', 'light'], scene: tablet('#dcdde0') },
  { id: 'tablet-portrait-rose', name: 'Tablet · Portrait · Rose', category: 'tablets', color: '#e6bdb7', colorName: 'Rose', tags: ['ipad', 'front', 'color'], scene: tablet('#e6bdb7') },
  { id: 'tablet-landscape-gray', name: 'Tablet · Landscape · Space gray', category: 'tablets', color: '#45464b', colorName: 'Space gray', tags: ['ipad', 'landscape', 'dark'], scene: tablet('#45464b', true) },
  { id: 'tablet-landscape-silver', name: 'Tablet · Landscape · Silver', category: 'tablets', color: '#dcdde0', colorName: 'Silver', tags: ['ipad', 'landscape', 'light'], scene: tablet('#dcdde0', true) },
  { id: 'tablet-tilt-silver', name: 'Tablet · Tilted', category: 'tablets', color: '#dcdde0', colorName: 'Silver', tags: ['ipad', 'angle', 'perspective'], scene: tablet('#dcdde0', true), proj: around(-20, 8) },
  // Laptops
  { id: 'laptop-silver', name: 'Laptop · Silver', category: 'laptops', color: '#c9cacd', colorName: 'Silver', tags: ['macbook', 'front', 'light'], scene: laptop('#c9cacd', false) },
  { id: 'laptop-gray', name: 'Laptop · Space gray', category: 'laptops', color: '#4a4b50', colorName: 'Space gray', tags: ['macbook', 'front', 'dark'], scene: laptop('#4a4b50', false) },
  { id: 'laptop-midnight', name: 'Laptop · Midnight', category: 'laptops', color: '#262b34', colorName: 'Midnight', tags: ['macbook', 'front', 'dark'], scene: laptop('#262b34', false) },
  { id: 'laptop-notch-silver', name: 'Laptop · Notch · Silver', category: 'laptops', color: '#c9cacd', colorName: 'Silver', tags: ['macbook', 'notch', 'light'], scene: laptop('#c9cacd', true) },
  { id: 'laptop-notch-gray', name: 'Laptop · Notch · Space gray', category: 'laptops', color: '#4a4b50', colorName: 'Space gray', tags: ['macbook', 'notch', 'dark'], scene: laptop('#4a4b50', true) },
  { id: 'laptop-tilt-silver', name: 'Laptop · Tilted', category: 'laptops', color: '#c9cacd', colorName: 'Silver', tags: ['macbook', 'angle', 'perspective'], scene: laptop('#c9cacd', true), proj: around(-22, 5) },
  // Desktops
  { id: 'monitor-silver', name: 'Monitor · Silver', category: 'desktops', color: '#cfd0d3', colorName: 'Silver', tags: ['imac', 'desktop', 'light'], scene: monitor('standard', '#cfd0d3') },
  { id: 'monitor-black', name: 'Monitor · Black', category: 'desktops', color: '#17171a', colorName: 'Black', tags: ['display', 'desktop', 'dark'], scene: monitor('standard', '#17171a') },
  { id: 'monitor-white', name: 'Monitor · White', category: 'desktops', color: '#f1f1f3', colorName: 'White', tags: ['display', 'desktop', 'light'], scene: monitor('standard', '#f1f1f3') },
  { id: 'monitor-slim-black', name: 'Monitor · Slim bezel', category: 'desktops', color: '#17171a', colorName: 'Black', tags: ['display', 'desktop', 'minimal'], scene: monitor('slim', '#17171a') },
  { id: 'monitor-ultrawide-black', name: 'Monitor · Ultrawide', category: 'desktops', color: '#17171a', colorName: 'Black', tags: ['display', 'ultrawide', 'dashboard'], scene: monitor('ultrawide', '#17171a') },
  { id: 'monitor-tilt-silver', name: 'Monitor · Tilted', category: 'desktops', color: '#cfd0d3', colorName: 'Silver', tags: ['imac', 'angle', 'perspective'], scene: monitor('standard', '#cfd0d3'), proj: around(20, 4) },
];

mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) rmSync(join(OUT, f));

const mockups: Mockup[] = entries.map((e) => {
  const proj = e.proj ? e.proj(e.scene) : flat;
  const built = e.scene.build(e.id, proj);
  writeFileSync(join(OUT, `${e.id}.svg`), built.frameSvg);
  writeFileSync(join(OUT, `${e.id}.thumb.svg`), built.thumbSvg);
  return {
    id: e.id,
    name: e.name,
    category: e.category,
    tags: e.tags,
    frame: `mockups/${e.id}.svg`,
    thumbnail: `mockups/${e.id}.thumb.svg`,
    canvas: { width: built.width, height: built.height },
    screen: { quad: built.quad, width: built.screenSize.w, height: built.screenSize.h, radius: built.screenRadius },
    color: e.colorName,
    license: { type: 'original', source: 'generated by scripts/generate-device-frames.ts', author: 'Mockup Studio' },
  };
});

const manifest: Manifest = { version: 1, mockups };
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Wrote ${mockups.length} mockups to ${OUT}`);
