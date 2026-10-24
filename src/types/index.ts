// StayNexa - Shared Type Definitions
// ====================================

// ─── Enums & Constants ──────────────────────────────────────────────────────

export type HotelStatus = 'SETUP' | 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE' | 'ARCHIVED';
export type ReservationStatus = 'INQUIRY' | 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'NO_SHOW';
export type RoomStatus = 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'OUT_OF_SERVICE' | 'MAINTENANCE';
export type HousekeepingStatus = 'CLEAN' | 'DIRTY' | 'CLEANING' | 'INSPECTION_REQUIRED' | 'INSPECTED';
export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';
export type RequestStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type MaintenanceStatus = 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'VERIFIED' | 'CLOSED';
export type PaymentMethod = 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER' | 'ONLINE' | 'OTHER';
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'REFUNDED';
export type BookingSource = 'DIRECT' | 'WEBSITE' | 'WALK_IN' | 'PHONE' | 'WHATSAPP' | 'MMT' | 'GOIBIBO' | 'BOOKING_COM' | 'AGODA' | 'EXPEDIA' | 'AIRBNB' | 'OTHER_OTA';
export type UserRole = 'SUPER_ADMIN' | 'HOTEL_ADMIN' | 'HOTEL_MANAGER' | 'RECEPTION' | 'RESTAURANT_MANAGER' | 'KITCHEN' | 'HOUSEKEEPING' | 'MAINTENANCE' | 'GUEST';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type SubscriptionPlan = 'FREE_TRIAL' | 'STARTER' | 'PRO' | 'ENTERPRISE';

// ─── Core Entities ──────────────────────────────────────────────────────────

export interface Hotel {
  id: string;
  name: string;
  legal_name?: string;
  slug: string;
  type: 'HOTEL' | 'RESORT' | 'BOUTIQUE' | 'HOSTEL' | 'APARTMENT';
  status: HotelStatus;
  address: string;
  city: string;
  state: string;
  country: string;
  pin_code: string;
  phone: string;
  email: string;
  website?: string;
  gstin?: string;
  currency: string;
  timezone: string;
  check_in_time: string;
  check_out_time: string;
  reception_phone?: string;
  total_rooms: number;
  created_at: string;
  updated_at: string;
}

export interface HotelBranding {
  id: string;
  hotel_id: string;
  logo_url?: string;
  cover_url?: string;
  primary_color: string;
  accent_color: string;
  tagline?: string;
}

export interface HotelSettings {
  id: string;
  hotel_id: string;
  wifi_name?: string;
  wifi_password?: string;
  default_tax_percent: number;
  service_charge_percent: number;
  invoice_prefix: string;
  allow_room_charge: boolean;
  require_deposit: boolean;
  deposit_percent: number;
  google_review_url?: string;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface HotelMembership {
  id: string;
  hotel_id: string;
  user_id: string;
  role: UserRole;
  department_id?: string;
  is_active: boolean;
  joined_at: string;
}

export interface Department {
  id: string;
  hotel_id: string;
  name: string;
  code: string;
  description?: string;
  head_staff_id?: string;
}

export interface RoomType {
  id: string;
  hotel_id: string;
  name: string;
  code: string;
  description?: string;
  base_rate: number;
  max_adults: number;
  max_children: number;
  amenities: string[];
  images: string[];
  is_active: boolean;
}

export interface Room {
  id: string;
  hotel_id: string;
  room_type_id: string;
  room_type?: RoomType;
  number: string;
  floor: number;
  status: RoomStatus;
  housekeeping_status: HousekeepingStatus;
  is_active: boolean;
  notes?: string;
}

export interface Guest {
  id: string;
  hotel_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  id_type?: string;
  id_number?: string;
  nationality?: string;
  address?: string;
  city?: string;
  date_of_birth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  vip_status: boolean;
  notes?: string;
  created_at: string;
}

export interface Reservation {
  id: string;
  hotel_id: string;
  guest_id: string;
  guest?: Guest;
  room_type_id: string;
  room_type?: RoomType;
  room_id?: string;
  room?: Room;
  status: ReservationStatus;
  source: BookingSource;
  external_booking_id?: string;
  check_in_date: string;
  check_out_date: string;
  actual_check_in?: string;
  actual_check_out?: string;
  adults: number;
  children: number;
  nights: number;
  rate_per_night: number;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  deposit_amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Folio {
  id: string;
  hotel_id: string;
  reservation_id: string;
  reservation?: Reservation;
  guest_id: string;
  guest?: Guest;
  status: PaymentStatus;
  total_charges: number;
  total_payments: number;
  outstanding: number;
  created_at: string;
  updated_at: string;
}

export interface FolioItem {
  id: string;
  folio_id: string;
  hotel_id: string;
  description: string;
  category: 'ROOM' | 'RESTAURANT' | 'ROOM_SERVICE' | 'LAUNDRY' | 'SPA' | 'TRANSPORT' | 'SERVICE' | 'OTHER';
  quantity: number;
  unit_price: number;
  tax_percent: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  reference_id?: string;
  posted_at: string;
  posted_by?: string;
}

export interface Payment {
  id: string;
  hotel_id: string;
  folio_id: string;
  guest_id: string;
  reservation_id?: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  received_by?: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  hotel_id: string;
  folio_id: string;
  reservation_id: string;
  guest_id: string;
  invoice_number: string;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID';
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  paid_amount: number;
  outstanding: number;
  issued_at: string;
  due_date?: string;
  created_at: string;
}

// ─── Restaurant ──────────────────────────────────────────────────────────────

export interface MenuCategory {
  id: string;
  hotel_id: string;
  name: string;
  description?: string;
  image_url?: string;
  sort_order: number;
  is_active: boolean;
}

export interface MenuItem {
  id: string;
  hotel_id: string;
  category_id: string;
  category?: MenuCategory;
  name: string;
  description?: string;
  price: number;
  tax_percent: number;
  image_url?: string;
  is_veg: boolean;
  is_available: boolean;
  tags: string[];
  preparation_time_minutes: number;
}

export interface Order {
  id: string;
  hotel_id: string;
  reservation_id?: string;
  room_id?: string;
  room_number?: string;
  room?: Room;
  guest_id?: string;
  guest?: Guest;
  status: OrderStatus;
  payment_status?: string;
  type: 'DINE_IN' | 'ROOM_SERVICE' | 'TAKEAWAY';
  items: OrderItem[];
  subtotal: number;
  tax_amount: number;
  total: number;
  total_amount?: number;
  special_instructions?: string;
  charge_to_room: boolean;
  created_at: string;
  updated_at: string;
  accepted_at?: string;
  preparing_at?: string;
  ready_at?: string;
  delivered_at?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  menu_item?: MenuItem;
  name: string;
  quantity: number;
  unit_price: number;
  tax_percent: number;
  total: number;
  notes?: string;
}

// ─── Operations ──────────────────────────────────────────────────────────────

export interface HotelService {
  id: string;
  hotel_id: string;
  name: string;
  description?: string;
  category: string;
  price?: number;
  is_available: boolean;
  requires_scheduling: boolean;
}

export interface ServiceRequest {
  id: string;
  hotel_id: string;
  reservation_id?: string;
  room_id?: string;
  room?: Room;
  guest_id?: string;
  guest?: Guest;
  service_id?: string;
  service?: HotelService;
  status: RequestStatus;
  priority: Priority;
  title: string;
  description?: string;
  assigned_to?: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface HousekeepingTask {
  id: string;
  hotel_id: string;
  room_id: string;
  room?: Room;
  reservation_id?: string;
  type: 'CHECKOUT_CLEAN' | 'STAYOVER_CLEAN' | 'DEEP_CLEAN' | 'INSPECTION' | 'TURNDOWN';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'INSPECTED';
  priority: Priority;
  assigned_to?: string;
  notes?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface MaintenanceTicket {
  id: string;
  hotel_id: string;
  room_id?: string;
  room?: Room;
  reservation_id?: string;
  guest_id?: string;
  title: string;
  description: string;
  category: string;
  status: MaintenanceStatus;
  priority: Priority;
  assigned_to?: string;
  resolved_at?: string;
  verified_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ─── Platform ────────────────────────────────────────────────────────────────

export interface Subscription {
  id: string;
  hotel_id: string;
  plan: SubscriptionPlan;
  status: 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'CANCELLED';
  trial_ends_at?: string;
  current_period_start?: string;
  current_period_end?: string;
  created_at: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  is_enabled: boolean;
  hotel_id?: string; // null = platform-wide
}

export interface ActivityLog {
  id: string;
  hotel_id?: string;
  user_id?: string;
  actor_name?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface Notification {
  id: string;
  hotel_id: string;
  user_id?: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  link?: string;
  created_at: string;
}

export interface QRCode {
  id: string;
  hotel_id: string;
  room_id?: string;
  room?: Room;
  token: string;
  url: string;
  type: 'ROOM' | 'HOTEL' | 'MENU' | 'WIFI';
  is_active: boolean;
  created_at: string;
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

export interface DashboardMetric {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: string;
  color?: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface FilterState {
  search: string;
  [key: string]: string | undefined;
}
