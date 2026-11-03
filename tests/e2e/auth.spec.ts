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
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });

    await page.fill('input[type="email"]', 'mohan@grandpalace.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button:has-text("Sign in")');

    await page.waitForURL(/\/kitchen|\/kds/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /Kitchen Display System/i })).toBeVisible();

    // Verify ZERO passwords or custom credentials exist in localStorage
    const storedCredentials = await page.evaluate(() => localStorage.getItem('staynexa_custom_credentials'));
    expect(storedCredentials).toBeNull();
  });

  test('login with invalid password rejects without session creation', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });

    await page.fill('input[type="email"]', 'mohan@grandpalace.com');
    await page.fill('input[type="password"]', 'wrongpassword999');
    await page.click('button:has-text("Sign in")');

    // Should remain on login page and display error message
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('text=/Invalid login credentials|Authentication failed/i')).toBeVisible({ timeout: 5000 });

    // Ensure protected route is still inaccessible
    await page.goto('/kitchen');
    await expect(page).toHaveURL(/\/login/);
  });

  test('session restoration keeps authenticated staff logged in across reload', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });

    await page.fill('input[type="email"]', 'mohan@grandpalace.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button:has-text("Sign in")');

    await page.waitForURL(/\/kitchen|\/kds/, { timeout: 15000 });

    // Reload page
    await page.reload();
    await expect(page).toHaveURL(/\/kitchen|\/kds/);
    await expect(page.getByRole('heading', { name: /Kitchen Display System/i })).toBeVisible();
  });

  test('role authorization prevents kitchen staff from accessing super-admin routes', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });

    await page.fill('input[type="email"]', 'mohan@grandpalace.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button:has-text("Sign in")');

    await page.waitForURL(/\/kitchen|\/kds/, { timeout: 15000 });

    // Attempt to navigate to /super-admin as KITCHEN role
    await page.goto('/super-admin');

    // Should redirect back to unauthorized or dashboard/kitchen
    await expect(page).not.toHaveURL(/\/super-admin/);
  });
});
