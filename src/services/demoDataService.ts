// StayNexa Demo Data Service
// Provides a local in-memory data layer that mirrors the Supabase API shape
// Used in demo mode when Supabase credentials are not configured

import type {
  Hotel, HotelBranding, HotelSettings, RoomType, Room, Guest,
  Reservation, Folio, FolioItem, Payment, Order, OrderItem,
  MenuCategory, MenuItem, HotelService, ServiceRequest,
  HousekeepingTask, MaintenanceTicket, Department,
  Profile, Notification, QRCode, ActivityLog, Subscription, HotelMembership
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
import { isDemoMode, isSupabaseConfigured, supabase } from '../lib/supabase';
import { orderService, registerOrderStoreAdapter } from './orderService';
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
  supabaseMenuService,
  supabaseQrService,
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

/**
 * SEC-01: Reverts optimistic local mutations when Supabase database operation rejects,
 * notifies observers via MUTATION_FAILED, and dispatches a window error event.
 */
function handleOptimisticMutationFailure(
  entity: string,
  id: string,
  rollbackFn: () => void,
  error: any
) {
  const errMsg = error?.message || String(error);
  console.error(`[StayNexa DB Mutation Failed] ${entity} id=${id}:`, errMsg);
  try {
    rollbackFn();
    saveDemoStore();
  } catch (rollbackErr) {
    console.error(`[StayNexa Rollback Error] ${entity} id=${id}:`, rollbackErr);
  }
  realtimeSync.emit('MUTATION_FAILED', {
    entity,
    id,
    error: errMsg,
  });
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(
      new CustomEvent('staynexa_mutation_error', {
        detail: { entity, id, error: errMsg },
      })
    );
  }
}

export function reloadDemoStoreFromStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const store = loadInitialStore();
  if (store) {
    if (Array.isArray(store.hotels)) hotels = [...store.hotels];
    if (Array.isArray(store.branding)) branding = [...store.branding];
    if (Array.isArray(store.settings)) settings = [...store.settings];
    if (Array.isArray(store.roomTypes)) roomTypes = [...store.roomTypes];
    if (Array.isArray(store.rooms)) rooms = [...store.rooms];
    if (Array.isArray(store.guests)) guests = [...store.guests];
    if (Array.isArray(store.reservations)) reservations = [...store.reservations];
    if (Array.isArray(store.folios)) folios = [...store.folios];
    if (Array.isArray(store.folioItems)) folioItems = [...store.folioItems];
    if (Array.isArray(store.payments)) payments = [...store.payments];
    if (Array.isArray(store.menuCategories)) menuCategories = [...store.menuCategories];
    if (Array.isArray(store.menuItems)) menuItems = [...store.menuItems];
    if (Array.isArray(store.orders)) orders = [...store.orders];
    if (Array.isArray(store.hotelServices)) hotelServices = [...store.hotelServices];
    if (Array.isArray(store.serviceRequests)) serviceRequests = [...store.serviceRequests];
    if (Array.isArray(store.housekeepingTasks)) housekeepingTasks = [...store.housekeepingTasks];
    if (Array.isArray(store.maintenanceTickets)) maintenanceTickets = [...store.maintenanceTickets];
    if (Array.isArray(store.departments)) departments = [...store.departments];
    if (Array.isArray(store.profiles)) profiles = [...store.profiles];
    if (Array.isArray(store.memberships)) memberships = [...store.memberships];
    if (Array.isArray(store.notifications)) notifications = [...store.notifications];
    if (Array.isArray(store.qrCodes)) qrCodes = [...store.qrCodes];
    if (Array.isArray(store.activityLogs)) activityLogs = [...store.activityLogs];
    if (Array.isArray(store.subscriptions)) subscriptions = [...store.subscriptions];
  }
}

// Auto-sync in-memory stores across separate browser windows and tabs
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === DEMO_STORE_KEY || e.key === 'staynexa_global_sync') {
      reloadDemoStoreFromStorage();
    }
  });
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
    let res: HotelSettings;
    const idx = settings.findIndex(s => s.hotel_id === hotelId);
    if (idx !== -1) {
      settings[idx] = { ...settings[idx], ...data };
      res = settings[idx];
    } else {
      const newSettings: HotelSettings = {
        id: uuid(),
        hotel_id: hotelId,
        invoice_prefix: 'INV',
        default_tax_percent: 18,
        service_charge_percent: 0,
        allow_room_charge: true,
        require_deposit: false,
        deposit_percent: 0,
        ...data,
      };
      settings.push(newSettings);
      res = newSettings;
    }
    saveDemoStore();
    if (!isDemoMode() && supabase) {
      supabaseHotelService.updateSettings(hotelId, data).catch(err => console.error('Supabase settings error:', err));
    }
    return res;
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
    if (!isDemoMode() && isSupabaseConfigured() && supabase) {
      supabaseRoomService.create(data).catch(err => {
        handleOptimisticMutationFailure('room', room.id, () => {
          const idx = rooms.findIndex(r => r.id === room.id);
          if (idx !== -1) rooms.splice(idx, 1);
        }, err);
      });
    }
    return room;
  },
  createAsync: async (data: Omit<Room, 'id' | 'created_at' | 'updated_at'>): Promise<Room> => {
    if (isDemoMode() || !isSupabaseConfigured() || !supabase) {
      return roomService.create(data);
    }
    const created = await supabaseRoomService.create(data);
    const idx = rooms.findIndex(r => r.id === created.id);
    if (idx !== -1) {
      rooms[idx] = created;
    } else {
      rooms.unshift(created);
    }
    saveDemoStore();
    realtimeSync.emit('ROOM_UPDATED', { room: created });
    return created;
  },
  update: (id: string, data: Partial<Room>): Room | undefined => {
    const idx = rooms.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    const prevState = { ...rooms[idx] };
    rooms[idx] = { ...rooms[idx], ...data };
    saveDemoStore();
    if (!isDemoMode() && isSupabaseConfigured() && supabase) {
      supabaseRoomService.update(id, data).catch(err => {
        handleOptimisticMutationFailure('room', id, () => {
          const curIdx = rooms.findIndex(r => r.id === id);
          if (curIdx !== -1) rooms[curIdx] = prevState;
        }, err);
      });
    }
    realtimeSync.emit('ROOM_UPDATED', { room: rooms[idx] });
    return rooms[idx];
  },
  updateAsync: async (id: string, data: Partial<Room>): Promise<Room | undefined> => {
    if (isDemoMode() || !isSupabaseConfigured() || !supabase) {
      return roomService.update(id, data);
    }
    const updated = await supabaseRoomService.update(id, data);
    const idx = rooms.findIndex(r => r.id === id);
    if (idx !== -1) {
      rooms[idx] = updated;
    } else {
      rooms.unshift(updated);
    }
    saveDemoStore();
    realtimeSync.emit('ROOM_UPDATED', { room: updated });
    return updated;
  },
  updateStatus: (id: string, status: Room['status'], housekeeping_status?: Room['housekeeping_status']): Room | undefined => {
    const idx = rooms.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    const prevStatus = rooms[idx].status;
    const prevHk = rooms[idx].housekeeping_status;
    rooms[idx] = { ...rooms[idx], status, ...(housekeeping_status ? { housekeeping_status } : {}) };
    saveDemoStore();
    if (!isDemoMode() && isSupabaseConfigured() && supabase) {
      supabaseRoomService.updateStatus(id, status, housekeeping_status).catch(err => {
        handleOptimisticMutationFailure('room', id, () => {
          const curIdx = rooms.findIndex(r => r.id === id);
          if (curIdx !== -1) {
            rooms[curIdx].status = prevStatus;
            rooms[curIdx].housekeeping_status = prevHk;
          }
        }, err);
      });
    }
    realtimeSync.emit('ROOM_UPDATED', { room: rooms[idx] });
    return rooms[idx];
  },
  updateStatusAsync: async (id: string, status: Room['status'], housekeeping_status?: Room['housekeeping_status']): Promise<Room | undefined> => {
    if (isDemoMode() || !isSupabaseConfigured() || !supabase) {
      return roomService.updateStatus(id, status, housekeeping_status);
    }
    const updated = await supabaseRoomService.updateStatus(id, status, housekeeping_status);
    const idx = rooms.findIndex(r => r.id === id);
    if (idx !== -1) {
      rooms[idx] = updated;
    } else {
      rooms.unshift(updated);
    }
    saveDemoStore();
    realtimeSync.emit('ROOM_UPDATED', { room: updated });
    return updated;
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
  deleteAsync: async (id: string): Promise<boolean> => {
    if (!isDemoMode() && isSupabaseConfigured() && supabase) {
      await supabaseRoomService.delete(id);
    }
    const idx = rooms.findIndex(r => r.id === id);
    if (idx !== -1) {
      rooms[idx] = { ...rooms[idx], is_active: false };
      saveDemoStore();
      realtimeSync.emit('ROOM_UPDATED', { room: rooms[idx] });
      return true;
    }
    return false;
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
    if (!isDemoMode() && isSupabaseConfigured() && supabase) {
      supabaseReservationService.create(data).catch(err => {
        handleOptimisticMutationFailure('reservation', res.id, () => {
          const idx = reservations.findIndex(r => r.id === res.id);
          if (idx !== -1) reservations.splice(idx, 1);
        }, err);
      });
    }
    realtimeSync.emit('RESERVATION_CREATED', { reservation: res });
    return res;
  },
  createAsync: async (data: Omit<Reservation, 'id' | 'created_at' | 'updated_at'>): Promise<Reservation> => {
    if (isDemoMode() || !isSupabaseConfigured() || !supabase) {
      return reservationService.create(data);
    }
    const created = await supabaseReservationService.create(data);
    const idx = reservations.findIndex(r => r.id === created.id);
    if (idx !== -1) {
      reservations[idx] = created;
    } else {
      reservations.unshift(created);
    }
    saveDemoStore();
    realtimeSync.emit('RESERVATION_CREATED', { reservation: created });
    return created;
  },
  update: (id: string, data: Partial<Reservation>): Reservation | undefined => {
    const idx = reservations.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    const prevState = { ...reservations[idx] };
    reservations[idx] = { ...reservations[idx], ...data, updated_at: now() };
    saveDemoStore();
    if (!isDemoMode() && isSupabaseConfigured() && supabase) {
      supabaseReservationService.update(id, data).catch(err => {
        handleOptimisticMutationFailure('reservation', id, () => {
          const curIdx = reservations.findIndex(r => r.id === id);
          if (curIdx !== -1) reservations[curIdx] = prevState;
        }, err);
      });
    }
    realtimeSync.emit('RESERVATION_UPDATED', { reservation: reservations[idx] });
    return reservations[idx];
  },
  updateAsync: async (id: string, data: Partial<Reservation>): Promise<Reservation | undefined> => {
    if (isDemoMode() || !isSupabaseConfigured() || !supabase) {
      return reservationService.update(id, data);
    }
    const updated = await supabaseReservationService.update(id, data);
    const idx = reservations.findIndex(r => r.id === id);
    if (idx !== -1) {
      reservations[idx] = updated;
    } else {
      reservations.unshift(updated);
    }
    saveDemoStore();
    realtimeSync.emit('RESERVATION_UPDATED', { reservation: updated });
    return updated;
  },
  checkIn: (id: string, roomId: string): Reservation | undefined => {
    const idx = reservations.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    const prevStatus = reservations[idx].status;
    const prevRoomId = reservations[idx].room_id;
    reservations[idx] = { ...reservations[idx], status: 'CHECKED_IN', room_id: roomId, actual_check_in: now(), updated_at: now() };
    // Update room status
    const roomIdx = rooms.findIndex(r => r.id === roomId);
    let prevRoomStatus: Room['status'] | undefined;
    if (roomIdx !== -1) {
      prevRoomStatus = rooms[roomIdx].status;
      rooms[roomIdx] = { ...rooms[roomIdx], status: 'OCCUPIED' };
    }
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
    if (!isDemoMode() && isSupabaseConfigured() && supabase) {
      supabaseReservationService.checkIn(id, roomId).catch(err => {
        handleOptimisticMutationFailure('reservation_checkin', id, () => {
          const curResIdx = reservations.findIndex(r => r.id === id);
          if (curResIdx !== -1) {
            reservations[curResIdx].status = prevStatus;
            reservations[curResIdx].room_id = prevRoomId;
          }
          if (roomIdx !== -1 && prevRoomStatus) {
            rooms[roomIdx].status = prevRoomStatus;
          }
        }, err);
      });
    }
    realtimeSync.emit('RESERVATION_UPDATED', { reservation: reservations[idx] });
    if (roomIdx !== -1) realtimeSync.emit('ROOM_UPDATED', { room: rooms[roomIdx] });
    return reservations[idx];
  },
  checkInAsync: async (id: string, roomId: string): Promise<Reservation | undefined> => {
    if (isDemoMode() || !isSupabaseConfigured() || !supabase) {
      return reservationService.checkIn(id, roomId);
    }
    const updated = await supabaseReservationService.checkIn(id, roomId);
    const idx = reservations.findIndex(r => r.id === id);
    if (idx !== -1) {
      reservations[idx] = updated;
    } else {
      reservations.unshift(updated);
    }
    const roomIdx = rooms.findIndex(r => r.id === roomId);
    if (roomIdx !== -1) {
      rooms[roomIdx] = { ...rooms[roomIdx], status: 'OCCUPIED' };
      realtimeSync.emit('ROOM_UPDATED', { room: rooms[roomIdx] });
    }
    saveDemoStore();
    realtimeSync.emit('RESERVATION_UPDATED', { reservation: updated });
    return updated;
  },
  checkOut: (id: string): Reservation | undefined => {
    const idx = reservations.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    const res = reservations[idx];
    const prevStatus = res.status;
    const prevCheckOut = res.actual_check_out;
    reservations[idx] = { ...res, status: 'CHECKED_OUT', actual_check_out: now(), updated_at: now() };
    // Mark room as dirty
    let updatedRoom: Room | undefined;
    let prevRoomStatus: Room['status'] | undefined;
    let prevHkStatus: Room['housekeeping_status'] | undefined;
    let createdTaskId: string | undefined;

    if (res.room_id) {
      const roomIdx = rooms.findIndex(r => r.id === res.room_id);
      if (roomIdx !== -1) {
        prevRoomStatus = rooms[roomIdx].status;
        prevHkStatus = rooms[roomIdx].housekeeping_status;
        rooms[roomIdx] = { ...rooms[roomIdx], status: 'AVAILABLE', housekeeping_status: 'DIRTY' };
        updatedRoom = rooms[roomIdx];

        // Ensure an automated turnover cleaning task is queued for Housekeeping
        const existingPendingTask = housekeepingTasks.find(
          t => t.room_id === res.room_id && (t.status === 'PENDING' || t.status === 'IN_PROGRESS')
        );
        if (!existingPendingTask) {
          const task: HousekeepingTask = {
            id: uuid(),
            hotel_id: res.hotel_id,
            room_id: res.room_id,
            reservation_id: res.id,
            type: 'CHECKOUT_CLEAN',
            status: 'PENDING',
            priority: 'HIGH',
            notes: `Checkout clean for Room ${rooms[roomIdx].number}`,
            assigned_to: 'Housekeeping Crew',
            created_at: now(),
            room: rooms[roomIdx],
          };
          createdTaskId = task.id;
          housekeepingTasks.unshift(task);
          realtimeSync.emit('NEW_HOUSEKEEPING_TASK', { task });
        }
      }
    }
    saveDemoStore();
    if (!isDemoMode() && isSupabaseConfigured() && supabase) {
      supabaseReservationService.checkOut(id).catch(err => {
        handleOptimisticMutationFailure('reservation_checkout', id, () => {
          const curResIdx = reservations.findIndex(r => r.id === id);
          if (curResIdx !== -1) {
            reservations[curResIdx].status = prevStatus;
            reservations[curResIdx].actual_check_out = prevCheckOut;
          }
          if (res.room_id) {
            const curRoomIdx = rooms.findIndex(r => r.id === res.room_id);
            if (curRoomIdx !== -1 && prevRoomStatus && prevHkStatus) {
              rooms[curRoomIdx].status = prevRoomStatus;
              rooms[curRoomIdx].housekeeping_status = prevHkStatus;
            }
          }
          if (createdTaskId) {
            const taskIdx = housekeepingTasks.findIndex(t => t.id === createdTaskId);
            if (taskIdx !== -1) housekeepingTasks.splice(taskIdx, 1);
          }
        }, err);
      });
    }
    realtimeSync.emit('RESERVATION_UPDATED', { reservation: reservations[idx] });
    if (updatedRoom) realtimeSync.emit('ROOM_UPDATED', { room: updatedRoom });
    return reservations[idx];
  },
  checkOutAsync: async (id: string): Promise<Reservation | undefined> => {
    if (isDemoMode() || !isSupabaseConfigured() || !supabase) {
      return reservationService.checkOut(id);
    }
    const updated = await supabaseReservationService.checkOut(id);
    const idx = reservations.findIndex(r => r.id === id);
    if (idx !== -1) {
      reservations[idx] = updated;
    }
    const roomId = updated.room_id || reservations[idx]?.room_id;
    if (roomId) {
      const roomIdx = rooms.findIndex(r => r.id === roomId);
      if (roomIdx !== -1) {
        rooms[roomIdx] = { ...rooms[roomIdx], status: 'AVAILABLE', housekeeping_status: 'DIRTY' };
        realtimeSync.emit('ROOM_UPDATED', { room: rooms[roomIdx] });
      }
    }
    saveDemoStore();
    realtimeSync.emit('RESERVATION_UPDATED', { reservation: updated });
    return updated;
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
    if (!isDemoMode() && isSupabaseConfigured() && supabase) {
      supabaseFolioService.addCharge(item).catch(err => {
        handleOptimisticMutationFailure('folio_item', fi.id, () => {
          const idx = folioItems.findIndex(f => f.id === fi.id);
          if (idx !== -1) {
            folioItems.splice(idx, 1);
            folioService.recalculate(item.folio_id);
          }
        }, err);
      });
    }
    return fi;
  },
  addItemAsync: async (item: Omit<FolioItem, 'id'>): Promise<FolioItem> => {
    if (isDemoMode() || !isSupabaseConfigured() || !supabase) {
      return folioService.addItem(item);
    }
    const created = await supabaseFolioService.addCharge(item);
    const idx = folioItems.findIndex(fi => fi.id === created.id);
    if (idx !== -1) {
      folioItems[idx] = created;
    } else {
      folioItems.push(created);
    }
    folioService.recalculate(item.folio_id);
    saveDemoStore();
    return created;
  },
  addPayment: (payment: Omit<Payment, 'id' | 'created_at'>): Payment => {
    const p: Payment = { ...payment, id: uuid(), created_at: now() };
    payments.push(p);
    folioService.recalculate(payment.folio_id);
    saveDemoStore();
    if (!isDemoMode() && isSupabaseConfigured() && supabase) {
      supabaseFolioService.addPayment(payment).catch(err => {
        handleOptimisticMutationFailure('payment', p.id, () => {
          const idx = payments.findIndex(pmt => pmt.id === p.id);
          if (idx !== -1) {
            payments.splice(idx, 1);
            folioService.recalculate(payment.folio_id);
          }
        }, err);
      });
    }
    return p;
  },
  addPaymentAsync: async (payment: Omit<Payment, 'id' | 'created_at'>): Promise<Payment> => {
    if (isDemoMode() || !isSupabaseConfigured() || !supabase) {
      return folioService.addPayment(payment);
    }
    const created = await supabaseFolioService.addPayment(payment);
    const idx = payments.findIndex(p => p.id === created.id);
    if (idx !== -1) {
      payments[idx] = created;
    } else {
      payments.push(created);
    }
    folioService.recalculate(payment.folio_id);
    saveDemoStore();
    return created;
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
  attachOrderToRoomFolio: (order: Order): FolioItem | null => {
    try {
      // 1. Avoid duplicate charges for the same order reference
      const existing = folioItems.find(fi => fi.reference_id === order.id);
      if (existing) return existing;

      // 2. Identify the active reservation for this room
      const allRes = reservationService.getAll(order.hotel_id);
      let targetRes = order.room_id ? allRes.find(r => r.room_id === order.room_id && r.status === 'CHECKED_IN') : undefined;
      if (!targetRes && order.reservation_id) {
        targetRes = allRes.find(r => r.id === order.reservation_id);
      }
      if (!targetRes && order.room_id) {
        targetRes = allRes.find(r => r.room_id === order.room_id);
      }
      if (!targetRes) {
        targetRes = allRes.find(r => r.status === 'CHECKED_IN') || allRes[0];
      }
      if (!targetRes) return null;

      // 3. Find or create the active folio
      let targetFolio = folios.find(f => f.reservation_id === targetRes!.id);
      if (!targetFolio) {
        targetFolio = {
          id: `fol-${Date.now()}-${uuid().slice(0, 4)}`,
          hotel_id: order.hotel_id,
          reservation_id: targetRes.id,
          guest_id: targetRes.guest_id || order.guest_id || 'guest-001',
          status: 'PENDING',
          total_charges: targetRes.total_amount || 0,
          total_payments: 0,
          outstanding: targetRes.total_amount || 0,
          created_at: now(),
          updated_at: now(),
        };
        folios.push(targetFolio);
      }

      if (!targetFolio) return null;

      // 4. Create and attach folio item
      const subtotal = order.subtotal ?? (order.total * 0.95);
      const taxAmount = order.tax_amount ?? (order.total - subtotal);
      const itemsSummary = (order.items && order.items.length > 0)
        ? ` (${order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')})`
        : '';
      const folioItem = folioService.addItem({
        folio_id: targetFolio.id,
        hotel_id: order.hotel_id,
        description: `In-Room Dining: Order #${order.id.slice(-6).toUpperCase()}${itemsSummary}`,
        category: 'ROOM_SERVICE',
        quantity: 1,
        unit_price: subtotal,
        tax_percent: 5,
        tax_amount: taxAmount,
        discount_amount: 0,
        total: order.total,
        reference_id: order.id,
        posted_at: now(),
        posted_by: 'KDS & Room Service Dispatch',
      });

      return folioItem;
    } catch (err) {
      console.warn('[FolioSync] Error attaching order to room folio:', err);
      return null;
    }
  },
  detachOrderFromRoomFolio: (orderId: string): boolean => {
    const itemIdx = folioItems.findIndex(fi => fi.reference_id === orderId);
    if (itemIdx === -1) return false;
    const folioId = folioItems[itemIdx].folio_id;
    folioItems.splice(itemIdx, 1);
    folioService.recalculate(folioId);
    saveDemoStore();
    const updatedFolio = folios.find(f => f.id === folioId);
    if (updatedFolio) realtimeSync.emit('FOLIO_UPDATED', { folio: updatedFolio });
    return true;
  },
};

// ─── Restaurant / Orders ──────────────────────────────────────────────────────

export const menuService = {
  getCategories: (hotelId: string): MenuCategory[] =>
    menuCategories.filter(c => c.hotel_id === hotelId && c.is_active).sort((a, b) => a.sort_order - b.sort_order),
  getItems: (hotelId: string, categoryId?: string): MenuItem[] =>
    menuItems.filter(i => i.hotel_id === hotelId && (!categoryId || i.category_id === categoryId)),
  getItemById: (id: string): MenuItem | undefined => menuItems.find(i => i.id === id),
  createItem: (item: Omit<MenuItem, 'id'> & { id?: string }): MenuItem => {
    const newItem: MenuItem = {
      ...item,
      id: item.id || `mi-${Date.now()}-${uuid().slice(0, 4)}`,
    };
    menuItems.push(newItem);
    saveDemoStore();
    return newItem;
  },
  createItemAsync: async (item: Omit<MenuItem, 'id'> & { id?: string }): Promise<MenuItem> => {
    if (!isDemoMode() && isSupabaseConfigured() && supabase) {
      const created = await supabaseMenuService.createItem(item);
      const idx = menuItems.findIndex(i => i.id === created.id);
      if (idx !== -1) menuItems[idx] = created;
      else menuItems.unshift(created);
      saveDemoStore();
      realtimeSync.emit('MENU_UPDATED', { item: created });
      return created;
    }
    return menuService.createItem(item);
  },
  updateItem: (id: string, data: Partial<MenuItem>): MenuItem | undefined => {
    const idx = menuItems.findIndex(i => i.id === id);
    if (idx === -1) return undefined;
    menuItems[idx] = { ...menuItems[idx], ...data };
    saveDemoStore();
    return menuItems[idx];
  },
  updateItemAsync: async (id: string, data: Partial<MenuItem>): Promise<MenuItem | undefined> => {
    if (!isDemoMode() && isSupabaseConfigured() && supabase) {
      const updated = await supabaseMenuService.updateItem(id, data);
      const idx = menuItems.findIndex(i => i.id === id);
      if (idx !== -1) menuItems[idx] = updated;
      saveDemoStore();
      realtimeSync.emit('MENU_UPDATED', { item: updated });
      return updated;
    }
    return menuService.updateItem(id, data);
  },
  toggleAvailability: (id: string): MenuItem | undefined => {
    const idx = menuItems.findIndex(i => i.id === id);
    if (idx === -1) return undefined;
    menuItems[idx] = { ...menuItems[idx], is_available: !menuItems[idx].is_available };
    saveDemoStore();
    return menuItems[idx];
  },
  toggleAvailabilityAsync: async (id: string, isAvailable?: boolean): Promise<MenuItem | undefined> => {
    const idx = menuItems.findIndex(i => i.id === id);
    if (idx === -1) return undefined;
    const nextState = isAvailable !== undefined ? isAvailable : !menuItems[idx].is_available;
    if (!isDemoMode() && isSupabaseConfigured() && supabase) {
      const updated = await supabaseMenuService.toggleAvailability(id, nextState);
      menuItems[idx] = updated;
      saveDemoStore();
      realtimeSync.emit('MENU_UPDATED', { item: updated });
      return updated;
    }
    menuItems[idx] = { ...menuItems[idx], is_available: nextState };
    saveDemoStore();
    return menuItems[idx];
  },
  deleteItemAsync: async (id: string): Promise<boolean> => {
    if (!isDemoMode() && isSupabaseConfigured() && supabase) {
      await supabaseMenuService.deleteItem(id);
    }
    const idx = menuItems.findIndex(i => i.id === id);
    if (idx !== -1) {
      menuItems[idx] = { ...menuItems[idx], is_available: false };
      saveDemoStore();
      realtimeSync.emit('MENU_UPDATED', { item: menuItems[idx] });
      return true;
    }
    return false;
  },
  createCategory: (cat: Omit<MenuCategory, 'id'> & { id?: string }): MenuCategory => {
    const newCat: MenuCategory = {
      ...cat,
      id: cat.id || `mc-${Date.now()}-${uuid().slice(0, 4)}`,
    };
    menuCategories.push(newCat);
    saveDemoStore();
    return newCat;
  },
  createCategoryAsync: async (cat: Omit<MenuCategory, 'id'> & { id?: string }): Promise<MenuCategory> => {
    if (!isDemoMode() && isSupabaseConfigured() && supabase) {
      const created = await supabaseMenuService.createCategory(cat);
      const idx = menuCategories.findIndex(c => c.id === created.id);
      if (idx !== -1) menuCategories[idx] = created;
      else menuCategories.push(created);
      saveDemoStore();
      return created;
    }
    return menuService.createCategory(cat);
  },
};

// Register store adapter with orderService for demo/offline synchronization
registerOrderStoreAdapter({
  getAll: (hotelId: string): Order[] =>
    orders.filter(o => o.hotel_id === hotelId).map(o => ({
      ...o,
      room: o.room || rooms.find(r => r.id === o.room_id) || (o.room_number ? { number: o.room_number } as any : undefined),
      guest: o.guest || guests.find(g => g.id === o.guest_id),
    })),
  getById: (id: string): Order | undefined => orders.find(o => o.id === id),
  getActive: (hotelId: string): Order[] =>
    orders.filter(o => o.hotel_id === hotelId && !['DELIVERED', 'CANCELLED', 'completed'].includes(o.status)),
  createLocal: (order: Order) => {
    if (!order.room && order.room_id) {
      order.room = rooms.find(r => r.id === order.room_id);
    }
    if (!order.guest && order.guest_id) {
      order.guest = guests.find(g => g.id === order.guest_id);
    }
    const existingIdx = orders.findIndex(o => o.id === order.id);
    if (existingIdx !== -1) {
      orders[existingIdx] = order;
    } else {
      orders.unshift(order);
    }
    saveDemoStore();
  },
  removeLocal: (id: string) => {
    const idx = orders.findIndex(o => o.id === id);
    if (idx !== -1) {
      orders.splice(idx, 1);
      saveDemoStore();
    }
  },
  updateLocal: (id: string, status: Order['status'], timeFields: Partial<Order>) => {
    const idx = orders.findIndex(o => o.id === id);
    if (idx === -1) return undefined;
    orders[idx] = { ...orders[idx], status, ...timeFields, updated_at: now() };
    saveDemoStore();
    return orders[idx];
  },
  attachToFolio: (order: Order) => {
    folioService.attachOrderToRoomFolio(order);
  },
  detachFromFolio: (order: Order) => {
    folioService.detachOrderFromRoomFolio(order.id);
  },
  addNotification: (notif: Notification) => {
    notifications.unshift(notif);
    saveDemoStore();
  },
  addActivityLog: (log: any) => {
    activityLogs.unshift(log);
    saveDemoStore();
  },
});

export { orderService };

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
    const prevTask = { ...housekeepingTasks[idx] };
    housekeepingTasks[idx] = { ...housekeepingTasks[idx], ...data };
    const task = housekeepingTasks[idx];

    // Synchronize room housekeeping status based on task progression
    if (data.status === 'IN_PROGRESS') {
      roomService.update(task.room_id, { housekeeping_status: 'CLEANING' });
    } else if (data.status === 'COMPLETED') {
      roomService.update(task.room_id, { housekeeping_status: 'CLEAN' });
    } else if (data.status === 'INSPECTED') {
      roomService.update(task.room_id, { housekeeping_status: 'INSPECTED' });
    }

    const updated = {
      ...housekeepingTasks[idx],
      room: rooms.find(r => r.id === task.room_id),
    };
    saveDemoStore();

    if (!isDemoMode() && isSupabaseConfigured() && supabase) {
      supabaseHousekeepingService.updateTask(id, data).catch(err => {
        handleOptimisticMutationFailure('housekeeping_task', id, () => {
          const curIdx = housekeepingTasks.findIndex(t => t.id === id);
          if (curIdx !== -1) housekeepingTasks[curIdx] = prevTask;
        }, err);
      });
    }

    realtimeSync.emit('HOUSEKEEPING_TASK_UPDATED', { taskId: id, task: updated });
    return updated;
  },
  updateTaskAsync: async (id: string, data: Partial<HousekeepingTask>): Promise<HousekeepingTask | undefined> => {
    if (isDemoMode() || !isSupabaseConfigured() || !supabase) {
      return housekeepingService.updateTask(id, data);
    }
    const updated = await supabaseHousekeepingService.updateTask(id, data);
    const idx = housekeepingTasks.findIndex(t => t.id === id);
    if (idx !== -1) {
      housekeepingTasks[idx] = updated;
    } else {
      housekeepingTasks.unshift(updated);
    }
    saveDemoStore();
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

    if (!isDemoMode() && isSupabaseConfigured() && supabase) {
      supabaseHousekeepingService.createTask(data).catch(err => {
        handleOptimisticMutationFailure('housekeeping_task', task.id, () => {
          const idx = housekeepingTasks.findIndex(t => t.id === task.id);
          if (idx !== -1) housekeepingTasks.splice(idx, 1);
        }, err);
      });
    }

    realtimeSync.emit('NEW_HOUSEKEEPING_TASK', { task });
    return task;
  },
  createTaskAsync: async (data: Omit<HousekeepingTask, 'id' | 'created_at'>): Promise<HousekeepingTask> => {
    if (isDemoMode() || !isSupabaseConfigured() || !supabase) {
      return housekeepingService.createTask(data);
    }
    const created = await supabaseHousekeepingService.createTask(data);
    const idx = housekeepingTasks.findIndex(t => t.id === created.id);
    if (idx !== -1) {
      housekeepingTasks[idx] = created;
    } else {
      housekeepingTasks.unshift(created);
    }
    saveDemoStore();
    realtimeSync.emit('NEW_HOUSEKEEPING_TASK', { task: created });
    return created;
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
    const ticket: MaintenanceTicket = {
      ...data,
      id: uuid(),
      room: rooms.find(r => r.id === data.room_id),
      created_at: now(),
      updated_at: now(),
    };
    maintenanceTickets.push(ticket);
    saveDemoStore();
    if (!isDemoMode() && isSupabaseConfigured() && supabase) {
      supabaseMaintenanceService.create(data).catch(err => {
        handleOptimisticMutationFailure('maintenance_ticket', ticket.id, () => {
          const idx = maintenanceTickets.findIndex(t => t.id === ticket.id);
          if (idx !== -1) maintenanceTickets.splice(idx, 1);
        }, err);
      });
    }
    realtimeSync.emit('NEW_MAINTENANCE_TICKET', { ticket });
    return ticket;
  },
  createAsync: async (data: Omit<MaintenanceTicket, 'id' | 'created_at' | 'updated_at'>): Promise<MaintenanceTicket> => {
    if (isDemoMode() || !isSupabaseConfigured() || !supabase) {
      return maintenanceService.create(data);
    }
    const created = await supabaseMaintenanceService.create(data);
    const idx = maintenanceTickets.findIndex(t => t.id === created.id);
    if (idx !== -1) {
      maintenanceTickets[idx] = created;
    } else {
      maintenanceTickets.unshift(created);
    }
    saveDemoStore();
    realtimeSync.emit('NEW_MAINTENANCE_TICKET', { ticket: created });
    return created;
  },
  update: (id: string, data: Partial<MaintenanceTicket>): MaintenanceTicket | undefined => {
    const idx = maintenanceTickets.findIndex(t => t.id === id);
    if (idx === -1) return undefined;
    const prevTicket = { ...maintenanceTickets[idx] };
    maintenanceTickets[idx] = {
      ...maintenanceTickets[idx],
      ...data,
      updated_at: now(),
      room: rooms.find(r => r.id === (data.room_id || maintenanceTickets[idx].room_id)),
    };
    saveDemoStore();
    if (!isDemoMode() && isSupabaseConfigured() && supabase) {
      supabaseMaintenanceService.update(id, data).catch(err => {
        handleOptimisticMutationFailure('maintenance_ticket', id, () => {
          const curIdx = maintenanceTickets.findIndex(t => t.id === id);
          if (curIdx !== -1) maintenanceTickets[curIdx] = prevTicket;
        }, err);
      });
    }
    const updated = maintenanceTickets[idx];
    realtimeSync.emit('MAINTENANCE_TICKET_UPDATED', { ticketId: id, ticket: updated });
    return updated;
  },
  updateAsync: async (id: string, data: Partial<MaintenanceTicket>): Promise<MaintenanceTicket | undefined> => {
    if (isDemoMode() || !isSupabaseConfigured() || !supabase) {
      return maintenanceService.update(id, data);
    }
    const updated = await supabaseMaintenanceService.update(id, data);
    const idx = maintenanceTickets.findIndex(t => t.id === id);
    if (idx !== -1) {
      maintenanceTickets[idx] = updated;
    } else {
      maintenanceTickets.unshift(updated);
    }
    saveDemoStore();
    realtimeSync.emit('MAINTENANCE_TICKET_UPDATED', { ticketId: id, ticket: updated });
    return updated;
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
  createService: (data: Omit<HotelService, 'id'>): HotelService => {
    const svc: HotelService = { ...data, id: uuid() };
    hotelServices.push(svc);
    saveDemoStore();
    return svc;
  },
  create: (data: Omit<ServiceRequest, 'id' | 'created_at' | 'updated_at'> & { token?: string }): ServiceRequest => {
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

    // Auto-create Maintenance Ticket if request is repair/engineering-related
    const isMaintenanceCategory = service?.category === 'MAINTENANCE' ||
      data.title.toLowerCase().includes('ac') ||
      data.title.toLowerCase().includes('air condition') ||
      data.title.toLowerCase().includes('repair') ||
      data.title.toLowerCase().includes('leak') ||
      data.title.toLowerCase().includes('plumb') ||
      data.title.toLowerCase().includes('tap') ||
      data.title.toLowerCase().includes('drain') ||
      data.title.toLowerCase().includes('electric') ||
      data.title.toLowerCase().includes('broken');

    if (isMaintenanceCategory && data.room_id) {
      let maintCat: 'HVAC' | 'PLUMBING' | 'ELECTRICAL' | 'CARPENTRY' | 'OTHER' = 'OTHER';
      const text = (data.title + ' ' + (data.description || '')).toLowerCase();
      if (text.includes('ac') || text.includes('cooling') || text.includes('heat') || text.includes('air condition')) {
        maintCat = 'HVAC';
      } else if (text.includes('leak') || text.includes('plumb') || text.includes('tap') || text.includes('drain') || text.includes('pipe')) {
        maintCat = 'PLUMBING';
      } else if (text.includes('electric') || text.includes('light') || text.includes('socket') || text.includes('power')) {
        maintCat = 'ELECTRICAL';
      } else if (text.includes('door') || text.includes('lock') || text.includes('window') || text.includes('chair') || text.includes('table')) {
        maintCat = 'CARPENTRY';
      }

      maintenanceService.create({
        hotel_id: data.hotel_id,
        room_id: data.room_id,
        title: `Guest Service Request: ${data.title}`,
        description: data.description || 'Dispatched via In-Room Guest Portal request',
        category: maintCat,
        priority: (data.priority as any) || 'HIGH',
        status: 'NEW',
      });
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
  createAsync: async (data: Omit<ServiceRequest, 'id' | 'created_at' | 'updated_at'> & { token?: string }): Promise<ServiceRequest> => {
    if (!isDemoMode() && supabase) {
      const created = await supabaseServiceRequestService.create(data);
      serviceRequests.unshift(created);
      saveDemoStore();
      realtimeSync.emit('NEW_SERVICE_REQUEST', { request: created });
      return created;
    }
    return serviceRequestService.create(data);
  },
  updateAsync: async (id: string, data: Partial<ServiceRequest>): Promise<ServiceRequest | undefined> => {
    if (!isDemoMode() && supabase) {
      const updated = await supabaseServiceRequestService.update(id, data);
      const idx = serviceRequests.findIndex(r => r.id === id);
      if (idx !== -1 && updated) {
        serviceRequests[idx] = { ...serviceRequests[idx], ...updated, updated_at: now() };
      }
      saveDemoStore();
      realtimeSync.emit('REQUEST_STATUS_CHANGED', { requestId: id, status: data.status || updated?.status || 'PENDING', request: updated || serviceRequests[idx] });
      return updated;
    }
    return serviceRequestService.update(id, data);
  },
  submitRequest: async (data: Omit<ServiceRequest, 'id' | 'created_at' | 'updated_at'> & { token?: string }): Promise<{ success: boolean; request: ServiceRequest; trackingToken?: string; error?: string }> => {
    try {
      if (!data.hotel_id) throw new Error('Missing hotel identifier.');
      if (!isDemoMode() && supabase && data.token) {
        const req = await supabaseServiceRequestService.create(data);
        return { success: true, request: req, trackingToken: (req as any).tracking_token };
      }
      const req = serviceRequestService.create(data);
      return { success: true, request: req, trackingToken: `demo-track-${req.id}` };
    } catch (err: any) {
      console.error('[serviceRequestService.submitRequest] Failed:', err);
      return { success: false, request: null as any, error: err?.message || 'Failed to submit service request.' };
    }
  },
  fetchGuestRequestStatus: async (requestId: string, trackingToken: string): Promise<Partial<ServiceRequest> | null> => {
    if (!isDemoMode() && supabase) {
      const { data, error } = await supabase.rpc('get_guest_request_status', {
        p_request_id: requestId,
        p_tracking_token: trackingToken,
      });
      if (!error && data) {
        return {
          id: data.id,
          status: data.status,
          title: data.title,
          priority: data.priority,
        };
      }
    } else {
      // In demo mode, validate the tracking token to prevent unauthorized access
      if (trackingToken && trackingToken === `demo-track-${requestId}`) {
        const req = serviceRequests.find(r => r.id === requestId);
        if (req) {
          return {
            id: req.id,
            status: req.status,
            title: req.title,
            priority: req.priority,
          };
        }
      }
    }
    return null;
  },
};

// ─── Staff / Auth ─────────────────────────────────────────────────────────────

export const staffService = {
  getAll: (hotelId: string): Profile[] => {
    const hotelMemberIds = memberships.filter(m => m.hotel_id === hotelId).map(m => m.user_id);
    return profiles.filter(p => hotelMemberIds.includes(p.user_id));
  },
  getAllProfiles: (): Profile[] => [...profiles],
  getAllMemberships: (): HotelMembership[] => [...memberships],
  getById: (id: string): Profile | undefined => profiles.find(p => p.id === id || p.user_id === id),
  getByEmail: (email: string): Profile | undefined => profiles.find(p => p.email.toLowerCase() === email.toLowerCase()),
  getMembership: (userId: string, hotelId: string) =>
    memberships.find(m => m.user_id === userId && m.hotel_id === hotelId),
  getDepartments: (hotelId: string): Department[] => departments.filter(d => d.hotel_id === hotelId),
  createProfile: (data: Omit<Profile, 'id' | 'created_at' | 'user_id'> & { id?: string; user_id?: string }): Profile => {
    const id = data.id || `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const profile: Profile = {
      ...data,
      id,
      user_id: data.user_id || id,
      created_at: now(),
    };
    profiles.push(profile);
    saveDemoStore();
    return profile;
  },
  updateProfile: (id: string, data: Partial<Profile>): Profile | undefined => {
    const idx = profiles.findIndex(p => p.id === id || p.user_id === id);
    if (idx === -1) return undefined;
    profiles[idx] = { ...profiles[idx], ...data };
    saveDemoStore();
    return profiles[idx];
  },
  createMembership: (data: Omit<HotelMembership, 'id' | 'joined_at'>): HotelMembership => {
    const membership: HotelMembership = {
      ...data,
      id: `mem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      joined_at: now(),
    };
    memberships.push(membership);
    saveDemoStore();
    return membership;
  },
  createDepartment: (data: Omit<Department, 'id'>): Department => {
    const dept: Department = {
      ...data,
      id: `dept-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
    departments.push(dept);
    saveDemoStore();
    return dept;
  },
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
  findByToken: (token: string): (QRCode & { hotel?: Hotel; room?: Room }) | undefined => {
    const qr = qrCodes.find(q => q.token === token);
    if (!qr) return undefined;
    return {
      ...qr,
      hotel: hotels.find(h => h.id === qr.hotel_id),
      room: rooms.find(r => r.id === qr.room_id),
    };
  },
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
  generateAsync: async (hotelId: string, roomId?: string, customToken?: string): Promise<QRCode> => {
    if (!isDemoMode() && isSupabaseConfigured() && supabase) {
      const created = await supabaseQrService.generate(hotelId, roomId, customToken);
      const enriched: QRCode = {
        ...created,
        room: rooms.find(r => r.id === created.room_id),
      };
      const idx = qrCodes.findIndex(q => q.id === created.id);
      if (idx !== -1) qrCodes[idx] = enriched;
      else qrCodes.push(enriched);
      saveDemoStore();
      return enriched;
    }
    return qrService.generate(hotelId, roomId);
  },
  deactivate: (id: string): void => {
    const idx = qrCodes.findIndex(q => q.id === id);
    if (idx !== -1) {
      qrCodes[idx] = { ...qrCodes[idx], is_active: false };
      saveDemoStore();
    }
  },
  deactivateAsync: async (id: string): Promise<void> => {
    if (!isDemoMode() && isSupabaseConfigured() && supabase) {
      await supabaseQrService.deactivate(id);
    }
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
      revenueBreakdown: (() => {
        const hotelFolioIds = new Set(folios.filter(f => f.hotel_id === hotelId).map(f => f.id));
        const hotelFolioItems = folioItems.filter(fi => hotelFolioIds.has(fi.folio_id));
        const roomRevenue = hotelFolioItems.filter(fi => fi.category === 'ROOM').reduce((sum, fi) => sum + fi.total, 0);
        const fnbOrders = orders.filter(o => o.hotel_id === hotelId && o.status !== 'CANCELLED');
        const roomServiceRev = fnbOrders.filter(o => o.type === 'ROOM_SERVICE').reduce((sum, o) => sum + o.total, 0);
        const diningRev = fnbOrders.filter(o => o.type !== 'ROOM_SERVICE').reduce((sum, o) => sum + o.total, 0);
        const serviceRev = hotelFolioItems.filter(fi => fi.category === 'SERVICE' || fi.category === 'LAUNDRY' || fi.category === 'SPA').reduce((sum, fi) => sum + fi.total, 0);
        
        return [
          { name: 'Room Nights', value: Math.max(roomRevenue, 345000), color: '#1a2744' },
          { name: 'Restaurant & Bar', value: Math.max(diningRev, 89000), color: '#c9a84c' },
          { name: 'Room Service', value: Math.max(roomServiceRev, 42000), color: '#3b82f6' },
          { name: 'Laundry & Spa', value: Math.max(serviceRev, 18500), color: '#10b981' },
        ];
      })(),
      totalRevenueMtd: (() => {
        const hotelFolioIds = new Set(folios.filter(f => f.hotel_id === hotelId).map(f => f.id));
        const hotelFolioItems = folioItems.filter(fi => hotelFolioIds.has(fi.folio_id));
        const roomRevenue = hotelFolioItems.filter(fi => fi.category === 'ROOM').reduce((sum, fi) => sum + fi.total, 0);
        const fnbOrders = orders.filter(o => o.hotel_id === hotelId && o.status !== 'CANCELLED');
        const fnbRev = fnbOrders.reduce((sum, o) => sum + o.total, 0);
        const serviceRev = hotelFolioItems.filter(fi => fi.category === 'SERVICE' || fi.category === 'LAUNDRY' || fi.category === 'SPA').reduce((sum, fi) => sum + fi.total, 0);
        const calcTotal = roomRevenue + fnbRev + serviceRev;
        return calcTotal > 0 ? calcTotal : 494500;
      })(),
    };
  },
  getPlatformStats: () => ({
    ...hotelService.getPlatformStats(),
    totalHotels: hotels.length,
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
  isFeatureEnabled: (key: string, hotelId?: string): boolean => {
    const scope = hotelId || 'GLOBAL';
    const flags = featureFlagService.getFlagsForScope(scope);
    return flags[key] !== undefined ? flags[key] : (defaultFlagsMap[key] ?? false);
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
      if (data.categories && data.categories.length > 0) menuCategories = data.categories;
      if (data.items && data.items.length > 0) menuItems = data.items;
      if (data.qrCodes && data.qrCodes.length > 0) qrCodes = data.qrCodes;
      saveDemoStore();
      return true;
    } catch (err) {
      console.error('[StayNexa] Error syncing data from Supabase:', err);
      return false;
    }
  },
};
