/*
# Security hardening: hotel settings, profile roles, trigger function

1. Summary
- Stops anonymous visitors from reading every hotel's settings.
- Stops any user from changing a profile's role, except super admins.
- Removes public execute rights on the new-user trigger function and pins its search path.

2. Modified objects
- Policy `hotel_settings_read` on `hotel_settings` is dropped. Staff still read their own hotel's settings through the existing `hotel_settings_write` policy (which covers SELECT for their hotel). The guest portal reads settings through its own definer function, so it is unaffected.
- Function `handle_new_user` loses EXECUTE for PUBLIC, anon and authenticated (it is a trigger, not an API call) and gets a fixed search path.
- New function `profiles_guard_role` and trigger `profiles_guard_role_trg` on `profiles`. Blocks role changes from any signed-in non-super-admin session. Server-side sessions with no user (service role) are allowed.

3. Security notes
- Helper functions used by row policies (`auth_hotel_id`, `auth_user_role`, `is_super_admin`) keep their current grants, because policies depend on them.
- Guest portal RPCs keep anonymous execute, because the guest portal calls them without signing in.
- Rollback script lives in supabase/rollbacks/20240108000000_rollback.sql.
*/

DROP POLICY IF EXISTS hotel_settings_read ON hotel_settings;

REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC, anon, authenticated;
ALTER FUNCTION handle_new_user() SET search_path = public;

CREATE OR REPLACE FUNCTION profiles_guard_role()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.uid() IS NOT NULL
     AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can change a profile role'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION profiles_guard_role() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_guard_role_trg ON profiles;
CREATE TRIGGER profiles_guard_role_trg
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION profiles_guard_role();
