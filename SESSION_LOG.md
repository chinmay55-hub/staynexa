# StayNexa — Operational Session Log

## Date: 2026-11-03

### Context & Objectives
Comprehensive review, diagnosis, remediation, security hardening, automated testing, and deployment verification across the StayNexa production platform.

---

### Issues Identified & Root Causes
1. **Silent Fallback to In-Memory Orders on DB Reject**:
   - *Root Cause*: `GuestPortalPage.tsx` lines 579-598 caught rejected Supabase RPC calls and fell back to generating in-memory orders with fake tracking tokens and broadcasting them via WebSocket.
   - *Impact*: Guests were misled into believing orders were placed when database mutations failed, causing data loss on page reload and missing tickets in KDS.
2. **Plaintext Credential Storage in LocalStorage**:
   - *Root Cause*: `HotelOnboardingPage.tsx` and `UsersManagementPage.tsx` stored custom administrator credentials in `staynexa_custom_credentials` with unhashed passwords.
   - *Impact*: Insecure credential exposure in browser storage violating OWASP security pillars.
3. **QR Base URL Overriding Production with Dead Tunnels**:
   - *Root Cause*: `src/utils/qrCode.ts` prioritized `getStoredTunnelUrl()` above `window.location.origin` even when browsing on `https://staynexa-nine.vercel.app`.
   - *Impact*: Scanned QR codes pointed to expired Cloudflare tunnels rather than the live production application.
4. **QR Token Fail-Closed Gap**:
   - *Root Cause*: `GuestPortalPage.tsx` defaulted any unmatched token without an explicit room pattern to Room 101 instead of showing an invalid token screen.
   - *Impact*: Invalid tokens loaded guest sessions for Room 101 instead of failing closed.
5. **Cross-Tenant WebSocket Broadcast Exposure**:
   - *Root Cause*: `realtimeSync.emit` looped through all opened hotel channels in `this.hotelChannels` when broadcasting events rather than restricting delivery to the target `hotel_id`.
   - *Impact*: Potential cross-tenant event leak between hotels if multiple channels were active.
6. **Cross-Device KDS Status Relay Gap**:
   - *Root Cause*: When orders arrived via WebSocket in KDS without prior local store entry, `orderService.updateStatusAsync` did not have an in-memory `Order` reference, suppressing `realtimeSync.emit('ORDER_STATUS_CHANGED')`.
   - *Impact*: Order status advances on KDS failed to sync back to the Guest Portal on separate devices/contexts.
7. **Missing Content-Security-Policy (CSP)**:
   - *Root Cause*: `vercel.json` omitted the CSP header.
   - *Impact*: Sub-optimal defense-in-depth against XSS or unauthorized script execution.

---

### Fixes Implemented
1. **Durable Order Persistence Enforcement**:
   - Updated `GuestPortalPage.tsx`: Removed the local in-memory fallback. Failed database mutations now display honest, visible error banners with retry capability.
   - Updated `demoDataService.ts`: `submitRequest` now propagates database write errors in connected mode rather than silently swallowing them.
2. **Cryptographic Password Hashing Utility**:
   - Created `src/utils/cryptoAuth.ts` with salted SHA-256 Web Crypto hashing (`hashPassword`, `verifyPassword`).
   - Updated `AuthContext.tsx`, `HotelOnboardingPage.tsx`, and `UsersManagementPage.tsx` to only store and verify cryptographic hashes. No plaintext passwords exist in `localStorage`.
3. **Production-First QR Base URL Resolution**:
   - Updated `src/utils/qrCode.ts`: When running on a live hostname (`hostname !== 'localhost' && hostname !== '127.0.0.1'`), `window.location.origin` is strictly used.
   - Updated `demoDataService.ts`: `qrService.generate` now accepts and preserves custom token strings.
4. **Strict Fail-Closed QR Validation**:
   - Updated `GuestPortalPage.tsx`: Completely removed default fallback to Room 101 on unrecognized tokens. Tokens with no database record, no recognized room pattern, and not matching known production tokens now fail closed with clear error messaging.
5. **Strict Multi-Tenant Channel Isolation**:
   - Updated `src/services/realtimeSync.ts`: When an event payload contains `hotel_id`, the WebSocket broadcast relays strictly to `targetDbId`. Asynchronous transmission errors are caught and queued via `.catch(...)`.
6. **Live Realtime Order Mirroring & Status Broadcast Relay**:
   - Added `mirrorOrderLocally` to `orderService.ts`.
   - Updated `KitchenDisplayPage.tsx` to mirror incoming live orders locally and consume updated orders on advance.
   - Hardened `orderService.updateStatusAsync` to always construct a broadcast payload and emit `ORDER_STATUS_CHANGED` across channels.
7. **Defense-in-Depth Edge Security**:
   - Updated `vercel.json`: Added `Content-Security-Policy` restricting script, frame, and connect sources.

---

### Verification & Testing Results
- **Vitest Unit & Integration Suites**: 9 test suites passed (192 tests passed, 1 todo, 0 failed).
- **Oxlint**: 0 errors, 5 warnings (non-blocking React hook/purity warnings).
- **TypeScript & Vite Production Build**: `tsc -b && vite build` built in 1.02s with 0 errors.
- **Playwright Full E2E Test Suite**: 40/40 tests passed across Chromium and Mobile Chrome viewports in 1.4m.
  - `auth.spec.ts`: 4 passed
  - `guest-cart.spec.ts`: 2 passed
  - `guest-portal.spec.ts`: 8 passed
  - `kds-realtime.spec.ts`: 2 passed
  - `qr-resolution.spec.ts`: 14 passed
  - `responsive.spec.ts`: 6 passed
  - `tenant-isolation.spec.ts`: 4 passed
