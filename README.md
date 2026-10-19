# StayNexa — One Stay. One Platform.

> **Level-3 Multi-Tenant Hotel Operating System & Guest Experience SaaS**

StayNexa is a production-grade, enterprise-ready unified hotel operating system built for modern hospitality management. It connects front desk operations, reservations, guest 360, folios and payments, restaurant ordering with Kitchen Display Systems (KDS), housekeeping, maintenance ticketing, QR-driven guest self-service portals, multi-property super admin management, and automated financial reporting under a single cohesive platform.

---

## 🌟 Key Features & Module Architecture

```
                                    StayNexa Platform
                                            │
                        ┌───────────────────┴───────────────────┐
                        ▼                                       ▼
             Platform Super Admin                      Multi-Tenant Hotel Engine
             - Hotel Provisioning                      - Multi-Property Isolation (hotel_id)
             - Subscription Billing                    - PostgreSQL Row Level Security (RLS)
             - Feature Flag Controls                   - Role-Based Access Control (RBAC)
             - Global Audit Logs                       - Dual-Mode (Demo Memory / Supabase)
                        │                                       │
      ┌─────────────────┼──────────────────┐                    │
      ▼                 ▼                  ▼                    │
Reception Center   Operations Hub     Financial Ledger          │
- Room Board       - Housekeeping     - Folio Billing           │
- Quick Check-In   - Maintenance      - GST Invoices            │
- Arrivals/Depart  - Restaurant POS   - UPI/Card Payments       │
      │                 │                  │                    │
      └─────────────────┴──────────────────┴────────────────────┘
                                │
                                ▼
                       Mobile Guest QR Portal
                       - Zero-App Web Experience
                       - Room Service Ordering
                       - Digital Concierge & Wi-Fi
                       - Live Stay Folio
```

### 1. Multi-Tenant SaaS Engine
- **Tenant Isolation**: Every database entity is strictly partitioned by `hotel_id`. Row Level Security (RLS) policies prevent cross-tenant access at the PostgreSQL layer.
- **Dual Mode**: Seamlessly switches between an **In-Memory Demo Service** (pre-seeded with 3 realistic properties, reservations, and inventory) and **Connected Supabase Production Mode**.

### 2. Super Admin Platform Console
- Platform overview metrics (active hotels, global room count, active trials, gross booking volume).
- Hotel provisioning and lifecycle management (Active, Trial, Suspended, Setup).
- Subscription plan tier management (Starter, Pro, Enterprise).
- Feature flag management per tenant.
- Global audit trails and activity logs.

### 3. Hotel Onboarding Wizard
- 12-step zero-code property setup wizard with automated draft saving in `localStorage`.
- Property details, custom branding colors, GST tax settings, Wi-Fi parameters, room inventory generator, service catalog, and instant QR generation.

### 4. Reception Command Center
- Real-time room status board with floor filters and housekeeping status indicators.
- Quick reservation management with 1-click Check-in (assigns room, marks OCCUPIED, opens folio) and Check-out (reviews charges, collects payments, triggers DIRTY housekeeping status).
- Guest 360 profile drawer with stay history, ID documentation, VIP tags, and folio links.
- Interactive service request dispatching with staff assignments.

### 5. Financial Folios & GST Invoicing
- Itemized room charges, room service orders, minibar items, and extra amenities.
- Dual-tax GST calculations (CGST/SGST/IGST) with zero floating-point arithmetic errors.
- Split payment handling across Cash, Card, UPI, and Bank Transfers.
- Printable, branded GST-compliant tax invoices.

### 6. Restaurant Management & Kitchen Display System (KDS)
- Category and menu item management with veg/non-veg flags and preparation time tracking.
- Touch-friendly full-screen KDS with sequential ticket progression (`NEW` → `ACCEPTED` → `PREPARING` → `READY` → `DELIVERED`).
- Live countdown timers with SLA alert badges (>15m amber, >30m red).

### 7. Housekeeping & Maintenance Operations
- Task board with clean/dirty/inspected states synced instantly to the front desk room board.
- Maintenance ticket tracker categorized by HVAC, Plumbing, Electrical, Carpentry, and IT.
- One-click escalation from housekeeping inspection directly into maintenance tickets.

### 8. Mobile-First Guest QR Portal (`/guest/:token`)
- Zero-download web app opened via encrypted room QR codes.
- 1-click Wi-Fi connection with password clipboard copy.
- Digital room service ordering cart with automatic folio charge posting.
- Concierge request dispatch (extra towels, room cleaning, wake-up calls).
- Live folio transparency showing real-time balance.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19, TypeScript (Strict Mode) |
| **Build & Tooling** | Vite, `@tailwindcss/vite` (Tailwind CSS v4) |
| **Routing** | React Router v7 |
| **Icons & Visuals** | Lucide React, Recharts |
| **QR Code Generation** | `qrcode` |
| **Backend & DB** | Supabase (PostgreSQL 15+), Row Level Security (RLS) |
| **Testing** | Vitest |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js 18+ or 20+ installed
- npm or pnpm package manager

### 2. Installation
```bash
# Navigate to the project directory
cd staynexa

# Install dependencies
npm install
```

### 3. Running in Demo Mode (Zero Backend Required)
StayNexa comes equipped with complete in-memory mock services containing 3 distinct hotel properties, active rooms, guests, menus, and reservations. No database configuration is needed to test all workflows.

```bash
npm run dev
```
Open your browser at: `http://localhost:5173`

### 4. Running the Test Suite
```bash
npm test
```
Executes 12 comprehensive unit and integration tests covering multi-tenant isolation, reservation lifecycle, folio financial math, KDS pipeline transitions, housekeeping synchronization, and QR cryptographic token resolution.

### 5. Building for Production
```bash
npm run build
```
Generates the optimized static distribution in `dist/`.

---

## 🔑 Demo Personas & Credentials

The application includes a split-screen quick login page with 1-click persona switching. To log in manually, use password `demo123` for any of the accounts below:

| Persona / Role | Email | Scope / Purpose |
|---|---|---|
| **Super Admin** | `superadmin@staynexa.com` | Multi-hotel platform management, subscriptions, flags |
| **Hotel Admin** | `vikram@grandpalace.com` | Full administrative control of Grand Palace Hotel |
| **Hotel Manager** | `priya@grandpalace.com` | Operations oversight, reports, and staff management |
| **Receptionist** | `amit@grandpalace.com` | Front desk, room board, check-ins, guest 360, folios |
| **Head Chef (KDS)** | `chef@grandpalace.com` | Full-screen Kitchen Display System & live tickets |
| **Housekeeping Lead** | `sunita@grandpalace.com`| Room cleaning workflow and inspection board |
| **Maintenance Lead** | `rajesh@grandpalace.com`| Facility repair tickets, SLA tracking, resolution |
| **Restaurant Manager**| `kavita@grandpalace.com`| Menu configuration and dining room orders |

### Direct Demo QR Guest Portals
You can experience the mobile guest view directly without logging in by visiting:
- **Room 101 (Occupied - Arjun Sharma)**: `http://localhost:5173/guest/gp-r101-abc123`
- **Room 102 (Available/Empty)**: `http://localhost:5173/guest/gp-r102-def456`
- **Azure Cove Villa 01 (David Chen)**: `http://localhost:5173/guest/ac-v01-ghi789`

---

## 🗄️ Database Architecture & Migrations

For connected Supabase mode, the complete relational schema and initial seed data are provided:

- **Schema Definition**: [`supabase/migrations/20240101000000_staynexa_schema.sql`](supabase/migrations/20240101000000_staynexa_schema.sql)
- **Seed Data**: [`supabase/seed.sql`](supabase/seed.sql)

### Tables Implemented
1. `hotels` — Multi-tenant property registry
2. `hotel_branding` — Custom color palettes, logos, and taglines
3. `hotel_settings` — Tax rates, Wi-Fi keys, deposit policies
4. `room_types` — Inventory definitions with amenity metadata
5. `rooms` — Physical room numbers, floor layout, status
6. `guests` — Guest 360 profiles, ID records, VIP indicators
7. `reservations` — Booking records, stay dates, pricing breakdown
8. `folios` — Master accounting ledger per reservation
9. `folio_items` — Itemized charges (Room, F&B, Services)
10. `payments` — Transaction logs (UPI, Card, Cash, NEFT)
11. `menu_categories` & `menu_items` — Restaurant catalog
12. `orders` & `order_items` — Dining and room service orders
13. `housekeeping_tasks` — Turnover and cleaning logs
14. `maintenance_tickets` — Engineering and facility tickets
15. `qr_codes` — Cryptographic room access tokens
16. `subscriptions` & `feature_flags` — SaaS platform monetization

### Activating Supabase Production Mode
1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env`:
   ```env
   VITE_APP_MODE=production
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Run the migration script in your Supabase SQL Editor.
4. Execute `supabase/seed.sql` to populate initial hotel records.

---

## 🔌 External Integrations Status

To maintain architectural honesty and prevent fake mock promises:
- **WhatsApp Cloud API**: Marked as `Manual Mode / Not Connected`. Configuration fields exist in settings; operational alerts display a "Connect WhatsApp Cloud API" banner until real Meta Business API keys are provided.
- **OTA Channel Manager (Booking.com, MMT, Agoda)**: Reservations support external booking IDs (`BK-987654321`, `MMT-456789`). The integration adapter is pre-structured with 2-way sync interfaces ready for SiteMinder or Channex API credentials.

---

## 🛡️ License & Credits

Developed with precision for high-efficiency hotel operations.  
**StayNexa** — One Stay. One Platform.
