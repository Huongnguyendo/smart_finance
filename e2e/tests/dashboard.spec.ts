import { test, expect } from '@playwright/test';
import { ensureAuthScreen, signUp } from '../helpers/auth';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    const uniqueEmail = `dash-${Date.now()}@example.com`;
    await ensureAuthScreen(page);
    await signUp(page, 'Dashboard User', uniqueEmail, 'secret123');
    await expect(page).toHaveURL(/\/(\(tabs\)\/)?home/, { timeout: 15000 });
  });

  test('shows dashboard after login', async ({ page }) => {
    await expect(page.getByText('Loading dashboard…')).not.toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/good evening/i)).toBeVisible({ timeout: 5000 });
  });

  test('load demo data and refresh', async ({ page }) => {
    await expect(page.getByText('Loading dashboard…')).not.toBeVisible({ timeout: 15000 });
    const loadDemo = page.getByText('Load demo data');
    await expect(loadDemo).toBeVisible({ timeout: 5000 });
    await loadDemo.click();
    await expect(page.getByText(/loaded|success|refreshing|demo data loaded/i)).toBeVisible({ timeout: 15000 });
  });
});
