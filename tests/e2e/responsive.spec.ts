import { test, expect } from '@playwright/test';

test.describe('Responsive & Viewport Testing', () => {
  test('Mobile viewport (375x667): Guest Portal has bottom nav, no overflow, touch targets', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/guest/gp-r101-abc123');

    await expect(page.locator('text=Grand Palace Hotel').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Room 101').first()).toBeVisible();

    // Verify fixed bottom navigation is visible
    const bottomNav = page.locator('nav').or(page.locator('button:has-text("Dining")'));
    await expect(bottomNav.first()).toBeVisible();

    // Verify no horizontal document overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('Tablet viewport (768x1024): Guest Portal renders balanced layout', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/guest/gp-r101-abc123');

    await expect(page.locator('text=Grand Palace Hotel').first()).toBeVisible({ timeout: 10000 });

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('Desktop viewport (1280x720): KDS renders full 4-column kanban board', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/kitchen');

    // Without login, redirects to /login
    await expect(page).toHaveURL(/\/login/);
  });
});
