-- =====================================================================
-- Create the first Director / Admin profile.
--
-- 1. In Supabase: Authentication > Users > Add user > Create new user
--      Email:    admin1@emp-login.app      (username + @ + your login domain)
--      Password: choose a strong password
--      Tick "Auto Confirm User"
-- 2. Change the username below if you used another one, then run this in SQL Editor.
-- =====================================================================
insert into public.profiles (id, username, role)
select id, split_part(email, '@', 1), 'dir'
  from auth.users
 where email = 'admin1@emp-login.app'      -- <- must match the user you just added
on conflict (username) do nothing;

select username, role from public.profiles;   -- you should see one row: your Director account
