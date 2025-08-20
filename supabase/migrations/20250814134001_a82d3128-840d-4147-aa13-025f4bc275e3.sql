-- First verify the user exists and update password to a known value
-- Using admin functions to update password directly
SELECT auth.admin_update_user_by_id(
  (SELECT id FROM auth.users WHERE email = 'matthew@selectbusinessclass.com'),
  '{"password": "Matvei123123!23"}'::jsonb
);