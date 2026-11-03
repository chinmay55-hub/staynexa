# StayNexa — System Architecture & Memory

## Overview
StayNexa is a modern, multi-tenant Hotel Operations System with integrated Guest QR Portal, Kitchen Display System (KDS), Reception, Housekeeping, Maintenance, and Super Admin Management.

## Multi-Tenant Architecture & Data Isolation
- **Tenancy Boundary**: Every physical entity (`rooms`, `orders`, `service_requests`, `housekeeping_tasks`, `reservations`, `hotel_services`, `menu_items`) strictly belongs to a `hotel_id`.
- **Tenant ID Normalization**: Handled via `src/utils/tenantId.ts` using `toDbHotelId` and `isSameHotel` to seamlessly map demo identifiers (`hotel-001`) and production PostgreSQL UUIDs (`obwdeoveqhmwbasdmeft`).
- **WebSocket Channel Isolation**: Realtime channels are partitioned per tenant as `staynexa-hotel-${dbHotelId}`. Broadcast events originating from staff or guests are routed strictly to the target hotel channel, preventing cross-tenant data exposure.

## Real-Time Synchronization Engine
- **Service**: `src/services/realtimeSync.ts`
- **Protocols**: Supabase Realtime Channels (WebSocket) with peer-to-peer broadcast relay, fallback to BroadcastChannel (`staynexa_realtime_bus`) and `localStorage` storage bus for same-browser multi-tab sync.
- **Reliability & Resilience**:
  - Outgoing broadcast queue (`pendingBroadcastQueue`) buffers messages emitted before the socket achieves `SUBSCRIBED` status and automatically flushes on connection.
  - Automatic channel reconnection handlers on `window.online` and `document.visibilitychange` to restore real-time connectivity when mobile devices wake from lock screen.
  - Deduplication via `eventIdentity(type, payload)` prevents duplicate execution across peer devices.
  - Asynchronous broadcast errors are trapped via `.catch(...)` and queued rather than dropped.

## Guest Portal & QR Code Subsystem
- **Canonical Route**: `/guest/:token` and `/q/:token`.
- **Base URL Resolution**: Defined in `src/utils/qrCode.ts`. When running on a live domain (`window.location.hostname !== 'localhost'`), the live public origin is strictly used. Local tunnel URLs are restricted to local development environments to prevent dead tunnel URLs from appearing in production QR standees.
- **Fail-Closed Security**: Invalid, expired, or unrecognized QR tokens reject closed with explicit error messages and never fall back to exposing unassigned rooms or menus.

## Order & Service Request Lifecycle
- **Durable Persistence First**: Guest orders and housekeeping service requests must durably persist in PostgreSQL via server-validated SECURITY DEFINER RPCs (`create_guest_order`, `create_guest_service_request`) before displaying placement success.
- **No Phantom Fallbacks**: When connected to Supabase in staging or production, client-side code never substitutes failed database mutations with fake in-memory orders. Failures surface honest error alerts with retry capabilities.
- **Idempotency**: Prevent duplicate order submissions using unique client-side idempotency keys.
- **KDS Order Lifecycle**: KDS operates on real-time WebSocket events (`NEW_ORDER`, `ORDER_STATUS_CHANGED`). Orders advance through `PENDING` -> `ACCEPTED` -> `PREPARING` -> `READY` -> `DELIVERED`. Delivered and cancelled tickets clear from active queues without polling interference.

## Authentication & Credential Storage
- **Production Mode**: Managed strictly via Supabase Auth (`supabase.auth.signInWithPassword`, `supabase.auth.signUp`, `supabase.auth.resetPasswordForEmail`, `supabase.auth.updateUser`).
- **Cryptographic Standards**: `src/utils/cryptoAuth.ts` implements OWASP-standard PBKDF2-HMAC-SHA512 (100,000 iterations, 16-byte cryptographically secure random salt) with constant-time equality checks.
- **Zero Browser Credential Storage**: All custom credential stores (`staynexa_custom_credentials`) in `localStorage` have been permanently abolished and purged on startup.
- **Direct Auth Provisioning**: New hotel administrators created during onboarding (`HotelOnboardingPage.tsx`) and staff created by super-admins (`UsersManagementPage.tsx`) are provisioned directly into Supabase Auth with associated `profiles` and `hotel_memberships` records.
- **Password Reset Architecture**: Fully integrated via `/reset-password` route, "Forgot password?" modal on `/login`, and Supabase password recovery pipeline.
- **Zero Mock Fallback in Production**: When configured with live Supabase credentials (`!isDemoMode() && supabase`), authentication rejections and database mutation errors fail honestly and never fall back to mock data or demo credentials.

## Edge & Transport Security (Cloudflare & Vercel)
- **Headers in `vercel.json`**:
  - `Content-Security-Policy`: Restricts scripts, frames, connect domains to Supabase, Cloudflare tunnels, Google fonts, and local origins.
  - `Strict-Transport-Security`: `max-age=31536000; includeSubDomains; preload`
  - `X-Content-Type-Options`: `nosniff`
  - `X-Frame-Options`: `SAMEORIGIN`
  - `Referrer-Policy`: `strict-origin-when-cross-origin`
  - `Permissions-Policy`: `camera=(self), microphone=(), geolocation=()`
