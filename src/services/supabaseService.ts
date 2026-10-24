// StayNexa Production Supabase Service Layer
// Implements direct PostgreSQL queries via Supabase client with Row Level Security (RLS)
// Strictly isolated by tenant context and authenticated user session

import { supabase } from '../lib/supabase';
import type { 
  Hotel, HotelBranding, HotelSettings, RoomType, Room, Guest, 
  Reservation, Folio, FolioItem, Payment, Order, OrderItem, HousekeepingTask, 
  MaintenanceTicket, QRCode, Subscription, ServiceRequest, Notification, ActivityLog
} from '../types';

/**
 * Helper to ensure Supabase client is available in production
 */
function getClient() {
  if (!supabase) {
    throw new Error('Supabase client is not initialized. Please verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
}

// ─── Hotels & Settings ─────────────────────────────────────────────────────────

export const supabaseHotelService = {
  async getAll(): Promise<Hotel[]> {
    const client = getClient();
    const { data, error } = await client.from('hotels').select('*').order('name');
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Hotel | null> {
    const client = getClient();
    const { data, error } = await client.from('hotels').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async getBranding(hotelId: string): Promise<HotelBranding | null> {
    const client = getClient();
    const { data, error } = await client.from('hotel_branding').select('*').eq('hotel_id', hotelId).maybeSingle();
    if (error) throw error;
    return data;
  },

  async getSettings(hotelId: string): Promise<HotelSettings | null> {
    const client = getClient();
    const { data, error } = await client.from('hotel_settings').select('*').eq('hotel_id', hotelId).maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(data: Omit<Hotel, 'id' | 'created_at' | 'updated_at'>): Promise<Hotel> {
    const client = getClient();
    const { data: hotel, error } = await client
      .from('hotels')
      .insert({
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return hotel;
  },

  async update(id: string, updates: Partial<Hotel>): Promise<Hotel> {
    const client = getClient();
    const { data, error } = await client.from('hotels').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async updateBranding(hotelId: string, updates: Partial<HotelBranding>): Promise<HotelBranding> {
    const client = getClient();
    const { data, error } = await client
      .from('hotel_branding')
      .upsert({ hotel_id: hotelId, ...updates, updated_at: new Date().toISOString() }, { onConflict: 'hotel_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateSettings(hotelId: string, updates: Partial<HotelSettings>): Promise<HotelSettings> {
    const client = getClient();
    const { data, error } = await client
      .from('hotel_settings')
      .upsert({ hotel_id: hotelId, ...updates, updated_at: new Date().toISOString() }, { onConflict: 'hotel_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// ─── Rooms & Room Types ───────────────────────────────────────────────────────

export const supabaseRoomService = {
  async getAll(hotelId: string): Promise<Room[]> {
    const client = getClient();
    const { data, error } = await client.from('rooms').select('*, room_type:room_types(*)').eq('hotel_id', hotelId).order('number');
    if (error) throw error;
    return data || [];
  },

  async getTypes(hotelId: string): Promise<RoomType[]> {
    const client = getClient();
    const { data, error } = await client.from('room_types').select('*').eq('hotel_id', hotelId);
    if (error) throw error;
    return data || [];
  },

  async create(data: Omit<Room, 'id'>): Promise<Room> {
    const client = getClient();
    const { data: room, error } = await client
      .from('rooms')
      .insert({
        ...data,
        created_at: new Date().toISOString(),
      })
      .select('*, room_type:room_types(*)')
      .single();
    if (error) throw error;
    return room;
  },

  async update(roomId: string, updates: Partial<Room>): Promise<Room> {
    const client = getClient();
    const { data: room, error } = await client
      .from('rooms')
      .update(updates)
      .eq('id', roomId)
      .select('*, room_type:room_types(*)')
      .single();
    if (error) throw error;
    return room;
  },

  async createType(data: Omit<RoomType, 'id'>): Promise<RoomType> {
    const client = getClient();
    const { data: rt, error } = await client
      .from('room_types')
      .insert({
        ...data,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return rt;
  },

  async updateStatus(roomId: string, status: Room['status'], housekeepingStatus?: Room['housekeeping_status']): Promise<Room> {
    const client = getClient();
    const updates: Partial<Room> = { status };
    if (housekeepingStatus) updates.housekeeping_status = housekeepingStatus;
    const { data, error } = await client.from('rooms').update(updates).eq('id', roomId).select().single();
    if (error) throw error;
    return data;
  },
};

// ─── Guests ───────────────────────────────────────────────────────────────────

export const supabaseGuestService = {
  async getAll(hotelId: string): Promise<Guest[]> {
    const client = getClient();
    const { data, error } = await client.from('guests').select('*').eq('hotel_id', hotelId).order('first_name');
    if (error) throw error;
    return data || [];
  },

  async create(data: Omit<Guest, 'id' | 'created_at'>): Promise<Guest> {
    const client = getClient();
    const { data: guest, error } = await client
      .from('guests')
      .insert({
        ...data,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return guest;
  },

  async update(id: string, updates: Partial<Guest>): Promise<Guest> {
    const client = getClient();
    const { data: guest, error } = await client
      .from('guests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return guest;
  },
};

// ─── Reservations ─────────────────────────────────────────────────────────────

export const supabaseReservationService = {
  async getAll(hotelId: string): Promise<Reservation[]> {
    const client = getClient();
    const { data, error } = await client
      .from('reservations')
      .select('*, guest:guests(*), room:rooms(*), room_type:room_types(*)')
      .eq('hotel_id', hotelId)
      .order('check_in_date', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async checkIn(reservationId: string, roomId: string): Promise<Reservation> {
    const client = getClient();
    const now = new Date().toISOString();
    
    // Update reservation
    const { data: res, error: resErr } = await client
      .from('reservations')
      .update({ status: 'CHECKED_IN', room_id: roomId, actual_check_in: now })
      .eq('id', reservationId)
      .select()
      .single();
    if (resErr) throw resErr;

    // Update room status
    const { error: roomErr } = await client
      .from('rooms')
      .update({ status: 'OCCUPIED' })
      .eq('id', roomId);
    if (roomErr) throw roomErr;

    return res;
  },

  async checkOut(reservationId: string): Promise<Reservation> {
    const client = getClient();
    const now = new Date().toISOString();

    const { data: res, error: resErr } = await client
      .from('reservations')
      .update({ status: 'CHECKED_OUT', actual_check_out: now })
      .eq('id', reservationId)
      .select()
      .single();
    if (resErr) throw resErr;

    // Room becomes available but dirty
    if (res.room_id) {
      await client
        .from('rooms')
        .update({ status: 'AVAILABLE', housekeeping_status: 'DIRTY' })
        .eq('id', res.room_id);
    }

    return res;
  },

  async create(data: Omit<Reservation, 'id' | 'created_at' | 'updated_at'>): Promise<Reservation> {
    const client = getClient();
    const { guest, room, room_type, ...cleanData } = data as any;
    const { data: res, error } = await client
      .from('reservations')
      .insert({
        ...cleanData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*, guest:guests(*), room:rooms(*), room_type:room_types(*)')
      .single();
    if (error) throw error;
    return res;
  },

  async update(id: string, updates: Partial<Reservation>): Promise<Reservation> {
    const client = getClient();
    const { guest, room, room_type, ...cleanUpdates } = updates as any;
    const { data: res, error } = await client
      .from('reservations')
      .update({
        ...cleanUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, guest:guests(*), room:rooms(*), room_type:room_types(*)')
      .single();
    if (error) throw error;
    return res;
  },
};

// ─── Folios & Payments ────────────────────────────────────────────────────────

export const supabaseFolioService = {
  async getAll(hotelId: string): Promise<Folio[]> {
    const client = getClient();
    const { data, error } = await client.from('folios').select('*').eq('hotel_id', hotelId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Folio | null> {
    const client = getClient();
    const { data, error } = await client.from('folios').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(data: Omit<Folio, 'id' | 'created_at' | 'updated_at'>): Promise<Folio> {
    const client = getClient();
    const { data: folio, error } = await client
      .from('folios')
      .insert({
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return folio;
  },

  async getByReservation(reservationId: string): Promise<Folio | null> {
    const client = getClient();
    const { data, error } = await client.from('folios').select('*').eq('reservation_id', reservationId).maybeSingle();
    if (error) throw error;
    return data;
  },

  async getItems(folioId: string): Promise<FolioItem[]> {
    const client = getClient();
    const { data, error } = await client.from('folio_items').select('*').eq('folio_id', folioId).order('posted_at');
    if (error) throw error;
    return data || [];
  },

  async getPayments(folioId: string): Promise<Payment[]> {
    const client = getClient();
    const { data, error } = await client.from('payments').select('*').eq('folio_id', folioId).order('created_at');
    if (error) throw error;
    return data || [];
  },

  async addCharge(item: Omit<FolioItem, 'id'>): Promise<FolioItem> {
    const client = getClient();
    const { data, error } = await client.from('folio_items').insert(item).select().single();
    if (error) throw error;
    return data;
  },

  async addPayment(payment: Omit<Payment, 'id' | 'created_at'>): Promise<Payment> {
    const client = getClient();
    const { data, error } = await client.from('payments').insert(payment).select().single();
    if (error) throw error;
    return data;
  },
};

// ─── Orders & KDS ─────────────────────────────────────────────────────────────

export const supabaseOrderService = {
  async getAll(hotelId: string): Promise<Order[]> {
    const client = getClient();
    try {
      const { data, error } = await client
        .from('orders')
        .select('*, items:order_items(*), room:rooms(*), guest:guests(*)')
        .eq('hotel_id', hotelId)
        .order('created_at', { ascending: false });
      if (!error && data) return data;
    } catch {
      // Graceful fallback to simple select without joins
    }

    try {
      const { data, error } = await client
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('hotel_id', hotelId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch {
      const { data, error } = await client
        .from('orders')
        .select('*')
        .eq('hotel_id', hotelId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(o => ({ ...o, items: [] }));
    }
  },

  async create(orderData: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'items'> & { items: Omit<OrderItem, 'id' | 'order_id'>[] }): Promise<Order> {
    const client = getClient();
    const { items, ...orderRecord } = orderData;
    
    // 1. Try public SECURITY DEFINER RPC endpoint 'create_guest_order'
    try {
      const { data: rpcData, error: rpcErr } = await client.rpc('create_guest_order', {
        p_hotel_id: orderRecord.hotel_id,
        p_room_id: orderRecord.room_id || null,
        p_guest_id: orderRecord.guest_id || null,
        p_reservation_id: orderRecord.reservation_id || null,
        p_type: orderRecord.type || 'ROOM_SERVICE',
        p_subtotal: orderRecord.subtotal,
        p_tax_amount: orderRecord.tax_amount,
        p_total: orderRecord.total,
        p_charge_to_room: orderRecord.charge_to_room ?? true,
        p_special_instructions: orderRecord.special_instructions || null,
        p_items: items || [],
      });
      if (!rpcErr && rpcData && rpcData.id) {
        return rpcData as Order;
      }
    } catch (rpcException) {
      console.warn('[supabaseOrderService] RPC create_guest_order fallback to direct query:', rpcException);
    }

    // 2. Direct Table Insert into public.orders
    let order: Order;
    const { data: insertedOrder, error: orderErr } = await client
      .from('orders')
      .insert({
        ...orderRecord,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*, room:rooms(*), guest:guests(*)')
      .maybeSingle();

    if (orderErr || !insertedOrder) {
      // Retry without nested joins if foreign key RLS blocked the select
      const { data: simpleOrder, error: simpleErr } = await client
        .from('orders')
        .insert({
          ...orderRecord,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (simpleErr) throw simpleErr;
      order = simpleOrder as Order;
    } else {
      order = insertedOrder as Order;
    }

    // 3. Insert items into public.order_items
    if (items && items.length > 0) {
      const itemsToInsert = items.map(item => ({
        ...item,
        order_id: order.id,
        hotel_id: order.hotel_id,
      }));
      const { data: insertedItems, error: itemsErr } = await client
        .from('order_items')
        .insert(itemsToInsert)
        .select();
      if (!itemsErr && insertedItems) {
        order.items = insertedItems;
      } else {
        order.items = items.map((it, idx) => ({ ...it, id: `item-${idx}`, order_id: order.id } as OrderItem));
      }
    } else {
      order.items = [];
    }

    // 4. Log to activity_logs (non-blocking)
    (async () => {
      try {
        await client.from('activity_logs').insert({
          hotel_id: order.hotel_id,
          actor_name: 'Guest QR Portal',
          action: 'ORDER_PLACED',
          entity_type: 'ORDER',
          entity_id: order.id,
          metadata: { total: order.total, type: order.type, room_id: order.room_id },
          created_at: new Date().toISOString(),
        });
      } catch {
        // Non-blocking log catch
      }
    })();

    return order;
  },

  async updateStatus(orderId: string, status: Order['status']): Promise<Order> {
    const client = getClient();
    const updates: Partial<Order> = { status };
    if (status === 'ACCEPTED') updates.accepted_at = new Date().toISOString();
    if (status === 'PREPARING') updates.preparing_at = new Date().toISOString();
    if (status === 'READY') updates.ready_at = new Date().toISOString();
    if (status === 'DELIVERED') updates.delivered_at = new Date().toISOString();
    const { data, error } = await client.from('orders').update(updates).eq('id', orderId).select('*, items:order_items(*)').single();
    if (error) throw error;
    return data;
  },
};

// ─── Guest Service Requests ───────────────────────────────────────────────────

export const supabaseServiceRequestService = {
  async getAll(hotelId: string): Promise<ServiceRequest[]> {
    const client = getClient();
    const { data, error } = await client
      .from('service_requests')
      .select('*, room:rooms(*), guest:guests(*), service:hotel_services(*)')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(data: Omit<ServiceRequest, 'id' | 'created_at' | 'updated_at'>): Promise<ServiceRequest> {
    const client = getClient();
    const { data: request, error } = await client
      .from('service_requests')
      .insert({
        ...data,
        status: data.status || 'PENDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*, room:rooms(*), guest:guests(*), service:hotel_services(*)')
      .single();
    if (error) throw error;

    // Log to activity_logs
    await client.from('activity_logs').insert({
      hotel_id: data.hotel_id,
      actor_name: 'Guest QR Portal',
      action: 'SERVICE_REQUEST_CREATED',
      entity_type: 'SERVICE_REQUEST',
      entity_id: request.id,
      metadata: { title: request.title, priority: request.priority, room_id: request.room_id },
      created_at: new Date().toISOString(),
    });

    return request;
  },

  async update(id: string, updates: Partial<ServiceRequest>): Promise<ServiceRequest> {
    const client = getClient();
    const { data, error } = await client
      .from('service_requests')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, room:rooms(*), guest:guests(*), service:hotel_services(*)')
      .single();
    if (error) throw error;
    return data;
  },
};

// ─── Housekeeping Tasks ───────────────────────────────────────────────────────

export const supabaseHousekeepingService = {
  async getTasks(hotelId: string): Promise<HousekeepingTask[]> {
    const client = getClient();
    const { data, error } = await client
      .from('housekeeping_tasks')
      .select('*, room:rooms(*)')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createTask(data: Omit<HousekeepingTask, 'id' | 'created_at'>): Promise<HousekeepingTask> {
    const client = getClient();
    const { data: task, error } = await client
      .from('housekeeping_tasks')
      .insert({
        ...data,
        status: data.status || 'PENDING',
        created_at: new Date().toISOString(),
      })
      .select('*, room:rooms(*)')
      .single();
    if (error) throw error;
    return task;
  },

  async updateTask(id: string, data: Partial<HousekeepingTask>): Promise<HousekeepingTask> {
    const client = getClient();
    const { data: task, error } = await client
      .from('housekeeping_tasks')
      .update(data)
      .eq('id', id)
      .select('*, room:rooms(*)')
      .single();
    if (error) throw error;

    // If completed or inspected, update room status
    if (data.status === 'COMPLETED' || data.status === 'INSPECTED') {
      const newStatus = data.status === 'INSPECTED' ? 'INSPECTED' : 'CLEAN';
      await client.from('rooms').update({ housekeeping_status: newStatus }).eq('id', task.room_id);
    }
    return task;
  },
};

// ─── Operational Notifications ────────────────────────────────────────────────

export const supabaseNotificationService = {
  async getAll(userId: string, hotelId: string): Promise<Notification[]> {
    const client = getClient();
    const { data, error } = await client
      .from('notifications')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(data: Omit<Notification, 'id' | 'created_at'>): Promise<Notification> {
    const client = getClient();
    const { data: notif, error } = await client
      .from('notifications')
      .insert({ ...data, created_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    return notif;
  },
};

// ─── QR Code Resolution ───────────────────────────────────────────────────────

export const supabaseQrService = {
  async getByToken(token: string): Promise<QRCode | null> {
    const client = getClient();
    const { data, error } = await client
      .from('qr_codes')
      .select('*, room:rooms(*), hotel:hotels(*)')
      .eq('token', token)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
};

// ─── Maintenance Tickets ──────────────────────────────────────────────────────

export const supabaseMaintenanceService = {
  async getAll(hotelId: string): Promise<MaintenanceTicket[]> {
    const client = getClient();
    const { data, error } = await client
      .from('maintenance_tickets')
      .select('*, room:rooms(*)')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(data: Omit<MaintenanceTicket, 'id' | 'created_at' | 'updated_at'>): Promise<MaintenanceTicket> {
    const client = getClient();
    const { room, ...cleanData } = data as any;
    const { data: ticket, error } = await client
      .from('maintenance_tickets')
      .insert({
        ...cleanData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*, room:rooms(*)')
      .single();
    if (error) throw error;
    return ticket;
  },

  async update(id: string, updates: Partial<MaintenanceTicket>): Promise<MaintenanceTicket> {
    const client = getClient();
    const { room, ...cleanUpdates } = updates as any;
    const { data: ticket, error } = await client
      .from('maintenance_tickets')
      .update({
        ...cleanUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, room:rooms(*)')
      .single();
    if (error) throw error;
    return ticket;
  },
};

// ─── Full Hotel State Sync (Production Cache Hydration) ───────────────────────

export const supabaseSyncService = {
  async fetchHotelData(hotelId: string) {
    const client = getClient();
    const [
      roomsRes,
      roomTypesRes,
      guestsRes,
      reservationsRes,
      ordersRes,
      requestsRes,
      tasksRes,
      ticketsRes,
      foliosRes,
      brandingRes,
      settingsRes,
      servicesRes,
      categoriesRes,
      itemsRes,
    ] = await Promise.allSettled([
      client.from('rooms').select('*, room_type:room_types(*)').eq('hotel_id', hotelId),
      client.from('room_types').select('*').eq('hotel_id', hotelId),
      client.from('guests').select('*').eq('hotel_id', hotelId),
      client.from('reservations').select('*, guest:guests(*), room:rooms(*), room_type:room_types(*)').eq('hotel_id', hotelId),
      client.from('orders').select('*, items:order_items(*), room:rooms(*), guest:guests(*)').eq('hotel_id', hotelId),
      client.from('service_requests').select('*, room:rooms(*), guest:guests(*), service:hotel_services(*)').eq('hotel_id', hotelId),
      client.from('housekeeping_tasks').select('*, room:rooms(*)').eq('hotel_id', hotelId),
      client.from('maintenance_tickets').select('*, room:rooms(*)').eq('hotel_id', hotelId),
      client.from('folios').select('*').eq('hotel_id', hotelId),
      client.from('hotel_branding').select('*').eq('hotel_id', hotelId).maybeSingle(),
      client.from('hotel_settings').select('*').eq('hotel_id', hotelId).maybeSingle(),
      client.from('hotel_services').select('*').eq('hotel_id', hotelId),
      client.from('menu_categories').select('*').eq('hotel_id', hotelId),
      client.from('menu_items').select('*').eq('hotel_id', hotelId),
    ]);

    return {
      rooms: roomsRes.status === 'fulfilled' && roomsRes.value.data ? roomsRes.value.data : undefined,
      roomTypes: roomTypesRes.status === 'fulfilled' && roomTypesRes.value.data ? roomTypesRes.value.data : undefined,
      guests: guestsRes.status === 'fulfilled' && guestsRes.value.data ? guestsRes.value.data : undefined,
      reservations: reservationsRes.status === 'fulfilled' && reservationsRes.value.data ? reservationsRes.value.data : undefined,
      orders: ordersRes.status === 'fulfilled' && ordersRes.value.data ? ordersRes.value.data : undefined,
      serviceRequests: requestsRes.status === 'fulfilled' && requestsRes.value.data ? requestsRes.value.data : undefined,
      housekeepingTasks: tasksRes.status === 'fulfilled' && tasksRes.value.data ? tasksRes.value.data : undefined,
      maintenanceTickets: ticketsRes.status === 'fulfilled' && ticketsRes.value.data ? ticketsRes.value.data : undefined,
      folios: foliosRes.status === 'fulfilled' && foliosRes.value.data ? foliosRes.value.data : undefined,
      branding: brandingRes.status === 'fulfilled' && brandingRes.value.data ? brandingRes.value.data : undefined,
      settings: settingsRes.status === 'fulfilled' && settingsRes.value.data ? settingsRes.value.data : undefined,
      services: servicesRes.status === 'fulfilled' && servicesRes.value.data ? servicesRes.value.data : undefined,
      categories: categoriesRes.status === 'fulfilled' && categoriesRes.value.data ? categoriesRes.value.data : undefined,
      items: itemsRes.status === 'fulfilled' && itemsRes.value.data ? itemsRes.value.data : undefined,
    };
  },
};

