// StayNexa Production Supabase Service Layer
// Implements direct PostgreSQL queries via Supabase client with Row Level Security (RLS)
// Strictly isolated by tenant context and authenticated user session

import { supabase } from '../lib/supabase';
import type { 
  Hotel, HotelBranding, HotelSettings, RoomType, Room, Guest, 
  Reservation, Folio, FolioItem, Payment, Order, HousekeepingTask, 
  MaintenanceTicket, QRCode, Subscription
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

  async update(id: string, updates: Partial<Hotel>): Promise<Hotel> {
    const client = getClient();
    const { data, error } = await client.from('hotels').update(updates).eq('id', id).select().single();
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

  async updateStatus(roomId: string, status: Room['status'], housekeepingStatus?: Room['housekeeping_status']): Promise<Room> {
    const client = getClient();
    const updates: Partial<Room> = { status };
    if (housekeepingStatus) updates.housekeeping_status = housekeepingStatus;
    const { data, error } = await client.from('rooms').update(updates).eq('id', roomId).select().single();
    if (error) throw error;
    return data;
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
};

// ─── Folios & Payments ────────────────────────────────────────────────────────

export const supabaseFolioService = {
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
    const { data, error } = await client
      .from('orders')
      .select('*, order_items(*)')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async updateStatus(orderId: string, status: Order['status']): Promise<Order> {
    const client = getClient();
    const updates: Partial<Order> = { status };
    if (status === 'DELIVERED') updates.delivered_at = new Date().toISOString();
    const { data, error } = await client.from('orders').update(updates).eq('id', orderId).select().single();
    if (error) throw error;
    return data;
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
