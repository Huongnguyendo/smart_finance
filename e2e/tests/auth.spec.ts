import { test, expect } from '@playwright/test';
import { ensureAuthScreen, signUp, login } from '../helpers/auth';

const apiUrl = process.env.E2E_API_URL ?? 'http://localhost:8080';

test.describe.serial('Auth flow', () => {
  const uniqueEmail = `e2e-${Date.now()}@example.com`;

  test('register and redirect to home', async ({ page }) => {
    await ensureAuthScreen(page);
    await signUp(page, 'E2E User', uniqueEmail, 'secret123');

    await expect(page).toHaveURL(/\/(\(tabs\)\/)?home/, { timeout: 15000 });
    await expect(page.getByText(/good evening|welcome|dashboard/i)).toBeVisible({ timeout: 5000 });
  });

  test('login with existing user', async ({ page, request }) => {
    await request.post(`${apiUrl}/auth/register`, {
      data: { email: uniqueEmail, password: 'secret123', displayName: 'E2E User' },
    }).catch(() => {});

    await ensureAuthScreen(page);
    await login(page, uniqueEmail, 'secret123');

    await expect(page).toHaveURL(/\/(\(tabs\)\/)?home/, { timeout: 20000 });
  });

  test('login fails with wrong password', async ({ page }) => {
    await ensureAuthScreen(page);
    await login(page, uniqueEmail, 'wrongpassword');

    await expect(page.getByText(/failed|invalid|error/i)).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/auth/);
  });
});
