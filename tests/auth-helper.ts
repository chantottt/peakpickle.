import type { Page } from '@playwright/test';
export async function loginDemo(page: Page, email = 'admin@demo.local') {
  const base = process.env.PEAKPICKLE_TEST_API_URL || 'http://127.0.0.1:5000/api';
  const csrf = await page.request.get(base + '/auth/csrf');
  const { csrfToken } = await csrf.json();
  const response = await page.request.post(base + '/auth/login', {
    headers: { 'X-CSRF-Token': csrfToken },
    data: { email, password: 'PeakPickleDemo!2026' },
  });
  if (!response.ok())
    throw new Error(
      `Demo login failed (${response.status()}). Start npm run demo with fresh temporary data.`,
    );
}
