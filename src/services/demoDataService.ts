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


// In-memory mutable store (demo mode only)
let hotels = [...DEMO_HOTELS];
let branding = [...DEMO_HOTEL_BRANDING];
let settings = [...DEMO_HOTEL_SETTINGS];
let roomTypes = [...DEMO_ROOM_TYPES];
let rooms = [...DEMO_ROOMS];
let guests = [...DEMO_GUESTS];
let reservations = [...DEMO_RESERVATIONS];
let folios = [...DEMO_FOLIOS];
let folioItems = [...DEMO_FOLIO_ITEMS];
let payments = [...DEMO_PAYMENTS];
let menuCategories = [...DEMO_MENU_CATEGORIES];
let menuItems = [...DEMO_MENU_ITEMS];
let orders = [...DEMO_ORDERS];
let hotelServices = [...DEMO_HOTEL_SERVICES];
let serviceRequests = [...DEMO_SERVICE_REQUESTS];
let housekeepingTasks = [...DEMO_HOUSEKEEPING];
let maintenanceTickets = [...DEMO_MAINTENANCE];
let departments = [...DEMO_DEPARTMENTS];
let profiles = [...DEMO_PROFILES];
let memberships = [...DEMO_MEMBERSHIPS];
let notifications = [...DEMO_NOTIFICATIONS];
let qrCodes = [...DEMO_QR_CODES];
let activityLogs = [...DEMO_ACTIVITY_LOGS];
let subscriptions = [...DEMO_SUBSCRIPTIONS];

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
    return hotel;
  },
  update: (id: string, data: Partial<Hotel>): Hotel | undefined => {
    const idx = hotels.findIndex(h => h.id === id);
    if (idx === -1) return undefined;
    hotels[idx] = { ...hotels[idx], ...data, updated_at: now() };
    return hotels[idx];
  },
  getBranding: (hotelId: string): HotelBranding | undefined => branding.find(b => b.hotel_id === hotelId),
  getSettings: (hotelId: string): HotelSettings | undefined => settings.find(s => s.hotel_id === hotelId),
  updateBranding: (hotelId: string, data: Partial<HotelBranding>): HotelBranding | undefined => {
    const idx = branding.findIndex(b => b.hotel_id === hotelId);
    if (idx !== -1) {
      branding[idx] = { ...branding[idx], ...data };
      return branding[idx];
    }
    const newBranding: HotelBranding = { id: uuid(), hotel_id: hotelId, primary_color: '#1a3a5c', accent_color: '#c9a84c', ...data };
    branding.push(newBranding);
    return newBranding;
  },
  updateSettings: (hotelId: string, data: Partial<HotelSettings>): HotelSettings | undefined => {
    const idx = settings.findIndex(s => s.hotel_id === hotelId);
    if (idx !== -1) {
      settings[idx] = { ...settings[idx], ...data };
      return settings[idx];
    }
    return undefined;
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
    return room;
  },
  update: (id: string, data: Partial<Room>): Room | undefined => {
    const idx = rooms.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    rooms[idx] = { ...rooms[idx], ...data };
    return rooms[idx];
  },
  updateStatus: (id: string, status: Room['status'], housekeeping_status?: Room['housekeeping_status']): Room | undefined => {
    const idx = rooms.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    rooms[idx] = { ...rooms[idx], status, ...(housekeeping_status ? { housekeeping_status } : {}) };
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
    return guest;
  },
  update: (id: string, data: Partial<Guest>): Guest | undefined => {
    const idx = guests.findIndex(g => g.id === id);
    if (idx === -1) return undefined;
    guests[idx] = { ...guests[idx], ...data };
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
    return res;
  },
  update: (id: string, data: Partial<Reservation>): Reservation | undefined => {
    const idx = reservations.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    reservations[idx] = { ...reservations[idx], ...data, updated_at: now() };
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
    return reservations[idx];
  },
  checkOut: (id: string): Reservation | undefined => {
    const idx = reservations.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    const res = reservations[idx];
    reservations[idx] = { ...res, status: 'CHECKED_OUT', actual_check_out: now(), updated_at: now() };
    // Mark room as dirty
    if (res.room_id) {
      const roomIdx = rooms.findIndex(r => r.id === res.room_id);
      if (roomIdx !== -1) {
        rooms[roomIdx] = { ...rooms[roomIdx], status: 'AVAILABLE', housekeeping_status: 'DIRTY' };
      }
    }
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
  getByReservation: (reservationId: string): Folio | undefined => folios.find(f => f.reservation_id === reservationId),
  getById: (id: string): Folio | undefined => folios.find(f => f.id === id),
  getItems: (folioId: string): FolioItem[] => folioItems.filter(fi => fi.folio_id === folioId),
  getPayments: (folioId: string): Payment[] => payments.filter(p => p.folio_id === folioId),
  addItem: (item: Omit<FolioItem, 'id'>): FolioItem => {
    const fi: FolioItem = { ...item, id: uuid() };
    folioItems.push(fi);
    // Recalculate folio totals
    folioService.recalculate(item.folio_id);
    return fi;
  },
  addPayment: (payment: Omit<Payment, 'id' | 'created_at'>): Payment => {
    const p: Payment = { ...payment, id: uuid(), created_at: now() };
    payments.push(p);
    folioService.recalculate(payment.folio_id);
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
    const order: Order = {
      ...data,
      id: uuid(),
      created_at: now(),
      updated_at: now(),
      items: data.items.map(item => ({ ...item, id: uuid(), order_id: '' })),
    };
    order.items = order.items.map(item => ({ ...item, order_id: order.id }));
    orders.push(order);
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
    return orders[idx];
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
    return housekeepingTasks[idx];
  },
  createTask: (data: Omit<HousekeepingTask, 'id' | 'created_at'>): HousekeepingTask => {
    const task: HousekeepingTask = { ...data, id: uuid(), created_at: now() };
    housekeepingTasks.push(task);
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
    return ticket;
  },
  update: (id: string, data: Partial<MaintenanceTicket>): MaintenanceTicket | undefined => {
    const idx = maintenanceTickets.findIndex(t => t.id === id);
    if (idx === -1) return undefined;
    maintenanceTickets[idx] = { ...maintenanceTickets[idx], ...data, updated_at: now() };
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
    const req: ServiceRequest = { ...data, id: uuid(), created_at: now(), updated_at: now() };
    serviceRequests.push(req);
    return req;
  },
  update: (id: string, data: Partial<ServiceRequest>): ServiceRequest | undefined => {
    const idx = serviceRequests.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    serviceRequests[idx] = { ...serviceRequests[idx], ...data, updated_at: now() };
    return serviceRequests[idx];
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
  getAll: (userId: string): Notification[] =>
    notifications.filter(n => n.user_id === userId || !n.user_id).sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
  getUnreadCount: (userId: string): number =>
    notifications.filter(n => (n.user_id === userId || !n.user_id) && !n.is_read).length,
  markRead: (id: string): void => {
    const idx = notifications.findIndex(n => n.id === id);
    if (idx !== -1) notifications[idx] = { ...notifications[idx], is_read: true };
  },
  markAllRead: (userId: string): void => {
    notifications = notifications.map(n =>
      (n.user_id === userId || !n.user_id) ? { ...n, is_read: true } : n
    );
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
      id: uuid(), hotel_id: hotelId, room_id: roomId, token, url: `/guest/${token}`,
      type: roomId ? 'ROOM' : 'HOTEL', is_active: true, created_at: now(),
    };
    qrCodes.push(qr);
    return qr;
  },
  deactivate: (id: string): void => {
    const idx = qrCodes.findIndex(q => q.id === id);
    if (idx !== -1) qrCodes[idx] = { ...qrCodes[idx], is_active: false };
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
  },
  saveFlagsForScope: (scope: string, flags: Record<string, boolean>) => {
    featureFlagsStore[scope] = { ...flags };
  },
};
