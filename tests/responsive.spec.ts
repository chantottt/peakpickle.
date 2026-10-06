import { loginDemo } from './auth-helper';
import { expect, test } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await loginDemo(page);
});
const routes = [
  '/',
  '/dashboard',
  '/activity',
  '/activity?player=000000000000000000000066',
  '/courts',
  '/courts/0000000000000000000000c8',
  '/reservations',
  '/reservations/new',
  '/reservations/00000000000000000000012c/edit',
  '/queue',
  '/players',
  '/players/000000000000000000000064',
  '/matchmaking',
  '/matches',
  '/matches/000000000000000000000190',
  '/rankings',
  '/statistics',
];
for (const width of [1440, 1280, 1024, 768, 375]) {
  test(`all routes render without page overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.getByLabel('Loading page').first()).toBeHidden();
      await expect(page.locator('.error-state')).toHaveCount(0);
      const dimensions = await page.evaluate(() => ({
        viewport: innerWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(dimensions.content, `${route} overflow at ${width}px`).toBeLessThanOrEqual(
        dimensions.viewport,
      );
    }
  });
}
test('reservation fields show validation and court availability updates', async ({ page }) => {
  await page.goto('/reservations/new');
  await expect(page.getByRole('button', { name: 'Create Reservation' })).toBeEnabled();
  await page.getByRole('button', { name: 'Create Reservation' }).click();
  await expect(page.getByText('Please make a selection.')).toHaveCount(2);
  await page.getByLabel('Start Time', { exact: true }).fill('17:00');
  await page.getByLabel('End Time', { exact: true }).fill('18:00');
  await expect(page.getByText('No courts are available. Try another time.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create Reservation' })).toBeDisabled();
});
test('mobile navigation drawer opens and routes correctly', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 850 });
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Application' })).toBeInViewport();
  await page
    .getByRole('navigation', { name: 'Application' })
    .getByRole('link', { name: 'Courts', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Courts', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open navigation', exact: true })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
});
