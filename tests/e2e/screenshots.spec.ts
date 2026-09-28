import { test } from '@playwright/test';

test('capture README screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'docs/landing.png', fullPage: true });

  await page.getByLabel('Niche').fill('indie game dev tooling');
  await page.getByRole('button', { name: 'Run Scout' }).click();
  await page.waitForURL(/\/project\//, { timeout: 90_000 });
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'docs/project.png', fullPage: true });

  await page.getByRole('link', { name: 'Dashboard' }).first().click();
  await page.waitForURL(/\/dashboard/);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'docs/dashboard.png', fullPage: true });
});
