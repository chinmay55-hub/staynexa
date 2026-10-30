import { test, expect } from '@playwright/test';

test.describe('Multi-Tenant Isolation (Hotel A vs Hotel B)', () => {
  test('Hotel A guest portal displays only Grand Palace data', async ({ page }) => {
    await page.goto('/guest/gp-r101-abc123');

    // Verify Hotel A details
    await expect(page.locator('text=Grand Palace Hotel').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Room 101').first()).toBeVisible();

    // Navigate to Dining
    await page.locator('button', { hasText: 'Dining' }).first().click();

    // Hotel A items MUST be visible
    await expect(page.locator('text=Paneer Tikka').first()).toBeVisible();
    await expect(page.locator('text=Butter Chicken').first()).toBeVisible();

    // Hotel B items MUST NOT be visible
    await expect(page.locator('text=Truffle Mushroom Pasta')).not.toBeVisible();
  });

  test('Hotel B guest portal displays only The Willow Boutique data', async ({ page }) => {
    await page.goto('/guest/wb-r201-willow');

    // Verify Hotel B details
    await expect(page.locator('text=The Willow Boutique').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Room 201').first()).toBeVisible();

    // Navigate to Dining
    await page.locator('button', { hasText: 'Dining' }).first().click();

    // Hotel B items MUST be visible
    await expect(page.locator('text=Truffle Mushroom Pasta').first()).toBeVisible();
    await expect(page.locator('text=₹550').first()).toBeVisible();

    // Hotel A items MUST NOT be visible
    await expect(page.locator('text=Paneer Tikka')).not.toBeVisible();
    await expect(page.locator('text=Butter Chicken')).not.toBeVisible();
  });
});
