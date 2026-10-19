-- ============================================================================
-- STAYNEXA - SEED DATA FOR DEMO HOTELS
-- ============================================================================

-- 1. Insert 3 Distinct Hotels
INSERT INTO hotels (id, name, legal_name, slug, type, status, address, city, state, country, pin_code, phone, email, website, gstin, currency, timezone, check_in_time, check_out_time, total_rooms)
VALUES
('00000000-0000-0000-0000-000000000001', 'Grand Palace Hotel', 'Grand Palace Hospitality Pvt Ltd', 'grand-palace', 'HOTEL', 'ACTIVE', '15, MG Road, Connaught Place', 'New Delhi', 'Delhi', 'India', '110001', '+91 11 4567 8900', 'reservations@grandpalacedelhi.com', 'https://grandpalacedelhi.com', '07AABCG1234A1Z5', 'INR', 'Asia/Kolkata', '14:00', '12:00', 48),
('00000000-0000-0000-0000-000000000002', 'The Willow Boutique', 'Willow Stays LLP', 'willow-boutique', 'BOUTIQUE', 'ACTIVE', '7, Heritage Lane, Koregaon Park', 'Pune', 'Maharashtra', 'India', '411001', '+91 20 6789 0123', 'hello@willowboutique.in', 'https://willowboutique.in', '27AABCW5678B1Z2', 'INR', 'Asia/Kolkata', '13:00', '11:00', 18),
('00000000-0000-0000-0000-000000000003', 'Azure Cove Resort', 'Azure Hospitality Group Pvt Ltd', 'azure-cove', 'RESORT', 'ACTIVE', 'Baga Beach Road, Calangute', 'Goa', 'Goa', 'India', '403516', '+91 832 234 5678', 'stay@azureresort.com', 'https://azurecoveresort.com', '30AABCA9012C1Z7', 'INR', 'Asia/Kolkata', '15:00', '11:00', 32)
ON CONFLICT (id) DO NOTHING;

-- 2. Branding
INSERT INTO hotel_branding (hotel_id, primary_color, accent_color, tagline)
VALUES
('00000000-0000-0000-0000-000000000001', '#1a3a5c', '#c9a84c', 'Where Luxury Meets Legacy'),
('00000000-0000-0000-0000-000000000002', '#2d5016', '#8fb340', 'Your Home Away from Home'),
('00000000-0000-0000-0000-000000000003', '#0a4a6e', '#00b4d8', 'Where Paradise Begins')
ON CONFLICT (hotel_id) DO NOTHING;

-- 3. Settings
INSERT INTO hotel_settings (hotel_id, wifi_name, wifi_password, default_tax_percent, service_charge_percent, invoice_prefix, allow_room_charge)
VALUES
('00000000-0000-0000-0000-000000000001', 'GrandPalace_Guest', 'WelcomeGP2024', 18.00, 10.00, 'GP', true),
('00000000-0000-0000-0000-000000000002', 'WillowGuest_5G', 'WillowStay#7', 12.00, 0.00, 'WB', true),
('00000000-0000-0000-0000-000000000003', 'AzureCove_WiFi', 'Azure@Beach2024', 18.00, 5.00, 'AC', true)
ON CONFLICT (hotel_id) DO NOTHING;

-- 4. Subscriptions
INSERT INTO subscriptions (hotel_id, plan, status, current_period_start, current_period_end)
VALUES
('00000000-0000-0000-0000-000000000001', 'PRO', 'ACTIVE', '2024-01-01', '2024-12-31'),
('00000000-0000-0000-0000-000000000002', 'STARTER', 'ACTIVE', '2024-01-01', '2024-12-31'),
('00000000-0000-0000-0000-000000000003', 'ENTERPRISE', 'ACTIVE', '2024-01-01', '2024-12-31')
ON CONFLICT (hotel_id) DO NOTHING;
