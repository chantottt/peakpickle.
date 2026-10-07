import { expect, test } from '@playwright/test';
import { loginDemo } from './auth-helper';
const apiBase = process.env.PEAKPICKLE_TEST_API_URL || 'http://127.0.0.1:5000/api';
const localFrontendBase = (
  process.env.PEAKPICKLE_TEST_FRONTEND_URL || 'http://127.0.0.1:5173'
).replace('127.0.0.1', 'localhost');
test('public landing renders sanitized courts and rankings without authentication', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('.court-card').first()).toBeVisible();
  await expect(page.locator('.error-state')).toHaveCount(0);
  await expect(
    page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Courts', exact: true }),
  ).toHaveAttribute('href', '/courts');
});
test('guest booking returns to the form after login and shows field errors', async ({ page }) => {
  await page.goto('/');
  await page.locator('.landing-navbar').getByRole('link', { name: 'Reserve Court' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email', { exact: true }).fill('invalid-email');
  await page.getByLabel('Password', { exact: true }).fill('short');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  await expect(page.getByText('Use at least 12 characters.')).toBeVisible();
  await page.getByRole('link', { name: 'Create an account' }).click();
  await expect(page.getByLabel('Name', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email', { exact: true }).fill('miguel.santos@peakpickle.demo');
  await page.getByLabel('Password', { exact: true }).fill('PeakPickleDemo!2026');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL(/\/reservations\/new$/);
  await expect(page.getByRole('heading', { name: 'New Court Reservation' })).toBeVisible();
});
test('admin login redirects, persists on refresh, and logout closes protected routes', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('admin@demo.local');
  await page.getByLabel('Password', { exact: true }).fill('PeakPickleDemo!2026');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await page.reload();
  await expect(page.locator('h1')).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Application' })
      .getByRole('link', { name: 'Players', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Account information' }).click();
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/admin/dashboard');
  await expect(page).toHaveURL(/\/login$/);
});
test('member dashboard restores own data and cannot open admin screens', async ({ page }) => {
  await loginDemo(page, 'miguel.santos@peakpickle.demo');
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/member\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Welcome, Miguel Santos' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Player statistics', exact: true })).toBeVisible();
  await expect(page.getByLabel('Player', { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome, Miguel Santos' })).toBeVisible();
  await page.goto('/admin/dashboard');
  await expect(page).toHaveURL(/\/member\/dashboard$/);
  await page.goto('/activity?player=000000000000000000000066');
  await expect(page.getByLabel('Player', { exact: true })).toHaveCount(0);
  await page.goto('/reservations/new?player=000000000000000000000066');
  await expect(page.getByLabel('Player', { exact: true })).toBeDisabled();
  await expect(page.getByLabel('Player', { exact: true })).toHaveValue('000000000000000000000064');
  await expect(page.getByLabel('Status', { exact: true })).toHaveValue('pending');
  await page.goto('/queue');
  await expect(page.getByRole('button', { name: 'Call Next', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Start Match', exact: true })).toHaveCount(0);
});
test('signup creates a member and bookings show only that member', async ({ page, request }) => {
  await page.goto('/signup');
  await page.getByLabel('Name', { exact: true }).fill('Browser Member');
  await page.getByLabel('Email', { exact: true }).fill(`browser-${Date.now()}@test.local`);
  await page.getByLabel('Password', { exact: true }).fill('BrowserPassword!2026');
  await page.getByRole('button', { name: 'Create member account' }).click();
  await expect(page).toHaveURL(/\/member\/dashboard$/);
  await page.goto('/reservations');
  await expect(page.getByRole('heading', { name: 'No reservations found' })).toBeVisible();
  await page.goto('/reservations/new');
  await page
    .getByLabel('Date', { exact: true })
    .fill(new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10));
  await expect(page.getByLabel('Available Court', { exact: true })).toBeEnabled();
  await page
    .getByLabel('Available Court', { exact: true })
    .selectOption('0000000000000000000000c8');
  await page.getByRole('button', { name: 'Create Reservation', exact: true }).click();
  await expect(page).toHaveURL(/\/reservations$/);
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('tbody tr')).toContainText('Browser Member');
  await expect(page.locator('tbody tr')).toContainText('Pending');
  await page.getByRole('link', { name: 'Edit reservation for Browser Member' }).click();
  await page.getByLabel('End Time', { exact: true }).fill('09:30');
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await expect(page).toHaveURL(/\/reservations$/);
  const booking = (await (await page.request.get(`${apiBase}/reservations`)).json())[0];
  const csrfToken = (await (await request.get(`${apiBase}/auth/csrf`)).json()).csrfToken;
  await request.post(`${apiBase}/auth/login`, {
    headers: { 'X-CSRF-Token': csrfToken },
    data: { email: 'admin@demo.local', password: 'PeakPickleDemo!2026' },
  });
  const confirmation = await request.patch(`${apiBase}/reservations/${booking._id}`, {
    headers: { 'X-CSRF-Token': csrfToken },
    data: { status: 'confirmed' },
  });
  expect(confirmation.ok()).toBeTruthy();
  await page.reload();
  await expect(page.locator('tbody tr')).toContainText('Confirmed');
  await page.getByRole('button', { name: 'Cancel reservation for Browser Member' }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Cancel booking', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('tbody tr')).toContainText('Cancelled');
  await page.goto('/queue');
  await page.getByRole('button', { name: 'Join Queue', exact: true }).first().click();
  await expect(page.getByLabel('Player', { exact: true })).toBeDisabled();
  await page.getByRole('dialog').getByRole('button', { name: 'Join Queue', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const ownRow = page.locator('tbody tr').filter({ hasText: 'Browser Member' });
  await ownRow.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(ownRow).toHaveCount(0);
  await page.goto('/courts');
  await expect(page.getByRole('button', { name: 'Add Court' })).toHaveCount(0);
  await page.goto('/matches');
  await expect(page.getByRole('button', { name: 'New Match' })).toHaveCount(0);
});
test('anonymous and expired sessions stay outside protected pages', async ({ page }) => {
  await page.goto('/member/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await page.context().addCookies([
    {
      name: 'pp_session',
      value: 'invalid.jwt.signature',
      domain: '127.0.0.1',
      path: '/api',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('.app-shell')).toHaveCount(0);
});
test('localhost uses matching cookie and API host', async ({ page }) => {
  await page.goto(`${localFrontendBase}/login`);
  await page.getByLabel('Email', { exact: true }).fill('admin@demo.local');
  await page.getByLabel('Password', { exact: true }).fill('PeakPickleDemo!2026');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL(`${localFrontendBase}/admin/dashboard`);
  await page.reload();
  await expect(page.locator('.app-shell')).toBeVisible();
});

test('session deadline clears protected screens without waiting for a page reload', async ({
  page,
}) => {
  await page.clock.install();
  await loginDemo(page, 'miguel.santos@peakpickle.demo');
  await page.goto('/member/dashboard');
  await expect(page.locator('.app-shell')).toBeVisible();
  await page.clock.fastForward(3601000);
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('.app-shell')).toHaveCount(0);
});
