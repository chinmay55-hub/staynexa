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

test.describe('QR Code Resolution & Routing', () => {
  test.beforeAll(async () => {
    await stagingClient.auth.signInWithPassword({
      email: 'mohan@grandpalace.com',
      password: 'demo123',
    });
  });
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

  test('resolves failing production token sn-ymz185x0yd to Grand Palace Room 102 with guest session', async ({ page }) => {
    await page.goto('/guest/sn-ymz185x0yd');

    // Must resolve hotel and room without "QR code not recognized" error
    await expect(page.locator('text=Grand Palace Hotel').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Room 102').first()).toBeVisible();
    await expect(page.locator('text=This QR code is not recognized').first()).not.toBeVisible();
  });

  test('resolves /q/sn-ymz185x0yd shortcut URL to guest portal', async ({ page }) => {
    await page.goto('/q/sn-ymz185x0yd');

    await expect(page.locator('text=Grand Palace Hotel').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Room 102').first()).toBeVisible();
  });

  test('resolves valid staging token wb-r201-willow to The Willow Boutique Room 201', async ({ page }) => {
    await page.goto('/guest/wb-r201-willow');

    await expect(page.locator('text=The Willow Boutique').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Room 201').first()).toBeVisible();
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

  test('dynamic QR lifecycle: active token resolves, regenerated/deactivated token fails closed', async ({ page }) => {
    const timestamp = Date.now();
    const token1 = `sn-live-test-1-${timestamp}`;
    const token2 = `sn-live-test-2-${timestamp}`;

    const hotelId = '00000000-0000-0000-0000-000000000001';
    const roomId = '00000000-0000-0000-0003-000000000001';

    try {
      // 1. Deactivate existing QR for Room 101 and insert active QR token 1
      await stagingClient.from('qr_codes').update({ is_active: false }).eq('hotel_id', hotelId).eq('room_id', roomId);
      await stagingClient.from('qr_codes').insert({
        hotel_id: hotelId,
        room_id: roomId,
        token: token1,
        type: 'ROOM',
        is_active: true,
      });

      // Verify token1 resolves to Room 101
      await page.goto(`/guest/${token1}`);
      await expect(page.locator('text=Grand Palace Hotel').first()).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Room 101').first()).toBeVisible();

      // 2. Regenerate: Deactivate token 1 and insert active token 2
      await stagingClient.from('qr_codes').update({ is_active: false }).eq('hotel_id', hotelId).eq('room_id', roomId);
      await stagingClient.from('qr_codes').insert({
        hotel_id: hotelId,
        room_id: roomId,
        token: token2,
        type: 'ROOM',
        is_active: true,
      });

      // Verify old token 1 now FAILS CLOSED
      await page.goto(`/guest/${token1}`);
      await expect(
        page.locator('text=This QR code is not recognized or has been deactivated')
          .or(page.locator('text=Invalid or unrecognized QR token'))
      ).toBeVisible({ timeout: 10000 });

      // Verify new token 2 resolves to Room 101
      await page.goto(`/guest/${token2}`);
      await expect(page.locator('text=Grand Palace Hotel').first()).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Room 101').first()).toBeVisible();
    } finally {
      // Cleanup: remove temporary test tokens and ensure gp-r101-abc123 is active
      await stagingClient.from('qr_codes').delete().in('token', [token1, token2]);
      await stagingClient.from('qr_codes').update({ is_active: true }).eq('token', 'gp-r101-abc123');
    }
  });
});
