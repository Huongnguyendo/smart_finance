import { test, expect } from '@playwright/test';
import { ensureAuthScreen, signUp } from '../helpers/auth';

/**
 * Smoke-test every major route: page loads and shows expected shell (no blank crash).
 * Run: cd e2e && npx playwright test tests/screens.spec.ts
 * Requires: app web on E2E_BASE_URL (default localhost:8081), API on E2E_API_URL if signing up.
 */

test.describe('Public routes', () => {
  test('splash', async ({ page }) => {
    await page.goto('/splash');
    await expect(page.getByText('SmartWallet AI')).toBeVisible({ timeout: 5000 });
  });

  test('onboarding', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('smartwallet_onboarded');
      localStorage.removeItem('smartwallet_token');
    });
    await page.goto('/onboarding');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByText('Welcome to SmartWallet AI')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /next|skip/i })).toBeVisible();
  });

  test('auth', async ({ page }) => {
    await ensureAuthScreen(page);
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByText(/sign in|sign up/i)).toBeVisible();
  });
});

test.describe('Authenticated routes', () => {
  test.beforeEach(async ({ page }) => {
    const email = `screens-${Date.now()}@example.com`;
    await ensureAuthScreen(page);
    await signUp(page, 'Screens User', email, 'secret123');
    await expect(page).toHaveURL(/\/(\(tabs\)\/)?home/, { timeout: 20000 });
  });

  test('home tab', async ({ page }) => {
    await page.goto('/(tabs)/home');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByText(/good evening|welcome|dashboard|home/i)).toBeVisible({ timeout: 10000 });
  });

  test('transactions tab', async ({ page }) => {
    await page.goto('/(tabs)/transactions');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByText(/transaction/i)).toBeVisible({ timeout: 10000 });
  });

  test('add tab', async ({ page }) => {
    await page.goto('/(tabs)/add');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByPlaceholder(/\$0\.00|Starbucks/i)).toBeVisible({ timeout: 10000 });
  });

  test('insights tab', async ({ page }) => {
    await page.goto('/(tabs)/insights');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByText(/insight|optimization|AI/i)).toBeVisible({ timeout: 10000 });
  });

  test('budgets tab', async ({ page }) => {
    await page.goto('/(tabs)/budgets');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByText(/budget|Overall Monthly/i)).toBeVisible({ timeout: 10000 });
  });

  test('profile tab', async ({ page }) => {
    await page.goto('/(tabs)/profile');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByText(/profile|account|sign out|log out|SmartWallet/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test('receipt-upload stack screen', async ({ page }) => {
    await page.goto('/receipt-upload');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByText('Receipt Upload')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Select Receipt')).toBeVisible();
  });

  test('chat stack screen', async ({ page }) => {
    await page.goto('/chat');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByText('Money coach', { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('goals stack screen', async ({ page }) => {
    await page.goto('/goals');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByText(/Savings Goals|Streaks|Badges/)).toBeVisible({ timeout: 10000 });
  });

  test('transaction detail (placeholder id)', async ({ page }) => {
    await page.goto('/transaction/999999999');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByText(/Loading|not found|Transaction|failed/i)).toBeVisible({
      timeout: 15000,
    });
  });
});
