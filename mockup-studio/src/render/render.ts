import type { Mockup, Point, Quad, RenderSettings, StageRatio } from '../types';
import { computePlacement } from './fit';
import { paintScene, type Focus } from './scenes';
import { applyProjective, isAffine, squareToQuad, triangleAffine } from './homography';

export interface RenderInput {
  mockup: Mockup;
  frame: CanvasImageSource;
  image: CanvasImageSource & { width: number; height: number };
  settings: RenderSettings;
  /** Transparent layer drawn over the design (camera notch, dynamic island). */
  overlay?: CanvasImageSource | null;
  /** Colour shown around the image when fit mode leaves gaps. */
  letterbox?: string;
  /** The picture chosen as a custom background, once loaded. */
  backgroundImage?: HTMLImageElement | null;
}

const RATIOS: Record<StageRatio, number> = { auto: 0, '1:1': 1, '4:3': 4 / 3, '16:9': 16 / 9, '4:5': 4 / 5 };

/** Size of the finished picture in mockup units, and where the device sits inside it. */
export function outputSize(mockup: Mockup, settings: RenderSettings) {
  const { width: cw, height: ch } = mockup.canvas;
  if (mockup.layer === 'under') return { width: cw, height: ch, ox: 0, oy: 0 };
  const p = settings.stage.padding;
  let w = cw * (1 + 2 * p);
  let h = ch * (1 + 2 * p);
  const r = RATIOS[settings.stage.ratio];
  if (r) {
    if (w / h < r) w = h * r;
    else h = w / r;
  }
  return { width: Math.round(w), height: Math.round(h), ox: (w - cw) / 2, oy: (h - ch) / 2 };
}

const GRID = 20;

function paintBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bg: RenderSettings['background'],
  image: HTMLImageElement | null | undefined,
  focus: Focus,
) {
  if (bg.type === 'scene') {
    paintScene(ctx, w, h, bg.id, focus);
  } else if (bg.type === 'image') {
    if (image && image.naturalWidth) {
      // Cover-fit the picture.
      const k = Math.max(w / image.naturalWidth, h / image.naturalHeight);
      const dw = image.naturalWidth * k;
      const dh = image.naturalHeight * k;
      ctx.drawImage(image, (w - dw) / 2, (h - dh) / 2, dw, dh);
    } else {
      ctx.fillStyle = '#e9e6e2';
      ctx.fillRect(0, 0, w, h);
    }
  } else if (bg.type === 'solid') {
    ctx.fillStyle = bg.color;
    ctx.fillRect(0, 0, w, h);
  } else if (bg.type === 'gradient') {
    const rad = ((bg.angle - 90) * Math.PI) / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    const half = (Math.abs(dx) * w + Math.abs(dy) * h) / 2;
    const g = ctx.createLinearGradient(w / 2 - dx * half, h / 2 - dy * half, w / 2 + dx * half, h / 2 + dy * half);
    g.addColorStop(0, bg.from);
    g.addColorStop(1, bg.to);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}

/** The user's image, positioned and fitted, on a screen-sized canvas. */
function paintScreen(input: RenderInput, w: number, h: number, unit: number): HTMLCanvasElement {
  const { mockup, image, settings } = input;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = input.letterbox ?? '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);
  const p = computePlacement(
    image.width,
    image.height,
    mockup.screen.width,
    mockup.screen.height,
    settings.fit,
    settings.zoom,
    settings.offsetX,
    settings.offsetY,
  );
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, p.x * unit, p.y * unit, p.w * unit, p.h * unit);
  return c;
}

export function renderMockup(canvas: HTMLCanvasElement, input: RenderInput, scale: number) {
  const { mockup, frame, settings } = input;
  const out = outputSize(mockup, settings);
  const W = Math.round(out.width * scale);
  const H = Math.round(out.height * scale);
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, W, H);
  const under = mockup.layer === 'under';
  const DW = Math.round(mockup.canvas.width * scale);
  const DH = Math.round(mockup.canvas.height * scale);

  if (under) {
    // A flat photo: it is the whole scene, and the design goes on top of its screen.
    ctx.drawImage(frame, 0, 0, W, H);
  } else {
    // Where the device sits, so scenes can put a floor, podium or glow in the right place.
    const focus: Focus = {
      cx: (out.ox + mockup.canvas.width / 2) / out.width,
      cy: (out.oy + mockup.canvas.height / 2) / out.height,
      bottom: (out.oy + mockup.canvas.height - 62) / out.height,
      w: mockup.canvas.width / out.width,
      h: mockup.canvas.height / out.height,
    };
    paintBackground(ctx, W, H, settings.background, input.backgroundImage, focus);
    if (settings.shadow && settings.background.type !== 'transparent') {
      // Soft contact shadow where the device meets the ground.
      const cx = (out.ox + mockup.canvas.width / 2) * scale;
      const cy = (out.oy + mockup.canvas.height - 62) * scale;
      const rx = mockup.canvas.width * 0.36 * scale;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, 0.14);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, 'rgba(0,0,0,0.42)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.save();
  ctx.translate(out.ox * scale, out.oy * scale);

  if (settings.shadow && !under) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.38)';
    ctx.shadowBlur = 70 * scale;
    ctx.shadowOffsetY = 36 * scale;
    ctx.drawImage(frame, 0, 0, DW, DH);
    ctx.restore();
  }

  const { quad, width: sw, height: sh, radius, extra } = mockup.screen;
  const src = paintScreen(input, sw * scale, sh * scale, scale);
  for (const q of [quad, ...(extra ?? [])]) drawOnScreen(ctx, src, q, sw, sh, radius, scale);

  if (input.overlay) ctx.drawImage(input.overlay, 0, 0, DW, DH);
  if (!under) ctx.drawImage(frame, 0, 0, DW, DH);
  ctx.restore();
}

/** Maps the fitted design onto one screen quad, clipped to the rounded screen shape. */
function drawOnScreen(ctx: CanvasRenderingContext2D, src: HTMLCanvasElement, quad: Quad, sw: number, sh: number, radius: number, scale: number) {
  const m = squareToQuad(quad.map(([x, y]) => [x * scale, y * scale]) as Quad);
  const map = (u: number, v: number) => applyProjective(m, u, v);
  ctx.save();
  // Clip to the rounded screen so the image never pokes outside the bezel.
  const r = Math.min(radius, sw / 2, sh / 2);
  const outline: Point[] = [];
  const corner = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= 10; i++) {
      const a = a0 + ((Math.PI / 2) * i) / 10;
      outline.push(map((cx + r * Math.cos(a)) / sw, (cy + r * Math.sin(a)) / sh));
    }
  };
  corner(sw - r, r, -Math.PI / 2);
  corner(sw - r, sh - r, 0);
  corner(r, sh - r, Math.PI / 2);
  corner(r, r, Math.PI);
  ctx.beginPath();
  outline.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.clip();

  ctx.imageSmoothingQuality = 'high';
  if (isAffine(m)) {
    ctx.transform(m.a / src.width, m.d / src.width, m.b / src.height, m.e / src.height, m.c, m.f);
    ctx.drawImage(src, 0, 0);
  } else {
    drawPerspective(ctx, src, map);
  }
  ctx.restore();
}

/** Draws `src` through a projective map by splitting it into small affine triangles. */
function drawPerspective(
  ctx: CanvasRenderingContext2D,
  src: HTMLCanvasElement,
  map: (u: number, v: number) => Point,
) {
  const { width: w, height: h } = src;
  const sp = (i: number, j: number): Point => [(i / GRID) * w, (j / GRID) * h];
  const dp = (i: number, j: number) => map(i / GRID, j / GRID);
  const tri = (s: [Point, Point, Point], t: [Point, Point, Point]) => {
    const cx = (t[0][0] + t[1][0] + t[2][0]) / 3;
    const cy = (t[0][1] + t[1][1] + t[2][1]) / 3;
    // Grow the clip slightly so neighbouring triangles overlap and leave no seams.
    const grown = t.map(([x, y]) => {
      const dx = x - cx;
      const dy = y - cy;
      const len = Math.hypot(dx, dy) || 1;
      return [x + (dx / len) * 1.8, y + (dy / len) * 1.8];
    });
    ctx.save();
    ctx.beginPath();
    grown.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.clip();
    const [a, b, c, d, e, f] = triangleAffine(s, t);
    ctx.transform(a, b, c, d, e, f);
    ctx.drawImage(src, 0, 0);
    ctx.restore();
  };
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      tri([sp(i, j), sp(i + 1, j), sp(i, j + 1)], [dp(i, j), dp(i + 1, j), dp(i, j + 1)]);
      tri([sp(i + 1, j), sp(i + 1, j + 1), sp(i, j + 1)], [dp(i + 1, j), dp(i + 1, j + 1), dp(i, j + 1)]);
    }
  }
}
