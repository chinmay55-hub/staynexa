import { test, expect } from '@playwright/test';

test.describe('Part 16: Cross-Device Housekeeping Realtime Synchronization', () => {
  test('Guest submits housekeeping request -> Staff receives ticket live -> Staff fulfills -> Guest tracker updates', async ({ browser }) => {
    // ─── STEP 1: Browser Context A (Staff: Housekeeping / Admin) ───
    const staffContext = await browser.newContext();
    const staffPage = await staffContext.newPage();

    await staffPage.goto('/login');
    await expect(staffPage.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });

    // Authenticate as Hotel Admin / Staff
    await staffPage.fill('input[type="email"]', 'vikram@grandpalace.com');
    await staffPage.fill('input[type="password"]', 'demo123');
    await staffPage.click('button:has-text("Sign in")');
    await staffPage.waitForURL(/\/hotel|\/dashboard|\/housekeeping/, { timeout: 15000 });

    // Navigate to Housekeeping page
    await staffPage.goto('/housekeeping');
    await expect(staffPage.getByRole('heading', { name: /Housekeeping/i })).toBeVisible({ timeout: 15000 });

    // Switch to Guest Amenity Requests tab
    const requestsTab = staffPage.locator('button:has-text("Guest Amenity Requests")');
    await expect(requestsTab).toBeVisible();
    await requestsTab.click();

    // ─── STEP 2: Browser Context B (Guest Portal) ───
    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();

    await guestPage.goto('/guest/gp-r101-abc123');
    await expect(guestPage.locator('text=Grand Palace Hotel').first()).toBeVisible({ timeout: 10000 });
    await expect(guestPage.locator('text=Room 101').first()).toBeVisible();

    // Navigate to Services tab in bottom navigation
    const servicesTabBtn = guestPage.locator('button', { hasText: 'Services' }).first();
    await servicesTabBtn.click();
    await expect(guestPage.locator('text=In-Room Amenities & Services')).toBeVisible({ timeout: 10000 });

    // Find Fresh Towels service button and open request modal
    const towelBtn = guestPage.locator('button').filter({ hasText: /Fresh Towels|Extra Towels/i }).first();
    await expect(towelBtn).toBeVisible({ timeout: 10000 });
    await towelBtn.click();

    // Fill request modal
    const dialog = guestPage.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('textarea').fill('2 extra plush towels needed for Room 101');
    const submitBtn = dialog.getByRole('button', { name: 'Submit Request' });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Verify request logged banner and request card in Guest Portal
    await expect(guestPage.locator('text=Your service request has been logged with Front Desk')).toBeVisible({ timeout: 10000 });
    const guestReqCard = guestPage.locator('[data-testid="guest-request-card"]').filter({ hasText: /Fresh Towels|Extra Towels/i }).first();
    await expect(guestReqCard).toBeVisible({ timeout: 10000 });
    await expect(guestReqCard.locator('span', { hasText: 'PENDING' })).toBeVisible();

    // ─── STEP 3: Staff Dashboard Receives Request in Real Time (WITHOUT Refresh) ───
    const staffReqCard = staffPage.locator('[data-testid="housekeeping-request-card"]').filter({ hasText: 'Room 101' }).filter({ hasText: /Fresh Towels|Extra Towels/i }).first();
    await expect(staffReqCard).toBeVisible({ timeout: 15000 });

    // ─── STEP 4: Staff Fulfills Request ───
    const fulfillBtn = staffReqCard.locator('button', { hasText: 'Mark Delivered / Fulfilled' });
    await fulfillBtn.scrollIntoViewIfNeeded();
    await fulfillBtn.click();

    // ─── STEP 5: Guest Portal Updates Status in Real Time (WITHOUT Refresh) ───
    await expect(guestReqCard.locator('span', { hasText: 'COMPLETED' })).toBeVisible({ timeout: 15000 });

    // ─── STEP 6: Persistence Verification on Reload ───
    await guestPage.reload();
    await expect(guestPage.locator('text=Grand Palace Hotel').first()).toBeVisible({ timeout: 10000 });
    await guestPage.locator('button', { hasText: 'Services' }).first().click();
    const reloadedGuestReqCard = guestPage.locator('[data-testid="guest-request-card"]').filter({ hasText: /Fresh Towels|Extra Towels/i }).first();
    await expect(reloadedGuestReqCard.locator('span', { hasText: 'COMPLETED' })).toBeVisible({ timeout: 10000 });

    await staffPage.reload();
    await expect(staffPage.getByRole('heading', { name: /Housekeeping/i })).toBeVisible({ timeout: 15000 });

    await guestContext.close();
    await staffContext.close();
  });
});
