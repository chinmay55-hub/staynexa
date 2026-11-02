import { describe, it, expect, beforeEach } from 'vitest';
import { toDbHotelId, isSameHotel, isUuid } from '../utils/tenantId';
import { orderService } from '../services/orderService';
import { staffService, reloadDemoStoreFromStorage } from '../services/demoDataService';

describe('StayNexa Realtime KDS, Onboarding & User Management Verifications', () => {
  beforeEach(() => {
    reloadDemoStoreFromStorage();
  });

  describe('Tenant ID & Hotel Normalization', () => {
    it('should normalize demo hotel slug to canonical database UUID', () => {
      expect(toDbHotelId('hotel-001')).toBe('00000000-0000-0000-0000-000000000001');
      expect(toDbHotelId('hotel-002')).toBe('00000000-0000-0000-0000-000000000002');
      expect(toDbHotelId('hotel-003')).toBe('00000000-0000-0000-0000-000000000003');
    });

    it('should leave canonical UUID unchanged', () => {
      const canonicalUuid = '00000000-0000-0000-0000-000000000001';
      expect(toDbHotelId(canonicalUuid)).toBe(canonicalUuid);
    });

    it('should correctly match demo slug with canonical database UUID in isSameHotel', () => {
      expect(isSameHotel('hotel-001', '00000000-0000-0000-0000-000000000001')).toBe(true);
      expect(isSameHotel('00000000-0000-0000-0000-000000000001', 'hotel-001')).toBe(true);
      expect(isSameHotel('hotel-001', 'hotel-001')).toBe(true);
      expect(isSameHotel('hotel-001', 'hotel-002')).toBe(false);
      expect(isSameHotel('hotel-001', '00000000-0000-0000-0000-000000000002')).toBe(false);
    });

    it('should validate RFC4122 UUID format accurately', () => {
      expect(isUuid('00000000-0000-0000-0000-000000000001')).toBe(true);
      expect(isUuid('c0326d9e-1f7c-4824-9ea0-42cf05d53531')).toBe(true);
      expect(isUuid('hotel-001')).toBe(false);
      expect(isUuid('ord-002')).toBe(false);
      expect(isUuid('')).toBe(false);
      expect(isUuid(null)).toBe(false);
    });
  });

  describe('Kitchen Display Active Orders & Completed Dismissal', () => {
    it('should exclude DELIVERED and CANCELLED orders from getActive', () => {
      const active = orderService.getActive('hotel-001');
      const hasDelivered = active.some(o => o.status === 'DELIVERED');
      const hasCancelled = active.some(o => o.status === 'CANCELLED');
      expect(hasDelivered).toBe(false);
      expect(hasCancelled).toBe(false);
    });

    it('should clear all completed and delivered orders via clearCompleted', () => {
      const order = orderService.create({
        hotel_id: 'hotel-001',
        room_number: '101',
        status: 'PENDING',
        type: 'ROOM_SERVICE',
        charge_to_room: true,
        subtotal: 500,
        tax_amount: 25,
        total: 525,
        items: [{ menu_item_id: 'mi-001', name: 'Paneer Tikka', quantity: 1, unit_price: 500, tax_percent: 5, total: 525 }],
      });

      orderService.updateStatus(order.id, 'DELIVERED');
      expect(orderService.getById(order.id)?.status).toBe('DELIVERED');

      orderService.clearCompleted('hotel-001');
      expect(orderService.getById(order.id)).toBeUndefined();
    });

    it('should successfully update status of non-UUID demo order without throwing', async () => {
      const updated = await orderService.updateStatusAsync('ord-002', 'READY');
      expect(updated).toBeDefined();
      expect(updated?.status).toBe('READY');
    });
  });

  describe('Super Admin User Management & Membership Reassignment', () => {
    it('should allow Super Admin to reassign hotel membership', () => {
      const profiles = staffService.getAllProfiles();
      const testUser = profiles.find(p => p.role === 'RECEPTION') || profiles[0];
      expect(testUser).toBeDefined();

      const updatedMem = staffService.updateMembership(testUser.user_id, 'hotel-002', 'RECEPTION');
      expect(updatedMem.hotel_id).toBe('hotel-002');

      const mem = staffService.getMembership(testUser.user_id, 'hotel-002');
      expect(mem).toBeDefined();
      expect(mem?.hotel_id).toBe('hotel-002');
    });

    it('should allow Super Admin to update user profile details', () => {
      const profiles = staffService.getAllProfiles();
      const testUser = profiles[0];

      staffService.updateProfile(testUser.user_id, {
        full_name: 'Updated Manager Name',
        phone: '+91 99999 88888',
      });

      const updated = staffService.getById(testUser.user_id);
      expect(updated?.full_name).toBe('Updated Manager Name');
      expect(updated?.phone).toBe('+91 99999 88888');
    });

    it('should delete membership when user is converted to Super Admin', () => {
      const profiles = staffService.getAllProfiles();
      const testUser = profiles.find(p => p.role !== 'SUPER_ADMIN') || profiles[1];

      staffService.deleteMembership(testUser.user_id);
      const memberships = staffService.getAllMemberships();
      expect(memberships.some(m => m.user_id === testUser.user_id)).toBe(false);
    });
  });
});
