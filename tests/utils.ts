import { expect, Page } from '@playwright/test';

export async function signIn(page: Page, email: string, password: string) {
  await page.goto('/auth');
  const signInTab = page.getByRole('button', { name: 'Sign In' });
  if (await signInTab.isVisible()) {
    await signInTab.click();
  }

  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('********').first().fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();

  await page.waitForURL('**/');
  await expect(page.getByText('Welcome to SplitEase')).toBeVisible();
}

export async function openCreateGroupModal(page: Page) {
  const newGroupButton = page.getByRole('button', { name: 'New Group' });
  if (await newGroupButton.isVisible()) {
    await newGroupButton.click();
    return;
  }
  await page.getByRole('button', { name: /create your first group/i }).click();
}

export async function createGroup(page: Page, name: string, description?: string) {
  await openCreateGroupModal(page);
  await page.getByPlaceholder('e.g., Trip to Paris, Roommates').fill(name);
  if (description) {
    await page.getByPlaceholder('What is this group for?').fill(description);
  }
  await page.getByRole('button', { name: /create group/i }).click();
  await expect(page.getByRole('heading', { name })).toBeVisible();
}
