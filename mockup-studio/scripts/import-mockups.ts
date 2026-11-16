/**
 * Imports mockup PSDs from a folder of archives (zip / rar / 7z) into public/my-mockups/.
 *
 * For every PSD it writes a flat JPG of the scene, a thumbnail, optionally a transparent overlay (camera
 * notch / island that sits above the screen), and reads the screen position from the PSD's smart object, so
 * nothing needs to be marked by hand. Results go to public/my-mockups/manifest.json, plus import-report.json.
 *
 * Usage: tsx scripts/import-mockups.ts <archives-dir> <work-dir> <path-to-7zz> [--only substring]
 *
 * Extracted archives are untrusted data: each one is unpacked into its own empty folder under <work-dir>,
 * only read (never executed), and deleted again afterwards.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { initializeCanvas, readPsd, type Layer, type Psd } from 'ag-psd';
import sharp from 'sharp';
import type { Mockup, Quad } from '../src/types';
import { compositeLayers, to8bit } from './psd-composite';
import { guessCategory, isConvex, quadSize } from '../src/render/quad';

const [, , SRC, WORK, SEVENZIP, ...rest] = process.argv;
if (!SRC || !WORK || !SEVENZIP) {
  console.error('Usage: tsx scripts/import-mockups.ts <archives-dir> <work-dir> <7zz> [--only text]');
  process.exit(1);
}
const only = rest[0] === '--only' ? rest[1]?.toLowerCase() : undefined;
const OUT = join(import.meta.dirname, '..', 'public', 'my-mockups');
const MAX_SIDE = 2400;

const imageData = (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
initializeCanvas(
  ((w: number, h: number) => ({ width: w, height: h, getContext: () => ({ createImageData: imageData }) })) as never,
  imageData as never,
);

// --- Helpers ----------------------------------------------------------------

const SCREEN_NAME = /screen|display|design|insert|place|replace|content|your|image|app\b|ui\b|website|site|artwork|smart|photo|mobile|phone|laptop|monitor|desktop/i;
const NOT_SCREEN = /shadow|reflect|glare|background|\bbg\b|texture|logo|brand|camera|notch|island|mask|overlay|frame|shell|case|body|light|wall|floor|table|hand|finger|watermark|goodmockups|mockup\.?com/i;
const OVERLAY_NAME = /notch|island|camera|cutout|punch|speaker|sensor|status|bezel/i;

const slug = (s: string) =>
  s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'mockup';

function cleanName(file: string) {
  let n = basename(file, extname(file));
  n = n.replace(/\.psd$/i, '').replace(/[-_]+/g, ' ').replace(/\(\d+\)/g, '').replace(/\bby spin\b/i, '');
  n = n.replace(/\bfree\b/gi, '').replace(/\bmockups?\b/gi, '').replace(/\bpsd( file)?\b/gi, '').replace(/\s+/g, ' ').trim();
  n = n.replace(/\b\w/g, (c) => c.toUpperCase());
  return (n || 'Device') + ' Mockup';
}

function listFiles(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== '__MACOSX') listFiles(p, out);
    } else if (!e.name.startsWith('._')) out.push(p);
  }
  return out;
}

interface Smart {
  layer: Layer;
  name: string;
  quad: Quad;
  pw: number;
  ph: number;
  hidden: boolean;
  order: number;
}

interface Flat {
  layer: Layer;
  hidden: boolean;
  order: number;
}

/** Layers in bottom-to-top paint order with inherited visibility. */
function flatten(layers: Layer[] | undefined, parentHidden = false, acc: Flat[] = []): Flat[] {
  for (const l of layers ?? []) {
    const hidden = parentHidden || !!l.hidden;
    if (l.children?.length) flatten(l.children, hidden, acc);
    else acc.push({ layer: l, hidden, order: acc.length });
  }
  return acc;
}

const area = (q: Quad) => Math.abs(q.reduce((s, p, i) => s + p[0] * q[(i + 1) % 4][1] - q[(i + 1) % 4][0] * p[1], 0)) / 2;

function smartObjects(flat: Flat[], docW: number, docH: number): Smart[] {
  const out: Smart[] = [];
  for (const { layer, hidden, order } of flat) {
    // A perspective-warped smart object keeps its true corners in nonAffineTransform.
    const t = layer.placedLayer?.nonAffineTransform?.length === 8 ? layer.placedLayer.nonAffineTransform : layer.placedLayer?.transform;
    if (!t || t.length < 8) continue;
    const quad = [[t[0], t[1]], [t[2], t[3]], [t[4], t[5]], [t[6], t[7]]] as Quad;
    // Ignore tiny layers, and full-bleed ones (those are the background photo, not a device screen).
    if (!isConvex(quad) || area(quad) < docW * docH * 0.004 || area(quad) > docW * docH * 0.8) continue;
    out.push({
      layer,
      name: layer.name ?? '',
      quad,
      pw: layer.placedLayer?.width ?? 0,
      ph: layer.placedLayer?.height ?? 0,
      hidden,
      order,
    });
  }
  return out;
}

/** Normal-blend layers drawn above the screen that must stay in front of the design (notch, island...). */
function buildOverlay(flat: Flat[], screenOrder: number, docW: number, docH: number): Buffer | null {
  const picked = flat.filter(
    (f) =>
      f.order > screenOrder &&
      !f.hidden &&
      OVERLAY_NAME.test(f.layer.name ?? '') &&
      !f.layer.clipping &&
      (!f.layer.blendMode || f.layer.blendMode === 'normal') &&
      f.layer.imageData,
  );
  if (!picked.length) return null;
  const dst = new Uint8ClampedArray(docW * docH * 4);
  for (const { layer } of picked) {
    const img = layer.imageData!;
    const src = to8bit(img);
    const opacity = (layer.opacity ?? 1) * (layer.fillOpacity ?? 1);
    const left = layer.left ?? 0;
    const top = layer.top ?? 0;
    for (let y = 0; y < img.height; y++) {
      const dy = y + top;
      if (dy < 0 || dy >= docH) continue;
      for (let x = 0; x < img.width; x++) {
        const dx = x + left;
        if (dx < 0 || dx >= docW) continue;
        const s = (y * img.width + x) * 4;
        const a = (src[s + 3] / 255) * opacity;
        if (a <= 0) continue;
        const d = (dy * docW + dx) * 4;
        const da = dst[d + 3] / 255;
        const oa = a + da * (1 - a);
        for (let c = 0; c < 3; c++) dst[d + c] = (src[s + c] * a + dst[d + c] * da * (1 - a)) / oa;
        dst[d + 3] = oa * 255;
      }
    }
  }
  // Nothing visible drawn (all transparent)?
  let any = false;
  for (let i = 3; i < dst.length && !any; i += 4) any = dst[i] > 8;
  return any ? Buffer.from(dst.buffer) : null;
}

/**
 * Imports whose device art could not be rebuilt (it lives in layer types the compositor can't draw), so the
 * design would float on a blank page. Checked by eye; left out of the gallery.
 */
const REJECTED = new Set(["my-7-mockup", "my-device-mockup-2", "my-device-mockup-4", "my-device-mockup-5", "my-device-mockup", "my-floating-macbookpro-mockup", "my-iphone-x-in-hand-mockup", "my-iphone-x-matte-mockup", "my-iphone-x-mockup", "my-macbook-pro-isometric-mockup", "my-iphone-mockup", "my-macbook-pro-workplace-photo-mockup", "my-reflection-iphone-x-mockup"]);

const DIFF_LIMIT = 14;
/** Promo / watermark layers that cover the scene until the user deletes them. */
const PROMO_LAYER = /g\s*o\s*o\s*d\s*m\s*o\s*c\s*k|created\s*by|download\s*more|more\s*free|visit|www\.|\.com\b|\.net\b|watermark|credit|delete|instruction|read\s*me|tutorial|mockups?-?\s*design|hide\s*this|remove\s*this|turn\s*off/i;

/** Mean absolute grey difference (0-255) between two RGBA images, compared at thumbnail size. */
async function meanDifference(a: Uint8ClampedArray, b: Uint8ClampedArray, W: number, H: number) {
  const grey = async (d: Uint8ClampedArray) =>
    sharp(Buffer.from(d.buffer, d.byteOffset, d.length), { raw: { width: W, height: H, channels: 4 } })
      .flatten({ background: '#ffffff' })
      .resize(160, 160, { fit: 'fill' })
      .greyscale()
      .raw()
      .toBuffer();
  const [x, y] = await Promise.all([grey(a), grey(b)]);
  let sum = 0;
  for (let i = 0; i < x.length; i++) sum += Math.abs(x[i] - y[i]);
  return sum / x.length;
}

/**
 * Opaque, mostly one-colour layers that cover the whole canvas above the screen are instruction covers
 * ("HIDE THIS LAYER"), not part of the scene.
 */
function coverLayers(flat: Flat[], aboveOrder: number, W: number, H: number): Set<Layer> {
  const out = new Set<Layer>();
  for (const f of flat) {
    const l = f.layer;
    const img = l.imageData;
    if (f.order <= aboveOrder || f.hidden || !img) continue;
    if ((l.blendMode && l.blendMode !== 'normal') || (l.opacity ?? 1) < 0.9) continue;
    if (img.width < W * 0.95 || img.height < H * 0.95) continue;
    const d = to8bit(img);
    const step = Math.max(1, Math.floor(d.length / 4 / 4000)) * 4;
    let n = 0;
    let alpha = 0;
    let same = 0;
    const r0 = d[0];
    const g0 = d[1];
    const b0 = d[2];
    for (let i = 0; i < d.length; i += step) {
      n++;
      alpha += d[i + 3];
      if (Math.abs(d[i] - r0) < 14 && Math.abs(d[i + 1] - g0) < 14 && Math.abs(d[i + 2] - b0) < 14) same++;
    }
    if (alpha / n >= 230 && same / n >= 0.7) out.add(l);
  }
  return out;
}

// --- Main -------------------------------------------------------------------

interface ReportEntry {
  archive: string;
  psd?: string;
  id?: string;
  status: 'ok' | 'review' | 'no-screen' | 'duplicate' | 'failed' | 'no-psd' | 'skipped';
  note?: string;
  screens?: number;
  overlay?: boolean;
  doc?: string;
  source?: 'composite' | 'layers';
  diff?: number;
  unsupported?: string;
}

mkdirSync(OUT, { recursive: true });
mkdirSync(WORK, { recursive: true });
const manifestPath = join(OUT, 'manifest.json');
const previous: Mockup[] = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')).mockups : [];
const mockups: Mockup[] = only ? previous : [];
const seenHashes = new Set<string>();
const usedIds = new Set(mockups.map((m) => m.id));
const report: ReportEntry[] = [];
const EXT_OK = new Set(['.zip', '.rar', '.7z']);

const archives = readdirSync(SRC)
  .filter((f) => EXT_OK.has(extname(f).toLowerCase()) && (!only || f.toLowerCase().includes(only)))
  .sort();
console.log(`Archives to process: ${archives.length}`);

for (const [ai, archive] of archives.entries()) {
  const tag = `[${ai + 1}/${archives.length}] ${archive}`;
  const dir = join(WORK, `a${ai}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir);
  try {
    execFileSync(SEVENZIP, ['x', '-y', '-bso0', '-bsp0', `-o${dir}`, join(SRC, archive)], { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (e) {
    const msg = (e as { stderr?: Buffer }).stderr?.toString().split('\n').find(Boolean) ?? 'extract failed';
    console.log(`${tag} FAILED to extract: ${msg}`);
    report.push({ archive, status: 'failed', note: `extract: ${msg}` });
    rmSync(dir, { recursive: true, force: true });
    continue;
  }

  const psds = listFiles(dir).filter((f) => extname(f).toLowerCase() === '.psd');
  if (!psds.length) {
    console.log(`${tag} no PSD inside`);
    report.push({ archive, status: 'no-psd', note: listFiles(dir).map((f) => extname(f)).slice(0, 6).join(',') });
    rmSync(dir, { recursive: true, force: true });
    continue;
  }

  for (const file of psds) {
    const entry: ReportEntry = { archive, psd: basename(file), status: 'failed' };
    report.push(entry);
    try {
      const buf = readFileSync(file);
      const hash = createHash('sha1').update(buf).digest('hex');
      if (seenHashes.has(hash)) {
        entry.status = 'duplicate';
        console.log(`${tag} duplicate of an earlier PSD`);
        continue;
      }
      seenHashes.add(hash);

      const psd: Psd = readPsd(buf, { skipThumbnail: true, useImageData: true, totalMemoryLimit: 10 * 1024 ** 3 } as Parameters<typeof readPsd>[1]);
      const W = psd.width;
      const H = psd.height;
      entry.doc = `${W}x${H}`;

      const flat = flatten(psd.children);
      const smarts = smartObjects(flat, W, H);
      const visible = smarts.filter((s) => !s.hidden);
      const pool = visible.length ? visible : smarts;
      let picks = pool.filter((s) => SCREEN_NAME.test(s.name) && !NOT_SCREEN.test(s.name));
      let status: ReportEntry['status'] = 'ok';
      if (!picks.length) {
        const unnamed = pool.filter((s) => !NOT_SCREEN.test(s.name));
        if (unnamed.length) {
          picks = unnamed;
          status = unnamed.length === 1 ? 'ok' : 'review';
        }
      }
      if (!picks.length) {
        entry.status = 'no-screen';
        entry.note = smarts.length ? `smart objects: ${smarts.map((s) => s.name).join(' | ')}` : 'no smart object found';
        console.log(`${tag} / ${basename(file)}: no screen found`);
        continue;
      }

      picks.sort((a, b) => area(b.quad) - area(a.quad));
      const main = picks[0];
      const aspect = (s: Smart) => (s.pw > 0 && s.ph > 0 ? s.pw / s.ph : quadSize(s.quad).w / quadSize(s.quad).h);
      const extras = picks.slice(1).filter((s) => Math.abs(aspect(s) / aspect(main) - 1) < 0.12 && area(s.quad) > area(main.quad) * 0.15);
      if (picks.length - 1 !== extras.length) {
        status = 'review';
        entry.note = `ignored other screens: ${picks.slice(1).filter((s) => !extras.includes(s)).map((s) => s.name).join(' | ')}`;
      }

      const scale = Math.min(1, MAX_SIDE / Math.max(W, H));
      const outW = Math.round(W * scale);
      const outH = Math.round(H * scale);
      const name = cleanName(entry.psd!);
      let id = `my-${slug(name)}`;
      for (let n = 2; usedIds.has(id); n++) id = `my-${slug(name)}-${n}`;
      usedIds.add(id);

      // Prefer the PSD's own flattened preview, but some PSDs store a promo card there, so compare it with a
      // composite rebuilt from the layers and switch to that when they disagree strongly.
      const covers = coverLayers(flat, main.order, W, H);
      const promo = covers.size > 0 || flat.some((f) => !f.hidden && PROMO_LAYER.test(f.layer.name ?? ''));
      const layered = compositeLayers(psd.children, W, H, (l) => covers.has(l) || PROMO_LAYER.test(l.name ?? ''));
      let pixels = layered.data;
      let source: 'composite' | 'layers' = 'layers';
      if (psd.imageData) {
        const real = to8bit(psd.imageData);
        entry.diff = Math.round(await meanDifference(real, layered.data, W, H) * 10) / 10;
        // The PSD's own preview is the most faithful picture, unless a promo layer is baked into it.
        if (!promo) {
          pixels = real;
          source = 'composite';
        }
      }
      entry.source = source;
      const un = layered.stats;
      if (source === 'layers' && (un.effects || un.skippedAdjustments || un.vectorMasks)) {
        entry.unsupported = `effects=${un.effects} adjustments=${un.skippedAdjustments} vectorMasks=${un.vectorMasks}`;
      }
      const base = sharp(Buffer.from(pixels.buffer, pixels.byteOffset, pixels.length), { raw: { width: W, height: H, channels: 4 } }).flatten({ background: '#ffffff' });
      await base.clone().resize(outW, outH).jpeg({ quality: 86, mozjpeg: true }).toFile(join(OUT, `${id}.jpg`));
      await base.clone().resize({ width: 520, height: 520, fit: 'inside' }).jpeg({ quality: 72 }).toFile(join(OUT, `${id}.thumb.jpg`));

      let overlay: string | undefined;
      const ov = buildOverlay(flat, main.order, W, H);
      if (ov) {
        await sharp(ov, { raw: { width: W, height: H, channels: 4 } }).resize(outW, outH).png({ compressionLevel: 9 }).toFile(join(OUT, `${id}.overlay.png`));
        overlay = `my-mockups/${id}.overlay.png`;
      }

      const sc = (q: Quad) => q.map(([x, y]) => [Math.round(x * scale * 10) / 10, Math.round(y * scale * 10) / 10]) as Quad;
      const qs = quadSize(sc(main.quad));
      const real = main.pw > 0 && main.ph > 0 && main.pw / main.ph > 0.15 && main.pw / main.ph < 7;
      const screenW = Math.round(qs.w);
      const screenH = Math.round(real ? (screenW * main.ph) / main.pw : qs.h);
      const category = guessCategory(`${archive} ${entry.psd}`);
      const radiusFactor = { phones: 0.13, tablets: 0.045, laptops: 0.008, desktops: 0.006 }[category];

      if (REJECTED.has(id)) {
        entry.status = 'skipped';
        entry.note = 'device art not renderable';
        for (const f of [`${id}.jpg`, `${id}.thumb.jpg`, `${id}.overlay.png`]) rmSync(join(OUT, f), { force: true });
        continue;
      }
      mockups.push({
        id,
        name,
        category,
        tags: ['mine', 'imported', ...name.toLowerCase().split(' ')],
        frame: `my-mockups/${id}.jpg`,
        thumbnail: `my-mockups/${id}.thumb.jpg`,
        canvas: { width: outW, height: outH },
        screen: {
          quad: sc(main.quad),
          width: screenW,
          height: screenH,
          radius: Math.round(screenW * radiusFactor),
          ...(extras.length ? { extra: extras.map((e) => sc(e.quad)) } : {}),
        },
        color: 'Photo',
        license: { type: 'personal', source: archive, author: 'unknown' },
        layer: 'under',
        custom: true,
        imported: true,
        ...(overlay ? { overlay } : {}),
      });

      Object.assign(entry, { id, status, screens: 1 + extras.length, overlay: !!overlay });
      console.log(`${tag} -> ${id} (${category}, ${1 + extras.length} screen${extras.length ? 's' : ''}${overlay ? ', overlay' : ''}${status === 'review' ? ', REVIEW' : ''})`);
    } catch (e) {
      entry.note = (e as Error).message.slice(0, 160);
      console.log(`${tag} / ${basename(file)}: FAILED ${entry.note}`);
    }
  }
  rmSync(dir, { recursive: true, force: true });
  // Save progress after every archive so a crash never loses finished work.
  writeFileSync(manifestPath, JSON.stringify({ version: 1, mockups }, null, 2) + '\n');
  writeFileSync(join(OUT, 'import-report.json'), JSON.stringify(report, null, 2) + '\n');
}

writeFileSync(manifestPath, JSON.stringify({ version: 1, mockups }, null, 2) + '\n');
writeFileSync(join(OUT, 'import-report.json'), JSON.stringify(report, null, 2) + '\n');
const count = (s: string) => report.filter((r) => r.status === s).length;
console.log(`\nDone. ok=${count('ok')} review=${count('review')} no-screen=${count('no-screen')} duplicate=${count('duplicate')} failed=${count('failed')} no-psd=${count('no-psd')}`);
console.log(`Total mockups in manifest: ${mockups.length}`);
