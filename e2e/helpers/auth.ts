import { Page } from '@playwright/test';

/** Ensure we're on auth screen, handling splash (1.2s) and optional onboarding. */
export async function ensureAuthScreen(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('smartwallet_onboarded', 'true');
  });
  await page.goto('/auth');

  const onboarding = page.getByRole('button', { name: /skip|get started/i });
  if (await onboarding.isVisible().catch(() => false)) {
    await onboarding.click();
    await page.waitForURL(/\/auth/, { timeout: 5000 });
  }

  await page.getByTestId('auth-email-input').waitFor({ state: 'visible', timeout: 15000 });
}

/** Fill signup form and submit. Uses placeholder/text selectors for RN Web compatibility. */
export async function signUp(page: Page, name: string, email: string, password: string) {
  await page.getByTestId('auth-signup-toggle').click();
  await page.getByTestId('auth-name-input').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByTestId('auth-name-input').fill(name);
  await page.getByTestId('auth-email-input').fill(email);
  await page.getByTestId('auth-password-input').fill(password);
  await page.getByTestId('auth-submit').click();
}

/** Fill login form and submit. */
export async function login(page: Page, email: string, password: string) {
  await page.getByTestId('auth-email-input').fill(email);
  await page.getByTestId('auth-password-input').fill(password);
  await page.getByTestId('auth-submit').click();
}
