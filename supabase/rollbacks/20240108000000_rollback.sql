/*
# Rollback: security hardening (20240108000000)

1. Summary
- Restores the public read policy on hotel settings.
- Removes the profile role guard trigger and its function.
- Restores default execute rights on the new-user trigger function.

2. Notes
- Only use this if the hardening causes a production problem. It reopens the issues it fixed.
*/

DROP TRIGGER IF EXISTS profiles_guard_role_trg ON profiles;
DROP FUNCTION IF EXISTS profiles_guard_role();

GRANT EXECUTE ON FUNCTION handle_new_user() TO PUBLIC, anon, authenticated;

CREATE POLICY hotel_settings_read ON hotel_settings
  FOR SELECT
  USING (true);
