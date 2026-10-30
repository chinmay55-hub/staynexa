import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read Staging Supabase credentials from .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

const stagingClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

test.describe('Part 15: True Realtime End-to-End Test (Guest Portal to KDS)', () => {
  let createdOrderId: string | null = null;

  test.beforeAll(async () => {
    // Authenticate client for test lifecycle hooks
    await stagingClient.auth.signInWithPassword({
      email: 'mohan@grandpalace.com',
      password: 'demo123',
    });
  });

  test.afterEach(async () => {
    // Clean up test order if created
    if (createdOrderId) {
      try {
        await stagingClient.from('order_items').delete().eq('order_id', createdOrderId);
        await stagingClient.from('orders').delete().eq('id', createdOrderId);
      } catch (err) {
        console.warn('Test order cleanup error:', err);
      }
    }
  });

  test('Guest submits order -> KDS receives ticket live -> KDS advances status -> Guest tracker updates', async ({ browser }) => {
    // ─── STEP 1: Browser B (Kitchen Staff KDS) ───
    const staffContext = await browser.newContext();
    const staffPage = await staffContext.newPage();

    await staffPage.goto('/login');
    await expect(staffPage.locator('text=StayNexa').first()).toBeVisible({ timeout: 10000 });

    // Authenticate as Kitchen staff
    await staffPage.fill('input[type="email"]', 'mohan@grandpalace.com');
    await staffPage.fill('input[type="password"]', 'demo123');
    await staffPage.click('button:has-text("Sign in")');

    // Redirects to /kitchen
    await staffPage.waitForURL(/\/kitchen|\/kds/, { timeout: 15000 });
    await expect(staffPage.getByRole('heading', { name: /Kitchen Display System/i })).toBeVisible({ timeout: 10000 });

    // ─── STEP 2: Browser A (Guest Portal) ───
    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();

    await guestPage.goto('/guest/gp-r101-abc123');
    await expect(guestPage.locator('text=Grand Palace Hotel').first()).toBeVisible({ timeout: 10000 });
    await expect(guestPage.locator('text=Room 101').first()).toBeVisible();

    // Navigate to Dining tab
    await guestPage.locator('button', { hasText: 'Dining' }).first().click();
    await expect(guestPage.locator('text=Paneer Tikka').first()).toBeVisible();

    // Target Paneer Tikka card specifically and click Add
    const paneerCard = guestPage.locator('div').filter({ hasText: /^Paneer Tikka/ }).first();
    await paneerCard.locator('button', { hasText: 'Add' }).click();

    // Open cart modal via Review Cart button
    await expect(guestPage.getByRole('button', { name: 'Review Cart' })).toBeVisible();
    await guestPage.getByRole('button', { name: 'Review Cart' }).click();

    // In modal, click Charge to Room Folio to dispatch order
    const dialog = guestPage.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const chargeBtn = dialog.getByRole('button', { name: 'Charge to Room Folio' });
    await expect(chargeBtn).toBeVisible();
    await chargeBtn.click();

    // Wait for the active order card in guest orders tracker
    const orderBadge = guestPage.locator('span', { hasText: 'PENDING' }).first();
    await expect(orderBadge).toBeVisible({ timeout: 15000 });

    // Capture the newly created order ID from the card
    const orderTitleText = await guestPage.locator('span:has-text("Order #")').first().innerText();
    const _orderTag = orderTitleText.replace('Order #', '').trim();

    // ─── STEP 3: KDS Receives Order in Real Time (WITHOUT Refresh) ───
    // Look at staffPage (Browser B) without calling reload()!
    const kdsTicket = staffPage.locator(`text=Room 101`).first();
    await expect(kdsTicket).toBeVisible({ timeout: 15000 });
    await expect(staffPage.locator('text=Paneer Tikka').first()).toBeVisible();

    // ─── STEP 4: KDS Advances to ACCEPTED ───
    const acceptBtn = staffPage.locator('button', { hasText: 'Accept Order' }).first();
    await acceptBtn.click();

    // Verify ticket moves to Accepted Queue on KDS
    await expect(staffPage.locator('text=Accepted Queue')).toBeVisible();

    // Look at Browser A (Guest tracker) — verifies update without manual refresh
    await expect(
      guestPage.locator('span', { hasText: 'ACCEPTED' }).first()
    ).toBeVisible({ timeout: 10000 });

    // ─── STEP 5: KDS Advances to PREPARING ───
    const prepBtn = staffPage.locator('button', { hasText: 'Start Preparing' }).first();
    await prepBtn.click();

    // Verify on KDS
    await expect(staffPage.locator('text=On the Stove')).toBeVisible();

    // Verify on Guest Portal
    await expect(
      guestPage.locator('span', { hasText: 'PREPARING' }).first()
    ).toBeVisible({ timeout: 10000 });

    // ─── STEP 6: KDS Advances to READY ───
    const readyBtn = staffPage.locator('button', { hasText: 'Mark Ready for Delivery' }).first();
    await readyBtn.click();

    // Verify on KDS
    await expect(staffPage.locator('text=Ready on Counter')).toBeVisible();

    // Verify on Guest Portal
    await expect(
      guestPage.locator('span', { hasText: 'READY' }).first()
    ).toBeVisible({ timeout: 10000 });

    // ─── STEP 7: KDS Advances to DELIVERED ───
    const deliveredBtn = staffPage.locator('button', { hasText: 'Dispatched / Delivered' }).first();
    await deliveredBtn.click();
    await expect(deliveredBtn).not.toBeVisible({ timeout: 10000 });

    // Verify on Guest Portal
    await expect(
      guestPage.locator('span', { hasText: 'DELIVERED' }).first()
    ).toBeVisible({ timeout: 10000 });

    // ─── STEP 8: Reload Both Pages & Verify Persisted State ───
    await staffPage.reload();
    await expect(staffPage.getByRole('heading', { name: /Kitchen Display System/i })).toBeVisible({ timeout: 10000 });

    await guestPage.reload();
    await expect(guestPage.locator('text=Grand Palace Hotel').first()).toBeVisible({ timeout: 10000 });
    // Navigate to Orders tab on guest page
    await guestPage.locator('button', { hasText: 'Orders' }).first().click();
    await expect(guestPage.locator('span', { hasText: 'DELIVERED' }).first()).toBeVisible({ timeout: 10000 });

    // Extract order id for cleanup
    const { data: dbOrders } = await stagingClient
      .from('orders')
      .select('id')
      .eq('hotel_id', '00000000-0000-0000-0000-000000000001')
      .order('created_at', { ascending: false })
      .limit(1);
    if (dbOrders && dbOrders.length > 0) {
      createdOrderId = dbOrders[0].id;
    }

    // Close contexts
    await staffContext.close();
    await guestContext.close();
  });
});
