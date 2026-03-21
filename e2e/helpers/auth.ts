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

  await page.getByPlaceholder('Email').waitFor({ state: 'visible', timeout: 15000 });
}

/** Fill signup form and submit. Uses placeholder/text selectors for RN Web compatibility. */
export async function signUp(page: Page, name: string, email: string, password: string) {
  await page.getByText('Sign Up').first().click();
  await page.getByPlaceholder('Name').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByPlaceholder('Name').fill(name);
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByText('Create Account').click();
}

/** Fill login form and submit. */
export async function login(page: Page, email: string, password: string) {
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByText('Sign In').click();
}
