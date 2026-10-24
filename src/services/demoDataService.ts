// StayNexa Demo Data Service
// Provides a local in-memory data layer that mirrors the Supabase API shape
// Used in demo mode when Supabase credentials are not configured

import type {
  Hotel, HotelBranding, HotelSettings, RoomType, Room, Guest,
  Reservation, Folio, FolioItem, Payment, Order, OrderItem,
  MenuCategory, MenuItem, HotelService, ServiceRequest,
  HousekeepingTask, MaintenanceTicket, Department,
  Profile, Notification, QRCode, ActivityLog, Subscription
} from '../types';

import {
  DEMO_HOTELS, DEMO_HOTEL_BRANDING, DEMO_HOTEL_SETTINGS,
  DEMO_ROOM_TYPES, DEMO_ROOMS, DEMO_GUESTS, DEMO_RESERVATIONS,
  DEMO_FOLIOS, DEMO_FOLIO_ITEMS, DEMO_PAYMENTS,
  DEMO_MENU_CATEGORIES, DEMO_MENU_ITEMS, DEMO_ORDERS,
  DEMO_HOTEL_SERVICES, DEMO_SERVICE_REQUESTS,
  DEMO_HOUSEKEEPING, DEMO_MAINTENANCE,
  DEMO_DEPARTMENTS, DEMO_PROFILES, DEMO_MEMBERSHIPS,
  DEMO_NOTIFICATIONS, DEMO_QR_CODES, DEMO_ACTIVITY_LOGS,
  DEMO_SUBSCRIPTIONS,
} from '../data/demo';

import { realtimeSync } from './realtimeSync';
import { isDemoMode, supabase } from '../lib/supabase';
import { 
  supabaseHotelService,
  supabaseRoomService,
  supabaseGuestService,
  supabaseReservationService,
  supabaseFolioService,
  supabaseOrderService, 
  supabaseServiceRequestService, 
  supabaseHousekeepingService,
  supabaseMaintenanceService,
  supabaseSyncService
} from './supabaseService';

// Also re-export demo constants for convenience
export {
  DEMO_HOTELS, DEMO_HOTEL_BRANDING, DEMO_HOTEL_SETTINGS,
  DEMO_ROOM_TYPES, DEMO_ROOMS, DEMO_GUESTS, DEMO_RESERVATIONS,
  DEMO_FOLIOS, DEMO_FOLIO_ITEMS, DEMO_PAYMENTS,
  DEMO_MENU_CATEGORIES, DEMO_MENU_ITEMS, DEMO_ORDERS,
  DEMO_HOTEL_SERVICES, DEMO_SERVICE_REQUESTS,
  DEMO_HOUSEKEEPING, DEMO_MAINTENANCE,
  DEMO_DEPARTMENTS, DEMO_PROFILES, DEMO_MEMBERSHIPS,
  DEMO_NOTIFICATIONS, DEMO_QR_CODES, DEMO_ACTIVITY_LOGS,
  DEMO_SUBSCRIPTIONS,
} from '../data/demo';

// ─── LocalStorage Persistence Wrapper (Demo Mode) ────────────────────────────

const DEMO_STORE_KEY = 'staynexa_demo_store';

export interface DemoStoreState {
  hotels: Hotel[];
  branding: HotelBranding[];
  settings: HotelSettings[];
  roomTypes: RoomType[];
  rooms: Room[];
  guests: Guest[];
  reservations: Reservation[];
  folios: Folio[];
  folioItems: FolioItem[];
  payments: Payment[];
  menuCategories: MenuCategory[];
  menuItems: MenuItem[];
  orders: Order[];
  hotelServices: HotelService[];
  serviceRequests: ServiceRequest[];
  housekeepingTasks: HousekeepingTask[];
  maintenanceTickets: MaintenanceTicket[];
  departments: Department[];
  profiles: Profile[];
  memberships: any[];
  notifications: Notification[];
  qrCodes: QRCode[];
  activityLogs: ActivityLog[];
  subscriptions: Subscription[];
}

function loadInitialStore(): DemoStoreState | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = localStorage.getItem(DEMO_STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.rooms) && Array.isArray(parsed.hotels)) {
      return parsed;
    }
  } catch (e) {
    console.warn('[StayNexa] Error reading demo store from localStorage:', e);
  }
  return null;
}

const initialStore = loadInitialStore();

// In-memory mutable store (persisted to LocalStorage in demo mode, synced from Supabase in production)
let hotels = initialStore?.hotels ? [...initialStore.hotels] : [...DEMO_HOTELS];
let branding = initialStore?.branding ? [...initialStore.branding] : [...DEMO_HOTEL_BRANDING];
let settings = initialStore?.settings ? [...initialStore.settings] : [...DEMO_HOTEL_SETTINGS];
let roomTypes = initialStore?.roomTypes ? [...initialStore.roomTypes] : [...DEMO_ROOM_TYPES];
let rooms = initialStore?.rooms ? [...initialStore.rooms] : [...DEMO_ROOMS];
let guests = initialStore?.guests ? [...initialStore.guests] : [...DEMO_GUESTS];
let reservations = initialStore?.reservations ? [...initialStore.reservations] : [...DEMO_RESERVATIONS];
let folios = initialStore?.folios ? [...initialStore.folios] : [...DEMO_FOLIOS];
let folioItems = initialStore?.folioItems ? [...initialStore.folioItems] : [...DEMO_FOLIO_ITEMS];
let payments = initialStore?.payments ? [...initialStore.payments] : [...DEMO_PAYMENTS];
let menuCategories = initialStore?.menuCategories ? [...initialStore.menuCategories] : [...DEMO_MENU_CATEGORIES];
let menuItems = initialStore?.menuItems ? [...initialStore.menuItems] : [...DEMO_MENU_ITEMS];
let orders = initialStore?.orders ? [...initialStore.orders] : [...DEMO_ORDERS];
let hotelServices = initialStore?.hotelServices ? [...initialStore.hotelServices] : [...DEMO_HOTEL_SERVICES];
let serviceRequests = initialStore?.serviceRequests ? [...initialStore.serviceRequests] : [...DEMO_SERVICE_REQUESTS];
let housekeepingTasks = initialStore?.housekeepingTasks ? [...initialStore.housekeepingTasks] : [...DEMO_HOUSEKEEPING];
let maintenanceTickets = initialStore?.maintenanceTickets ? [...initialStore.maintenanceTickets] : [...DEMO_MAINTENANCE];
let departments = initialStore?.departments ? [...initialStore.departments] : [...DEMO_DEPARTMENTS];
let profiles = initialStore?.profiles ? [...initialStore.profiles] : [...DEMO_PROFILES];
let memberships = initialStore?.memberships ? [...initialStore.memberships] : [...DEMO_MEMBERSHIPS];
let notifications = initialStore?.notifications ? [...initialStore.notifications] : [...DEMO_NOTIFICATIONS];
let qrCodes = initialStore?.qrCodes ? [...initialStore.qrCodes] : [...DEMO_QR_CODES];
let activityLogs = initialStore?.activityLogs ? [...initialStore.activityLogs] : [...DEMO_ACTIVITY_LOGS];
let subscriptions = initialStore?.subscriptions ? [...initialStore.subscriptions] : [...DEMO_SUBSCRIPTIONS];

export function saveDemoStore() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const state: DemoStoreState = {
      hotels,
      branding,
      settings,
      roomTypes,
      rooms,
      guests,
      reservations,
      folios,
      folioItems,
      payments,
      menuCategories,
      menuItems,
      orders,
      hotelServices,
      serviceRequests,
      housekeepingTasks,
      maintenanceTickets,
      departments,
      profiles,
      memberships,
      notifications,
      qrCodes,
      activityLogs,
      subscriptions,
    };
    localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('[StayNexa] Error saving demo store to localStorage:', e);
  }
}

export function resetDemoStore(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(DEMO_STORE_KEY);
  }
  hotels = [...DEMO_HOTELS];
  branding = [...DEMO_HOTEL_BRANDING];
  settings = [...DEMO_HOTEL_SETTINGS];
  roomTypes = [...DEMO_ROOM_TYPES];
  rooms = [...DEMO_ROOMS];
  guests = [...DEMO_GUESTS];
  reservations = [...DEMO_RESERVATIONS];
  folios = [...DEMO_FOLIOS];
  folioItems = [...DEMO_FOLIO_ITEMS];
  payments = [...DEMO_PAYMENTS];
  menuCategories = [...DEMO_MENU_CATEGORIES];
  menuItems = [...DEMO_MENU_ITEMS];
  orders = [...DEMO_ORDERS];
  hotelServices = [...DEMO_HOTEL_SERVICES];
  serviceRequests = [...DEMO_SERVICE_REQUESTS];
  housekeepingTasks = [...DEMO_HOUSEKEEPING];
  maintenanceTickets = [...DEMO_MAINTENANCE];
  departments = [...DEMO_DEPARTMENTS];
  profiles = [...DEMO_PROFILES];
  memberships = [...DEMO_MEMBERSHIPS];
  notifications = [...DEMO_NOTIFICATIONS];
  qrCodes = [...DEMO_QR_CODES];
  activityLogs = [...DEMO_ACTIVITY_LOGS];
  subscriptions = [...DEMO_SUBSCRIPTIONS];
}

function uuid() {
  return `demo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function now() {
  return new Date().toISOString();
}

// ─── Hotels ───────────────────────────────────────────────────────────────────

export const hotelService = {
  getAll: (): Hotel[] => hotels,
  getById: (id: string): Hotel | undefined => hotels.find(h => h.id === id),
  getBySlug: (slug: string): Hotel | undefined => hotels.find(h => h.slug === slug),
  create: (data: Omit<Hotel, 'id' | 'created_at' | 'updated_at'>): Hotel => {
    const hotel: Hotel = { ...data, id: uuid(), created_at: now(), updated_at: now() };
    hotels.push(hotel);
    saveDemoStore();
    if (!isDemoMode() && supabase) {
      supabaseHotelService.create(data).catch(err => console.error('Supabase hotel create error:', err));
    }
    return hotel;
  },
  update: (id: string, data: Partial<Hotel>): Hotel | undefined => {
    const idx = hotels.findIndex(h => h.id === id);
    if (idx === -1) return undefined;
    hotels[idx] = { ...hotels[idx], ...data, updated_at: now() };
    saveDemoStore();
    if (!isDemoMode() && supabase) {
      supabaseHotelService.update(id, data).catch(err => console.error('Supabase hotel update error:', err));
    }
    return hotels[idx];
  },
  getBranding: (hotelId: string): HotelBranding | undefined => branding.find(b => b.hotel_id === hotelId),
  getSettings: (hotelId: string): HotelSettings | undefined => settings.find(s => s.hotel_id === hotelId),
  updateBranding: (hotelId: string, data: Partial<HotelBranding>): HotelBranding | undefined => {
    let res: HotelBranding;
    const idx = branding.findIndex(b => b.hotel_id === hotelId);
    if (idx !== -1) {
      branding[idx] = { ...branding[idx], ...data };
      res = branding[idx];
    } else {
      const newBranding: HotelBranding = { id: uuid(), hotel_id: hotelId, primary_color: '#1a3a5c', accent_color: '#c9a84c', ...data };
      branding.push(newBranding);
      res = newBranding;
    }
    saveDemoStore();
    if (!isDemoMode() && supabase) {
      supabaseHotelService.updateBranding(hotelId, data).catch(err => console.error('Supabase branding error:', err));
    }
    return res;
  },
  updateSettings: (hotelId: string, data: Partial<HotelSettings>): HotelSettings | undefined => {
    const idx = settings.findIndex(s => s.hotel_id === hotelId);
    if (idx === -1) return undefined;
    settings[idx] = { ...settings[idx], ...data };
    saveDemoStore();
    if (!isDemoMode() && supabase) {
      supabaseHotelService.updateSettings(hotelId, data).catch(err => console.error('Supabase settings error:', err));
    }
    return settings[idx];
  },
  getPlatformStats: () => ({
    total: hotels.length,
    active: hotels.filter(h => h.status === 'ACTIVE').length,
    trial: hotels.filter(h => h.status === 'TRIAL').length,
    suspended: hotels.filter(h => h.status === 'SUSPENDED').length,
    setup: hotels.filter(h => h.status === 'SETUP').length,
    totalRooms: hotels.reduce((sum, h) => sum + h.total_rooms, 0),
  }),
};

// ─── Rooms ────────────────────────────────────────────────────────────────────

export const roomService = {
  getAll: (hotelId: string): (Room & { room_type?: RoomType })[] =>
    rooms.filter(r => r.hotel_id === hotelId).map(r => ({
      ...r,
      room_type: roomTypes.find(rt => rt.id === r.room_type_id),
    })),
  getById: (id: string): Room | undefined => rooms.find(r => r.id === id),
  create: (data: Omit<Room, 'id'>): Room => {
    const room: Room = { ...data, id: uuid() };
    rooms.push(room);
    saveDemoStore();
    if (!isDemoMode() && supabase) {
      supabaseRoomService.create(data).catch(err => console.error('Supabase room create error:', err));
    }
    return room;
  },
  update: (id: string, data: Partial<Room>): Room | undefined => {
    const idx = rooms.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    rooms[idx] = { ...rooms[idx], ...data };
    saveDemoStore();
    if (!isDemoMode() && supabase) {
      supabaseRoomService.update(id, data).catch(err => console.error('Supabase room update error:', err));
    }
    realtimeSync.emit('ROOM_UPDATED', { room: rooms[idx] });
    return rooms[idx];
  },
  updateStatus: (id: string, status: Room['status'], housekeeping_status?: Room['housekeeping_status']): Room | undefined => {
    const idx = rooms.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    rooms[idx] = { ...rooms[idx], status, ...(housekeeping_status ? { housekeeping_status } : {}) };
    saveDemoStore();
    if (!isDemoMode() && supabase) {
      supabaseRoomService.updateStatus(id, status, housekeeping_status).catch(err => console.error('Supabase room status error:', err));
    }
    realtimeSync.emit('ROOM_UPDATED', { room: rooms[idx] });
    return rooms[idx];
  },
  getAvailable: (hotelId: string, checkIn: string, checkOut: string, roomTypeId?: string): Room[] => {
    const occupiedRoomIds = reservations
      .filter(res =>
        res.hotel_id === hotelId &&
        res.status !== 'CANCELLED' &&
        res.status !== 'CHECKED_OUT' &&
        res.status !== 'NO_SHOW' &&
        res.room_id &&
        res.check_in_date < checkOut &&
        res.check_out_date > checkIn
      )
      .map(res => res.room_id!);

    return rooms.filter(r =>
      r.hotel_id === hotelId &&
      r.is_active &&
      r.status === 'AVAILABLE' &&
      !occupiedRoomIds.includes(r.id) &&
      (!roomTypeId || r.room_type_id === roomTypeId)
    );
  },
  getTypes: (hotelId: string): RoomType[] => roomTypes.filter(rt => rt.hotel_id === hotelId),
  getTypeById: (id: string): RoomType | undefined => roomTypes.find(rt => rt.id === id),
  createType: (data: Omit<RoomType, 'id'>): RoomType => {
    const rt: RoomType = { ...data, id: uuid() };
    roomTypes.push(rt);
    saveDemoStore();
    if (!isDemoMode() && supabase) {
      supabaseRoomService.createType(data).catch(err => console.error('Supabase room type error:', err));
    }
    return rt;
  },
};

// ─── Guests ───────────────────────────────────────────────────────────────────

export const guestService = {
  getAll: (hotelId: string): Guest[] => guests.filter(g => g.hotel_id === hotelId),
  getById: (id: string): Guest | undefined => guests.find(g => g.id === id),
  search: (hotelId: string, query: string): Guest[] => {
    const q = query.toLowerCase();
    return guests.filter(g =>
      g.hotel_id === hotelId &&
      (g.first_name.toLowerCase().includes(q) ||
       g.last_name.toLowerCase().includes(q) ||
       g.phone.includes(q) ||
       (g.email && g.email.toLowerCase().includes(q)))
    );
  },
  create: (data: Omit<Guest, 'id' | 'created_at'>): Guest => {
    const guest: Guest = { ...data, id: uuid(), created_at: now() };
    guests.push(guest);
    saveDemoStore();
    if (!isDemoMode() && supabase) {
      supabaseGuestService.create(data).catch(err => console.error('Supabase guest create error:', err));
    }
    return guest;
  },
  update: (id: string, data: Partial<Guest>): Guest | undefined => {
    const idx = guests.findIndex(g => g.id === id);
    if (idx === -1) return undefined;
    guests[idx] = { ...guests[idx], ...data };
    saveDemoStore();
    if (!isDemoMode() && supabase) {
      supabaseGuestService.update(id, data).catch(err => console.error('Supabase guest update error:', err));
    }
    return guests[idx];
  },
};

// ─── Reservations ─────────────────────────────────────────────────────────────

export const reservationService = {
  getAll: (hotelId: string): Reservation[] =>
    reservations.filter(r => r.hotel_id === hotelId).map(r => ({
      ...r,
      guest: guests.find(g => g.id === r.guest_id),
      room: rooms.find(rm => rm.id === r.room_id),
      room_type: roomTypes.find(rt => rt.id === r.room_type_id),
    })),
  getById: (id: string): Reservation | undefined => {
    const res = reservations.find(r => r.id === id);
    if (!res) return undefined;
    return {
      ...res,
      guest: guests.find(g => g.id === res.guest_id),
      room: rooms.find(rm => rm.id === res.room_id),
      room_type: roomTypes.find(rt => rt.id === res.room_type_id),
    };
  },
  create: (data: Omit<Reservation, 'id' | 'created_at' | 'updated_at'>): Reservation => {
    const res: Reservation = { ...data, id: uuid(), created_at: now(), updated_at: now() };
    reservations.push(res);
    saveDemoStore();
    if (!isDemoMode() && supabase) {
      supabaseReservationService.create(data).catch(err => console.error('Supabase reservation create error:', err));
    }
    realtimeSync.emit('RESERVATION_CREATED', { reservation: res });
    return res;
  },
  update: (id: string, data: Partial<Reservation>): Reservation | undefined => {
    const idx = reservations.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    reservations[idx] = { ...reservations[idx], ...data, updated_at: now() };
    saveDemoStore();
    if (!isDemoMode() && supabase) {
      supabaseReservationService.update(id, data).catch(err => console.error('Supabase reservation update error:', err));
    }
    realtimeSync.emit('RESERVATION_UPDATED', { reservation: reservations[idx] });
    return reservations[idx];
  },
  checkIn: (id: string, roomId: string): Reservation | undefined => {
    const idx = reservations.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    reservations[idx] = { ...reservations[idx], status: 'CHECKED_IN', room_id: roomId, actual_check_in: now(), updated_at: now() };
    // Update room status
    const roomIdx = rooms.findIndex(r => r.id === roomId);
    if (roomIdx !== -1) rooms[roomIdx] = { ...rooms[roomIdx], status: 'OCCUPIED' };
    // Create folio if not exists
    const existingFolio = folios.find(f => f.reservation_id === id);
    if (!existingFolio) {
      const res = reservations[idx];
      folios.push({
        id: uuid(), hotel_id: res.hotel_id, reservation_id: id, guest_id: res.guest_id,
        status: 'PENDING', total_charges: 0, total_payments: 0, outstanding: 0,
        created_at: now(), updated_at: now(),
      });
    }
    saveDemoStore();
    if (!isDemoMode() && supabase) {
      supabaseReservationService.checkIn(id, roomId).catch(err => console.error('Supabase checkin error:', err));
    }
    realtimeSync.emit('RESERVATION_UPDATED', { reservation: reservations[idx] });
    if (roomIdx !== -1) realtimeSync.emit('ROOM_UPDATED', { room: rooms[roomIdx] });
    return reservations[idx];
  },
  checkOut: (id: string): Reservation | undefined => {
    const idx = reservations.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    const res = reservations[idx];
    reservations[idx] = { ...res, status: 'CHECKED_OUT', actual_check_out: now(), updated_at: now() };
    // Mark room as dirty
    let updatedRoom: Room | undefined;
    if (res.room_id) {
      const roomIdx = rooms.findIndex(r => r.id === res.room_id);
      if (roomIdx !== -1) {
        rooms[roomIdx] = { ...rooms[roomIdx], status: 'AVAILABLE', housekeeping_status: 'DIRTY' };
        updatedRoom = rooms[roomIdx];
      }
    }
    saveDemoStore();
    if (!isDemoMode() && supabase) {
      supabaseReservationService.checkOut(id).catch(err => console.error('Supabase checkout error:', err));
    }
    realtimeSync.emit('RESERVATION_UPDATED', { reservation: reservations[idx] });
    if (updatedRoom) realtimeSync.emit('ROOM_UPDATED', { room: updatedRoom });
    return reservations[idx];
  },
  getTodayArrivals: (hotelId: string): Reservation[] => {
    const todayDate = new Date().toISOString().split('T')[0];
    return reservationService.getAll(hotelId).filter(r =>
      r.check_in_date === todayDate && (r.status === 'CONFIRMED' || r.status === 'PENDING')
    );
  },
  getTodayDepartures: (hotelId: string): Reservation[] => {
    const todayDate = new Date().toISOString().split('T')[0];
    return reservationService.getAll(hotelId).filter(r =>
      r.check_out_date === todayDate && r.status === 'CHECKED_IN'
    );
  },
};

// ─── Folio / Payments ─────────────────────────────────────────────────────────

export const folioService = {
  getAll: (hotelId?: string): Folio[] => (hotelId ? folios.filter(f => f.hotel_id === hotelId) : folios),
  getByReservation: (reservationId: string): Folio | undefined => folios.find(f => f.reservation_id === reservationId),
  getById: (id: string): Folio | undefined => folios.find(f => f.id === id),
  getItems: (folioId: string): FolioItem[] => folioItems.filter(fi => fi.folio_id === folioId),
  getPayments: (folioId: string): Payment[] => payments.filter(p => p.folio_id === folioId),
  addItem: (item: Omit<FolioItem, 'id'>): FolioItem => {
    const fi: FolioItem = { ...item, id: uuid() };
    folioItems.push(fi);
    // Recalculate folio totals
    folioService.recalculate(item.folio_id);
    saveDemoStore();
    if (!isDemoMode() && supabase) {
      supabaseFolioService.addCharge(item).catch(err => console.error('Supabase folio charge error:', err));
    }
    return fi;
  },
  addPayment: (payment: Omit<Payment, 'id' | 'created_at'>): Payment => {
    const p: Payment = { ...payment, id: uuid(), created_at: now() };
    payments.push(p);
    folioService.recalculate(payment.folio_id);
    saveDemoStore();
    if (!isDemoMode() && supabase) {
      supabaseFolioService.addPayment(payment).catch(err => console.error('Supabase folio payment error:', err));
    }
    return p;
  },
  recalculate: (folioId: string): void => {
    const idx = folios.findIndex(f => f.id === folioId);
    if (idx === -1) return;
    const items = folioItems.filter(fi => fi.folio_id === folioId);
    const pmts = payments.filter(p => p.folio_id === folioId);
    const totalCharges = items.reduce((sum, i) => sum + i.total, 0);
    const totalPayments = pmts.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = totalCharges - totalPayments;
    const status = outstanding <= 0 ? 'PAID' : totalPayments > 0 ? 'PARTIAL' : 'PENDING';
    folios[idx] = { ...folios[idx], total_charges: totalCharges, total_payments: totalPayments, outstanding, status, updated_at: now() };
    saveDemoStore();
    realtimeSync.emit('FOLIO_UPDATED', { folio: folios[idx] });
  },
};

// ─── Restaurant / Orders ──────────────────────────────────────────────────────

export const menuService = {
  getCategories: (hotelId: string): MenuCategory[] =>
    menuCategories.filter(c => c.hotel_id === hotelId && c.is_active).sort((a, b) => a.sort_order - b.sort_order),
  getItems: (hotelId: string, categoryId?: string): MenuItem[] =>
    menuItems.filter(i => i.hotel_id === hotelId && (!categoryId || i.category_id === categoryId)),
  getItemById: (id: string): MenuItem | undefined => menuItems.find(i => i.id === id),
};

export const orderService = {
  getAll: (hotelId: string): Order[] =>
    orders.filter(o => o.hotel_id === hotelId).map(o => ({
      ...o,
      room: rooms.find(r => r.id === o.room_id),
      guest: guests.find(g => g.id === o.guest_id),
    })),
  getById: (id: string): Order | undefined => orders.find(o => o.id === id),
  getActive: (hotelId: string): Order[] =>
    orders.filter(o => o.hotel_id === hotelId && !['DELIVERED', 'CANCELLED'].includes(o.status)),
  create: (data: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'items'> & { items: Omit<OrderItem, 'id' | 'order_id'>[] }): Order => {
    const orderId = uuid();
    const room = rooms.find(r => r.id === data.room_id);
    const guest = guests.find(g => g.id === data.guest_id);
    const order: Order = {
      ...data,
      id: orderId,
      created_at: now(),
      updated_at: now(),
      room,
      guest,
      items: data.items.map(item => ({ ...item, id: uuid(), order_id: orderId })),
    };
    orders.unshift(order);
    saveDemoStore();

    // Create Notification for Desk & KDS
    const notif: Notification = {
      id: uuid(),
      hotel_id: data.hotel_id,
      type: 'ORDER',
      title: `New In-Room Order: Room ${room?.number || 'Portal'}`,
      message: `${order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')} (Total: ₹${order.total})`,
      is_read: false,
      link: '/kds',
      created_at: now(),
    };
    notifications.unshift(notif);

    // Create Activity Log
    activityLogs.unshift({
      id: uuid(),
      hotel_id: data.hotel_id,
      actor_name: guest ? `${guest.first_name} ${guest.last_name}` : 'Guest QR Portal',
      action: 'ORDER_PLACED',
      entity_type: 'ORDER',
      entity_id: order.id,
      metadata: { total: order.total, room: room?.number, items_count: order.items.length },
      created_at: now(),
    });

    // Write to Supabase in production mode
    if (!isDemoMode() && supabase) {
      supabaseOrderService.create(data).catch(err => console.error('Supabase order write error:', err));
    }

    // Broadcast Realtime Event
    realtimeSync.emit('NEW_ORDER', { order });
    realtimeSync.emit('NEW_NOTIFICATION', { notification: notif });

    return order;
  },
  updateStatus: (id: string, status: Order['status']): Order | undefined => {
    const idx = orders.findIndex(o => o.id === id);
    if (idx === -1) return undefined;
    const timeFields: Partial<Order> = {};
    if (status === 'ACCEPTED') timeFields.accepted_at = now();
    if (status === 'PREPARING') timeFields.preparing_at = now();
    if (status === 'READY') timeFields.ready_at = now();
    if (status === 'DELIVERED') timeFields.delivered_at = now();
    orders[idx] = { ...orders[idx], status, ...timeFields, updated_at: now() };
    const updated = orders[idx];
    saveDemoStore();

    // Write to Supabase in production mode
    if (!isDemoMode() && supabase) {
      supabaseOrderService.updateStatus(id, status).catch(err => console.error('Supabase order update error:', err));
    }

    // Broadcast Realtime Event
    realtimeSync.emit('ORDER_STATUS_CHANGED', { orderId: id, status, order: updated });
    return updated;
  },
};

// ─── Housekeeping / Maintenance ───────────────────────────────────────────────

export const housekeepingService = {
  getTasks: (hotelId: string): HousekeepingTask[] =>
    housekeepingTasks.filter(t => t.hotel_id === hotelId).map(t => ({
      ...t,
      room: rooms.find(r => r.id === t.room_id),
    })),
  updateTask: (id: string, data: Partial<HousekeepingTask>): HousekeepingTask | undefined => {
    const idx = housekeepingTasks.findIndex(t => t.id === id);
    if (idx === -1) return undefined;
    housekeepingTasks[idx] = { ...housekeepingTasks[idx], ...data };
    // If completed, update room housekeeping status
    if (data.status === 'COMPLETED' || data.status === 'INSPECTED') {
      const task = housekeepingTasks[idx];
      const newStatus = data.status === 'INSPECTED' ? 'INSPECTED' : 'CLEAN';
      roomService.update(task.room_id, { housekeeping_status: newStatus });
    }
    const updated = housekeepingTasks[idx];
    saveDemoStore();

    if (!isDemoMode() && supabase) {
      supabaseHousekeepingService.updateTask(id, data).catch(err => console.error('Supabase housekeeping update error:', err));
    }

    realtimeSync.emit('HOUSEKEEPING_TASK_UPDATED', { taskId: id, task: updated });
    return updated;
  },
  createTask: (data: Omit<HousekeepingTask, 'id' | 'created_at'>): HousekeepingTask => {
    const room = rooms.find(r => r.id === data.room_id);
    const task: HousekeepingTask = {
      ...data,
      id: uuid(),
      room,
      created_at: now(),
    };
    housekeepingTasks.unshift(task);
    saveDemoStore();

    if (!isDemoMode() && supabase) {
      supabaseHousekeepingService.createTask(data).catch(err => console.error('Supabase housekeeping task write error:', err));
    }

    realtimeSync.emit('NEW_HOUSEKEEPING_TASK', { task });
    return task;
  },
};

export const maintenanceService = {
  getAll: (hotelId: string): MaintenanceTicket[] =>
    maintenanceTickets.filter(t => t.hotel_id === hotelId).map(t => ({
      ...t,
      room: rooms.find(r => r.id === t.room_id),
    })),
  getById: (id: string): MaintenanceTicket | undefined => maintenanceTickets.find(t => t.id === id),
  create: (data: Omit<MaintenanceTicket, 'id' | 'created_at' | 'updated_at'>): MaintenanceTicket => {
    const ticket: MaintenanceTicket = { ...data, id: uuid(), created_at: now(), updated_at: now() };
    maintenanceTickets.push(ticket);
    saveDemoStore();
    if (!isDemoMode() && supabase) {
      supabaseMaintenanceService.create(data).catch(err => console.error('Supabase maintenance create error:', err));
    }
    return ticket;
  },
  update: (id: string, data: Partial<MaintenanceTicket>): MaintenanceTicket | undefined => {
    const idx = maintenanceTickets.findIndex(t => t.id === id);
    if (idx === -1) return undefined;
    maintenanceTickets[idx] = { ...maintenanceTickets[idx], ...data, updated_at: now() };
    saveDemoStore();
    if (!isDemoMode() && supabase) {
      supabaseMaintenanceService.update(id, data).catch(err => console.error('Supabase maintenance update error:', err));
    }
    return maintenanceTickets[idx];
  },
};

// ─── Service Requests ─────────────────────────────────────────────────────────

export const serviceRequestService = {
  getAll: (hotelId: string): ServiceRequest[] =>
    serviceRequests.filter(r => r.hotel_id === hotelId).map(r => ({
      ...r,
      room: rooms.find(rm => rm.id === r.room_id),
      guest: guests.find(g => g.id === r.guest_id),
      service: hotelServices.find(s => s.id === r.service_id),
    })),
  getServices: (hotelId: string): HotelService[] => hotelServices.filter(s => s.hotel_id === hotelId && s.is_available),
  create: (data: Omit<ServiceRequest, 'id' | 'created_at' | 'updated_at'>): ServiceRequest => {
    const room = rooms.find(rm => rm.id === data.room_id);
    const guest = guests.find(g => g.id === data.guest_id);
    const service = hotelServices.find(s => s.id === data.service_id);
    const req: ServiceRequest = {
      ...data,
      id: uuid(),
      room,
      guest,
      service,
      created_at: now(),
      updated_at: now(),
    };
    serviceRequests.unshift(req);

    // Auto-create Housekeeping Task if request is housekeeping-related
    const isHousekeepingCategory = service?.category === 'HOUSEKEEPING' || 
      data.title.toLowerCase().includes('towel') || 
      data.title.toLowerCase().includes('clean') ||
      data.title.toLowerCase().includes('linen');

    if (isHousekeepingCategory && data.room_id) {
      const task = housekeepingService.createTask({
        hotel_id: data.hotel_id,
        room_id: data.room_id,
        reservation_id: data.reservation_id,
        type: 'STAYOVER_CLEAN',
        status: 'PENDING',
        priority: (data.priority as any) || 'HIGH',
        notes: `Guest Request: ${data.title} - ${data.description || ''}`,
      });
      realtimeSync.emit('NEW_HOUSEKEEPING_TASK', { task });
    }

    // Create Notification for Front Desk
    const notif: Notification = {
      id: uuid(),
      hotel_id: data.hotel_id,
      type: 'REQUEST',
      title: `New Service Request: Room ${room?.number || 'Portal'}`,
      message: `${req.title} (${req.priority} Priority)`,
      is_read: false,
      link: '/reception/requests',
      created_at: now(),
    };
    notifications.unshift(notif);

    // Create Activity Log
    activityLogs.unshift({
      id: uuid(),
      hotel_id: data.hotel_id,
      actor_name: guest ? `${guest.first_name} ${guest.last_name}` : 'Guest QR Portal',
      action: 'SERVICE_REQUEST_CREATED',
      entity_type: 'SERVICE_REQUEST',
      entity_id: req.id,
      metadata: { title: req.title, priority: req.priority, room: room?.number },
      created_at: now(),
    });

    // Write to Supabase in production mode
    if (!isDemoMode() && supabase) {
      supabaseServiceRequestService.create(data).catch(err => console.error('Supabase service request write error:', err));
    }

    saveDemoStore();

    // Broadcast Realtime Event
    realtimeSync.emit('NEW_SERVICE_REQUEST', { request: req });
    realtimeSync.emit('NEW_NOTIFICATION', { notification: notif });

    return req;
  },
  update: (id: string, data: Partial<ServiceRequest>): ServiceRequest | undefined => {
    const idx = serviceRequests.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    serviceRequests[idx] = { ...serviceRequests[idx], ...data, updated_at: now() };
    const updated = serviceRequests[idx];
    saveDemoStore();

    // Write to Supabase in production mode
    if (!isDemoMode() && supabase) {
      supabaseServiceRequestService.update(id, data).catch(err => console.error('Supabase service request update error:', err));
    }

    // Broadcast Realtime Event
    realtimeSync.emit('REQUEST_STATUS_CHANGED', { requestId: id, status: data.status || updated.status, request: updated });
    return updated;
  },
};

// ─── Staff / Auth ─────────────────────────────────────────────────────────────

export const staffService = {
  getAll: (hotelId: string): Profile[] => {
    const hotelMemberIds = memberships.filter(m => m.hotel_id === hotelId).map(m => m.user_id);
    return profiles.filter(p => hotelMemberIds.includes(p.user_id));
  },
  getById: (id: string): Profile | undefined => profiles.find(p => p.id === id),
  getMembership: (userId: string, hotelId: string) =>
    memberships.find(m => m.user_id === userId && m.hotel_id === hotelId),
  getDepartments: (hotelId: string): Department[] => departments.filter(d => d.hotel_id === hotelId),
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const notificationService = {
  getAll: (userId?: string, hotelId?: string): Notification[] =>
    notifications.filter(n => {
      const matchesUser = !userId || n.user_id === userId || !n.user_id;
      const matchesHotel = !hotelId || !n.hotel_id || n.hotel_id === hotelId;
      return matchesUser && matchesHotel;
    }).sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
  getUnreadCount: (userId?: string, hotelId?: string): number =>
    notifications.filter(n => {
      const matchesUser = !userId || n.user_id === userId || !n.user_id;
      const matchesHotel = !hotelId || !n.hotel_id || n.hotel_id === hotelId;
      return matchesUser && matchesHotel && !n.is_read;
    }).length,
  markRead: (id: string): void => {
    const idx = notifications.findIndex(n => n.id === id);
    if (idx !== -1) {
      notifications[idx] = { ...notifications[idx], is_read: true };
      saveDemoStore();
    }
  },
  markAllRead: (userId?: string, hotelId?: string): void => {
    notifications = notifications.map(n => {
      const matchesUser = !userId || n.user_id === userId || !n.user_id;
      const matchesHotel = !hotelId || !n.hotel_id || n.hotel_id === hotelId;
      return (matchesUser && matchesHotel) ? { ...n, is_read: true } : n;
    });
    saveDemoStore();
  },
};

// ─── QR Codes ─────────────────────────────────────────────────────────────────

export const qrService = {
  getAll: (hotelId: string): QRCode[] =>
    qrCodes.filter(q => q.hotel_id === hotelId).map(q => ({
      ...q,
      room: rooms.find(r => r.id === q.room_id),
    })),
  getByToken: (token: string): (QRCode & { hotel?: Hotel; room?: Room }) | undefined => {
    const qr = qrCodes.find(q => q.token === token && q.is_active);
    if (!qr) return undefined;
    return {
      ...qr,
      hotel: hotels.find(h => h.id === qr.hotel_id),
      room: rooms.find(r => r.id === qr.room_id),
    };
  },
  generate: (hotelId: string, roomId?: string): QRCode => {
    const token = `sn-${Math.random().toString(36).slice(2, 12)}`;
    const qr: QRCode = {
      id: uuid(), hotel_id: hotelId, room_id: roomId, token, url: `/q/${token}`,
      type: roomId ? 'ROOM' : 'HOTEL', is_active: true, created_at: now(),
    };
    qrCodes.push(qr);
    saveDemoStore();
    return qr;
  },
  deactivate: (id: string): void => {
    const idx = qrCodes.findIndex(q => q.id === id);
    if (idx !== -1) {
      qrCodes[idx] = { ...qrCodes[idx], is_active: false };
      saveDemoStore();
    }
  },
};

// ─── Activity Logs ────────────────────────────────────────────────────────────

export const activityLogService = {
  getAll: (hotelId: string, limit = 50): ActivityLog[] =>
    activityLogs
      .filter(l => l.hotel_id === hotelId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit),
  log: (entry: Omit<ActivityLog, 'id' | 'created_at'>): void => {
    activityLogs.push({ ...entry, id: uuid(), created_at: now() });
    saveDemoStore();
  },
};

// ─── Analytics ────────────────────────────────────────────────────────────────

export const analyticsService = {
  getHotelStats: (hotelId: string) => {
    const hotelRooms = rooms.filter(r => r.hotel_id === hotelId);
    const today = new Date().toISOString().split('T')[0];
    const hotelReservations = reservations.filter(r => r.hotel_id === hotelId);

    return {
      totalRooms: hotelRooms.length,
      availableRooms: hotelRooms.filter(r => r.status === 'AVAILABLE').length,
      occupiedRooms: hotelRooms.filter(r => r.status === 'OCCUPIED').length,
      reservedRooms: hotelRooms.filter(r => r.status === 'RESERVED').length,
      maintenanceRooms: hotelRooms.filter(r => r.status === 'MAINTENANCE' || r.status === 'OUT_OF_SERVICE').length,
      dirtyRooms: hotelRooms.filter(r => r.housekeeping_status === 'DIRTY').length,
      cleaningRooms: hotelRooms.filter(r => r.housekeeping_status === 'CLEANING').length,
      cleanRooms: hotelRooms.filter(r => r.housekeeping_status === 'CLEAN').length,
      todayArrivals: hotelReservations.filter(r => r.check_in_date === today && ['CONFIRMED', 'PENDING'].includes(r.status)).length,
      todayDepartures: hotelReservations.filter(r => r.check_out_date === today && r.status === 'CHECKED_IN').length,
      currentGuests: hotelReservations.filter(r => r.status === 'CHECKED_IN').length,
      occupancyPercent: hotelRooms.length > 0
        ? Math.round((hotelRooms.filter(r => r.status === 'OCCUPIED').length / hotelRooms.length) * 100)
        : 0,
      pendingRequests: serviceRequests.filter(r => r.hotel_id === hotelId && r.status === 'PENDING').length,
      activeOrders: orders.filter(o => o.hotel_id === hotelId && !['DELIVERED', 'CANCELLED'].includes(o.status)).length,
      maintenanceIssues: maintenanceTickets.filter(t => t.hotel_id === hotelId && !['CLOSED', 'VERIFIED'].includes(t.status)).length,
      housekeepingTasks: housekeepingTasks.filter(t => t.hotel_id === hotelId && t.status !== 'COMPLETED').length,
      pendingPayments: folios.filter(f => f.hotel_id === hotelId && f.outstanding > 0).reduce((sum, f) => sum + f.outstanding, 0),
      todayRevenue: payments.filter(p => p.hotel_id === hotelId && p.created_at.startsWith(today)).reduce((sum, p) => sum + p.amount, 0),
    };
  },
  getPlatformStats: () => ({
    ...hotelService.getPlatformStats(),
    totalUsers: profiles.length,
    totalReservations: reservations.length,
    totalOrders: orders.length,
    totalRevenue: payments.reduce((sum, p) => sum + p.amount, 0),
  }),
};

// ─── Subscriptions ────────────────────────────────────────────────────────────

export const subscriptionService = {
  getAll: (): Subscription[] => subscriptions,
  getByHotel: (hotelId: string): Subscription | undefined => subscriptions.find(s => s.hotel_id === hotelId),
  update: (id: string, data: Partial<Subscription>): Subscription | undefined => {
    const idx = subscriptions.findIndex(s => s.id === id);
    if (idx === -1) return undefined;
    subscriptions[idx] = { ...subscriptions[idx], ...data };
    return subscriptions[idx];
  },
};

// ─── Feature Flags ────────────────────────────────────────────────────────────

const defaultFlagsMap: Record<string, boolean> = {
  restaurant_module: true,
  room_service: true,
  kitchen_display: true,
  housekeeping_module: true,
  maintenance_tickets: true,
  guest_qr_portal: true,
  whatsapp_notifications: false,
  digital_checkin: true,
  ota_channel_sync: false,
  custom_domains: true,
  ai_concierge: false,
};

let featureFlagsStore: Record<string, Record<string, boolean>> = {
  GLOBAL: { ...defaultFlagsMap },
};

export const featureFlagService = {
  getFlagsForScope: (scope: string): Record<string, boolean> => {
    const globalFlags = featureFlagsStore['GLOBAL'] || { ...defaultFlagsMap };
    if (scope === 'GLOBAL') return { ...globalFlags };
    const hotelFlags = featureFlagsStore[scope] || {};
    return { ...globalFlags, ...hotelFlags };
  },
  setFlag: (scope: string, key: string, enabled: boolean) => {
    if (!featureFlagsStore[scope]) {
      featureFlagsStore[scope] = { ...(featureFlagsStore['GLOBAL'] || defaultFlagsMap) };
    }
    featureFlagsStore[scope][key] = enabled;
    saveDemoStore();
  },
  saveFlagsForScope: (scope: string, flags: Record<string, boolean>) => {
    featureFlagsStore[scope] = { ...flags };
    saveDemoStore();
  },
};

// ─── Unified Data Layer Service ───────────────────────────────────────────────

export const demoDataService = {
  resetDemoStore,
  saveDemoStore,
  async syncFromSupabase(hotelId: string): Promise<boolean> {
    if (isDemoMode() || !supabase) return false;
    try {
      const data = await supabaseSyncService.fetchHotelData(hotelId);
      if (data.rooms && data.rooms.length > 0) rooms = data.rooms;
      if (data.roomTypes && data.roomTypes.length > 0) roomTypes = data.roomTypes;
      if (data.guests && data.guests.length > 0) guests = data.guests;
      if (data.reservations && data.reservations.length > 0) reservations = data.reservations;
      if (data.orders) orders = data.orders;
      if (data.serviceRequests) serviceRequests = data.serviceRequests;
      if (data.housekeepingTasks) housekeepingTasks = data.housekeepingTasks;
      if (data.maintenanceTickets) maintenanceTickets = data.maintenanceTickets;
      if (data.folios && data.folios.length > 0) folios = data.folios;
      if (data.branding) {
        const idx = branding.findIndex(b => b.hotel_id === hotelId);
        if (idx !== -1) branding[idx] = data.branding;
        else branding.push(data.branding);
      }
      if (data.settings) {
        const idx = settings.findIndex(s => s.hotel_id === hotelId);
        if (idx !== -1) settings[idx] = data.settings;
        else settings.push(data.settings);
      }
      return true;
    } catch (err) {
      console.error('[StayNexa] Error syncing data from Supabase:', err);
      return false;
    }
  },
};
