import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

/** A recognisable 600x1300 "design": blue top half, green bottom half. */
async function samplePng(page: Page) {
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 600;
    c.height = 1300;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#0066ff';
    ctx.fillRect(0, 0, 600, 650);
    ctx.fillStyle = '#00aa44';
    ctx.fillRect(0, 650, 600, 650);
    return c.toDataURL('image/png').split(',')[1];
  });
  return Buffer.from(b64, 'base64');
}

/** Reads a pixel from the preview canvas at fractional coordinates. */
const pixel = (page: Page, fx: number, fy: number) =>
  page.locator('canvas[role="img"]').evaluate((c: HTMLCanvasElement, [x, y]) => {
    const d = c.getContext('2d')!.getImageData(Math.round(c.width * x), Math.round(c.height * y), 1, 1).data;
    return [d[0], d[1], d[2], d[3]];
  }, [fx, fy]);

test('choose a mockup, upload, preview and download', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('mockup');
  // 28 built-in mockups, plus any the owner imported into public/my-mockups.
  await expect.poll(() => page.locator('#library li').count()).toBeGreaterThanOrEqual(28);

  await page.locator('#library').getByRole('button', { name: /^Phones/ }).click();
  await expect.poll(() => page.locator('#library li').count()).toBeGreaterThanOrEqual(10);
  await page.getByLabel('Search mockups').fill('tilted');
  await expect(page.locator('#library li')).toHaveCount(2);
  await page.getByLabel('Search mockups').fill('zzzz');
  await expect(page.getByText('No mockups match')).toBeVisible();
  await page.getByRole('button', { name: /Clear search/ }).click();

  await page.getByRole('link', { name: 'Use Phone · Island · Midnight' }).click();
  await expect(page).toHaveURL(/editor\/phone-island-midnight/);
  await expect(page.getByRole('button', { name: 'Download' })).toBeDisabled();

  await page.locator('#design-file').setInputFiles({ name: 'design.png', mimeType: 'image/png', buffer: await samplePng(page) });
  await expect(page.getByText('design.png')).toBeVisible();
  await expect(page.getByText('not saved')).toBeVisible();

  // Upper screen area shows blue, lower area shows green.
  await expect.poll(async () => (await pixel(page, 0.5, 0.35))[2]).toBeGreaterThan(200);
  expect((await pixel(page, 0.5, 0.7))[1]).toBeGreaterThan(130);
  await page.screenshot({ path: 'e2e/screenshot-editor.png' });

  await page.getByRole('button', { name: 'Download' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download PNG' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('mockup-phone-island-midnight-2x.png');
  const file = await download.path();
  const png = readFileSync(file);
  expect(png.subarray(1, 4).toString()).toBe('PNG');
  expect(png.readUInt32BE(16)).toBeGreaterThan(2000); // 2x of a ~1064px-wide canvas
});

test('rejects unsupported files and keeps the uploaded design when switching mockups', async ({ page }) => {
  await page.goto('/editor/laptop-silver');
  await page.locator('#design-file').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hi') });
  await expect(page.getByRole('alert')).toContainText('PNG, JPG or WebP');

  await page.locator('#design-file').setInputFiles({ name: 'ok.png', mimeType: 'image/png', buffer: await samplePng(page) });
  await expect(page.getByText('ok.png')).toBeVisible();
  await page.getByRole('link', { name: 'Laptop · Tilted' }).click();
  await expect(page).toHaveURL(/laptop-tilt-silver/);
  await expect(page.getByText('ok.png')).toBeVisible();
  await expect.poll(async () => (await pixel(page, 0.5, 0.3))[3]).toBe(255);
  await page.screenshot({ path: 'e2e/screenshot-tilted.png' });

  await page.getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByText('ok.png')).toHaveCount(0);
});

test('works on a phone-sized screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.screenshot({ path: 'e2e/screenshot-home-mobile.png' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

test.describe('accessibility', () => {
  for (const path of ['/', '/editor/phone-island-red', '/license']) {
    test(`no serious axe violations on ${path}`, async ({ page }) => {
      const { default: AxeBuilder } = await import('@axe-core/playwright');
      await page.goto(path);
      await page.waitForTimeout(400);
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
      const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`)).toEqual([]);
    });
  }
});
