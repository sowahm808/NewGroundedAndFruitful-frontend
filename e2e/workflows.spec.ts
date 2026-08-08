import { expect, test } from '@playwright/test';
const publicCases = [
  ['parent login', '/auth/login', 'Sign in'],
  ['child login', '/auth/child', 'Ready to grow?'],
] as const;
for (const [name, path, heading] of publicCases)
  test(name, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  });
for (const [name, path] of [
  ['child daily journey', '/child/today'],
  ['character assessment', '/child/character'],
  ['Bible activity', '/child/bible'],
  ['parent observation', '/parent/observations'],
  ['mentor dashboard', '/mentor/teams'],
  ['admin quarter setup', '/admin/quarters'],
] as const)
  test(`${name} requires authentication`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/auth\/login/);
  });
