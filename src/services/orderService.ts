// StayNexa Order Service
// Handles direct Supabase PostgreSQL persistence and real-time synchronization

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { realtimeSync } from './realtimeSync';
import type { Order, OrderItem, OrderStatus } from '../types';

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // fallback
    }
  }
  return 'ord-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36);
}

function nowISO(): string {
  return new Date().toISOString();
}

export type StoreAdapter = {
  getAll: (hotelId: string) => Order[];
  getById: (id: string) => Order | undefined;
  getActive: (hotelId: string) => Order[];
  createLocal: (order: Order) => void;
  updateLocal: (id: string, status: OrderStatus, timeFields: Partial<Order>) => Order | undefined;
  attachToFolio?: (order: Order) => void;
  addNotification?: (notif: any) => void;
  addActivityLog?: (log: any) => void;
};

let storeAdapter: StoreAdapter | null = null;
const fallbackOrders: Order[] = [];

/**
 * Register the local in-memory store adapter for demo / local offline synchronization
 */
export function registerOrderStoreAdapter(adapter: StoreAdapter) {
  storeAdapter = adapter;
}

export const orderService = {
  getAll: (hotelId: string): Order[] => {
    if (storeAdapter) return storeAdapter.getAll(hotelId);
    return fallbackOrders.filter(o => o.hotel_id === hotelId);
  },

  getById: (id: string): Order | undefined => {
    if (storeAdapter) return storeAdapter.getById(id);
    return fallbackOrders.find(o => o.id === id);
  },

  getActive: (hotelId: string): Order[] => {
    if (storeAdapter) return storeAdapter.getActive(hotelId);
    return fallbackOrders.filter(o => o.hotel_id === hotelId && !['DELIVERED', 'CANCELLED', 'completed'].includes(o.status));
  },

  create: (data: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'items'> & { 
    items: Omit<OrderItem, 'id' | 'order_id'>[];
    room_number?: string;
  }): Order => {
    const orderId = generateId();
    const order: Order = {
      ...data,
      id: orderId,
      room_number: data.room_number,
      total_amount: data.total,
      payment_status: data.charge_to_room === false ? 'paid' : 'unpaid',
      created_at: nowISO(),
      updated_at: nowISO(),
      items: data.items.map((item, idx) => ({ ...item, id: `oi-${orderId}-${idx}`, order_id: orderId })),
    };

    if (storeAdapter) {
      storeAdapter.createLocal(order);
      if (data.charge_to_room !== false && storeAdapter.attachToFolio) {
        storeAdapter.attachToFolio(order);
      }
      if (storeAdapter.addNotification) {
        storeAdapter.addNotification({
          id: generateId(),
          hotel_id: data.hotel_id,
          type: 'ORDER',
          title: `New Order: Room ${order.room_number || order.room_id || 'Portal'}`,
          message: `${order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')} (Total: ₹${order.total})`,
          is_read: false,
          link: '/kds',
          created_at: nowISO(),
        });
      }
      if (storeAdapter.addActivityLog) {
        storeAdapter.addActivityLog({
          id: generateId(),
          hotel_id: data.hotel_id,
          actor_name: 'Guest QR Portal',
          action: 'ORDER_PLACED',
          entity_type: 'ORDER',
          entity_id: order.id,
          metadata: { total: order.total, room: order.room_number, items_count: order.items.length },
          created_at: nowISO(),
        });
      }
    } else {
      fallbackOrders.unshift(order);
    }

    // Direct write to Supabase if configured
    if (isSupabaseConfigured() && supabase) {
      (async () => {
        try {
          await supabase.from('orders').insert({
            id: order.id,
            hotel_id: order.hotel_id,
            room_id: order.room_id || null,
            room_number: order.room_number || null,
            guest_id: order.guest_id || null,
            reservation_id: order.reservation_id || null,
            type: order.type || 'ROOM_SERVICE',
            status: 'PENDING',
            payment_status: order.payment_status || 'unpaid',
            subtotal: order.subtotal,
            tax_amount: order.tax_amount,
            total: order.total,
            total_amount: order.total,
            items: order.items,
            charge_to_room: order.charge_to_room ?? true,
            special_instructions: order.special_instructions || null,
            created_at: order.created_at,
            updated_at: order.updated_at,
          });
        } catch (err) {
          console.warn('[orderService.create] Supabase insert background error:', err);
        }
      })();
    }

    realtimeSync.emit('NEW_ORDER', { order });
    return order;
  },

  updateStatus: (id: string, status: OrderStatus): Order | undefined => {
    const timeFields: Partial<Order> = {};
    if (status === 'ACCEPTED') timeFields.accepted_at = nowISO();
    if (status === 'PREPARING') timeFields.preparing_at = nowISO();
    if (status === 'READY') timeFields.ready_at = nowISO();
    if (status === 'DELIVERED') timeFields.delivered_at = nowISO();

    let updated: Order | undefined;
    if (storeAdapter) {
      updated = storeAdapter.updateLocal(id, status, timeFields);
      if (updated && (status === 'DELIVERED' || status === 'READY') && updated.charge_to_room !== false && storeAdapter.attachToFolio) {
        storeAdapter.attachToFolio(updated);
      }
    } else {
      const idx = fallbackOrders.findIndex(o => o.id === id);
      if (idx !== -1) {
        fallbackOrders[idx] = { ...fallbackOrders[idx], status, ...timeFields, updated_at: nowISO() };
        updated = fallbackOrders[idx];
      }
    }

    // Direct write to Supabase PostgreSQL table
    if (isSupabaseConfigured() && supabase) {
      (async () => {
        try {
          await supabase
            .from('orders')
            .update({
              status: status.toUpperCase(),
              ...timeFields,
              updated_at: nowISO(),
            })
            .eq('id', id);
        } catch (err) {
          console.error('[orderService.updateStatus] Supabase error:', err);
        }
      })();
    }

    if (updated) {
      realtimeSync.emit('ORDER_STATUS_CHANGED', { orderId: id, status, order: updated });
    }
    return updated;
  },

  /**
   * FORCE DIRECT SUPABASE ORDER PERSISTENCE
   * Directly writes order to Supabase public.orders and order_items tables.
   * Does NOT fall back to local demo mocks when Supabase credentials are configured.
   */
  placeOrder: async (data: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'items'> & { 
    items: Omit<OrderItem, 'id' | 'order_id'>[];
    room_number?: string;
  }): Promise<{ success: boolean; order: Order; error?: string }> => {
    try {
      if (!data.hotel_id) throw new Error('Missing hotel identifier.');
      if (!data.items || data.items.length === 0) throw new Error('Order must contain at least 1 menu item.');

      // 1. Direct Supabase Order Persistence (Connected Mode)
      if (isSupabaseConfigured() && supabase) {
        const orderId = generateId();
        const currentTime = nowISO();
        const resolvedRoomNumber = data.room_number || (data.room_id ? data.room_id : undefined);

        const orderPayload = {
          id: orderId,
          hotel_id: data.hotel_id,
          room_id: data.room_id || null,
          room_number: resolvedRoomNumber || null,
          guest_id: data.guest_id || null,
          reservation_id: data.reservation_id || null,
          type: data.type || 'ROOM_SERVICE',
          status: 'PENDING',
          payment_status: data.charge_to_room === false ? 'paid' : 'unpaid',
          subtotal: data.subtotal,
          tax_amount: data.tax_amount,
          total: data.total,
          total_amount: data.total,
          charge_to_room: data.charge_to_room ?? true,
          special_instructions: data.special_instructions || null,
          items: data.items,
          created_at: currentTime,
          updated_at: currentTime,
        };

        console.log('[orderService.placeOrder] Inserting order into Supabase public.orders:', orderPayload);

        // Perform direct Supabase PostgreSQL table insertion
        let insertedOrder: any = null;
        const { data: directData, error: directErr } = await supabase
          .from('orders')
          .insert(orderPayload)
          .select()
          .maybeSingle();

        if (directErr || !directData) {
          console.warn('[orderService.placeOrder] Direct insert warning, attempting RPC fallback:', directErr);
          // Attempt SECURITY DEFINER RPC create_guest_order
          const { data: rpcData, error: rpcErr } = await supabase.rpc('create_guest_order', {
            p_hotel_id: data.hotel_id,
            p_room_id: data.room_id || null,
            p_room_number: resolvedRoomNumber || null,
            p_guest_id: data.guest_id || null,
            p_reservation_id: data.reservation_id || null,
            p_type: data.type || 'ROOM_SERVICE',
            p_subtotal: data.subtotal,
            p_tax_amount: data.tax_amount,
            p_total: data.total,
            p_charge_to_room: data.charge_to_room ?? true,
            p_special_instructions: data.special_instructions || null,
            p_payment_status: data.charge_to_room === false ? 'paid' : 'unpaid',
            p_items: data.items || [],
          });

          if (rpcErr || !rpcData) {
            console.error('[orderService.placeOrder] Both direct insert and RPC failed:', directErr || rpcErr);
            throw new Error(directErr?.message || rpcErr?.message || 'Database order insertion failed');
          }
          insertedOrder = rpcData;
        } else {
          insertedOrder = directData;
        }

        const finalOrder: Order = {
          ...orderPayload,
          ...(insertedOrder || {}),
          status: 'PENDING',
          items: data.items.map((it, idx) => ({
            ...it,
            id: `oi-${orderId}-${idx}`,
            order_id: orderId,
          })),
        };

        // Insert items into public.order_items table
        if (data.items && data.items.length > 0) {
          try {
            const lineItems = data.items.map(item => ({
              order_id: finalOrder.id,
              hotel_id: data.hotel_id,
              menu_item_id: item.menu_item_id || null,
              name: item.name,
              quantity: item.quantity,
              unit_price: item.unit_price,
              tax_percent: item.tax_percent || 5,
              total: item.total,
              notes: item.notes || null,
            }));
            await supabase.from('order_items').insert(lineItems);
          } catch (itemErr) {
            console.warn('[orderService.placeOrder] order_items insert warning:', itemErr);
          }
        }

        // Mirror order into local store adapter for same-tab instant reactivity
        if (storeAdapter) {
          storeAdapter.createLocal(finalOrder);
        }

        // Broadcast Realtime Event
        realtimeSync.emit('NEW_ORDER', { order: finalOrder });

        return { success: true, order: finalOrder };
      }

      // 2. Offline / Mock fallback ONLY when Supabase credentials are not configured
      const localOrder = orderService.create(data);
      return { success: true, order: localOrder };
    } catch (err: any) {
      console.error('[orderService.placeOrder] Failed:', err);
      return { success: false, order: null as any, error: err?.message || 'Failed to dispatch order.' };
    }
  },

  /**
   * Fetch orders directly from Supabase PostgreSQL orders table
   */
  fetchDirectOrders: async (hotelId: string): Promise<Order[]> => {
    if (!supabase || !isSupabaseConfigured()) {
      return orderService.getAll(hotelId);
    }
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('hotel_id', hotelId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map((o: any) => ({
          ...o,
          status: (o.status || 'PENDING').toUpperCase() as OrderStatus,
          items: Array.isArray(o.items) ? o.items : [],
          room: o.room_number ? { number: o.room_number } : undefined,
        }));
      }
    } catch (err) {
      console.warn('[orderService.fetchDirectOrders] Error:', err);
    }
    return orderService.getAll(hotelId);
  },
};
