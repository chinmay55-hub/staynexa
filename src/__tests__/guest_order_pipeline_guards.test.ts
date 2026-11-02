import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const migrationPath = path.resolve(
  __dirname,
  '../../supabase/migrations/20240103000000_secure_guest_pipeline.sql',
);
const sql = fs.readFileSync(migrationPath, 'utf-8');

describe('GUEST ORDER PIPELINE SERVER GUARDS (create_guest_order)', () => {
  it('is defined as SECURITY DEFINER with a pinned search_path', () => {
    const start = sql.indexOf('CREATE OR REPLACE FUNCTION public.create_guest_order(');
    expect(start).toBeGreaterThan(-1);
    const header = sql.slice(start, sql.indexOf('AS $', start));
    expect(header).toMatch(/SECURITY DEFINER/);
    expect(header).toMatch(/SET search_path/);
  });

  it('resolves the hotel from the QR token and rejects unknown tokens with P0001', () => {
    expect(sql).toMatch(/INVALID_QR_TOKEN[\s\S]*?ERRCODE = 'P0001'/);
  });

  it('requires an active CHECKED_IN reservation for the room with P0002', () => {
    expect(sql).toMatch(/AND res\.hotel_id = v_hotel_id/);
    expect(sql).toMatch(/NO_ACTIVE_CHECKIN[\s\S]*?ERRCODE = 'P0002'/);
  });

  it('rejects empty orders with P0003, out-of-range quantities with P0004', () => {
    expect(sql).toMatch(/EMPTY_ORDER[\s\S]*?ERRCODE = 'P0003'/);
    expect(sql).toMatch(/INVALID_QUANTITY: Quantity must be between 1 and 100\.[\s\S]*?ERRCODE = 'P0004'/);
  });

  it('looks up menu items scoped to the token hotel and rejects others with P0005', () => {
    expect(sql).toMatch(/WHERE mi\.id = v_menu_item_id AND mi\.hotel_id = v_hotel_id/);
    expect(sql).toMatch(/INVALID_MENU_ITEM[\s\S]*?ERRCODE = 'P0005'/);
  });

  it('rejects unavailable items with P0006', () => {
    expect(sql).toMatch(/ITEM_UNAVAILABLE[\s\S]*?ERRCODE = 'P0006'/);
  });

  it('takes unit price and tax from the menu, never from the client payload', () => {
    expect(sql).toMatch(/SELECT mi\.name, mi\.price, COALESCE\(mi\.tax_percent, 5\.00\), mi\.is_available/);
    expect(sql).toMatch(/v_line_subtotal := ROUND\(v_unit_price \* v_quantity, 2\)/);
    expect(sql).not.toMatch(/v_unit_price\s*:=\s*\(v_item->>'unit_price'/);
  });

  it('revokes PUBLIC execute before granting the guest roles', () => {
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.create_guest_order\(TEXT, VARCHAR, BOOLEAN, TEXT, JSONB\) FROM PUBLIC;/,
    );
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.create_guest_order\(TEXT, VARCHAR, BOOLEAN, TEXT, JSONB\) TO anon, authenticated, service_role;/,
    );
  });

  it.todo('rejects a duplicate submission with the same client idempotency key (no guard exists yet)');
});
