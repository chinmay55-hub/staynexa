import { test, expect } from '@playwright/test';

test.describe('Authentication & Role Protection', () => {
  test('unauthenticated users cannot access protected staff routes', async ({ page }) => {
    // Attempt to access /hotel/dashboard without auth
    await page.goto('/hotel/dashboard');
    await expect(page).toHaveURL(/\/login/);

    // Attempt to access /reception without auth
    await page.goto('/reception');
    await expect(page).toHaveURL(/\/login/);

    // Attempt to access /super-admin without auth
    await page.goto('/super-admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('Kitchen staff logs in and is routed to /kitchen', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=StayNexa').first()).toBeVisible({ timeout: 10000 });

    await page.fill('input[type="email"]', 'mohan@grandpalace.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button:has-text("Sign in")');

    await page.waitForURL(/\/kitchen|\/kds/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /Kitchen Display System/i })).toBeVisible();
  });
});
