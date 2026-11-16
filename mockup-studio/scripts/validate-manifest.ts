/** Checks public/mockups/manifest.json: files exist, geometry is sane, licences are filled in. */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Manifest, Point } from '../src/types';

const PUBLIC = join(import.meta.dirname, '..', 'public');
const manifest: Manifest = JSON.parse(readFileSync(join(PUBLIC, 'mockups', 'manifest.json'), 'utf8'));
const errors: string[] = [];
const seen = new Set<string>();

const cross = (a: Point, b: Point, c: Point) => (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);

for (const m of manifest.mockups) {
  const fail = (msg: string) => errors.push(`${m.id}: ${msg}`);
  if (seen.has(m.id)) fail('duplicate id');
  seen.add(m.id);
  for (const f of [m.frame, m.thumbnail]) if (!existsSync(join(PUBLIC, f))) fail(`missing file ${f}`);
  const { quad } = m.screen;
  if (quad.some(([x, y]) => x < 0 || y < 0 || x > m.canvas.width || y > m.canvas.height)) fail('screen quad outside canvas');
  const signs = quad.map((_, i) => Math.sign(cross(quad[i], quad[(i + 1) % 4], quad[(i + 2) % 4])));
  if (!signs.every((s) => s === signs[0] && s !== 0)) fail('screen quad is not convex');
  if (m.screen.width <= 0 || m.screen.height <= 0) fail('screen size must be positive');
  if (!m.license?.type || !m.license.source || !m.license.author) fail('licence needs type, source and author');
  if (m.license.type !== 'original' && !m.license.url) fail('third-party assets need a licence url');
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`${manifest.mockups.length} mockups OK`);
