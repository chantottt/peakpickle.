import { expect, test } from '@playwright/test';

test('activity selection filters bookings and queue, and survives reload', async ({ page }) => {
  await page.goto('/activity');
  await expect(page.getByText('Choose your player profile')).toBeVisible();
  await page.getByLabel('Player', { exact: true }).selectOption('000000000000000000000066');
  const queue = page.getByRole('region', { name: 'My queue', exact: true });
  await expect(queue.getByText(/waited/)).toBeVisible();
  await expect(queue.getByRole('link', { name: 'View queue' })).toHaveAttribute(
    'href',
    '/queue?court=0000000000000000000000c8',
  );
  await expect(
    page
      .getByRole('region', { name: 'My reservations' })
      .getByRole('link', { name: 'View booking' })
      .first(),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Player', { exact: true })).toHaveValue('000000000000000000000066');
  await page.getByLabel('Player', { exact: true }).selectOption('000000000000000000000077');
  await expect(queue.getByText('You’re not in a queue')).toBeVisible();
});

test('queue shows elapsed wait and both play types; new matches default to doubles', async ({
  page,
}) => {
  await page.goto('/queue');
  await expect(page.getByLabel('Queue play type')).toHaveValue('doubles');
  await expect(page.getByText(/\d+ min waited/).first()).toBeVisible();
  await page.getByLabel('Queue play type').selectOption('singles');
  await expect(page.getByText('Singles: one player on each side.')).toBeVisible();
  await page.goto('/matches');
  await page.getByRole('button', { name: 'New Match', exact: true }).first().click();
  await expect(page.getByLabel('Play type', { exact: true })).toHaveValue('doubles');
  await expect(page.getByLabel('Team B · Player 4', { exact: true })).toBeVisible();
  await page.getByLabel('Play type', { exact: true }).selectOption('singles');
  await expect(page.getByLabel('Player A', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Team B · Player 4', { exact: true })).toHaveCount(0);
});
