import { test, expect } from '@playwright/test';

test.describe('QR Code Resolution & Routing', () => {
  test('resolves valid staging QR token gp-r101-abc123 to Grand Palace Room 101', async ({ page }) => {
    await page.goto('/guest/gp-r101-abc123');

    // Wait for guest portal header to render
    await expect(page.locator('text=Grand Palace Hotel').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Room 101').first()).toBeVisible();
    await expect(page.locator('text=Arjun').first()).toBeVisible();
  });

  test('handles trailing slash on QR route correctly', async ({ page }) => {
    await page.goto('/guest/gp-r101-abc123/');

    await expect(page.locator('text=Grand Palace Hotel').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Room 101').first()).toBeVisible();
  });

  test('resolves /q/:token route alias to guest portal', async ({ page }) => {
    await page.goto('/q/gp-r101-abc123');

    await expect(page.locator('text=Grand Palace Hotel').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Room 101').first()).toBeVisible();
  });

  test('fails closed with clear error on invalid QR token', async ({ page }) => {
    await page.goto('/guest/invalid-token-nonexistent');

    // Expected clear error message indicating unrecognized/deactivated QR code
    await expect(
      page.locator('text=This QR code is not recognized or has been deactivated')
        .or(page.locator('text=Invalid or unrecognized QR token'))
    ).toBeVisible({ timeout: 10000 });

    // Menu should NOT be displayed
    await expect(page.locator('text=Dining')).not.toBeVisible();
  });
});
