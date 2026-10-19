-- ============================================================================
-- STAYNEXA - LEVEL-3 MULTI-TENANT HOTEL OPERATING SYSTEM SCHEMA
-- ============================================================================
-- Complete PostgreSQL & Supabase Relational Schema with Row-Level Security (RLS)
-- Version: 1.0.1 (Strict Topological Dependency Ordering & Idempotency)
-- ============================================================================

-- ─── 1. EXTENSIONS ──────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── 2. CORE TABLE DEFINITIONS (STRICT TOPOLOGICAL FK ORDER) ─────────────────

-- Hotels (Tenants)
CREATE TABLE IF NOT EXISTS hotels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    slug VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50) DEFAULT 'HOTEL' CHECK (type IN ('HOTEL', 'RESORT', 'BOUTIQUE', 'HOSTEL', 'APARTMENT')),
    status VARCHAR(50) DEFAULT 'SETUP' CHECK (status IN ('SETUP', 'TRIAL', 'ACTIVE', 'SUSPENDED', 'INACTIVE', 'ARCHIVED')),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) DEFAULT 'India',
    pin_code VARCHAR(20) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    website VARCHAR(255),
    gstin VARCHAR(50),
    currency VARCHAR(10) DEFAULT 'INR',
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    check_in_time TIME DEFAULT '14:00',
    check_out_time TIME DEFAULT '12:00',
    reception_phone VARCHAR(50),
    total_rooms INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hotel Custom Domains
CREATE TABLE IF NOT EXISTS hotel_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    domain VARCHAR(255) UNIQUE NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    ssl_status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hotel Branding
CREATE TABLE IF NOT EXISTS hotel_branding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID UNIQUE NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    logo_url TEXT,
    cover_url TEXT,
    primary_color VARCHAR(20) DEFAULT '#1a2744',
    accent_color VARCHAR(20) DEFAULT '#c9a84c',
    tagline TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hotel Settings & Configurations
CREATE TABLE IF NOT EXISTS hotel_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID UNIQUE NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    wifi_name VARCHAR(100),
    wifi_password VARCHAR(100),
    default_tax_percent NUMERIC(5,2) DEFAULT 18.00,
    service_charge_percent NUMERIC(5,2) DEFAULT 0.00,
    invoice_prefix VARCHAR(10) DEFAULT 'SN',
    allow_room_charge BOOLEAN DEFAULT true,
    require_deposit BOOLEAN DEFAULT false,
    deposit_percent NUMERIC(5,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hotel Policies
CREATE TABLE IF NOT EXISTS hotel_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    policy_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles (mirrors auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'RECEPTION' CHECK (role IN (
        'SUPER_ADMIN', 'HOTEL_ADMIN', 'HOTEL_MANAGER', 'RECEPTION', 
        'RESTAURANT_MANAGER', 'KITCHEN', 'HOUSEKEEPING', 'MAINTENANCE', 'GUEST'
    )),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Operational Departments
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    description TEXT,
    head_staff_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hotel_id, code)
);

-- Hotel Memberships (Tenant Authorization Binding)
CREATE TABLE IF NOT EXISTS hotel_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hotel_id, user_id)
);

-- Granular Permissions Catalog
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL
);

-- Role-Permission Mappings
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role VARCHAR(50) NOT NULL,
    permission_code VARCHAR(100) NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
    UNIQUE(role, permission_code)
);

-- Room Types (Categories)
CREATE TABLE IF NOT EXISTS room_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    description TEXT,
    base_rate NUMERIC(12,2) NOT NULL CHECK (base_rate >= 0),
    max_occupancy INTEGER DEFAULT 2 CHECK (max_occupancy >= 1),
    max_adults INTEGER DEFAULT 2 CHECK (max_adults >= 1),
    max_children INTEGER DEFAULT 0,
    amenities TEXT[] DEFAULT '{}',
    images TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hotel_id, code)
);

-- Rooms
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
    number VARCHAR(20) NOT NULL,
    floor INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'AVAILABLE' CHECK (status IN (
        'AVAILABLE', 'RESERVED', 'OCCUPIED', 'OUT_OF_SERVICE', 'MAINTENANCE'
    )),
    housekeeping_status VARCHAR(50) DEFAULT 'CLEAN' CHECK (housekeeping_status IN (
        'CLEAN', 'DIRTY', 'CLEANING', 'INSPECTION_REQUIRED', 'INSPECTED'
    )),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hotel_id, number)
);

-- Guest Directory
CREATE TABLE IF NOT EXISTS guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    id_type VARCHAR(50) DEFAULT 'AADHAAR',
    id_number VARCHAR(100),
    nationality VARCHAR(100) DEFAULT 'Indian',
    address TEXT,
    city VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(20),
    vip_status BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reservations
CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE RESTRICT,
    room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'CONFIRMED' CHECK (status IN (
        'INQUIRY', 'PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW'
    )),
    source VARCHAR(50) DEFAULT 'DIRECT' CHECK (source IN (
        'DIRECT', 'WEBSITE', 'WALK_IN', 'PHONE', 'WHATSAPP', 'MMT', 'GOIBIBO', 'BOOKING_COM', 'AGODA', 'EXPEDIA', 'AIRBNB', 'OTHER_OTA'
    )),
    external_booking_id VARCHAR(100),
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    actual_check_in TIMESTAMPTZ,
    actual_check_out TIMESTAMPTZ,
    adults INTEGER DEFAULT 1,
    children INTEGER DEFAULT 0,
    nights INTEGER NOT NULL CHECK (nights >= 1),
    rate_per_night NUMERIC(12,2) NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    tax_amount NUMERIC(12,2) DEFAULT 0.00,
    discount_amount NUMERIC(12,2) DEFAULT 0.00,
    deposit_amount NUMERIC(12,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_dates CHECK (check_out_date > check_in_date)
);

-- Stay Folios (Financial Ledger)
CREATE TABLE IF NOT EXISTS folios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    reservation_id UUID UNIQUE NOT NULL REFERENCES reservations(id) ON DELETE RESTRICT,
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE RESTRICT,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIAL', 'PAID', 'REFUNDED')),
    total_charges NUMERIC(12,2) DEFAULT 0.00,
    total_payments NUMERIC(12,2) DEFAULT 0.00,
    outstanding NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Folio Itemized Charges
CREATE TABLE IF NOT EXISTS folio_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio_id UUID NOT NULL REFERENCES folios(id) ON DELETE CASCADE,
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'ROOM', 'RESTAURANT', 'ROOM_SERVICE', 'LAUNDRY', 'SPA', 'TRANSPORT', 'SERVICE', 'OTHER'
    )),
    quantity INTEGER DEFAULT 1 CHECK (quantity >= 1),
    unit_price NUMERIC(12,2) NOT NULL,
    tax_percent NUMERIC(5,2) DEFAULT 0.00,
    tax_amount NUMERIC(12,2) DEFAULT 0.00,
    discount_amount NUMERIC(12,2) DEFAULT 0.00,
    total NUMERIC(12,2) NOT NULL,
    reference_id VARCHAR(100),
    posted_by VARCHAR(100),
    posted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments Ledger
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    folio_id UUID NOT NULL REFERENCES folios(id) ON DELETE RESTRICT,
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE RESTRICT,
    reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    method VARCHAR(50) NOT NULL CHECK (method IN (
        'CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'ONLINE', 'OTHER'
    )),
    reference VARCHAR(100),
    notes TEXT,
    received_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tax Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    folio_id UUID NOT NULL REFERENCES folios(id) ON DELETE RESTRICT,
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE RESTRICT,
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'ISSUED' CHECK (status IN ('DRAFT', 'ISSUED', 'PAID', 'VOID')),
    subtotal NUMERIC(12,2) NOT NULL,
    tax_amount NUMERIC(12,2) NOT NULL,
    discount_amount NUMERIC(12,2) DEFAULT 0.00,
    total NUMERIC(12,2) NOT NULL,
    paid_amount NUMERIC(12,2) NOT NULL,
    outstanding NUMERIC(12,2) NOT NULL,
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hotel_id, invoice_number)
);

-- Menu Categories
CREATE TABLE IF NOT EXISTS menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    tax_percent NUMERIC(5,2) DEFAULT 5.00,
    image_url TEXT,
    is_veg BOOLEAN DEFAULT true,
    is_available BOOLEAN DEFAULT true,
    tags TEXT[] DEFAULT '{}',
    preparation_time_minutes INTEGER DEFAULT 15,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restaurant & Room Service Orders
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN (
        'PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'
    )),
    type VARCHAR(50) DEFAULT 'ROOM_SERVICE' CHECK (type IN ('DINE_IN', 'ROOM_SERVICE', 'TAKEAWAY')),
    subtotal NUMERIC(12,2) NOT NULL,
    tax_amount NUMERIC(12,2) NOT NULL,
    total NUMERIC(12,2) NOT NULL,
    special_instructions TEXT,
    charge_to_room BOOLEAN DEFAULT true,
    accepted_at TIMESTAMPTZ,
    preparing_at TIMESTAMPTZ,
    ready_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1 CHECK (quantity >= 1),
    unit_price NUMERIC(12,2) NOT NULL,
    tax_percent NUMERIC(5,2) DEFAULT 5.00,
    total NUMERIC(12,2) NOT NULL,
    notes TEXT
);

-- Hotel Services Catalog
CREATE TABLE IF NOT EXISTS hotel_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    price NUMERIC(12,2) DEFAULT 0.00,
    is_available BOOLEAN DEFAULT true,
    requires_scheduling BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guest Service Requests
CREATE TABLE IF NOT EXISTS service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
    service_id UUID REFERENCES hotel_services(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN (
        'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
    )),
    priority VARCHAR(50) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to VARCHAR(100),
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Housekeeping Tasks
CREATE TABLE IF NOT EXISTS housekeeping_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
    type VARCHAR(50) DEFAULT 'CHECKOUT_CLEAN' CHECK (type IN (
        'CHECKOUT_CLEAN', 'STAYOVER_CLEAN', 'DEEP_CLEAN', 'INSPECTION', 'TURNDOWN'
    )),
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN (
        'PENDING', 'IN_PROGRESS', 'COMPLETED', 'INSPECTED'
    )),
    priority VARCHAR(50) DEFAULT 'HIGH' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    assigned_to VARCHAR(100),
    notes TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance Tickets
CREATE TABLE IF NOT EXISTS maintenance_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
    guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'NEW' CHECK (status IN (
        'NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED', 'CLOSED'
    )),
    priority VARCHAR(50) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    assigned_to VARCHAR(100),
    resolved_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- QR Access Codes
CREATE TABLE IF NOT EXISTS qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    token VARCHAR(64) UNIQUE NOT NULL,
    url TEXT,
    type VARCHAR(50) DEFAULT 'ROOM' CHECK (type IN ('ROOM', 'HOTEL', 'MENU', 'WIFI')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- In-App & Operational Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    user_id UUID,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security & Operational Audit Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID REFERENCES hotels(id) ON DELETE SET NULL,
    user_id UUID,
    actor_name VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SaaS Hotel Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID UNIQUE NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    plan VARCHAR(50) DEFAULT 'PRO' CHECK (plan IN ('FREE_TRIAL', 'STARTER', 'PRO', 'ENTERPRISE')),
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'TRIAL', 'EXPIRED', 'CANCELLED')),
    trial_ends_at TIMESTAMPTZ,
    current_period_start DATE,
    current_period_end DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform & Hotel Feature Flags
CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT true,
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    UNIQUE(key, hotel_id)
);


-- ─── 3. TENANT CONTEXT HELPER FUNCTIONS & TRIGGERS ───────────────────────────
-- (Defined strictly AFTER table definitions so relations & columns exist)

-- Function to extract authenticated user's hotel_id strictly from verified hotel_memberships
CREATE OR REPLACE FUNCTION auth_hotel_id()
RETURNS UUID AS $$
  SELECT hotel_id 
  FROM hotel_memberships 
  WHERE user_id = auth.uid() 
    AND is_active = true 
    AND (
      -- If a specific hotel was requested via verified JWT claim, match it; otherwise use primary active membership
      NULLIF(NULLIF(current_setting('request.jwt.claims', true), '')::json->'app_metadata'->>'hotel_id', '')::UUID IS NULL
      OR hotel_id = NULLIF(NULLIF(current_setting('request.jwt.claims', true), '')::json->'app_metadata'->>'hotel_id', '')::UUID
    )
  ORDER BY created_at ASC
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to check if user is Platform Super Admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
      AND role = 'SUPER_ADMIN' 
      AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Automatically create a profile when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_app_meta_data->>'role', 'RECEPTION')
  )
  ON CONFLICT (user_id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition for auth.users (idempotent block)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;


-- ─── 4. ROW LEVEL SECURITY (RLS) POLICIES ────────────────────────────────────

-- Enable RLS on all tenant and platform tables
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE folios ENABLE ROW LEVEL SECURITY;
ALTER TABLE folio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE housekeeping_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- 1. Hotels Policy
DROP POLICY IF EXISTS hotels_isolation_policy ON hotels;
CREATE POLICY hotels_isolation_policy ON hotels
    FOR ALL USING (is_super_admin() OR id = auth_hotel_id());

-- 2. Hotel Domains Policy
DROP POLICY IF EXISTS hotel_domains_policy ON hotel_domains;
CREATE POLICY hotel_domains_policy ON hotel_domains
    FOR ALL USING (is_super_admin() OR hotel_id = auth_hotel_id());

-- 3. Hotel Branding Policy (Public read for active portals)
DROP POLICY IF EXISTS hotel_branding_read ON hotel_branding;
CREATE POLICY hotel_branding_read ON hotel_branding
    FOR SELECT USING (true);
DROP POLICY IF EXISTS hotel_branding_write ON hotel_branding;
CREATE POLICY hotel_branding_write ON hotel_branding
    FOR ALL USING (is_super_admin() OR hotel_id = auth_hotel_id());

-- 4. Hotel Settings Policy (Public read for Wi-Fi and general config)
DROP POLICY IF EXISTS hotel_settings_read ON hotel_settings;
CREATE POLICY hotel_settings_read ON hotel_settings
    FOR SELECT USING (true);
DROP POLICY IF EXISTS hotel_settings_write ON hotel_settings;
CREATE POLICY hotel_settings_write ON hotel_settings
    FOR ALL USING (is_super_admin() OR hotel_id = auth_hotel_id());

-- 5. Hotel Policies
DROP POLICY IF EXISTS hotel_policies_policy ON hotel_policies;
CREATE POLICY hotel_policies_policy ON hotel_policies
    FOR ALL USING (is_super_admin() OR hotel_id = auth_hotel_id());

-- 6. User Profiles Policy (Self-read, SuperAdmin full access, Same-tenant staff read)
DROP POLICY IF EXISTS profiles_read_policy ON profiles;
CREATE POLICY profiles_read_policy ON profiles
    FOR SELECT USING (
        is_super_admin() 
        OR user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM hotel_memberships hm1
            JOIN hotel_memberships hm2 ON hm1.hotel_id = hm2.hotel_id
            WHERE hm1.user_id = auth.uid() AND hm2.user_id = profiles.user_id AND hm1.is_active = true
        )
    );
DROP POLICY IF EXISTS profiles_update_policy ON profiles;
CREATE POLICY profiles_update_policy ON profiles
    FOR UPDATE USING (is_super_admin() OR user_id = auth.uid());
DROP POLICY IF EXISTS profiles_admin_insert ON profiles;
CREATE POLICY profiles_admin_insert ON profiles
    FOR INSERT WITH CHECK (is_super_admin() OR user_id = auth.uid());

-- 7. Hotel Memberships Policy
DROP POLICY IF EXISTS memberships_read_policy ON hotel_memberships;
CREATE POLICY memberships_read_policy ON hotel_memberships
    FOR SELECT USING (is_super_admin() OR user_id = auth.uid() OR hotel_id = auth_hotel_id());
DROP POLICY IF EXISTS memberships_write_policy ON hotel_memberships;
CREATE POLICY memberships_write_policy ON hotel_memberships
    FOR ALL USING (
        is_super_admin() 
        OR (hotel_id = auth_hotel_id() AND EXISTS (
            SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('HOTEL_ADMIN', 'HOTEL_MANAGER')
        ))
    );

-- 8. Departments Policy
DROP POLICY IF EXISTS departments_isolation_policy ON departments;
CREATE POLICY departments_isolation_policy ON departments
    FOR ALL USING (is_super_admin() OR hotel_id = auth_hotel_id());

-- 9. Permissions & Role-Permissions Policy (Platform defined catalog)
DROP POLICY IF EXISTS permissions_read ON permissions;
CREATE POLICY permissions_read ON permissions
    FOR SELECT USING (true);
DROP POLICY IF EXISTS permissions_write ON permissions;
CREATE POLICY permissions_write ON permissions
    FOR ALL USING (is_super_admin());

DROP POLICY IF EXISTS role_permissions_read ON role_permissions;
CREATE POLICY role_permissions_read ON role_permissions
    FOR SELECT USING (true);
DROP POLICY IF EXISTS role_permissions_write ON role_permissions;
CREATE POLICY role_permissions_write ON role_permissions
    FOR ALL USING (is_super_admin());

-- 10. Room Types Policy (Public read for booking/guest info)
DROP POLICY IF EXISTS room_types_read ON room_types;
CREATE POLICY room_types_read ON room_types
    FOR SELECT USING (true);
DROP POLICY IF EXISTS room_types_write ON room_types;
CREATE POLICY room_types_write ON room_types
    FOR ALL USING (is_super_admin() OR hotel_id = auth_hotel_id());

-- 11. Rooms Policy
DROP POLICY IF EXISTS rooms_isolation_policy ON rooms;
CREATE POLICY rooms_isolation_policy ON rooms
    FOR ALL USING (is_super_admin() OR hotel_id = auth_hotel_id());

-- 12. Guests Policy
DROP POLICY IF EXISTS guests_isolation_policy ON guests;
CREATE POLICY guests_isolation_policy ON guests
    FOR ALL USING (is_super_admin() OR hotel_id = auth_hotel_id());

-- 13. Reservations Policy
DROP POLICY IF EXISTS reservations_isolation_policy ON reservations;
CREATE POLICY reservations_isolation_policy ON reservations
    FOR ALL USING (is_super_admin() OR hotel_id = auth_hotel_id());

-- 14. Folios Policy
DROP POLICY IF EXISTS folios_isolation_policy ON folios;
CREATE POLICY folios_isolation_policy ON folios
    FOR ALL USING (is_super_admin() OR hotel_id = auth_hotel_id());

-- 15. Folio Items Policy
DROP POLICY IF EXISTS folio_items_isolation_policy ON folio_items;
CREATE POLICY folio_items_isolation_policy ON folio_items
    FOR ALL USING (is_super_admin() OR hotel_id = auth_hotel_id());

-- 16. Payments Policy
DROP POLICY IF EXISTS payments_isolation_policy ON payments;
CREATE POLICY payments_isolation_policy ON payments
    FOR ALL USING (is_super_admin() OR hotel_id = auth_hotel_id());

-- 17. Invoices Policy
DROP POLICY IF EXISTS invoices_isolation_policy ON invoices;
CREATE POLICY invoices_isolation_policy ON invoices
    FOR ALL USING (is_super_admin() OR hotel_id = auth_hotel_id());

-- 18. Menu Categories (Public read for dining guests)
DROP POLICY IF EXISTS menu_categories_read ON menu_categories;
CREATE POLICY menu_categories_read ON menu_categories
    FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS menu_categories_write ON menu_categories;
CREATE POLICY menu_categories_write ON menu_categories
    FOR ALL USING (is_super_admin() OR hotel_id = auth_hotel_id());

-- 19. Menu Items (Public read for dining guests)
DROP POLICY IF EXISTS menu_items_read ON menu_items;
CREATE POLICY menu_items_read ON menu_items
    FOR SELECT USING (is_available = true);
DROP POLICY IF EXISTS menu_items_write ON menu_items;
CREATE POLICY menu_items_write ON menu_items
    FOR ALL USING (is_super_admin() OR hotel_id = auth_hotel_id());

-- 20. Orders Policy (Staff manage tenant orders; Guests can insert via portal)
DROP POLICY IF EXISTS orders_select_policy ON orders;
CREATE POLICY orders_select_policy ON orders
    FOR SELECT USING (is_super_admin() OR hotel_id = auth_hotel_id());
DROP POLICY IF EXISTS orders_insert_policy ON orders;
CREATE POLICY orders_insert_policy ON orders
    FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS orders_update_policy ON orders;
CREATE POLICY orders_update_policy ON orders
    FOR UPDATE USING (is_super_admin() OR hotel_id = auth_hotel_id());

-- 21. Order Items Policy (Staff access via hotel or order; Guests can insert items)
DROP POLICY IF EXISTS order_items_select ON order_items;
CREATE POLICY order_items_select ON order_items
    FOR SELECT USING (
        is_super_admin() 
        OR (hotel_id IS NOT NULL AND hotel_id = auth_hotel_id())
        OR EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
              AND orders.hotel_id = auth_hotel_id()
        )
    );
DROP POLICY IF EXISTS order_items_insert ON order_items;
CREATE POLICY order_items_insert ON order_items
    FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS order_items_modify ON order_items;
CREATE POLICY order_items_modify ON order_items
    FOR ALL USING (
        is_super_admin() 
        OR (hotel_id IS NOT NULL AND hotel_id = auth_hotel_id())
        OR EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
              AND orders.hotel_id = auth_hotel_id()
        )
    );

-- 22. Hotel Services (Public read for guest catalog)
DROP POLICY IF EXISTS hotel_services_read ON hotel_services;
CREATE POLICY hotel_services_read ON hotel_services
    FOR SELECT USING (is_available = true);
DROP POLICY IF EXISTS hotel_services_write ON hotel_services;
CREATE POLICY hotel_services_write ON hotel_services
    FOR ALL USING (is_super_admin() OR hotel_id = auth_hotel_id());

-- 23. Service Requests Policy
DROP POLICY IF EXISTS requests_isolation_policy ON service_requests;
CREATE POLICY requests_isolation_policy ON service_requests
    FOR ALL USING (is_super_admin() OR hotel_id = auth_hotel_id());
DROP POLICY IF EXISTS requests_insert_policy ON service_requests;
CREATE POLICY requests_insert_policy ON service_requests
    FOR INSERT WITH CHECK (true);

-- 24. Housekeeping Tasks Policy
DROP POLICY IF EXISTS housekeeping_isolation_policy ON housekeeping_tasks;
CREATE POLICY housekeeping_isolation_policy ON housekeeping_tasks
    FOR ALL USING (is_super_admin() OR hotel_id = auth_hotel_id());

-- 25. Maintenance Tickets Policy
DROP POLICY IF EXISTS maintenance_isolation_policy ON maintenance_tickets;
CREATE POLICY maintenance_isolation_policy ON maintenance_tickets
    FOR ALL USING (is_super_admin() OR hotel_id = auth_hotel_id());

-- 26. QR Codes Policy (Public read for active cryptographic tokens)
DROP POLICY IF EXISTS qr_guest_read ON qr_codes;
CREATE POLICY qr_guest_read ON qr_codes
    FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS qr_staff_manage ON qr_codes;
CREATE POLICY qr_staff_manage ON qr_codes
    FOR ALL USING (is_super_admin() OR hotel_id = auth_hotel_id());

-- 27. Notifications Policy
DROP POLICY IF EXISTS notifications_policy ON notifications;
CREATE POLICY notifications_policy ON notifications
    FOR ALL USING (is_super_admin() OR hotel_id = auth_hotel_id() OR user_id = auth.uid());

-- 28. Activity Logs Policy
DROP POLICY IF EXISTS activity_logs_policy ON activity_logs;
CREATE POLICY activity_logs_policy ON activity_logs
    FOR ALL USING (is_super_admin() OR hotel_id = auth_hotel_id());

-- 29. Subscriptions Policy
DROP POLICY IF EXISTS subscriptions_policy ON subscriptions;
CREATE POLICY subscriptions_policy ON subscriptions
    FOR ALL USING (is_super_admin() OR hotel_id = auth_hotel_id());

-- 30. Feature Flags Policy
DROP POLICY IF EXISTS feature_flags_read ON feature_flags;
CREATE POLICY feature_flags_read ON feature_flags
    FOR SELECT USING (true);
DROP POLICY IF EXISTS feature_flags_write ON feature_flags;
CREATE POLICY feature_flags_write ON feature_flags
    FOR ALL USING (is_super_admin());


-- ─── 5. PERFORMANCE INDEXES ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_rooms_hotel_id ON rooms(hotel_id);
CREATE INDEX IF NOT EXISTS idx_reservations_hotel_id ON reservations(hotel_id);
CREATE INDEX IF NOT EXISTS idx_reservations_dates ON reservations(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_folios_res_id ON folios(reservation_id);
CREATE INDEX IF NOT EXISTS idx_orders_hotel_status ON orders(hotel_id, status);
CREATE INDEX IF NOT EXISTS idx_qr_token ON qr_codes(token);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON hotel_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_hotel ON hotel_memberships(hotel_id);
