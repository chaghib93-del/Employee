-- DANGER: deletes ALL app tables and data (development only). Login users in
-- Authentication > Users and files in Storage > files are NOT removed here.
drop table if exists public.notes, public.notices, public.documents, public.fq_applications,
  public.employees, public.phases, public.app_settings, public.profiles cascade;
drop function if exists public.my_role(), public.my_district(), public.my_username(),
  public.employees_guard_insert(), public.employees_guard_update() cascade;
drop policy if exists files_read   on storage.objects;
drop policy if exists files_insert on storage.objects;
drop policy if exists files_delete on storage.objects;
