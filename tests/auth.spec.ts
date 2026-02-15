import { test, expect } from '@playwright/test';
import { signIn } from './utils';

test('@extended signup shows confirmation message', async ({ page }) => {
  test.skip(process.env.E2E_ALLOW_SIGNUP !== 'true', 'Set E2E_ALLOW_SIGNUP=true to run this test.');

  await page.goto('/auth');
  await page.getByRole('button', { name: 'Sign Up' }).click();

  const email = `e2e+${Date.now()}@example.com`;
  await page.getByPlaceholder('Jane Doe').fill('E2E User');
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('********').first().fill('TestPassword123!');

  await page.getByRole('button', { name: /create account/i }).click();

  await expect(
    page.getByText('Check your email to confirm your account, then sign in.')
  ).toBeVisible();
});

test('@core sign in with existing account', async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) {
    if (process.env.CI) {
      throw new Error('CI requires E2E_EMAIL and E2E_PASSWORD for auth coverage.');
    }
    test.skip(true, 'Set E2E_EMAIL and E2E_PASSWORD to run this test locally.');
    return;
  }

  await signIn(page, email, password);
});
