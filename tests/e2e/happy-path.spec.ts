import { expect, test } from '@playwright/test';

test('scout -> ideas -> blueprint -> export', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: /Find the trend\. Ship the repo\./ })
  ).toBeVisible();

  // Fill the scout form and run it.
  await page.getByLabel('Niche').fill('indie game dev tooling');
  await page.getByRole('button', { name: 'Run Scout' }).click();

  // The project page is pushed after the scout resolves.
  await page.waitForURL(/\/project\//, { timeout: 90_000 });
  await expect(page.getByRole('tab', { name: /Ideas/ })).toBeVisible();

  // Expand the first idea to confirm details render.
  await page.getByRole('button', { name: 'Details' }).first().click();
  await expect(page.getByText('Target user').first()).toBeVisible();

  // Generate a blueprint from the first idea.
  await page
    .getByRole('button', { name: /Build blueprint/ })
    .first()
    .click();
  await expect(page.getByRole('tab', { name: 'README' })).toBeVisible({ timeout: 90_000 });

  await page.getByRole('tab', { name: 'README' }).click();
  await expect(page.locator('pre').first()).toContainText('#');

  // The dashboard shows the project.
  await page.getByRole('link', { name: 'Dashboard' }).first().click();
  await page.waitForURL(/\/dashboard/);
  await expect(page.getByText('indie game dev tooling').first()).toBeVisible();
});
