// StayNexa Demo Data
// Complete seed data for 3 demo hotels
import type {
  Hotel, HotelBranding, HotelSettings, RoomType, Room, Guest,
  Reservation, Folio, FolioItem, Payment, Invoice,
  MenuCategory, MenuItem, Order, OrderItem,
  HotelService, ServiceRequest, HousekeepingTask, MaintenanceTicket,
  Department, Profile, HotelMembership, Notification, QRCode, ActivityLog,
  Subscription
} from '../types';

// ─── HOTEL 1: Grand Palace Hotel (Premium City Hotel) ────────────────────────

export const DEMO_HOTELS: Hotel[] = [
  {
    id: 'hotel-001',
    name: 'Grand Palace Hotel',
    legal_name: 'Grand Palace Hospitality Pvt Ltd',
    slug: 'grand-palace',
    type: 'HOTEL',
    status: 'ACTIVE',
    address: '15, MG Road, Connaught Place',
    city: 'New Delhi',
    state: 'Delhi',
    country: 'India',
    pin_code: '110001',
    phone: '+91 11 4567 8900',
    email: 'reservations@grandpalacedelhi.com',
    website: 'https://grandpalacedelhi.com',
    gstin: '07AABCG1234A1Z5',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    check_in_time: '14:00',
    check_out_time: '12:00',
    reception_phone: '+91 11 4567 8901',
    total_rooms: 48,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-06-01T08:00:00Z',
  },
  {
    id: 'hotel-002',
    name: 'The Willow Boutique',
    legal_name: 'Willow Stays LLP',
    slug: 'willow-boutique',
    type: 'BOUTIQUE',
    status: 'ACTIVE',
    address: '7, Heritage Lane, Koregaon Park',
    city: 'Pune',
    state: 'Maharashtra',
    country: 'India',
    pin_code: '411001',
    phone: '+91 20 6789 0123',
    email: 'hello@willowboutique.in',
    website: 'https://willowboutique.in',
    gstin: '27AABCW5678B1Z2',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    check_in_time: '13:00',
    check_out_time: '11:00',
    reception_phone: '+91 20 6789 0124',
    total_rooms: 18,
    created_at: '2024-02-20T10:00:00Z',
    updated_at: '2024-06-01T08:00:00Z',
  },
  {
    id: 'hotel-003',
    name: 'Azure Cove Resort',
    legal_name: 'Azure Hospitality Group Pvt Ltd',
    slug: 'azure-cove',
    type: 'RESORT',
    status: 'ACTIVE',
    address: 'Baga Beach Road, Calangute',
    city: 'Goa',
    state: 'Goa',
    country: 'India',
    pin_code: '403516',
    phone: '+91 832 234 5678',
    email: 'stay@azureresort.com',
    website: 'https://azurecoveresort.com',
    gstin: '30AABCA9012C1Z7',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    check_in_time: '15:00',
    check_out_time: '11:00',
    reception_phone: '+91 832 234 5679',
    total_rooms: 32,
    created_at: '2024-03-10T10:00:00Z',
    updated_at: '2024-06-01T08:00:00Z',
  },
];

export const DEMO_HOTEL_BRANDING: HotelBranding[] = [
  {
    id: 'brand-001',
    hotel_id: 'hotel-001',
    primary_color: '#1a3a5c',
    accent_color: '#c9a84c',
    tagline: 'Where Luxury Meets Legacy',
  },
  {
    id: 'brand-002',
    hotel_id: 'hotel-002',
    primary_color: '#2d5016',
    accent_color: '#8fb340',
    tagline: 'Your Home Away from Home',
  },
  {
    id: 'brand-003',
    hotel_id: 'hotel-003',
    primary_color: '#0a4a6e',
    accent_color: '#00b4d8',
    tagline: 'Where Paradise Begins',
  },
];

export const DEMO_HOTEL_SETTINGS: HotelSettings[] = [
  {
    id: 'settings-001',
    hotel_id: 'hotel-001',
    wifi_name: 'GrandPalace_Guest',
    wifi_password: 'WelcomeGP2024',
    default_tax_percent: 18,
    service_charge_percent: 10,
    invoice_prefix: 'GP',
    allow_room_charge: true,
    require_deposit: true,
    deposit_percent: 20,
    google_review_url: 'https://search.google.com/local/writereview?placeid=ChIJdd4hrwugDDkRkX6Z1Gj9Yn4',
  },
  {
    id: 'settings-002',
    hotel_id: 'hotel-002',
    wifi_name: 'WillowGuest_5G',
    wifi_password: 'WillowStay#7',
    default_tax_percent: 12,
    service_charge_percent: 0,
    invoice_prefix: 'WB',
    allow_room_charge: true,
    require_deposit: false,
    deposit_percent: 0,
    google_review_url: 'https://search.google.com/local/writereview?placeid=ChIJk9XwPq_CwjsROb0Qj001',
  },
  {
    id: 'settings-003',
    hotel_id: 'hotel-003',
    wifi_name: 'AzureCove_WiFi',
    wifi_password: 'Azure@Beach2024',
    default_tax_percent: 18,
    service_charge_percent: 5,
    invoice_prefix: 'AC',
    allow_room_charge: true,
    require_deposit: true,
    deposit_percent: 30,
    google_review_url: 'https://search.google.com/local/writereview?placeid=ChIJ8_Qj8mSvvzsRK9b1-azureresort',
  },
];

// ─── Room Types ───────────────────────────────────────────────────────────────

export const DEMO_ROOM_TYPES: RoomType[] = [
  // Grand Palace
  { id: 'rt-001', hotel_id: 'hotel-001', name: 'Superior Room', code: 'SUP', description: 'Elegantly appointed city-view room', base_rate: 4500, max_adults: 2, max_children: 1, amenities: ['AC', 'WiFi', 'LCD TV', 'Mini Bar', 'Safe', 'Tea/Coffee Maker'], images: [], is_active: true },
  { id: 'rt-002', hotel_id: 'hotel-001', name: 'Deluxe Room', code: 'DLX', description: 'Spacious room with premium amenities', base_rate: 6500, max_adults: 2, max_children: 2, amenities: ['AC', 'WiFi', 'LCD TV', 'Mini Bar', 'Safe', 'Bathtub', 'Tea/Coffee Maker', 'Work Desk'], images: [], is_active: true },
  { id: 'rt-003', hotel_id: 'hotel-001', name: 'Executive Suite', code: 'EXE', description: 'Luxury suite with separate living area', base_rate: 12000, max_adults: 2, max_children: 2, amenities: ['AC', 'WiFi', 'LCD TV', 'Mini Bar', 'Jacuzzi', 'Butler Service', 'Lounge Access', 'Kitchenette'], images: [], is_active: true },
  { id: 'rt-004', hotel_id: 'hotel-001', name: 'Presidential Suite', code: 'PRE', description: 'Our finest accommodation with panoramic views', base_rate: 25000, max_adults: 4, max_children: 2, amenities: ['AC', 'WiFi', 'Smart TV', 'Full Bar', 'Private Pool', 'Butler Service', 'Dining Room', 'Home Theater'], images: [], is_active: true },
  // Willow Boutique
  { id: 'rt-005', hotel_id: 'hotel-002', name: 'Garden Room', code: 'GRD', description: 'Cozy room with garden view', base_rate: 3200, max_adults: 2, max_children: 1, amenities: ['AC', 'WiFi', 'TV', 'Garden View'], images: [], is_active: true },
  { id: 'rt-006', hotel_id: 'hotel-002', name: 'Heritage Suite', code: 'HER', description: 'Boutique suite with antique furnishings', base_rate: 5800, max_adults: 2, max_children: 1, amenities: ['AC', 'WiFi', 'Smart TV', 'Clawfoot Bath', 'Heritage Decor'], images: [], is_active: true },
  // Azure Cove Resort
  { id: 'rt-007', hotel_id: 'hotel-003', name: 'Beach Villa', code: 'BCH', description: 'Private villa steps from the beach', base_rate: 9500, max_adults: 2, max_children: 2, amenities: ['AC', 'WiFi', 'Smart TV', 'Private Patio', 'Beach Access', 'Outdoor Shower'], images: [], is_active: true },
  { id: 'rt-008', hotel_id: 'hotel-003', name: 'Pool Suite', code: 'POL', description: 'Suite with private plunge pool', base_rate: 15000, max_adults: 2, max_children: 2, amenities: ['AC', 'WiFi', 'Smart TV', 'Plunge Pool', 'Outdoor Bath', 'Butler'], images: [], is_active: true },
  { id: 'rt-009', hotel_id: 'hotel-003', name: 'Ocean Cottage', code: 'OCN', description: 'Stand-alone cottage with ocean view', base_rate: 7500, max_adults: 3, max_children: 2, amenities: ['AC', 'WiFi', 'TV', 'Ocean View', 'Hammock', 'BBQ Pit'], images: [], is_active: true },
];

// ─── Rooms ────────────────────────────────────────────────────────────────────

export const DEMO_ROOMS: Room[] = [
  // Grand Palace - Floor 1
  { id: 'room-001', hotel_id: 'hotel-001', room_type_id: 'rt-001', number: '101', floor: 1, status: 'OCCUPIED', housekeeping_status: 'CLEAN', is_active: true },
  { id: 'room-002', hotel_id: 'hotel-001', room_type_id: 'rt-001', number: '102', floor: 1, status: 'AVAILABLE', housekeeping_status: 'CLEAN', is_active: true },
  { id: 'room-003', hotel_id: 'hotel-001', room_type_id: 'rt-001', number: '103', floor: 1, status: 'AVAILABLE', housekeeping_status: 'DIRTY', is_active: true },
  { id: 'room-004', hotel_id: 'hotel-001', room_type_id: 'rt-002', number: '104', floor: 1, status: 'RESERVED', housekeeping_status: 'CLEAN', is_active: true },
  { id: 'room-005', hotel_id: 'hotel-001', room_type_id: 'rt-002', number: '105', floor: 1, status: 'OCCUPIED', housekeeping_status: 'CLEAN', is_active: true },
  // Grand Palace - Floor 2
  { id: 'room-006', hotel_id: 'hotel-001', room_type_id: 'rt-001', number: '201', floor: 2, status: 'AVAILABLE', housekeeping_status: 'CLEAN', is_active: true },
  { id: 'room-007', hotel_id: 'hotel-001', room_type_id: 'rt-002', number: '202', floor: 2, status: 'OCCUPIED', housekeeping_status: 'DIRTY', is_active: true },
  { id: 'room-008', hotel_id: 'hotel-001', room_type_id: 'rt-002', number: '203', floor: 2, status: 'MAINTENANCE', housekeeping_status: 'INSPECTION_REQUIRED', is_active: true, notes: 'AC unit repair in progress' },
  { id: 'room-009', hotel_id: 'hotel-001', room_type_id: 'rt-003', number: '204', floor: 2, status: 'AVAILABLE', housekeeping_status: 'CLEAN', is_active: true },
  { id: 'room-010', hotel_id: 'hotel-001', room_type_id: 'rt-004', number: '205', floor: 2, status: 'RESERVED', housekeeping_status: 'CLEAN', is_active: true },
  // Willow Boutique
  { id: 'room-101', hotel_id: 'hotel-002', room_type_id: 'rt-005', number: 'G01', floor: 0, status: 'OCCUPIED', housekeeping_status: 'CLEAN', is_active: true },
  { id: 'room-102', hotel_id: 'hotel-002', room_type_id: 'rt-005', number: 'G02', floor: 0, status: 'AVAILABLE', housekeeping_status: 'CLEAN', is_active: true },
  { id: 'room-103', hotel_id: 'hotel-002', room_type_id: 'rt-006', number: 'S01', floor: 1, status: 'OCCUPIED', housekeeping_status: 'DIRTY', is_active: true },
  { id: 'room-104', hotel_id: 'hotel-002', room_type_id: 'rt-006', number: 'S02', floor: 1, status: 'AVAILABLE', housekeeping_status: 'CLEAN', is_active: true },
  // Azure Cove
  { id: 'room-201', hotel_id: 'hotel-003', room_type_id: 'rt-007', number: 'V01', floor: 0, status: 'OCCUPIED', housekeeping_status: 'CLEAN', is_active: true },
  { id: 'room-202', hotel_id: 'hotel-003', room_type_id: 'rt-007', number: 'V02', floor: 0, status: 'RESERVED', housekeeping_status: 'CLEAN', is_active: true },
  { id: 'room-203', hotel_id: 'hotel-003', room_type_id: 'rt-008', number: 'PS01', floor: 0, status: 'AVAILABLE', housekeeping_status: 'CLEAN', is_active: true },
  { id: 'room-204', hotel_id: 'hotel-003', room_type_id: 'rt-009', number: 'OC01', floor: 0, status: 'OCCUPIED', housekeeping_status: 'DIRTY', is_active: true },
];

// ─── Guests ───────────────────────────────────────────────────────────────────

export const DEMO_GUESTS: Guest[] = [
  { id: 'guest-001', hotel_id: 'hotel-001', first_name: 'Arjun', last_name: 'Sharma', email: 'arjun.sharma@email.com', phone: '+91 98765 43210', id_type: 'AADHAAR', id_number: 'XXXX XXXX 1234', nationality: 'Indian', address: '42 Park Street', city: 'Mumbai', date_of_birth: '1985-03-15', gender: 'MALE', vip_status: true, notes: 'Regular guest. Prefers high floor rooms.', created_at: '2024-01-20T10:00:00Z' },
  { id: 'guest-002', hotel_id: 'hotel-001', first_name: 'Priya', last_name: 'Mehta', email: 'priya.mehta@corp.com', phone: '+91 87654 32109', id_type: 'PASSPORT', id_number: 'J1234567', nationality: 'Indian', city: 'Bangalore', gender: 'FEMALE', vip_status: false, created_at: '2024-02-10T10:00:00Z' },
  { id: 'guest-003', hotel_id: 'hotel-001', first_name: 'Rahul', last_name: 'Gupta', email: 'rahul.g@business.in', phone: '+91 76543 21098', id_type: 'PAN', id_number: 'ABCPG1234D', nationality: 'Indian', city: 'Chennai', gender: 'MALE', vip_status: false, created_at: '2024-03-05T10:00:00Z' },
  { id: 'guest-004', hotel_id: 'hotel-002', first_name: 'Sneha', last_name: 'Patil', email: 'sneha@example.com', phone: '+91 65432 10987', id_type: 'AADHAAR', id_number: 'XXXX XXXX 5678', nationality: 'Indian', city: 'Pune', gender: 'FEMALE', vip_status: false, created_at: '2024-02-25T10:00:00Z' },
  { id: 'guest-005', hotel_id: 'hotel-003', first_name: 'David', last_name: 'Chen', email: 'david.chen@tech.com', phone: '+65 9123 4567', id_type: 'PASSPORT', id_number: 'K7654321', nationality: 'Singaporean', city: 'Singapore', gender: 'MALE', vip_status: true, notes: 'Allergic to seafood. Loves beach activities.', created_at: '2024-03-15T10:00:00Z' },
  { id: 'guest-006', hotel_id: 'hotel-003', first_name: 'Ananya', last_name: 'Krishnan', email: 'ananya.k@gmail.com', phone: '+91 54321 09876', id_type: 'AADHAAR', id_number: 'XXXX XXXX 9012', nationality: 'Indian', city: 'Hyderabad', gender: 'FEMALE', vip_status: false, created_at: '2024-04-01T10:00:00Z' },
];

// ─── Reservations ─────────────────────────────────────────────────────────────

const today = new Date().toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

export const DEMO_RESERVATIONS: Reservation[] = [
  {
    id: 'res-001', hotel_id: 'hotel-001', guest_id: 'guest-001', room_type_id: 'rt-001', room_id: 'room-001',
    status: 'CHECKED_IN', source: 'DIRECT', check_in_date: yesterday, check_out_date: tomorrow,
    actual_check_in: `${yesterday}T14:30:00Z`,
    adults: 2, children: 0, nights: 2, rate_per_night: 4500,
    total_amount: 9000, tax_amount: 1620, discount_amount: 0, deposit_amount: 1800,
    notes: 'VIP guest. Extra amenities requested.', created_at: `${lastWeek}T10:00:00Z`, updated_at: `${yesterday}T14:30:00Z`,
  },
  {
    id: 'res-002', hotel_id: 'hotel-001', guest_id: 'guest-002', room_type_id: 'rt-002', room_id: 'room-005',
    status: 'CHECKED_IN', source: 'BOOKING_COM', external_booking_id: 'BK-987654321',
    check_in_date: today, check_out_date: nextWeek,
    actual_check_in: `${today}T15:00:00Z`,
    adults: 1, children: 0, nights: 7, rate_per_night: 6500,
    total_amount: 45500, tax_amount: 8190, discount_amount: 0, deposit_amount: 9100,
    created_at: `${lastWeek}T12:00:00Z`, updated_at: `${today}T15:00:00Z`,
  },
  {
    id: 'res-003', hotel_id: 'hotel-001', guest_id: 'guest-003', room_type_id: 'rt-002', room_id: 'room-004',
    status: 'CONFIRMED', source: 'PHONE',
    check_in_date: tomorrow, check_out_date: nextWeek,
    adults: 2, children: 1, nights: 6, rate_per_night: 6500,
    total_amount: 39000, tax_amount: 7020, discount_amount: 1950, deposit_amount: 0,
    notes: 'Late check-in expected. Early breakfast requested.', created_at: `${lastWeek}T14:00:00Z`, updated_at: `${lastWeek}T14:00:00Z`,
  },
  {
    id: 'res-004', hotel_id: 'hotel-002', guest_id: 'guest-004', room_type_id: 'rt-005', room_id: 'room-101',
    status: 'CHECKED_IN', source: 'WALK_IN',
    check_in_date: today, check_out_date: tomorrow,
    actual_check_in: `${today}T13:30:00Z`,
    adults: 2, children: 0, nights: 1, rate_per_night: 3200,
    total_amount: 3200, tax_amount: 384, discount_amount: 0, deposit_amount: 0,
    created_at: `${today}T13:30:00Z`, updated_at: `${today}T13:30:00Z`,
  },
  {
    id: 'res-005', hotel_id: 'hotel-003', guest_id: 'guest-005', room_type_id: 'rt-007', room_id: 'room-201',
    status: 'CHECKED_IN', source: 'MMT', external_booking_id: 'MMT-456789',
    check_in_date: yesterday, check_out_date: nextWeek,
    actual_check_in: `${yesterday}T15:30:00Z`,
    adults: 2, children: 0, nights: 8, rate_per_night: 9500,
    total_amount: 76000, tax_amount: 13680, discount_amount: 0, deposit_amount: 22800,
    created_at: `${lastWeek}T09:00:00Z`, updated_at: `${yesterday}T15:30:00Z`,
  },
];

// ─── Folios ───────────────────────────────────────────────────────────────────

export const DEMO_FOLIOS: Folio[] = [
  {
    id: 'folio-001', hotel_id: 'hotel-001', reservation_id: 'res-001', guest_id: 'guest-001',
    status: 'PARTIAL', total_charges: 11747, total_payments: 1800, outstanding: 9947,
    created_at: `${yesterday}T14:30:00Z`, updated_at: new Date().toISOString(),
  },
  {
    id: 'folio-002', hotel_id: 'hotel-001', reservation_id: 'res-002', guest_id: 'guest-002',
    status: 'PARTIAL', total_charges: 7670, total_payments: 9100, outstanding: -1430,
    created_at: `${today}T15:00:00Z`, updated_at: new Date().toISOString(),
  },
  {
    id: 'folio-003', hotel_id: 'hotel-003', reservation_id: 'res-005', guest_id: 'guest-005',
    status: 'PARTIAL', total_charges: 22420, total_payments: 22800, outstanding: -380,
    created_at: `${yesterday}T15:30:00Z`, updated_at: new Date().toISOString(),
  },
];

export const DEMO_FOLIO_ITEMS: FolioItem[] = [
  { id: 'fi-001', folio_id: 'folio-001', hotel_id: 'hotel-001', description: 'Room Charge - Superior Room (101) - Night 1', category: 'ROOM', quantity: 1, unit_price: 4500, tax_percent: 18, tax_amount: 810, discount_amount: 0, total: 5310, posted_at: `${yesterday}T14:30:00Z` },
  { id: 'fi-002', folio_id: 'folio-001', hotel_id: 'hotel-001', description: 'Butter Chicken + Naan x2 - Room Service', category: 'ROOM_SERVICE', quantity: 1, unit_price: 680, tax_percent: 5, tax_amount: 34, discount_amount: 0, total: 714, posted_at: `${yesterday}T19:30:00Z` },
  { id: 'fi-003', folio_id: 'folio-001', hotel_id: 'hotel-001', description: 'Minibar Consumption', category: 'OTHER', quantity: 1, unit_price: 350, tax_percent: 18, tax_amount: 63, discount_amount: 0, total: 413, posted_at: `${today}T07:00:00Z` },
  { id: 'fi-004', folio_id: 'folio-001', hotel_id: 'hotel-001', description: 'Room Charge - Superior Room (101) - Night 2', category: 'ROOM', quantity: 1, unit_price: 4500, tax_percent: 18, tax_amount: 810, discount_amount: 0, total: 5310, posted_at: `${today}T14:30:00Z` },
  { id: 'fi-005', folio_id: 'folio-002', hotel_id: 'hotel-001', description: 'Room Charge - Deluxe Room (105) - Night 1', category: 'ROOM', quantity: 1, unit_price: 6500, tax_percent: 18, tax_amount: 1170, discount_amount: 0, total: 7670, reference_id: 'res-002', posted_at: `${today}T15:00:00Z` },
  { id: 'fi-006', folio_id: 'folio-003', hotel_id: 'hotel-003', description: 'Room Charge - Beachfront Villa (V01) - Night 1', category: 'ROOM', quantity: 1, unit_price: 9500, tax_percent: 18, tax_amount: 1710, discount_amount: 0, total: 11210, posted_at: `${yesterday}T15:30:00Z` },
  { id: 'fi-007', folio_id: 'folio-003', hotel_id: 'hotel-003', description: 'Room Charge - Beachfront Villa (V01) - Night 2', category: 'ROOM', quantity: 1, unit_price: 9500, tax_percent: 18, tax_amount: 1710, discount_amount: 0, total: 11210, posted_at: `${today}T15:30:00Z` },
];

export const DEMO_PAYMENTS: Payment[] = [
  { id: 'pay-001', hotel_id: 'hotel-001', folio_id: 'folio-001', guest_id: 'guest-001', reservation_id: 'res-001', amount: 1800, method: 'UPI', reference: 'UPI-987654321', notes: 'Deposit collected at check-in', received_by: 'Reception', created_at: `${yesterday}T14:30:00Z` },
  { id: 'pay-002', hotel_id: 'hotel-001', folio_id: 'folio-002', guest_id: 'guest-002', reservation_id: 'res-002', amount: 9100, method: 'CARD', reference: 'CARD-123456', notes: 'Deposit via OTA prepayment', received_by: 'System', created_at: `${today}T15:00:00Z` },
  { id: 'pay-003', hotel_id: 'hotel-003', folio_id: 'folio-003', guest_id: 'guest-005', reservation_id: 'res-005', amount: 22800, method: 'BANK_TRANSFER', reference: 'NEFT-789012', notes: 'Advance payment', received_by: 'Front Desk', created_at: `${yesterday}T15:30:00Z` },
];

// ─── Menu ─────────────────────────────────────────────────────────────────────

export const DEMO_MENU_CATEGORIES: MenuCategory[] = [
  { id: 'mc-001', hotel_id: 'hotel-001', name: 'Starters', description: 'Appetizers and soups', sort_order: 1, is_active: true },
  { id: 'mc-002', hotel_id: 'hotel-001', name: 'Main Course', description: 'Indian and Continental mains', sort_order: 2, is_active: true },
  { id: 'mc-003', hotel_id: 'hotel-001', name: 'Breads', description: 'Fresh baked breads', sort_order: 3, is_active: true },
  { id: 'mc-004', hotel_id: 'hotel-001', name: 'Beverages & Water', description: 'Packaged mineral water, hot and cold drinks', sort_order: 4, is_active: true },
  { id: 'mc-005', hotel_id: 'hotel-001', name: 'Desserts', description: 'Sweet endings', sort_order: 5, is_active: true },
  { id: 'mc-006', hotel_id: 'hotel-003', name: 'Seafood', description: 'Fresh catch from the sea', sort_order: 1, is_active: true },
  { id: 'mc-007', hotel_id: 'hotel-003', name: 'Goan Specials', description: 'Authentic Goan cuisine', sort_order: 2, is_active: true },
  { id: 'mc-008', hotel_id: 'hotel-003', name: 'Cocktails', description: 'Tropical cocktails & mocktails', sort_order: 3, is_active: true },
];

export const DEMO_MENU_ITEMS: MenuItem[] = [
  // Grand Palace
  { id: 'mi-001', hotel_id: 'hotel-001', category_id: 'mc-001', name: 'Paneer Tikka', description: 'Grilled cottage cheese with spices', price: 320, tax_percent: 5, is_veg: true, is_available: true, tags: ['popular', 'spicy'], preparation_time_minutes: 15 },
  { id: 'mi-002', hotel_id: 'hotel-001', category_id: 'mc-001', name: 'Chicken Seekh Kebab', description: 'Minced chicken kebab from tandoor', price: 380, tax_percent: 5, is_veg: false, is_available: true, tags: ['popular'], preparation_time_minutes: 20 },
  { id: 'mi-003', hotel_id: 'hotel-001', category_id: 'mc-001', name: 'Tomato Shorba', description: 'Spiced tomato soup with cream', price: 180, tax_percent: 5, is_veg: true, is_available: true, tags: [], preparation_time_minutes: 10 },
  { id: 'mi-004', hotel_id: 'hotel-001', category_id: 'mc-002', name: 'Butter Chicken', description: 'Classic murgh makhani in rich tomato gravy', price: 480, tax_percent: 5, is_veg: false, is_available: true, tags: ['bestseller', 'popular'], preparation_time_minutes: 25 },
  { id: 'mi-005', hotel_id: 'hotel-001', category_id: 'mc-002', name: 'Dal Makhani', description: 'Slow-cooked black lentils in cream and butter', price: 320, tax_percent: 5, is_veg: true, is_available: true, tags: ['popular'], preparation_time_minutes: 20 },
  { id: 'mi-006', hotel_id: 'hotel-001', category_id: 'mc-002', name: 'Grilled Salmon', description: 'Atlantic salmon with herb butter', price: 750, tax_percent: 5, is_veg: false, is_available: true, tags: ['continental'], preparation_time_minutes: 25 },
  { id: 'mi-007', hotel_id: 'hotel-001', category_id: 'mc-003', name: 'Butter Naan', description: 'Leavened bread brushed with butter', price: 60, tax_percent: 5, is_veg: true, is_available: true, tags: [], preparation_time_minutes: 8 },
  { id: 'mi-008', hotel_id: 'hotel-001', category_id: 'mc-003', name: 'Tandoori Roti', description: 'Whole wheat bread from tandoor', price: 45, tax_percent: 5, is_veg: true, is_available: true, tags: [], preparation_time_minutes: 8 },
  { id: 'mi-009', hotel_id: 'hotel-001', category_id: 'mc-004', name: 'Masala Chai', description: 'Spiced Indian tea', price: 80, tax_percent: 5, is_veg: true, is_available: true, tags: [], preparation_time_minutes: 5 },
  { id: 'mi-010', hotel_id: 'hotel-001', category_id: 'mc-004', name: 'Fresh Lime Soda', description: 'Sweet or salted lime soda', price: 120, tax_percent: 5, is_veg: true, is_available: true, tags: [], preparation_time_minutes: 3 },
  { id: 'mi-011', hotel_id: 'hotel-001', category_id: 'mc-004', name: 'Packaged Mineral Water 1L', description: 'Natural spring packaged mineral water bottle (1000ml)', price: 60, tax_percent: 5, is_veg: true, is_available: true, tags: ['water', 'essential'], preparation_time_minutes: 2 },
  { id: 'mi-012', hotel_id: 'hotel-001', category_id: 'mc-004', name: 'Himalayan Sparkling Water 750ml', description: 'Artisanal sparkling natural mineral water with fine effervescence', price: 150, tax_percent: 5, is_veg: true, is_available: true, tags: ['water', 'premium'], preparation_time_minutes: 2 },
  { id: 'mi-013', hotel_id: 'hotel-001', category_id: 'mc-005', name: 'Gulab Jamun', description: 'Soft milk dumplings in sugar syrup', price: 150, tax_percent: 5, is_veg: true, is_available: true, tags: ['popular'], preparation_time_minutes: 5 },
  // Azure Cove
  { id: 'mi-101', hotel_id: 'hotel-003', category_id: 'mc-006', name: 'Grilled Tiger Prawns', description: 'Fresh tiger prawns with garlic butter', price: 850, tax_percent: 5, is_veg: false, is_available: true, tags: ['bestseller'], preparation_time_minutes: 20 },
  { id: 'mi-102', hotel_id: 'hotel-003', category_id: 'mc-007', name: 'Goan Fish Curry', description: 'Traditional red Goan fish curry with rice', price: 520, tax_percent: 5, is_veg: false, is_available: true, tags: ['authentic'], preparation_time_minutes: 25 },
  { id: 'mi-103', hotel_id: 'hotel-003', category_id: 'mc-008', name: 'Sunset Mojito', description: 'Classic mojito with tropical twist', price: 350, tax_percent: 18, is_veg: true, is_available: true, tags: ['popular'], preparation_time_minutes: 5 },
];

// ─── Orders ───────────────────────────────────────────────────────────────────

export const DEMO_ORDERS: Order[] = [
  {
    id: 'ord-001', hotel_id: 'hotel-001', reservation_id: 'res-001', room_id: 'room-001',
    guest_id: 'guest-001', status: 'DELIVERED', type: 'ROOM_SERVICE',
    subtotal: 680, tax_amount: 34, total: 714, charge_to_room: true,
    special_instructions: 'Please knock softly',
    created_at: `${yesterday}T19:00:00Z`, updated_at: `${yesterday}T20:00:00Z`,
    accepted_at: `${yesterday}T19:05:00Z`, preparing_at: `${yesterday}T19:10:00Z`,
    ready_at: `${yesterday}T19:30:00Z`, delivered_at: `${yesterday}T19:45:00Z`,
    items: [
      { id: 'oi-001', order_id: 'ord-001', menu_item_id: 'mi-004', name: 'Butter Chicken', quantity: 1, unit_price: 480, tax_percent: 5, total: 504 },
      { id: 'oi-002', order_id: 'ord-001', menu_item_id: 'mi-007', name: 'Butter Naan', quantity: 2, unit_price: 60, tax_percent: 5, total: 126 },
      { id: 'oi-003', order_id: 'ord-001', menu_item_id: 'mi-009', name: 'Masala Chai', quantity: 1, unit_price: 80, tax_percent: 5, total: 84 },
    ],
  },
  {
    id: 'ord-002', hotel_id: 'hotel-001', reservation_id: 'res-002', room_id: 'room-005',
    guest_id: 'guest-002', status: 'PREPARING', type: 'ROOM_SERVICE',
    subtotal: 600, tax_amount: 30, total: 630, charge_to_room: true,
    created_at: `${today}T12:30:00Z`, updated_at: `${today}T12:35:00Z`,
    accepted_at: `${today}T12:33:00Z`, preparing_at: `${today}T12:35:00Z`,
    items: [
      { id: 'oi-004', order_id: 'ord-002', menu_item_id: 'mi-005', name: 'Dal Makhani', quantity: 1, unit_price: 320, tax_percent: 5, total: 336 },
      { id: 'oi-005', order_id: 'ord-002', menu_item_id: 'mi-007', name: 'Butter Naan', quantity: 3, unit_price: 60, tax_percent: 5, total: 189 },
      { id: 'oi-006', order_id: 'ord-002', menu_item_id: 'mi-010', name: 'Fresh Lime Soda', quantity: 1, unit_price: 120, tax_percent: 5, total: 126 },
    ],
  },
  {
    id: 'ord-003', hotel_id: 'hotel-001', room_id: 'room-007',
    guest_id: 'guest-003', status: 'PENDING', type: 'ROOM_SERVICE',
    subtotal: 750, tax_amount: 38, total: 788, charge_to_room: true,
    created_at: new Date(Date.now() - 180000).toISOString(),
    updated_at: new Date(Date.now() - 180000).toISOString(),
    items: [
      { id: 'oi-007', order_id: 'ord-003', menu_item_id: 'mi-006', name: 'Grilled Salmon', quantity: 1, unit_price: 750, tax_percent: 5, total: 788 },
    ],
  },
];

// ─── Housekeeping Tasks ───────────────────────────────────────────────────────

export const DEMO_HOUSEKEEPING: HousekeepingTask[] = [
  { id: 'hk-001', hotel_id: 'hotel-001', room_id: 'room-003', type: 'CHECKOUT_CLEAN', status: 'PENDING', priority: 'HIGH', created_at: `${today}T11:00:00Z`, notes: 'Late checkout, priority clean' },
  { id: 'hk-002', hotel_id: 'hotel-001', room_id: 'room-007', type: 'STAYOVER_CLEAN', status: 'PENDING', priority: 'MEDIUM', assigned_to: 'Rekha Devi', created_at: `${today}T09:00:00Z` },
  { id: 'hk-003', hotel_id: 'hotel-001', room_id: 'room-001', type: 'TURNDOWN', status: 'COMPLETED', priority: 'LOW', assigned_to: 'Rekha Devi', created_at: `${yesterday}T17:00:00Z`, completed_at: `${yesterday}T18:30:00Z` },
  { id: 'hk-004', hotel_id: 'hotel-002', room_id: 'room-103', type: 'CHECKOUT_CLEAN', status: 'IN_PROGRESS', priority: 'HIGH', assigned_to: 'Maria Lopez', started_at: `${today}T11:30:00Z`, created_at: `${today}T11:00:00Z` },
];

// ─── Maintenance ──────────────────────────────────────────────────────────────

export const DEMO_MAINTENANCE: MaintenanceTicket[] = [
  { id: 'mt-001', hotel_id: 'hotel-001', room_id: 'room-008', title: 'AC Unit Not Cooling', description: 'The air conditioning unit in room 203 is not maintaining temperature', category: 'HVAC', status: 'IN_PROGRESS', priority: 'HIGH', assigned_to: 'Ramesh Kumar', created_at: `${today}T08:00:00Z`, updated_at: `${today}T09:00:00Z`, notes: 'Compressor replacement scheduled' },
  { id: 'mt-002', hotel_id: 'hotel-001', room_id: 'room-002', title: 'Tap Dripping in Bathroom', description: 'Hot water tap has a slow drip', category: 'PLUMBING', status: 'NEW', priority: 'LOW', created_at: `${today}T10:00:00Z`, updated_at: `${today}T10:00:00Z` },
  { id: 'mt-003', hotel_id: 'hotel-003', room_id: 'room-204', title: 'Bathroom Door Hinge Loose', description: 'Bathroom door does not close properly', category: 'CARPENTRY', status: 'RESOLVED', priority: 'MEDIUM', assigned_to: 'Jose Fernandes', resolved_at: `${today}T11:00:00Z`, created_at: `${yesterday}T16:00:00Z`, updated_at: `${today}T11:00:00Z` },
];

// ─── Service Requests ─────────────────────────────────────────────────────────

export const DEMO_HOTEL_SERVICES: HotelService[] = [
  { id: 'svc-001', hotel_id: 'hotel-001', name: 'Extra Towels', description: 'Request additional towels', category: 'HOUSEKEEPING', is_available: true, requires_scheduling: false },
  { id: 'svc-002', hotel_id: 'hotel-001', name: 'Room Cleaning', description: 'Request room cleaning', category: 'HOUSEKEEPING', is_available: true, requires_scheduling: false },
  { id: 'svc-003', hotel_id: 'hotel-001', name: 'Wake-up Call', description: 'Schedule a morning wake-up call', category: 'CONCIERGE', is_available: true, requires_scheduling: true },
  { id: 'svc-004', hotel_id: 'hotel-001', name: 'Laundry Service', description: '24-hour laundry and dry cleaning', category: 'LAUNDRY', price: 200, is_available: true, requires_scheduling: false },
  { id: 'svc-005', hotel_id: 'hotel-001', name: 'Airport Transfer', description: 'Car service to airport', category: 'TRANSPORT', price: 800, is_available: true, requires_scheduling: true },
  { id: 'svc-006', hotel_id: 'hotel-003', name: 'Beach Umbrella & Chairs', description: 'Setup on the beach for 4 hours', category: 'LEISURE', price: 500, is_available: true, requires_scheduling: false },
  { id: 'svc-007', hotel_id: 'hotel-003', name: 'Snorkeling Trip', description: 'Guided 2-hour snorkeling session', category: 'LEISURE', price: 1200, is_available: true, requires_scheduling: true },
];

export const DEMO_SERVICE_REQUESTS: ServiceRequest[] = [
  { id: 'sr-001', hotel_id: 'hotel-001', reservation_id: 'res-001', room_id: 'room-001', guest_id: 'guest-001', service_id: 'svc-001', status: 'COMPLETED', priority: 'MEDIUM', title: 'Extra Towels Request', description: 'Need 2 extra bath towels', completed_at: `${today}T10:00:00Z`, created_at: `${today}T09:30:00Z`, updated_at: `${today}T10:00:00Z` },
  { id: 'sr-002', hotel_id: 'hotel-001', reservation_id: 'res-002', room_id: 'room-005', guest_id: 'guest-002', service_id: 'svc-004', status: 'IN_PROGRESS', priority: 'MEDIUM', title: 'Laundry Service', description: '3 formal shirts for dry cleaning', assigned_to: 'Housekeeping', created_at: `${today}T11:00:00Z`, updated_at: `${today}T11:15:00Z` },
  { id: 'sr-003', hotel_id: 'hotel-003', reservation_id: 'res-005', room_id: 'room-201', guest_id: 'guest-005', service_id: 'svc-006', status: 'PENDING', priority: 'LOW', title: 'Beach Setup', description: 'Need beach setup for 2 people at 3pm', created_at: `${today}T13:00:00Z`, updated_at: `${today}T13:00:00Z` },
];

// ─── Departments ──────────────────────────────────────────────────────────────

export const DEMO_DEPARTMENTS: Department[] = [
  { id: 'dept-001', hotel_id: 'hotel-001', name: 'Front Office', code: 'FO', description: 'Reception and reservations' },
  { id: 'dept-002', hotel_id: 'hotel-001', name: 'Housekeeping', code: 'HK', description: 'Room cleaning and maintenance' },
  { id: 'dept-003', hotel_id: 'hotel-001', name: 'Food & Beverage', code: 'FB', description: 'Restaurant and room service' },
  { id: 'dept-004', hotel_id: 'hotel-001', name: 'Maintenance', code: 'MT', description: 'Technical and repairs' },
  { id: 'dept-005', hotel_id: 'hotel-003', name: 'Beach Operations', code: 'BO', description: 'Beach activities and water sports' },
];

// ─── Staff / Profiles ─────────────────────────────────────────────────────────

export const DEMO_PROFILES: Profile[] = [
  { id: 'user-super', user_id: 'user-super', full_name: 'Platform Admin', email: 'admin@staynexa.com', role: 'SUPER_ADMIN', is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'user-001', user_id: 'user-001', full_name: 'Vikram Nair', email: 'vikram@grandpalace.com', phone: '+91 98765 11111', role: 'HOTEL_ADMIN', is_active: true, created_at: '2024-01-15T10:00:00Z' },
  { id: 'user-002', user_id: 'user-002', full_name: 'Anjali Singh', email: 'anjali@grandpalace.com', phone: '+91 87654 22222', role: 'RECEPTION', is_active: true, created_at: '2024-01-20T10:00:00Z' },
  { id: 'user-003', user_id: 'user-003', full_name: 'Chef Mohan', email: 'mohan@grandpalace.com', phone: '+91 76543 33333', role: 'KITCHEN', is_active: true, created_at: '2024-01-20T10:00:00Z' },
  { id: 'user-004', user_id: 'user-004', full_name: 'Rekha Devi', email: 'rekha@grandpalace.com', phone: '+91 65432 44444', role: 'HOUSEKEEPING', is_active: true, created_at: '2024-02-01T10:00:00Z' },
  { id: 'user-005', user_id: 'user-005', full_name: 'Ramesh Kumar', email: 'ramesh@grandpalace.com', phone: '+91 54321 55555', role: 'MAINTENANCE', is_active: true, created_at: '2024-02-01T10:00:00Z' },
  { id: 'user-006', user_id: 'user-006', full_name: 'Priti Shah', email: 'priti@willowboutique.in', phone: '+91 43210 66666', role: 'HOTEL_ADMIN', is_active: true, created_at: '2024-02-20T10:00:00Z' },
  { id: 'user-007', user_id: 'user-007', full_name: 'Carlos Souza', email: 'carlos@azurecove.com', phone: '+91 32109 77777', role: 'HOTEL_ADMIN', is_active: true, created_at: '2024-03-10T10:00:00Z' },
];

export const DEMO_MEMBERSHIPS: HotelMembership[] = [
  { id: 'mem-001', hotel_id: 'hotel-001', user_id: 'user-001', role: 'HOTEL_ADMIN', is_active: true, joined_at: '2024-01-15T10:00:00Z' },
  { id: 'mem-002', hotel_id: 'hotel-001', user_id: 'user-002', role: 'RECEPTION', department_id: 'dept-001', is_active: true, joined_at: '2024-01-20T10:00:00Z' },
  { id: 'mem-003', hotel_id: 'hotel-001', user_id: 'user-003', role: 'KITCHEN', department_id: 'dept-003', is_active: true, joined_at: '2024-01-20T10:00:00Z' },
  { id: 'mem-004', hotel_id: 'hotel-001', user_id: 'user-004', role: 'HOUSEKEEPING', department_id: 'dept-002', is_active: true, joined_at: '2024-02-01T10:00:00Z' },
  { id: 'mem-005', hotel_id: 'hotel-001', user_id: 'user-005', role: 'MAINTENANCE', department_id: 'dept-004', is_active: true, joined_at: '2024-02-01T10:00:00Z' },
  { id: 'mem-006', hotel_id: 'hotel-002', user_id: 'user-006', role: 'HOTEL_ADMIN', is_active: true, joined_at: '2024-02-20T10:00:00Z' },
  { id: 'mem-007', hotel_id: 'hotel-003', user_id: 'user-007', role: 'HOTEL_ADMIN', is_active: true, joined_at: '2024-03-10T10:00:00Z' },
];

// ─── QR Codes ─────────────────────────────────────────────────────────────────

export const DEMO_QR_CODES: QRCode[] = [
  { id: 'qr-001', hotel_id: 'hotel-001', room_id: 'room-001', token: 'gp-r101-abc123', url: '/q/gp-r101-abc123', type: 'ROOM', is_active: true, created_at: '2024-01-16T10:00:00Z' },
  { id: 'qr-002', hotel_id: 'hotel-001', room_id: 'room-002', token: 'gp-r102-def456', url: '/q/gp-r102-def456', type: 'ROOM', is_active: true, created_at: '2024-01-16T10:00:00Z' },
  { id: 'qr-003', hotel_id: 'hotel-003', room_id: 'room-201', token: 'ac-v01-ghi789', url: '/q/ac-v01-ghi789', type: 'ROOM', is_active: true, created_at: '2024-03-11T10:00:00Z' },
];

// ─── Notifications ────────────────────────────────────────────────────────────

export const DEMO_NOTIFICATIONS: Notification[] = [
  { id: 'notif-001', hotel_id: 'hotel-001', user_id: 'user-002', type: 'NEW_ORDER', title: 'New Room Service Order', message: 'Order #ord-003 received from Room 202', is_read: false, link: '/reception/orders', created_at: new Date(Date.now() - 180000).toISOString() },
  { id: 'notif-002', hotel_id: 'hotel-001', user_id: 'user-002', type: 'MAINTENANCE', title: 'Maintenance Request', message: 'New maintenance ticket: Tap dripping in Room 102', is_read: false, link: '/reception/maintenance', created_at: `${today}T10:00:00Z` },
  { id: 'notif-003', hotel_id: 'hotel-001', user_id: 'user-002', type: 'ARRIVAL', title: 'Guest Arriving Today', message: 'Rahul Gupta checks in today. Room not yet assigned.', is_read: true, link: '/reception/reservations', created_at: `${today}T08:00:00Z` },
];

// ─── Activity Logs ────────────────────────────────────────────────────────────

export const DEMO_ACTIVITY_LOGS: ActivityLog[] = [
  { id: 'log-001', hotel_id: 'hotel-001', user_id: 'user-002', actor_name: 'Anjali Singh', action: 'CHECK_IN', entity_type: 'reservation', entity_id: 'res-001', metadata: { guest: 'Arjun Sharma', room: '101' }, created_at: `${yesterday}T14:30:00Z` },
  { id: 'log-002', hotel_id: 'hotel-001', user_id: 'user-002', actor_name: 'Anjali Singh', action: 'CHECK_IN', entity_type: 'reservation', entity_id: 'res-002', metadata: { guest: 'Priya Mehta', room: '105' }, created_at: `${today}T15:00:00Z` },
  { id: 'log-003', hotel_id: 'hotel-001', user_id: 'user-002', actor_name: 'Anjali Singh', action: 'PAYMENT_RECORDED', entity_type: 'payment', entity_id: 'pay-001', metadata: { amount: 1800, method: 'UPI' }, created_at: `${yesterday}T14:30:00Z` },
  { id: 'log-004', hotel_id: 'hotel-001', user_id: 'user-003', actor_name: 'Chef Mohan', action: 'ORDER_STATUS_CHANGED', entity_type: 'order', entity_id: 'ord-001', metadata: { status: 'READY' }, created_at: `${yesterday}T19:30:00Z` },
];

// ─── Subscriptions ────────────────────────────────────────────────────────────

export const DEMO_SUBSCRIPTIONS: Subscription[] = [
  { id: 'sub-001', hotel_id: 'hotel-001', plan: 'PRO', status: 'ACTIVE', current_period_start: '2024-06-01', current_period_end: '2024-12-31', created_at: '2024-01-15T10:00:00Z' },
  { id: 'sub-002', hotel_id: 'hotel-002', plan: 'STARTER', status: 'ACTIVE', current_period_start: '2024-06-01', current_period_end: '2024-08-31', created_at: '2024-02-20T10:00:00Z' },
  { id: 'sub-003', hotel_id: 'hotel-003', plan: 'ENTERPRISE', status: 'ACTIVE', current_period_start: '2024-01-01', current_period_end: '2024-12-31', created_at: '2024-03-10T10:00:00Z' },
];
