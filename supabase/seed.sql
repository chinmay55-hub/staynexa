-- ============================================================================
-- STAYNEXA - SEED DATA FOR DEMO HOTELS & COMPLETE OPERATIONAL ECOSYSTEM
-- ============================================================================
-- Reproducible PostgreSQL Seed Data covering all core hospitality entities
-- Idempotent & Self-Healing: Synchronizes missing columns before insertion
-- ============================================================================

-- ─── 0. COLUMN SYNCHRONIZATION (Ensures pre-existing tables have all columns) ──

ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255);
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS slug VARCHAR(100);
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'HOTEL';
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'SETUP';
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India';
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS pin_code VARCHAR(20);
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS gstin VARCHAR(50);
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR';
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Kolkata';
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS check_in_time TIME DEFAULT '14:00';
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS check_out_time TIME DEFAULT '12:00';
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS reception_phone VARCHAR(50);
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS total_rooms INTEGER DEFAULT 0;
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.hotel_branding ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.hotel_branding ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE public.hotel_branding ADD COLUMN IF NOT EXISTS primary_color VARCHAR(20) DEFAULT '#1a2744';
ALTER TABLE public.hotel_branding ADD COLUMN IF NOT EXISTS accent_color VARCHAR(20) DEFAULT '#c9a84c';
ALTER TABLE public.hotel_branding ADD COLUMN IF NOT EXISTS tagline TEXT;

ALTER TABLE public.hotel_settings ADD COLUMN IF NOT EXISTS wifi_name VARCHAR(100);
ALTER TABLE public.hotel_settings ADD COLUMN IF NOT EXISTS wifi_password VARCHAR(100);
ALTER TABLE public.hotel_settings ADD COLUMN IF NOT EXISTS default_tax_percent NUMERIC(5,2) DEFAULT 18.00;
ALTER TABLE public.hotel_settings ADD COLUMN IF NOT EXISTS service_charge_percent NUMERIC(5,2) DEFAULT 0.00;
ALTER TABLE public.hotel_settings ADD COLUMN IF NOT EXISTS invoice_prefix VARCHAR(10) DEFAULT 'SN';
ALTER TABLE public.hotel_settings ADD COLUMN IF NOT EXISTS allow_room_charge BOOLEAN DEFAULT true;
ALTER TABLE public.hotel_settings ADD COLUMN IF NOT EXISTS require_deposit BOOLEAN DEFAULT false;
ALTER TABLE public.hotel_settings ADD COLUMN IF NOT EXISTS deposit_percent NUMERIC(5,2) DEFAULT 0.00;

ALTER TABLE public.room_types ADD COLUMN IF NOT EXISTS max_occupancy INTEGER DEFAULT 2;
ALTER TABLE public.room_types ADD COLUMN IF NOT EXISTS max_adults INTEGER DEFAULT 2;
ALTER TABLE public.room_types ADD COLUMN IF NOT EXISTS max_children INTEGER DEFAULT 0;
ALTER TABLE public.room_types ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT '{}';
ALTER TABLE public.room_types ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE public.room_types ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE public.qr_codes ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE public.qr_codes ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'ROOM';
ALTER TABLE public.qr_codes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- ─── 1. Insert 3 Distinct Hotels ─────────────────────────────────────────────
INSERT INTO hotels (id, name, legal_name, slug, type, status, address, city, state, country, pin_code, phone, email, website, gstin, currency, timezone, check_in_time, check_out_time, total_rooms)
VALUES
('00000000-0000-0000-0000-000000000001', 'Grand Palace Hotel', 'Grand Palace Hospitality Pvt Ltd', 'grand-palace', 'HOTEL', 'ACTIVE', '15, MG Road, Connaught Place', 'New Delhi', 'Delhi', 'India', '110001', '+91 11 4567 8900', 'reservations@grandpalacedelhi.com', 'https://grandpalacedelhi.com', '07AABCG1234A1Z5', 'INR', 'Asia/Kolkata', '14:00', '12:00', 48),
('00000000-0000-0000-0000-000000000002', 'The Willow Boutique', 'Willow Stays LLP', 'willow-boutique', 'BOUTIQUE', 'ACTIVE', '7, Heritage Lane, Koregaon Park', 'Pune', 'Maharashtra', 'India', '411001', '+91 20 6789 0123', 'hello@willowboutique.in', 'https://willowboutique.in', '27AABCW5678B1Z2', 'INR', 'Asia/Kolkata', '13:00', '11:00', 18),
('00000000-0000-0000-0000-000000000003', 'Azure Cove Resort', 'Azure Hospitality Group Pvt Ltd', 'azure-cove', 'RESORT', 'ACTIVE', 'Baga Beach Road, Calangute', 'Goa', 'Goa', 'India', '403516', '+91 832 234 5678', 'stay@azureresort.com', 'https://azurecoveresort.com', '30AABCA9012C1Z7', 'INR', 'Asia/Kolkata', '15:00', '11:00', 32)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  legal_name = EXCLUDED.legal_name,
  slug = EXCLUDED.slug,
  type = EXCLUDED.type,
  status = EXCLUDED.status,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  country = EXCLUDED.country,
  pin_code = EXCLUDED.pin_code,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  website = EXCLUDED.website,
  gstin = EXCLUDED.gstin,
  currency = EXCLUDED.currency,
  timezone = EXCLUDED.timezone,
  check_in_time = EXCLUDED.check_in_time,
  check_out_time = EXCLUDED.check_out_time,
  total_rooms = EXCLUDED.total_rooms;

-- ─── 2. Branding ─────────────────────────────────────────────────────────────
INSERT INTO hotel_branding (hotel_id, primary_color, accent_color, tagline)
VALUES
('00000000-0000-0000-0000-000000000001', '#1a3a5c', '#c9a84c', 'Where Luxury Meets Legacy'),
('00000000-0000-0000-0000-000000000002', '#2d5016', '#8fb340', 'Your Home Away from Home'),
('00000000-0000-0000-0000-000000000003', '#0a4a6e', '#00b4d8', 'Where Paradise Begins')
ON CONFLICT (hotel_id) DO UPDATE SET
  primary_color = EXCLUDED.primary_color,
  accent_color = EXCLUDED.accent_color,
  tagline = EXCLUDED.tagline;

-- ─── 3. Settings ─────────────────────────────────────────────────────────────
INSERT INTO hotel_settings (hotel_id, wifi_name, wifi_password, default_tax_percent, service_charge_percent, invoice_prefix, allow_room_charge)
VALUES
('00000000-0000-0000-0000-000000000001', 'GrandPalace_Guest', 'WelcomeGP2024', 18.00, 10.00, 'GP', true),
('00000000-0000-0000-0000-000000000002', 'WillowGuest_5G', 'WillowStay#7', 12.00, 0.00, 'WB', true),
('00000000-0000-0000-0000-000000000003', 'AzureCove_WiFi', 'Azure@Beach2024', 18.00, 5.00, 'AC', true)
ON CONFLICT (hotel_id) DO UPDATE SET
  wifi_name = EXCLUDED.wifi_name,
  wifi_password = EXCLUDED.wifi_password,
  default_tax_percent = EXCLUDED.default_tax_percent,
  service_charge_percent = EXCLUDED.service_charge_percent,
  invoice_prefix = EXCLUDED.invoice_prefix,
  allow_room_charge = EXCLUDED.allow_room_charge;

-- ─── 4. Subscriptions ────────────────────────────────────────────────────────
INSERT INTO subscriptions (hotel_id, plan, status, current_period_start, current_period_end)
VALUES
('00000000-0000-0000-0000-000000000001', 'PRO', 'ACTIVE', '2024-01-01', '2024-12-31'),
('00000000-0000-0000-0000-000000000002', 'STARTER', 'ACTIVE', '2024-01-01', '2024-12-31'),
('00000000-0000-0000-0000-000000000003', 'ENTERPRISE', 'ACTIVE', '2024-01-01', '2024-12-31')
ON CONFLICT (hotel_id) DO UPDATE SET
  plan = EXCLUDED.plan,
  status = EXCLUDED.status,
  current_period_start = EXCLUDED.current_period_start,
  current_period_end = EXCLUDED.current_period_end;

-- ─── 5. Operational Departments ──────────────────────────────────────────────
INSERT INTO departments (id, hotel_id, name, code, description)
VALUES
('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001', 'Front Office', 'FO', 'Reception and guest check-in'),
('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001', 'Housekeeping', 'HK', 'Room turnover and linen management'),
('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000001', 'Food & Beverage', 'FB', 'Kitchen, dining room, and room service'),
('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000001', 'Maintenance', 'MT', 'Facility operations and repairs')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  description = EXCLUDED.description;

-- ─── 6. Room Types ───────────────────────────────────────────────────────────
INSERT INTO room_types (id, hotel_id, name, code, description, base_rate, max_occupancy, max_adults, max_children, amenities)
VALUES
('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-000000000001', 'Superior Room', 'SUP', 'Spacious room with king bed and city view', 4500.00, 2, 2, 1, '["AC", "WiFi", "TV", "Coffee Maker", "Safe"]'),
('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0000-000000000001', 'Deluxe Palace Suite', 'DLX', 'Executive suite with private balcony and marble bath', 7500.00, 3, 2, 2, '["AC", "High-speed WiFi", "Smart TV", "Mini Bar", "Bathtub", "Safe", "Work Desk"]')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  description = EXCLUDED.description,
  base_rate = EXCLUDED.base_rate,
  max_occupancy = EXCLUDED.max_occupancy,
  max_adults = EXCLUDED.max_adults,
  max_children = EXCLUDED.max_children,
  amenities = EXCLUDED.amenities;

-- ─── 7. Rooms ────────────────────────────────────────────────────────────────
INSERT INTO rooms (id, hotel_id, room_type_id, number, floor, status, housekeeping_status)
VALUES
('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0002-000000000001', '101', 1, 'OCCUPIED', 'CLEAN'),
('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0002-000000000001', '102', 1, 'AVAILABLE', 'CLEAN'),
('00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0002-000000000002', '105', 1, 'OCCUPIED', 'CLEAN'),
('00000000-0000-0000-0003-000000000004', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0002-000000000002', '106', 1, 'AVAILABLE', 'DIRTY')
ON CONFLICT (id) DO UPDATE SET
  number = EXCLUDED.number,
  floor = EXCLUDED.floor,
  status = EXCLUDED.status,
  housekeeping_status = EXCLUDED.housekeeping_status;

-- ─── 8. Guests ───────────────────────────────────────────────────────────────
INSERT INTO guests (id, hotel_id, first_name, last_name, email, phone, id_type, id_number, nationality, vip_status)
VALUES
('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0000-000000000001', 'Arjun', 'Sharma', 'arjun.sharma@email.com', '+91 98765 43210', 'AADHAAR', 'XXXX XXXX 1234', 'Indian', true),
('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0000-000000000001', 'Priya', 'Mehta', 'priya.mehta@corp.com', '+91 87654 32109', 'PASSPORT', 'J1234567', 'Indian', false)
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  id_type = EXCLUDED.id_type,
  id_number = EXCLUDED.id_number,
  nationality = EXCLUDED.nationality,
  vip_status = EXCLUDED.vip_status;

-- ─── 9. Reservations ─────────────────────────────────────────────────────────
INSERT INTO reservations (id, hotel_id, guest_id, room_type_id, room_id, status, source, check_in_date, check_out_date, adults, children, nights, rate_per_night, total_amount, tax_amount)
VALUES
('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0003-000000000001', 'CHECKED_IN', 'DIRECT', CURRENT_DATE - 1, CURRENT_DATE + 1, 2, 0, 2, 4500.00, 9000.00, 1620.00)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  source = EXCLUDED.source,
  check_in_date = EXCLUDED.check_in_date,
  check_out_date = EXCLUDED.check_out_date,
  adults = EXCLUDED.adults,
  children = EXCLUDED.children,
  nights = EXCLUDED.nights,
  rate_per_night = EXCLUDED.rate_per_night,
  total_amount = EXCLUDED.total_amount,
  tax_amount = EXCLUDED.tax_amount;

-- ─── 10. Folios ──────────────────────────────────────────────────────────────
INSERT INTO folios (id, hotel_id, reservation_id, guest_id, status, total_charges, total_payments, outstanding)
VALUES
('00000000-0000-0000-0006-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0004-000000000001', 'PARTIAL', 10620.00, 1800.00, 8820.00)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  total_charges = EXCLUDED.total_charges,
  total_payments = EXCLUDED.total_payments,
  outstanding = EXCLUDED.outstanding;

-- ─── 11. Restaurant Menu Categories & Items ──────────────────────────────────
INSERT INTO menu_categories (id, hotel_id, name, sort_order)
VALUES
('00000000-0000-0000-0007-000000000001', '00000000-0000-0000-0000-000000000001', 'Starters', 1),
('00000000-0000-0000-0007-000000000002', '00000000-0000-0000-0000-000000000001', 'Main Course', 2)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order;

INSERT INTO menu_items (id, hotel_id, category_id, name, price, is_veg, is_available, preparation_time_minutes)
VALUES
('00000000-0000-0000-0008-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0007-000000000001', 'Paneer Tikka', 320.00, true, true, 15),
('00000000-0000-0000-0008-000000000002', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0007-000000000002', 'Butter Chicken', 480.00, false, true, 25)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  is_veg = EXCLUDED.is_veg,
  is_available = EXCLUDED.is_available,
  preparation_time_minutes = EXCLUDED.preparation_time_minutes;

-- ─── 12. QR Access Tokens ────────────────────────────────────────────────────
INSERT INTO qr_codes (id, hotel_id, room_id, token, url, type, is_active)
VALUES
('00000000-0000-0000-0009-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0003-000000000001', 'gp-r101-abc123', '/guest/gp-r101-abc123', 'ROOM', true)
ON CONFLICT (id) DO UPDATE SET
  token = EXCLUDED.token,
  url = EXCLUDED.url,
  type = EXCLUDED.type,
  is_active = EXCLUDED.is_active;

-- ─── 13. Platform Feature Flags ──────────────────────────────────────────────
INSERT INTO feature_flags (id, key, name, description, is_enabled, hotel_id)
VALUES
('00000000-0000-0000-0010-000000000001', 'restaurant_module', 'Restaurant & POS Module', 'Menu & orders', true, NULL),
('00000000-0000-0000-0010-000000000002', 'room_service', 'In-Room Dining Orders', 'Guest room service', true, NULL),
('00000000-0000-0000-0010-000000000003', 'kitchen_display', 'Kitchen Display System', 'Live KDS queue', true, NULL),
('00000000-0000-0000-0010-000000000004', 'housekeeping_module', 'Housekeeping Automation', 'Auto cleaning tasks', true, NULL),
('00000000-0000-0000-0010-000000000005', 'maintenance_tickets', 'Maintenance Dispatch', 'Repairs & tickets', true, NULL)
ON CONFLICT (id) DO UPDATE SET
  key = EXCLUDED.key,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_enabled = EXCLUDED.is_enabled,
  hotel_id = EXCLUDED.hotel_id;
