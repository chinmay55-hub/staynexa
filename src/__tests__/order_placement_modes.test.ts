import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import * as supabaseLib from '../lib/supabase';
import { orderService } from '../services/orderService';
import { pinDemoMode } from './demoModePin';

const basePayload = {
  hotel_id: 'hotel-001',
  room_id: 'room-101',
  room_number: '101',
  type: 'ROOM_SERVICE' as const,
  status: 'PENDING' as const,
  charge_to_room: true,
  subtotal: 10,
  tax_amount: 0.5,
  total: 10.5,
  token: 'gp-r101-abc123',
  items: [
    { menu_item_id: 'mi-003', name: 'Cold Coffee', quantity: 2, unit_price: 1, tax_percent: 5, total: 2 },
  ],
};

describe('orderService.placeOrder live mode (server-validated RPC)', () => {
  let rpc: ReturnType<typeof vi.fn>;
  let originalClient: SupabaseClient | null;
  let demoSpy: ReturnType<typeof vi.spyOn>;
  let configuredSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    rpc = vi.fn().mockResolvedValue({
      data: { id: 'order-1', hotel_id: 'hotel-001', total: 315, tracking_token: 'trk-1', items: [] },
      error: null,
    });
    originalClient = supabaseLib.supabase;
    supabaseLib.setSupabaseClientForTesting({ rpc } as unknown as SupabaseClient);
    demoSpy = vi.spyOn(supabaseLib, 'isDemoMode').mockReturnValue(false);
    configuredSpy = vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(true);
  });

  afterEach(() => {
    supabaseLib.setSupabaseClientForTesting(originalClient);
    demoSpy.mockRestore();
    configuredSpy.mockRestore();
  });

  it('sends only menu item, quantity and notes to the server RPC', async () => {
    await orderService.placeOrder(basePayload);

    expect(rpc).toHaveBeenCalledTimes(1);
    const [fn, args] = rpc.mock.calls[0];
    expect(fn).toBe('create_guest_order');
    expect(args.p_token).toBe('gp-r101-abc123');
    expect(args.p_items).toEqual([{ menu_item_id: 'mi-003', quantity: 2, notes: null }]);
  });

  it('never forwards client-supplied prices, totals or tenant identifiers', async () => {
    await orderService.placeOrder({
      ...basePayload,
      hotel_id: 'hotel-002',
      total: 1,
      items: [{ ...basePayload.items[0], unit_price: 0.01, total: 0.02 }],
    });

    const serialized = JSON.stringify(rpc.mock.calls[0][1]);
    expect(serialized).not.toContain('unit_price');
    expect(serialized).not.toContain('hotel-002');
    expect(serialized).not.toContain('"total"');
  });

  it('reports the server-computed total rather than the client-submitted total', async () => {
    const result = await orderService.placeOrder({ ...basePayload, total: 1 });

    expect(result.success).toBe(true);
    expect(result.order.total).toBe(315);
    expect(result.trackingToken).toBe('trk-1');
  });

  it('returns a failure result when the server rejects an invalid guest token', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'Invalid or expired guest token' } });

    const result = await orderService.placeOrder({ ...basePayload, token: 'forged-token' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid or expired guest token');
  });
});

describe('orderService.placeOrder demo mode', () => {
  it('never calls the backend while demo mode is active', async () => {
    const rpc = vi.fn();
    const originalClient = supabaseLib.supabase;
    supabaseLib.setSupabaseClientForTesting({ rpc } as unknown as SupabaseClient);
    const unpin = pinDemoMode();

    try {
      const result = await orderService.placeOrder({ ...basePayload, token: undefined });

      expect(rpc).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.trackingToken).toMatch(/^demo-track-/);
    } finally {
      unpin();
      supabaseLib.setSupabaseClientForTesting(originalClient);
    }
  });
});
