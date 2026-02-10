import { test, expect } from '@playwright/test';
import { createGroup, signIn } from './utils';

test('core flow: group, expense, optional settlement', async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  const memberEmail = process.env.E2E_MEMBER_EMAIL;

  if (!email || !password) {
    if (process.env.CI) {
      throw new Error('CI requires E2E_EMAIL and E2E_PASSWORD for core flow coverage.');
    }
    test.skip(true, 'Set E2E_EMAIL and E2E_PASSWORD to run this test locally.');
    return;
  }
  if (!memberEmail && process.env.CI) {
    throw new Error('CI requires E2E_MEMBER_EMAIL so settlement flow is always exercised.');
  }

  await signIn(page, email, password);

  const groupName = `E2E Group ${Date.now()}`;
  await createGroup(page, groupName, 'Automated test group');

  if (memberEmail) {
    await page.getByRole('button', { name: 'Open group settings' }).click();
    await expect(page.getByRole('heading', { name: 'Group Settings' })).toBeVisible();
    await page.getByPlaceholder('Add member email').fill(memberEmail);
    await page.getByRole('button', { name: 'Add member' }).click();
    await expect(
      page.getByText(/Member added\.|Invite sent\./)
    ).toBeVisible();
    await page.keyboard.press('Escape');
  }

  await page.getByRole('button', { name: 'Add Expense' }).click();
  await page.getByPlaceholder('What was this expense for?').fill('Team Dinner');
  await page.getByPlaceholder('0.00').fill('24.00');
  await page.getByRole('button', { name: /add expense/i }).click();

  await expect(page.getByText('Team Dinner')).toBeVisible();

  if (memberEmail) {
    await page.getByRole('button', { name: 'Settle Up' }).click();
    const settleButtons = page.getByRole('button', { name: 'Settle' });
    if (await settleButtons.count()) {
      await settleButtons.first().click();
      await expect(page.getByRole('heading', { name: 'Record Settlement' })).toBeVisible();
      await page.getByRole('button', { name: 'Record Payment' }).click();
      await expect(page.getByText('Settlement history')).toBeVisible();
    }
  }

  await page.getByRole('button', { name: 'Open group settings' }).click();
  await page.getByRole('button', { name: 'Delete Group' }).click();
  await page.getByRole('button', { name: 'Delete' }).click();

  await page.waitForURL('**/');
  await expect(page.getByText('Welcome to SplitEase')).toBeVisible();
});
