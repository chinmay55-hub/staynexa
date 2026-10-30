import { test, expect } from '@playwright/test';

test.describe('Guest Portal Menu & Services', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/guest/gp-r101-abc123');
    await expect(page.locator('text=Grand Palace Hotel').first()).toBeVisible({ timeout: 10000 });
  });

  test('displays hotel branding, room number, and guest greeting', async ({ page }) => {
    await expect(page.locator('text=Room 101').first()).toBeVisible();
    await expect(page.locator('text=Arjun').first()).toBeVisible();
    await expect(page.locator('text=Where Luxury Meets Legacy').first()).toBeVisible();
  });

  test('displays Wi-Fi information with copy button', async ({ page }) => {
    await expect(page.locator('text=GrandPalace_Guest').first()).toBeVisible();
    await expect(page.locator('text=WelcomeGP2024').first()).toBeVisible();
  });

  test('displays hotel-specific menu items and prices in Dining tab', async ({ page }) => {
    // Click Dining tab in bottom navigation
    await page.locator('button', { hasText: 'Dining' }).first().click();

    // Verify hotel-specific menu items for Grand Palace
    await expect(page.locator('text=Paneer Tikka').first()).toBeVisible();
    await expect(page.locator('text=₹320').first()).toBeVisible();
    await expect(page.locator('text=Butter Chicken').first()).toBeVisible();
    await expect(page.locator('text=₹480').first()).toBeVisible();
  });

  test('filters vegetarian items correctly', async ({ page }) => {
    await page.locator('button', { hasText: 'Dining' }).first().click();
    await expect(page.locator('text=Butter Chicken').first()).toBeVisible();

    // Toggle veg only filter
    const vegToggle = page.locator('button', { hasText: 'Veg Only' }).or(page.locator('text=Veg Only'));
    await vegToggle.first().click();

    // Vegetarian item should remain visible
    await expect(page.locator('text=Paneer Tikka').first()).toBeVisible();

    // Non-veg Butter Chicken should be hidden
    await expect(page.locator('text=Butter Chicken')).not.toBeVisible();
  });
});
