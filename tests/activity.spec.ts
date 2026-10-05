import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { calendarText } from '../client/src/utils/calendar';

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

test('reservation and match buttons download usable calendar files', async ({ page }) => {
  await page.goto('/activity?player=000000000000000000000066');
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('region', { name: 'My reservations' })
    .getByRole('button', { name: 'Add to calendar' })
    .first()
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.ics$/);
  const text = await readFile((await download.path())!, 'utf8');
  expect(text).toContain('BEGIN:VCALENDAR\r\n');
  expect(text).toContain('DTEND:');
  expect(text).toContain('SUMMARY:Pickleball reservation');
  await page.goto('/matches/0000000000000000000001cd');
  const matchDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Add to calendar' }).click();
  const matchText = await readFile((await (await matchDownload).path())!, 'utf8');
  expect(matchText).toContain('SUMMARY:Pickleball singles');
  expect(matchText).not.toContain('DTEND:');
});

test('calendar escapes text, folds UTF-8 lines, and converts Manila times to UTC', () => {
  const text = calendarText({
    id: 'test',
    title: 'Court, A; B\\C\nNext',
    start: '2026-10-05T06:00:00+08:00',
    end: '2026-10-05T07:00:00+08:00',
    location: 'é'.repeat(100),
    description: 'Booking',
  });
  expect(text).toContain('DTSTART:20261004T220000Z');
  expect(text).toContain('DTEND:20261004T230000Z');
  expect(text).toContain('SUMMARY:Court\\, A\\; B\\\\C\\nNext');
  for (const line of text.split('\r\n')) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
  expect(text.replace(/\r\n /g, '')).toContain(`LOCATION:${'é'.repeat(100)}`);
});
