import { expect, test, type Page } from '@playwright/test';

/** A fake "photo": grey scene with a red placeholder screen at 30-70% x, 20-80% y. */
async function photoPng(page: Page) {
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 1000;
    c.height = 800;
    const x = c.getContext('2d')!;
    x.fillStyle = '#888888';
    x.fillRect(0, 0, 1000, 800);
    x.fillStyle = '#ff0000';
    x.fillRect(300, 160, 400, 480);
    return c.toDataURL('image/png').split(',')[1];
  });
  return Buffer.from(b64, 'base64');
}

const designPng = (page: Page) =>
  page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 400;
    c.height = 500;
    const x = c.getContext('2d')!;
    x.fillStyle = '#0066ff';
    x.fillRect(0, 0, 400, 500);
    return c.toDataURL('image/png').split(',')[1];
  }).then((b) => Buffer.from(b, 'base64'));

const pixel = (page: Page, fx: number, fy: number) =>
  page.locator('canvas[role="img"]').evaluate((c: HTMLCanvasElement, [x, y]) => {
    const d = c.getContext('2d')!.getImageData(Math.round(c.width * x), Math.round(c.height * y), 1, 1).data;
    return [d[0], d[1], d[2]];
  }, [fx, fy]);

test('add my own photo mockup, keep it after reload, and use it', async ({ page }) => {
  await page.goto('/my-mockups');
  await page.locator('#mm-files').setInputFiles({ name: 'free-macbook-test.png', mimeType: 'image/png', buffer: await photoPng(page) });

  await expect(page.getByLabel('Name')).toHaveValue('free macbook test');
  await expect(page.getByLabel('Category')).toHaveValue('laptops'); // guessed from the file name
  await page.getByRole('button', { name: 'Save mockup' }).click();
  await expect(page.getByRole('status')).toContainText('Saved');
  await expect(page.getByText('Saved (1)')).toBeVisible();

  // Survives a reload (stored in this browser), and shows under My mockups on the home page.
  await page.reload();
  await expect(page.getByText('Saved (1)')).toBeVisible();
  await page.goto('/');
  await page.locator('#library').getByRole('button', { name: /^My mockups/ }).click();
  await expect(page.getByRole('link', { name: 'Use free macbook test' })).toBeVisible();
  await page.getByRole('link', { name: 'Use free macbook test' }).click();

  await page.locator('#design-file').setInputFiles({ name: 'd.png', mimeType: 'image/png', buffer: await designPng(page) });
  await expect.poll(async () => (await pixel(page, 0.5, 0.5))[2]).toBeGreaterThan(200); // design inside the screen
  expect((await pixel(page, 0.5, 0.5))[0]).toBeLessThan(60); // not the red placeholder
  expect((await pixel(page, 0.05, 0.05))[0]).toBeGreaterThan(100); // scene outside the screen is kept
  expect((await pixel(page, 0.05, 0.05))[2]).toBeLessThan(160);
  await page.screenshot({ path: 'e2e/screenshot-custom.png' });

  // Delete it again.
  await page.goto('/my-mockups');
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Nothing saved yet.')).toBeVisible();
});
