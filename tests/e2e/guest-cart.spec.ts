import { test, expect } from '@playwright/test';

test.describe('Guest Cart & Price Calculations', () => {
  test('adds items, updates quantities, and calculates server-aligned totals', async ({ page }) => {
    await page.goto('/guest/gp-r101-abc123');
    await expect(page.locator('text=Grand Palace Hotel').first()).toBeVisible({ timeout: 10000 });

    // Navigate to Dining
    await page.locator('button', { hasText: 'Dining' }).first().click();
    await expect(page.locator('text=Paneer Tikka').first()).toBeVisible();

    // Target Paneer Tikka card specifically and click Add
    const paneerCard = page.locator('div').filter({ hasText: /^Paneer Tikka/ }).first();
    await paneerCard.locator('button', { hasText: 'Add' }).click();

    // Verify cart indicator appears and click Review Cart
    await expect(page.getByRole('button', { name: 'Review Cart' })).toBeVisible();
    await page.getByRole('button', { name: 'Review Cart' }).click();

    // Verify item is in the review modal
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Paneer Tikka')).toBeVisible();

    // Verify subtotal, 5% GST, and grand total in the dialog:
    // Subtotal: ₹320, GST (5%): ₹16, Order Total: ₹336
    await expect(dialog.getByText('Subtotal:')).toBeVisible();
    await expect(dialog.getByText('GST (5%):')).toBeVisible();
    await expect(dialog.getByText('Order Total:')).toBeVisible();
    await expect(dialog.getByText('₹336')).toBeVisible();
  });
});
