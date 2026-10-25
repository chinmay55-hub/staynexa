# StayNexa Staging Deployment Runbook: Secure Guest Pipeline & Tenant Isolation

**Document Version:** 1.1.0  
**Target Migration:** `supabase/migrations/20240103000000_secure_guest_pipeline.sql`  
**Rollback Script:** `supabase/migrations/rollback/20240103000000_rollback_to_20240102.sql`  
**Prerequisites:** Applied migrations `20240101000000_staynexa_schema.sql` and `20240102000000_realtime_orders_rls.sql`  
**Target Environment:** Staging / Hosted Supabase (Execute ONLY after explicit authorization)  

---

## 1. Overview & Operational Principles

This runbook specifies the end-to-end operational protocol for applying Migration `20240103000000_secure_guest_pipeline.sql` to the StayNexa staging environment.

### Core Safety Guarantees
1. **Zero Data Loss**: Line items (`order_items`), orders, and service requests are never silently deleted.
2. **Zero Context Loss**: Room, reservation, and guest foreign key associations are never silently nullified.
3. **Atomic Execution**: Executed within a single `BEGIN ... COMMIT` block. Any error or gate failure triggers 100% rollback.
4. **Lock Protection (`lock_timeout = '5s'`)**: Session-level lock timeout prevents the migration from hanging or queueing behind active traffic.
5. **Fail-Closed Security**: Anonymous public table writes are revoked in favor of hardened `SECURITY DEFINER` RPCs with `search_path = pg_catalog, public`.

---

## 2. Maintenance Window & Lock Contention Strategy

### 2.1 Scheduling & Timing
- **Recommended Window**: Schedule execution during low-traffic off-peak hours (e.g., 02:00 – 04:00 local time).
- **Service Impact**: Adding composite foreign keys and unique constraints requires brief `ACCESS EXCLUSIVE` table locks on `orders`, `order_items`, `service_requests`, `rooms`, `reservations`, and `guests`.
- **Active Traffic Suspension**: Temporarily pause background synchronizations, scheduled workers, or high-frequency polling prior to execution.

### 2.2 Lock Timeout Enforcement
The migration enforces `SET LOCAL lock_timeout = '5s';` immediately after `BEGIN;`.
- If an active uncommitted query or background transaction holds a conflicting lock, PostgreSQL will abort the migration within 5 seconds with error code `55P03` (`lock_not_available`).
- **Never increase the lock timeout blindly.** If a lock timeout occurs:
  1. Inspect blocking transactions:
     ```sql
     SELECT pid, usename, query, state, age(clock_timestamp(), query_start) 
     FROM pg_stat_activity 
     WHERE state != 'idle' AND pid <> pg_backend_pid();
     ```
  2. Wait for blocking queries to complete or terminate long-running idle transactions:
     ```sql
     SELECT pg_terminate_backend(<PID>);
     ```
  3. Re-attempt the migration only when the lock path is clear.

---

## 3. Pre-Deployment Backup & Restore Verification

Do not proceed without verified backup availability.

### 3.1 Supabase Point-in-Time Recovery (PITR) & Snapshot
1. Navigate to **Supabase Dashboard** -> **Project Settings** -> **Database** -> **Backups**.
2. Confirm automated backups are enabled and active.
3. Trigger a fresh manual snapshot or verify an automated PITR restore point exists within the last 30 minutes.
4. Confirm backup status displays **Healthy / Available**.
5. **Critical Verification Requirement**: Do not assume snapshots are restorable without verification. Before applying migrations to production, execute a non-production restore drill against a temporary clone or staging database to prove backup validity.

### 3.2 Logical Backup via Supabase CLI (Secondary Safeguard)
If operator CLI access is configured:
```bash
# Export schema definition
supabase db dump -f pre_migration_schema_backup.sql

# Export table data
supabase db dump --data-only -f pre_migration_data_backup.sql

# Verify dump files are non-empty
head -n 20 pre_migration_schema_backup.sql
```
*Never commit, log, or transmit backup files containing guest personal information or credentials. (These files are excluded by .gitignore).*

---

## 4. Preflight Sanity Checks (Read-Only)

Execute these queries in the Supabase SQL Editor prior to deploying. **All gates must return 0 rows before applying the migration.**

### Preflight Gate 1: Active Checked-In Stay Consistency (`P0016`)
Detects rooms with multiple active stays, or checked-in reservations without assigned rooms.

```sql
-- Check 1A: Multiple active CHECKED_IN reservations on the same room
SELECT room_id, COUNT(*) AS active_stays
FROM public.reservations
WHERE status = 'CHECKED_IN' AND room_id IS NOT NULL
GROUP BY room_id
HAVING COUNT(*) > 1;
-- Required: 0 rows

-- Check 1B: Active CHECKED_IN reservations with NULL room_id
SELECT id, hotel_id, status
FROM public.reservations
WHERE status = 'CHECKED_IN' AND room_id IS NULL;
-- Required: 0 rows
```
*Resolution if rows exist:* Front-desk staff must check out stale reservations or assign valid room numbers.

---

### Preflight Gate 2: Orphaned Order Items (`P0017`)
Detects line items referencing non-existent orders.

```sql
SELECT oi.id, oi.order_id, oi.name
FROM public.order_items oi
WHERE NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.id = oi.order_id);
-- Required: 0 rows
```
*Resolution if rows exist:* Re-attach orphaned items to their parent orders or archive them to cold storage before migration.

---

### Preflight Gate 3: Cross-Tenant References (`P0018`)
Detects mismatched hotel boundaries across orders, order items, and service requests.

```sql
-- Check 3A: Orders referencing foreign room, reservation, or guest
SELECT o.id, o.hotel_id, o.room_id, o.reservation_id, o.guest_id
FROM public.orders o
WHERE (o.room_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.rooms r WHERE r.hotel_id = o.hotel_id AND r.id = o.room_id
))
OR (o.reservation_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.reservations res WHERE res.hotel_id = o.hotel_id AND res.id = o.reservation_id
))
OR (o.guest_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.guests g WHERE g.hotel_id = o.hotel_id AND g.id = o.guest_id
));
-- Required: 0 rows

-- Check 3B: Order items with conflicting hotel_id or foreign menu items
SELECT oi.id, oi.order_id, oi.hotel_id AS item_hotel, o.hotel_id AS order_hotel
FROM public.order_items oi
JOIN public.orders o ON o.id = oi.order_id
WHERE (oi.hotel_id IS NOT NULL AND oi.hotel_id <> o.hotel_id)
   OR (oi.menu_item_id IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM public.menu_items m WHERE m.hotel_id = o.hotel_id AND m.id = oi.menu_item_id
   ));
-- Required: 0 rows

-- Check 3C: Service requests referencing foreign room, reservation, guest, or service
SELECT sr.id, sr.hotel_id
FROM public.service_requests sr
WHERE (sr.room_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.rooms r WHERE r.hotel_id = sr.hotel_id AND r.id = sr.room_id
))
OR (sr.reservation_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.reservations res WHERE res.hotel_id = sr.hotel_id AND res.id = sr.reservation_id
))
OR (sr.guest_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.guests g WHERE g.hotel_id = sr.hotel_id AND g.id = sr.guest_id
))
OR (sr.service_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.hotel_services hs WHERE hs.hotel_id = sr.hotel_id AND hs.id = sr.service_id
));
-- Required: 0 rows
```
*Resolution if rows exist:* Reconcile tenant foreign keys to point to the correct hotel resources.

---

### Preflight Check 4: Duplicate Active QR Codes (Informational)
Enumerates older duplicate active QR codes that will be deactivated:

```sql
SELECT hotel_id, room_id, COUNT(*) AS active_qrs
FROM public.qr_codes
WHERE is_active = true AND room_id IS NOT NULL
GROUP BY hotel_id, room_id
HAVING COUNT(*) > 1;
-- Informational: Older duplicates will be set to is_active = false; newest active QR remains.
```

---

## 5. Migration History Drift Check

Verify migration table history before applying:

```sql
SELECT version, inserted_at 
FROM supabase_migrations.schema_migrations 
ORDER BY version ASC;
```
Required output:
| version |
| :--- |
| `20240101000000` |
| `20240102000000` |

If versions are missing or unapplied, abort and align migration history first.

---

## 6. Deployment Execution Procedure

### Recommended Execution (Supabase Dashboard SQL Editor)
1. Open **Supabase Dashboard** -> **SQL Editor**.
2. Open a new query tab and paste the exact contents of:
   `supabase/migrations/20240103000000_secure_guest_pipeline.sql`
3. Verify that the query begins with:
   ```sql
   BEGIN;
   SET LOCAL lock_timeout = '5s';
   SET LOCAL statement_timeout = '30s';
   ```
   and concludes with:
   ```sql
   COMMIT;
   ```
4. Click **Run**.
5. Observe execution. If any gate or statement fails, PostgreSQL triggers an immediate automatic `ROLLBACK`.

---

## 7. Post-Deployment Smoke Verification

Run these verification queries immediately following deployment:

### 1. Row Level Security Verification
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('orders', 'order_items', 'service_requests', 'qr_codes');
```
*Pass Criteria: All 4 tables show `rowsecurity = true`.*

### 2. Active Staff Policies Verification
```sql
SELECT tablename, policyname, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('orders', 'order_items', 'service_requests', 'qr_codes')
ORDER BY tablename, policyname;
```
*Pass Criteria:*
- `orders`: `orders_staff_policy` (FOR ALL TO authenticated)
- `order_items`: `order_items_staff_policy` (FOR ALL TO authenticated)
- `service_requests`: `service_requests_staff_policy` (FOR ALL TO authenticated)
- `qr_codes`: `qr_codes_staff_policy` (FOR ALL TO authenticated)
- **Zero** policies granting direct write/read access to `anon` or `{public}`.

### 3. Anon Direct Table Privilege Revocation
```sql
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee = 'anon'
  AND table_name IN ('orders', 'order_items', 'service_requests', 'qr_codes');
```
*Pass Criteria: 0 rows returned.*

### 4. Partial Unique Index Enforcement
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname IN ('idx_unique_checked_in_room', 'idx_unique_active_room_qr');
```
*Pass Criteria: Both indexes exist with partial WHERE clauses.*

### 5. Hardened RPC Privileges & Search Paths
```sql
SELECT p.proname, p.prosecdef, p.proconfig,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_exec,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_can_exec
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'create_guest_order',
    'create_guest_service_request',
    'get_guest_order_status',
    'get_guest_request_status',
    'resolve_guest_portal_session'
  );
```
*Pass Criteria: All 5 functions display `prosecdef = true`, `proconfig = {search_path=pg_catalog, public}`, `anon_can_exec = true`, `auth_can_exec = true`.*

### 6. Vacant Room Session Resolution
```sql
SELECT public.resolve_guest_portal_session('<VALID_ACTIVE_QR_TOKEN>');
```
*Pass Criteria: Returns valid JSON with `has_active_stay: false`, non-null hotel/room, null reservation/guest, and exits with code 0.*

---

## 8. Explicit Stop Criteria & Emergency Rollback

### 8.1 Stop Criteria (Automatic Transaction Abort)
The transaction will abort and roll back automatically with zero changes if:
- `P0016`: Duplicate active stays or unassigned checked-in stays are found.
- `P0017`: Orphaned order items are found.
- `P0018`: Cross-tenant reference mismatches are found.
- `55P03`: Lock acquisition exceeds 5 seconds (`lock_not_available`).
- Any syntax, constraint violation, or type mismatch occurs.

### 8.2 Stop Criteria (Post-Commit Rollback Triggers)
Trigger incident management and execute rollback if:
1. Smoke queries show open anonymous table access or missing RLS.
2. Front-desk staff report inability to view or process orders.
3. Guest QR portal scans fail or throw HTTP 500 errors.

### 8.3 Safe Recovery & Incident Response Protocol

> [!CAUTION]
> **SECURITY DIRECTIVE (SEC-02): DO NOT EXECUTE LEGACY SQL ROLLBACK `rollback_to_20240102.sql`.**
> Reverting to migration 20240102000000 re-opens direct anonymous table write/read grants on orders and restores permissive `WITH CHECK (true)` policies. The script contains an active safety halt exception (`RAISE EXCEPTION`) to block execution.

In the event of a critical post-deployment failure:
1. **Primary Recovery (Snapshot Restore)**:
   - Navigate to Supabase Dashboard -> **Project Settings** -> **Database** -> **Backups**.
   - Select the pre-deployment snapshot captured in Step 3.1.
   - Click **Restore** to roll back the entire database state safely to pre-migration condition without opening security loopholes.
   - *Requirement: Snapshot restoration procedures must be verified in a non-production restore drill prior to relying upon them for production.*
2. **Secondary Recovery (Reviewed Forward Fix)**:
   - If a specific constraint, index, or RPC parameter causes an unexpected operational issue:
     - Author a targeted, reviewed SQL patch (e.g. tuning lock parameters, adjusting RPC return shapes, or adding a missing grant).
     - Maintain strict fail-closed RLS, `SECURITY DEFINER` with fixed `search_path = pg_catalog, public`, and zero anonymous direct table access.
     - Apply the forward fix under peer review.
3. **Legacy DDL Downgrade Script**:
   - `supabase/migrations/rollback/20240103000000_rollback_to_20240102.sql` is designated **BLOCKED / UNSAFE**. It must NOT be executed.
