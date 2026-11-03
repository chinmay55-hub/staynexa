// StayNexa Order Service
// Handles direct Supabase PostgreSQL persistence and real-time synchronization

import { supabase, isSupabaseConfigured, isDemoMode } from '../lib/supabase';
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
  removeLocal?: (id: string) => void;
  attachToFolio?: (order: Order) => void;
  detachFromFolio?: (order: Order) => void;
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

type GuestOrderInput = Omit<Order, 'id' | 'created_at' | 'updated_at' | 'items'> & {
  items: Omit<OrderItem, 'id' | 'order_id'>[];
  room_number?: string;
  token?: string;
};

type PlaceOrderResult = { success: boolean; order: Order; trackingToken?: string; error?: string };

const placedOrderRequests = new Map<string, Promise<PlaceOrderResult>>();

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

  removeOrder: (id: string): void => {
    if (storeAdapter?.removeLocal) {
      storeAdapter.removeLocal(id);
    } else {
      const idx = fallbackOrders.findIndex(o => o.id === id);
      if (idx !== -1) fallbackOrders.splice(idx, 1);
    }
  },

  clearCompleted: (hotelId: string): void => {
    const all = orderService.getAll(hotelId);
    all.forEach(o => {
      if (o.status === 'DELIVERED' || o.status === 'CANCELLED') {
        if (storeAdapter?.removeLocal) {
          storeAdapter.removeLocal(o.id);
        }
      }
    });
  },

  create: (data: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'items'> & { 
    items: Omit<OrderItem, 'id' | 'order_id'>[];
    room_number?: string;
  }): Order => {
    const orderId = generateId();
    const order: Order = {
      ...data,
      id: orderId,
      status: data.status || 'PENDING',
      room_number: data.room_number,
      total_amount: data.total,
      payment_status: data.charge_to_room === false ? 'pending_payment' : 'unpaid',
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

    // Direct write to Supabase if configured and not in demo mode
    if (!isDemoMode() && isSupabaseConfigured() && supabase) {
      (async () => {
        try {
          const { error: insertErr } = await supabase.from('orders').insert({
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
          if (insertErr) throw insertErr;
        } catch (err: any) {
          console.error('[orderService.create] Supabase insert error:', err);
          // SEC-01: Honest rollback of optimistic local state
          if (storeAdapter?.removeLocal) {
            storeAdapter.removeLocal(order.id);
          } else {
            const idx = fallbackOrders.findIndex(o => o.id === order.id);
            if (idx !== -1) fallbackOrders.splice(idx, 1);
          }
          if (order.charge_to_room !== false && storeAdapter?.detachFromFolio) {
            storeAdapter.detachFromFolio(order);
          }
          const errMsg = err?.message || String(err);
          realtimeSync.emit('MUTATION_FAILED', {
            entity: 'order',
            id: order.id,
            error: errMsg,
          });
          if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(
              new CustomEvent('staynexa_mutation_error', {
                detail: { entity: 'order', id: order.id, error: errMsg },
              })
            );
          }
        }
      })();
    }

    realtimeSync.emit('NEW_ORDER', { order });
    return order;
  },

  createAsync: async (data: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'items'> & { 
    items: Omit<OrderItem, 'id' | 'order_id'>[];
    room_number?: string;
  }): Promise<Order> => {
    if (isDemoMode() || !isSupabaseConfigured() || !supabase) {
      return orderService.create(data);
    }

    const orderId = generateId();
    const order: Order = {
      ...data,
      id: orderId,
      status: data.status || 'PENDING',
      room_number: data.room_number,
      total_amount: data.total,
      payment_status: data.charge_to_room === false ? 'pending_payment' : 'unpaid',
      created_at: nowISO(),
      updated_at: nowISO(),
      items: data.items.map((item, idx) => ({ ...item, id: `oi-${orderId}-${idx}`, order_id: orderId })),
    };

    const { error: insertErr } = await supabase.from('orders').insert({
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

    if (insertErr) {
      throw new Error(`Failed to persist order to database: ${insertErr.message}`);
    }

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
    } else {
      fallbackOrders.unshift(order);
    }

    realtimeSync.emit('NEW_ORDER', { order });
    return order;
  },

  updateStatus: (id: string, status: OrderStatus): Order | undefined => {
    const previousOrder = orderService.getById(id);
    const previousStatus = previousOrder?.status;

    const timeFields: Partial<Order> = {};
    if (status === 'ACCEPTED') timeFields.accepted_at = nowISO();
    if (status === 'PREPARING') timeFields.preparing_at = nowISO();
    if (status === 'READY') timeFields.ready_at = nowISO();
    if (status === 'DELIVERED') timeFields.delivered_at = nowISO();
    if (status === 'CANCELLED') {
      timeFields.payment_status = 'cancelled';
    }

    let updated: Order | undefined;
    if (storeAdapter) {
      updated = storeAdapter.updateLocal(id, status, timeFields);
      if (updated && (status === 'DELIVERED' || status === 'READY') && updated.charge_to_room !== false && storeAdapter.attachToFolio) {
        storeAdapter.attachToFolio(updated);
      } else if (updated && status === 'CANCELLED' && storeAdapter.detachFromFolio) {
        storeAdapter.detachFromFolio(updated);
      }
    } else {
      const idx = fallbackOrders.findIndex(o => o.id === id);
      if (idx !== -1) {
        fallbackOrders[idx] = { ...fallbackOrders[idx], status, ...timeFields, updated_at: nowISO() };
        updated = fallbackOrders[idx];
      }
    }

    // Direct write to Supabase PostgreSQL table
    if (!isDemoMode() && isSupabaseConfigured() && supabase) {
      (async () => {
        try {
          const { error: updateErr } = await supabase
            .from('orders')
            .update({
              status: status.toUpperCase(),
              ...timeFields,
              updated_at: nowISO(),
            })
            .eq('id', id);
          if (updateErr) throw updateErr;
        } catch (err: any) {
          if (err?.code === '22P02' || (typeof err?.message === 'string' && err.message.includes('invalid input syntax for type uuid'))) {
            return;
          }
          console.error('[orderService.updateStatus] Supabase error:', err);
          // SEC-01: Revert optimistic state back to previousStatus
          if (previousStatus && storeAdapter) {
            storeAdapter.updateLocal(id, previousStatus, {});
            const restored = orderService.getById(id);
            if (restored) {
              if (status === 'CANCELLED' && restored.charge_to_room !== false && storeAdapter.attachToFolio) {
                storeAdapter.attachToFolio(restored);
              } else if ((status === 'DELIVERED' || status === 'READY') && storeAdapter.detachFromFolio) {
                storeAdapter.detachFromFolio(restored);
              }
              realtimeSync.emit('ORDER_STATUS_CHANGED', { orderId: id, status: previousStatus, order: restored });
            }
          }
          const errMsg = err?.message || String(err);
          realtimeSync.emit('MUTATION_FAILED', {
            entity: 'order',
            id,
            error: errMsg,
          });
          if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(
              new CustomEvent('staynexa_mutation_error', {
                detail: { entity: 'order', id, error: errMsg },
              })
            );
          }
        }
      })();
    }

    if (updated) {
      realtimeSync.emit('ORDER_STATUS_CHANGED', { orderId: id, status, order: updated });
    }
    return updated;
  },

  updateStatusAsync: async (id: string, status: OrderStatus): Promise<Order | undefined> => {
    if (isDemoMode() || !isSupabaseConfigured() || !supabase) {
      return orderService.updateStatus(id, status);
    }

    const timeFields: Partial<Order> = {};
    if (status === 'ACCEPTED') timeFields.accepted_at = nowISO();
    if (status === 'PREPARING') timeFields.preparing_at = nowISO();
    if (status === 'READY') timeFields.ready_at = nowISO();
    if (status === 'DELIVERED') timeFields.delivered_at = nowISO();
    if (status === 'CANCELLED') {
      timeFields.payment_status = 'cancelled';
    }

    const updatePayload = {
      status: status.toUpperCase(),
      ...timeFields,
      updated_at: nowISO(),
    };

    let updateErr: any = null;
    try {
      const res = await supabase.from('orders').update(updatePayload).eq('id', id);
      updateErr = res.error;
    } catch (fetchErr: any) {
      // Retry once on transient network glitch or connection reset
      try {
        await new Promise(r => setTimeout(r, 200));
        const res = await supabase.from('orders').update(updatePayload).eq('id', id);
        updateErr = res.error;
      } catch (retryErr: any) {
        updateErr = retryErr || fetchErr;
      }
    }

    if (updateErr) {
      if (updateErr.code === '22P02' || (typeof updateErr.message === 'string' && updateErr.message.includes('invalid input syntax for type uuid'))) {
        return orderService.updateStatus(id, status);
      }
      throw new Error(`Failed to update order status in database: ${updateErr?.message || updateErr}`);
    }

    let updated: Order | undefined;
    if (storeAdapter) {
      updated = storeAdapter.updateLocal(id, status, timeFields);
      if (updated && (status === 'DELIVERED' || status === 'READY') && updated.charge_to_room !== false && storeAdapter.attachToFolio) {
        storeAdapter.attachToFolio(updated);
      } else if (updated && status === 'CANCELLED' && storeAdapter.detachFromFolio) {
        storeAdapter.detachFromFolio(updated);
      }
    } else {
      const idx = fallbackOrders.findIndex(o => o.id === id);
      if (idx !== -1) {
        fallbackOrders[idx] = { ...fallbackOrders[idx], status, ...timeFields, updated_at: nowISO() };
        updated = fallbackOrders[idx];
      }
    }

    if (updated) {
      realtimeSync.emit('ORDER_STATUS_CHANGED', { orderId: id, status, order: updated });
    }
    return updated;
  },

  /**
   * SECURE GUEST ORDER DISPATCH
   * Routes guest orders strictly through the server-validated create_guest_order RPC
   * when Supabase is configured. Prices and tenant integrity are verified server-side.
   * Falls back to local in-memory store in demo/offline mode.
   */
  placeOrder: (data: GuestOrderInput & { idempotencyKey?: string }): Promise<PlaceOrderResult> => {
    const key = data.idempotencyKey;
    if (!key) return orderService.dispatchGuestOrder(data);
    const existing = placedOrderRequests.get(key);
    if (existing) return existing;
    const pending = orderService.dispatchGuestOrder(data).then(res => {
      if (!res.success) placedOrderRequests.delete(key);
      return res;
    });
    placedOrderRequests.set(key, pending);
    return pending;
  },

  dispatchGuestOrder: async (data: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'items'> & { 
    items: Omit<OrderItem, 'id' | 'order_id'>[];
    room_number?: string;
    token?: string;
  }): Promise<{ success: boolean; order: Order; trackingToken?: string; error?: string }> => {
    try {
      if (!data.hotel_id) throw new Error('Missing hotel identifier.');
      if (!data.items || data.items.length === 0) throw new Error('Order must contain at least 1 menu item.');

      // 1. Validated Supabase Order RPC (Connected Mode)
      if (isSupabaseConfigured() && supabase) {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('create_guest_order', {
          p_token: data.token || '',
          p_type: data.type || 'ROOM_SERVICE',
          p_charge_to_room: data.charge_to_room ?? true,
          p_special_instructions: data.special_instructions || null,
          p_items: data.items.map(it => ({
            menu_item_id: it.menu_item_id,
            quantity: it.quantity,
            notes: it.notes || null,
          })),
        });

                if (rpcErr || !rpcData) {
          throw new Error(rpcErr?.message || 'Server order validation failed');
        }

        const finalOrder: Order = {
          id: rpcData.id,
          hotel_id: rpcData.hotel_id,
          room_id: rpcData.room_id || data.room_id,
          room_number: rpcData.room_number || data.room_number,
          guest_id: rpcData.guest_id || data.guest_id,
          reservation_id: rpcData.reservation_id || data.reservation_id,
          type: rpcData.type || data.type || 'ROOM_SERVICE',
          status: (rpcData.status || 'PENDING') as OrderStatus,
          payment_status: rpcData.payment_status || (data.charge_to_room === false ? 'pending_payment' : 'unpaid'),
          subtotal: Number(rpcData.subtotal ?? data.subtotal),
          tax_amount: Number(rpcData.tax_amount ?? data.tax_amount),
          total: Number(rpcData.total ?? data.total),
          total_amount: Number(rpcData.total_amount ?? rpcData.total ?? data.total),
          charge_to_room: rpcData.charge_to_room ?? (data.charge_to_room ?? true),
          special_instructions: rpcData.special_instructions || data.special_instructions || null,
          created_at: rpcData.created_at || nowISO(),
          updated_at: rpcData.updated_at || nowISO(),
          items: Array.isArray(rpcData.items) && rpcData.items.length > 0 
            ? rpcData.items.map((it: any, idx: number) => ({
                id: it.id || `oi-${rpcData.id}-${idx}`,
                order_id: rpcData.id,
                menu_item_id: it.menu_item_id,
                name: it.name,
                quantity: it.quantity,
                unit_price: Number(it.unit_price),
                tax_percent: Number(it.tax_percent || 5),
                total: Number(it.total),
                notes: it.notes || null,
              }))
            : data.items.map((it, idx) => ({
                ...it,
                id: `oi-${rpcData.id}-${idx}`,
                order_id: rpcData.id,
              })),
        };

        // Mirror order into local store adapter for same-tab instant reactivity
        if (storeAdapter) {
          storeAdapter.createLocal(finalOrder);
        }

        // Broadcast Realtime Event locally
        realtimeSync.emit('NEW_ORDER', { order: finalOrder });

        return { 
          success: true, 
          order: finalOrder, 
          trackingToken: rpcData.tracking_token 
        };
      }

      // 2. Offline / Mock fallback ONLY when Supabase credentials are not configured
      const localOrder = orderService.create(data);
      return { 
        success: true, 
        order: localOrder, 
        trackingToken: 'demo-track-' + localOrder.id 
      };
    } catch (err: any) {
      return { success: false, order: null as any, error: err?.message || 'Failed to dispatch order.' };
    }
  },

  /**
   * Fetch authenticated status of a guest order using tracking token
   */
  fetchGuestOrderStatus: async (orderId: string, trackingToken: string): Promise<any> => {
    const isUUID = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    if (isSupabaseConfigured() && supabase) {
      if (!isUUID(orderId) || !isUUID(trackingToken)) {
        // Safe rejection: invalid UUID tokens cannot match database records
        return null;
      }
      const { data, error } = await supabase.rpc('get_guest_order_status', {
        p_order_id: orderId,
        p_tracking_token: trackingToken,
      });
      if (error) {
        throw new Error(error.message);
      }
      return data;
    }
    // Offline/demo fallback
    if (storeAdapter) {
      return storeAdapter.getById(orderId);
    }
    return fallbackOrders.find(o => o.id === orderId);
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
