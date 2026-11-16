/**
 * Energetic studio backgrounds drawn on a canvas: colour meshes, glows, rings, suns and grids with a little film
 * grain. Everything is deterministic (no randomness at draw time), so previews and exports match exactly.
 */
export type SceneId =
  | 'podium-peach'
  | 'arch-sage'
  | 'sphere-lab'
  | 'crimson-burst'
  | 'electric-blue'
  | 'sunset-pop'
  | 'aurora'
  | 'mint-studio'
  | 'neon-night'
  | 'candy'
  | 'gold-hour'
  | 'ocean-wave'
  | 'lavender-glass';

export const SCENES: { id: SceneId; label: string }[] = [
  { id: 'podium-peach', label: 'Peach podium' },
  { id: 'arch-sage', label: 'Sage arch' },
  { id: 'sphere-lab', label: 'Sphere studio' },
  { id: 'crimson-burst', label: 'Crimson burst' },
  { id: 'electric-blue', label: 'Electric blue' },
  { id: 'sunset-pop', label: 'Sunset pop' },
  { id: 'aurora', label: 'Aurora' },
  { id: 'neon-night', label: 'Neon night' },
  { id: 'gold-hour', label: 'Gold hour' },
  { id: 'ocean-wave', label: 'Ocean wave' },
  { id: 'candy', label: 'Candy' },
  { id: 'mint-studio', label: 'Mint studio' },
  { id: 'lavender-glass', label: 'Lavender glass' },
];

type Ctx = CanvasRenderingContext2D;

/** Where the device sits on the stage, as fractions of the canvas (bottom = the line it stands on). */
export interface Focus {
  cx: number;
  cy: number;
  bottom: number;
  w: number;
  h: number;
}
const DEFAULT_FOCUS: Focus = { cx: 0.5, cy: 0.5, bottom: 0.8, w: 0.4, h: 0.62 };

const lerpGradient = (ctx: Ctx, W: number, H: number, angleDeg: number, stops: [number, string][]) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const half = (Math.abs(dx) * W + Math.abs(dy) * H) / 2;
  const g = ctx.createLinearGradient(W / 2 - dx * half, H / 2 - dy * half, W / 2 + dx * half, H / 2 + dy * half);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
};

/** A soft coloured glow. Positions and radius are fractions of the canvas width/height. */
const blob = (ctx: Ctx, W: number, H: number, x: number, y: number, r: number, color: string, alpha: number, mode: GlobalCompositeOperation = 'source-over') => {
  const R = r * W;
  const g = ctx.createRadialGradient(x * W, y * H, 0, x * W, y * H, R);
  g.addColorStop(0, color);
  g.addColorStop(1, color + '00');
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = mode;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
};

const ring = (ctx: Ctx, W: number, H: number, x: number, y: number, r: number, width: number, color: string, alpha: number) => {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width * W;
  ctx.beginPath();
  ctx.arc(x * W, y * H, r * W, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
};

const disc = (ctx: Ctx, W: number, H: number, x: number, y: number, r: number, inner: string, outer: string, alpha = 1) => {
  const g = ctx.createRadialGradient(x * W, (y - r * 0.25) * H, 0, x * W, y * H, r * W);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x * W, y * H, r * W, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const beam = (ctx: Ctx, W: number, H: number, x0: number, x1: number, skew: number, alpha: number) => {
  ctx.save();
  ctx.globalAlpha = alpha;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#ffffff00');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x0 * W, 0);
  ctx.lineTo(x1 * W, 0);
  ctx.lineTo((x1 + skew) * W, H);
  ctx.lineTo((x0 + skew * 1.4) * W, H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

const dots = (ctx: Ctx, W: number, H: number, color: string, alpha: number, gap = 0.028) => {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  const g = gap * W;
  for (let y = g / 2; y < H; y += g) for (let x = g / 2; x < W; x += g) ctx.fillRect(x, y, g * 0.07, g * 0.07);
  ctx.restore();
};

/** Perspective floor grid in the lower part of the canvas. */
const floorGrid = (ctx: Ctx, W: number, H: number, color: string, alpha: number) => {
  const horizon = H * 0.62;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, W * 0.0016);
  for (let i = -14; i <= 14; i++) {
    ctx.beginPath();
    ctx.moveTo(W / 2 + i * W * 0.02, horizon);
    ctx.lineTo(W / 2 + i * W * 0.2, H);
    ctx.stroke();
  }
  for (let k = 1; k <= 9; k++) {
    const y = horizon + (H - horizon) * (k / 9) ** 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();
};

const wave = (ctx: Ctx, W: number, H: number, base: number, amp: number, phase: number, color: string, alpha: number) => {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += W / 80) ctx.lineTo(x, H * base + Math.sin((x / W) * Math.PI * 2 + phase) * amp * H);
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

/** A shaded 3D-looking sphere resting on the floor line, with its own contact shadow. */
const sphere = (ctx: Ctx, W: number, H: number, x: number, floorY: number, r: number, color: string) => {
  const R = r * W;
  const cx = x * W;
  const cy = floorY * H - R;
  ctx.save();
  ctx.translate(cx, floorY * H);
  ctx.scale(1, 0.22);
  const sh = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.3);
  sh.addColorStop(0, 'rgba(0,0,0,0.38)');
  sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.arc(0, 0, R * 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.05, cx, cy, R);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.18, color);
  g.addColorStop(1, color + 'cc');
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();
  const edge = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R);
  edge.addColorStop(0, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = edge;
  ctx.fill();
  ctx.restore();
};

/** A round podium whose top surface is at y. */
const podium = (ctx: Ctx, W: number, H: number, x: number, y: number, widthFrac: number, light: string, dark: string) => {
  const rx = (widthFrac * W) / 2;
  const ry = rx * 0.2;
  const hgt = H * 0.07;
  const cx = x * W;
  const cy = y * H;
  ctx.save();
  ctx.translate(cx, cy + hgt);
  ctx.scale(1, 0.22);
  const sh = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * 1.35);
  sh.addColorStop(0, 'rgba(0,0,0,0.3)');
  sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.arc(0, 0, rx * 1.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const side = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
  side.addColorStop(0, light);
  side.addColorStop(0.45, light);
  side.addColorStop(1, dark);
  ctx.fillStyle = side;
  ctx.beginPath();
  ctx.moveTo(cx - rx, cy);
  ctx.lineTo(cx - rx, cy + hgt);
  ctx.ellipse(cx, cy + hgt, rx, ry, 0, Math.PI, 0, true);
  ctx.lineTo(cx + rx, cy);
  ctx.closePath();
  ctx.fill();
  const top = ctx.createLinearGradient(cx - rx, cy, cx + rx, cy);
  top.addColorStop(0, '#ffffff');
  top.addColorStop(1, light);
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
};

/** Fraction-based spotlight behind the device. */
const spot = (ctx: Ctx, W: number, H: number, alpha: number, color = '#ffffff', fx = 0.5, fy = 0.48) => blob(ctx, W, H, fx, fy, 0.55, color, alpha);

export function paintScene(ctx: Ctx, W: number, H: number, id: SceneId, focus: Focus = DEFAULT_FOCUS) {
  // Props stand just outside the device so they never overlap it.
  const left = Math.max(0.09, focus.cx - focus.w / 2 - 0.07);
  const right = Math.min(0.91, focus.cx + focus.w / 2 + 0.07);
  ctx.save();
  switch (id) {
    case 'podium-peach': {
      const floor = Math.min(0.92, focus.bottom);
      lerpGradient(ctx, W, H, 180, [[0, '#FCEFE6'], [1, '#F3D8C8']]);
      blob(ctx, W, H, 0.1, 0.05, 0.7, '#FFFFFF', 0.8);
      disc(ctx, W, H, focus.cx, focus.cy - 0.02, 0.3, '#FFFFFF', '#FBE3D5', 0.6);
      beam(ctx, W, H, 0.04, 0.18, 0.22, 0.14);
      const fy = floor * H;
      const fg = ctx.createLinearGradient(0, fy, 0, H);
      fg.addColorStop(0, '#EDD0BD');
      fg.addColorStop(1, '#D8B09A');
      ctx.fillStyle = fg;
      ctx.fillRect(0, fy, W, H - fy);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(0, fy - 1, W, 2);
      podium(ctx, W, H, focus.cx, floor, Math.max(0.3, focus.w * 0.7), '#F8E7DB', '#D2A790');
      sphere(ctx, W, H, left, floor + 0.05, 0.045, '#E86A5B');
      break;
    }
    case 'arch-sage': {
      const floor = Math.min(0.92, focus.bottom);
      lerpGradient(ctx, W, H, 180, [[0, '#E6EFE5'], [1, '#CDDECB']]);
      const aw = Math.min(0.92, focus.w * 1.45) * W;
      const ah = Math.min(0.98, focus.h * 1.12) * H;
      const ax = focus.cx * W - aw / 2;
      const ay = floor * H - ah;
      ctx.save();
      ctx.shadowColor = 'rgba(40,70,45,0.25)';
      ctx.shadowBlur = W * 0.04;
      ctx.shadowOffsetY = H * 0.01;
      const ag = ctx.createLinearGradient(0, ay, 0, floor * H);
      ag.addColorStop(0, '#F8FBF7');
      ag.addColorStop(1, '#E3EEE1');
      ctx.fillStyle = ag;
      ctx.beginPath();
      ctx.moveTo(ax, floor * H);
      ctx.lineTo(ax, ay + aw / 2);
      ctx.arc(ax + aw / 2, ay + aw / 2, aw / 2, Math.PI, 0);
      ctx.lineTo(ax + aw, floor * H);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      const fy = floor * H;
      const fg = ctx.createLinearGradient(0, fy, 0, H);
      fg.addColorStop(0, '#BCD2BA');
      fg.addColorStop(1, '#A4BEA2');
      ctx.fillStyle = fg;
      ctx.fillRect(0, fy, W, H - fy);
      blob(ctx, W, H, focus.cx, floor, 0.35, '#2F5D3A', 0.18);
      sphere(ctx, W, H, left, floor + 0.03, 0.055, '#F0B49E');
      sphere(ctx, W, H, right, floor + 0.04, 0.04, '#FFFFFF');
      break;
    }
    case 'sphere-lab': {
      const floor = Math.min(0.92, focus.bottom);
      lerpGradient(ctx, W, H, 180, [[0, '#FFFFFF'], [1, '#E4E9F3']]);
      blob(ctx, W, H, focus.cx, focus.cy, 0.5, '#CFD9FF', 0.55);
      ring(ctx, W, H, focus.cx, focus.cy, Math.max(0.22, focus.w * 0.62), 0.006, '#FFFFFF', 0.9);
      const fy = floor * H;
      const fg = ctx.createLinearGradient(0, fy, 0, H);
      fg.addColorStop(0, '#F4F6FB');
      fg.addColorStop(1, '#D9DFEC');
      ctx.fillStyle = fg;
      ctx.fillRect(0, fy, W, H - fy);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(0, fy - 1, W, 2);
      sphere(ctx, W, H, left, floor + 0.04, 0.06, '#FF4D5A');
      sphere(ctx, W, H, right, floor + 0.05, 0.05, '#2B3BFF');
      sphere(ctx, W, H, Math.max(0.12, right - 0.09), floor + 0.015, 0.026, '#FFD84A');
      break;
    }
    case 'crimson-burst':
      lerpGradient(ctx, W, H, 160, [[0, '#FF4D5A'], [0.55, '#D4102A'], [1, '#6B0220']]);
      blob(ctx, W, H, 0.1, 0.05, 0.7, '#FF9A5B', 0.85);
      blob(ctx, W, H, 0.95, 0.95, 0.75, '#C2185B', 0.8);
      blob(ctx, W, H, 0.95, 0.1, 0.4, '#FFD2A0', 0.35);
      [0.2, 0.3, 0.4, 0.52].forEach((r, i) => ring(ctx, W, H, focus.cx, focus.cy, r, 0.006, '#ffffff', 0.2 - i * 0.03));
      spot(ctx, W, H, 0.3, '#ffffff', focus.cx, focus.cy);
      break;
    case 'electric-blue':
      lerpGradient(ctx, W, H, 155, [[0, '#2B3BFF'], [0.6, '#1220C8'], [1, '#080C58']]);
      blob(ctx, W, H, 0.9, 0.08, 0.6, '#35D0FF', 0.7);
      blob(ctx, W, H, 0.05, 0.95, 0.65, '#8A3DFF', 0.7);
      beam(ctx, W, H, 0.18, 0.3, 0.12, 0.1);
      beam(ctx, W, H, 0.62, 0.8, 0.14, 0.08);
      dots(ctx, W, H, '#ffffff', 0.18);
      spot(ctx, W, H, 0.25, '#9AB4FF', focus.cx, focus.cy);
      break;
    case 'sunset-pop':
      lerpGradient(ctx, W, H, 180, [[0, '#FFB347'], [0.45, '#FF4F7B'], [1, '#5B2BD9']]);
      disc(ctx, W, H, 0.5, 0.42, 0.26, '#FFF3B0', '#FF8E53', 0.95);
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.1 + i * 0.03})`;
        ctx.fillRect(0, H * (0.58 + i * 0.045), W, H * 0.012);
      }
      blob(ctx, W, H, 0.1, 0.9, 0.6, '#FF2D95', 0.6);
      break;
    case 'aurora':
      lerpGradient(ctx, W, H, 180, [[0, '#031B26'], [1, '#07071C']]);
      blob(ctx, W, H, 0.2, 0.25, 0.65, '#19F0B1', 0.7, 'screen');
      blob(ctx, W, H, 0.85, 0.3, 0.6, '#7B5CFF', 0.75, 'screen');
      blob(ctx, W, H, 0.55, 0.85, 0.7, '#1AA7FF', 0.6, 'screen');
      blob(ctx, W, H, 0.4, 0.5, 0.35, '#FFFFFF', 0.12, 'screen');
      dots(ctx, W, H, '#ffffff', 0.1);
      break;
    case 'mint-studio':
      lerpGradient(ctx, W, H, 170, [[0, '#E9FFF4'], [1, '#B8EBD3']]);
      blob(ctx, W, H, 0.9, 0.1, 0.5, '#FFD9C2', 0.8);
      disc(ctx, W, H, 0.5, 0.52, 0.34, '#FFFFFF', '#E6FBF1', 0.95);
      ring(ctx, W, H, focus.cx, focus.cy, 0.38, 0.004, '#FFFFFF', 0.9);
      blob(ctx, W, H, 0.5, 1.02, 0.6, '#2FA67A', 0.18);
      break;
    case 'neon-night':
      lerpGradient(ctx, W, H, 180, [[0, '#0B0820'], [1, '#14052E']]);
      blob(ctx, W, H, 0.05, 0.4, 0.6, '#FF2DAA', 0.7, 'screen');
      blob(ctx, W, H, 0.95, 0.45, 0.6, '#22E1FF', 0.6, 'screen');
      floorGrid(ctx, W, H, '#22E1FF', 0.35);
      ring(ctx, W, H, focus.cx, focus.cy, 0.3, 0.004, '#FF2DAA', 0.45);
      ring(ctx, W, H, focus.cx, focus.cy, 0.36, 0.003, '#22E1FF', 0.35);
      break;
    case 'candy':
      lerpGradient(ctx, W, H, 150, [[0, '#FFE1EF'], [1, '#FFD1BF']]);
      blob(ctx, W, H, 0.15, 0.2, 0.55, '#C9B6FF', 0.9);
      blob(ctx, W, H, 0.9, 0.35, 0.5, '#AEE3FF', 0.85);
      blob(ctx, W, H, 0.6, 0.95, 0.6, '#FFB3C9', 0.8);
      disc(ctx, W, H, 0.82, 0.12, 0.09, '#FFFFFF', '#FFE8F2', 0.8);
      disc(ctx, W, H, 0.12, 0.78, 0.12, '#FFFFFF', '#E8DEFF', 0.7);
      break;
    case 'gold-hour':
      lerpGradient(ctx, W, H, 165, [[0, '#FFF0A8'], [0.5, '#FFB347'], [1, '#FF6A3D']]);
      [0.16, 0.26, 0.38, 0.5].forEach((r, i) => ring(ctx, W, H, focus.cx, focus.cy, r, 0.008, '#FFFFFF', 0.4 - i * 0.07));
      blob(ctx, W, H, 0.05, 0.95, 0.6, '#FF3D6A', 0.55);
      blob(ctx, W, H, 0.95, 0.05, 0.5, '#FFFFFF', 0.55);
      break;
    case 'ocean-wave':
      lerpGradient(ctx, W, H, 180, [[0, '#7BE7FF'], [0.55, '#1D7BFF'], [1, '#0A2A8C']]);
      disc(ctx, W, H, 0.78, 0.18, 0.1, '#FFFFFF', '#CFF5FF', 0.9);
      wave(ctx, W, H, 0.72, 0.04, 0, '#0B3FC9', 0.55);
      wave(ctx, W, H, 0.8, 0.045, 1.6, '#0A2A8C', 0.65);
      wave(ctx, W, H, 0.9, 0.04, 3.1, '#061B66', 0.75);
      break;
    case 'lavender-glass':
      lerpGradient(ctx, W, H, 160, [[0, '#F1ECFF'], [1, '#D6E4FF']]);
      blob(ctx, W, H, 0.15, 0.15, 0.6, '#FF8FD8', 0.7);
      blob(ctx, W, H, 0.9, 0.55, 0.6, '#6E8BFF', 0.7);
      blob(ctx, W, H, 0.35, 0.95, 0.5, '#B58CFF', 0.7);
      ring(ctx, W, H, focus.cx, focus.cy, 0.32, 0.012, '#FFFFFF', 0.55);
      ring(ctx, W, H, focus.cx, focus.cy, 0.42, 0.006, '#FFFFFF', 0.4);
      break;
  }
  ctx.restore();
  paintGrain(ctx, W, H);
}

let noiseTile: HTMLCanvasElement | null = null;

/** Deterministic grain tile (a seeded generator, so exports are reproducible). */
function grainTile() {
  if (noiseTile) return noiseTile;
  const c = document.createElement('canvas');
  c.width = c.height = 200;
  const x = c.getContext('2d')!;
  const img = x.createImageData(200, 200);
  let s = 123456789;
  for (let i = 0; i < img.data.length; i += 4) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const v = (s >>> 24) & 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  noiseTile = c;
  return c;
}

export function paintGrain(ctx: Ctx, W: number, H: number, strength = 0.16) {
  const pattern = ctx.createPattern(grainTile(), 'repeat');
  if (!pattern) return;
  ctx.save();
  // Keep the grain the same visual size at every export scale.
  const k = Math.max(1, W / 1400);
  pattern.setTransform(new DOMMatrix().scale(k));
  ctx.globalAlpha = strength;
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
