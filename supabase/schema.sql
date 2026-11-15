-- =====================================================================
-- Employee Dashboard: Supabase schema
-- Directorate of Education (Schools) Quetta Division
--
-- HOW TO RUN: Supabase > SQL Editor > New query > paste this whole file > Run.
-- Run it ONCE on a new project. To start again, run reset.sql first.
--
-- Design (to keep backend work small):
--   * The browser talks to Supabase directly. Security is enforced here,
--     by Row Level Security (RLS), so no custom API server is needed.
--   * Each table keeps the whole record the app already uses in the `data`
--     column (jsonb) and a few plain columns (district, phase, role ...)
--     that the security rules read.
--   * Logins use Supabase Auth. `profiles` adds the role and district.
--   * Files (degree scans, documents) go to the private Storage bucket "files".
-- =====================================================================

-- ---------------------------------------------------------------------
-- Profiles: one row per login (id = the Supabase Auth user id)
--   dir = Director / Admin      ad  = Assistant Director
--   deo = District Education Officer (needs a district)
--   entry = Entry level operator (needs a district)
--   ops = Office entry operator (works for any district; owner = the AD's username)
-- Rows are created by the Vercel function api/admin-users.js (service key),
-- never directly from the browser.
-- ---------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   text not null unique check (username = lower(username)),
  role       text not null check (role in ('dir', 'ad', 'deo', 'entry', 'ops')),
  district   text,
  owner      text,
  created_at timestamptz not null default now(),
  check (role not in ('deo', 'entry') or district is not null)
);

-- Helpers used by the security rules (security definer = they may read profiles)
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = (select auth.uid()) $$;

create or replace function public.my_district() returns text
language sql stable security definer set search_path = public as
$$ select district from public.profiles where id = (select auth.uid()) $$;

create or replace function public.my_username() returns text
language sql stable security definer set search_path = public as
$$ select username from public.profiles where id = (select auth.uid()) $$;

revoke all on function public.my_role(), public.my_district(), public.my_username() from public, anon;
grant execute on function public.my_role(), public.my_district(), public.my_username() to authenticated;

-- ---------------------------------------------------------------------
-- Appointment phases
-- ---------------------------------------------------------------------
create table public.phases (
  id            text primary key,
  seq           bigint generated always as identity,
  name          text not null,
  status        text not null default 'Active' check (status in ('Active', 'Completed')),
  all_districts boolean not null default true,
  districts     text[] not null default '{}',
  data          jsonb not null,
  created_at    timestamptz not null default now()
);
create unique index phases_name_key on public.phases (lower(name));

-- ---------------------------------------------------------------------
-- Employee records
-- ---------------------------------------------------------------------
create table public.employees (
  id         text primary key,
  seq        bigint generated always as identity,
  district   text not null,
  phase      text not null references public.phases (id) on delete cascade,
  closed     boolean not null default false,
  data       jsonb not null,
  created_at timestamptz not null default now()
);
create index employees_phase_district_idx on public.employees (phase, district);

-- Rule: a NEW record can be entered only while its phase is Active and assigned to the district.
create or replace function public.employees_guard_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.employees e where e.id = new.id) then
    return new;                                   -- an upsert of an existing record: not a new entry
  end if;
  if not new.closed and not exists (
       select 1 from public.phases p
        where p.id = new.phase and p.status = 'Active'
          and (p.all_districts or new.district = any (p.districts))) then
    raise exception 'Data entry is closed: no phase in progress for district % in this phase', new.district
      using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger employees_guard_insert before insert on public.employees
  for each row execute function public.employees_guard_insert();

-- Rule: a closed record cannot be edited (reopening a phase sets closed back to false and is allowed).
create or replace function public.employees_guard_update() returns trigger
language plpgsql as $$
begin
  if old.closed and new.closed then
    raise exception 'This record is closed because its appointment phase is completed'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger employees_guard_update before update on public.employees
  for each row execute function public.employees_guard_update();

-- ---------------------------------------------------------------------
-- Family quota applications
-- ---------------------------------------------------------------------
create table public.fq_applications (
  id         text primary key,
  seq        bigint generated always as identity,
  district   text not null,
  data       jsonb not null,
  created_at timestamptz not null default now()
);
create index fq_district_idx on public.fq_applications (district);

-- ---------------------------------------------------------------------
-- Notices and shared documents (file attachments of documents live in Storage)
-- ---------------------------------------------------------------------
create table public.notices (
  id         text primary key,
  seq        bigint generated always as identity,
  author     text not null,
  audience   text not null,
  data       jsonb not null,
  created_at timestamptz not null default now()
);

create table public.documents (
  id         text primary key,
  seq        bigint generated always as identity,
  author     text not null,
  by_role    text not null,
  share      text not null,
  district   text,
  data       jsonb not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Messages and alerts (Messages button)
-- ---------------------------------------------------------------------
create table public.notes (
  id         text primary key,
  seq        bigint generated always as identity,
  to_user    text not null,
  from_user  text not null,
  data       jsonb not null,
  created_at timestamptz not null default now()
);
create index notes_to_idx on public.notes (to_user);
create index notes_from_idx on public.notes (from_user);

-- ---------------------------------------------------------------------
-- Settings: key 'review' = {"deo":true,"entry":true}, key 'cols' = {"grv":true,"deo":true}
-- ---------------------------------------------------------------------
create table public.app_settings (
  key   text primary key,
  value jsonb not null
);

-- =====================================================================
-- SECURITY (Row Level Security)
-- =====================================================================
alter table public.profiles        enable row level security;
alter table public.phases          enable row level security;
alter table public.employees       enable row level security;
alter table public.fq_applications enable row level security;
alter table public.notices         enable row level security;
alter table public.documents       enable row level security;
alter table public.notes           enable row level security;
alter table public.app_settings    enable row level security;

revoke all on all tables in schema public from anon;

-- profiles: every signed-in user can see usernames and roles (needed for messages).
-- Nobody can change them from the browser; only the Vercel function can.
create policy profiles_read on public.profiles for select to authenticated using (true);

-- phases: Director creates / completes / reopens / deletes; others read the phases that apply to them.
create policy phases_read on public.phases for select to authenticated using (
  public.my_role() in ('dir', 'ad', 'ops')
  or all_districts
  or public.my_district() = any (districts));
create policy phases_write on public.phases for all to authenticated
  using (public.my_role() = 'dir') with check (public.my_role() = 'dir');

-- employees
create policy emp_read on public.employees for select to authenticated using (
  public.my_role() in ('dir', 'ad', 'ops') or district = public.my_district());
create policy emp_insert on public.employees for insert to authenticated with check (
  public.my_role() in ('dir', 'ad', 'ops') or district = public.my_district());
create policy emp_update on public.employees for update to authenticated
  using      (public.my_role() in ('dir', 'ad', 'ops') or district = public.my_district())
  with check (public.my_role() in ('dir', 'ad', 'ops') or district = public.my_district());
create policy emp_delete on public.employees for delete to authenticated using (
  public.my_role() = 'dir'
  or (public.my_role() = 'entry' and district = public.my_district() and not closed));

-- family quota
create policy fq_read on public.fq_applications for select to authenticated using (
  public.my_role() in ('dir', 'ad', 'ops') or district = public.my_district());
create policy fq_insert on public.fq_applications for insert to authenticated with check (
  public.my_role() in ('dir', 'ad', 'ops') or district = public.my_district());
create policy fq_update on public.fq_applications for update to authenticated
  using      (public.my_role() in ('dir', 'ad', 'ops') or district = public.my_district())
  with check (public.my_role() in ('dir', 'ad', 'ops') or district = public.my_district());
create policy fq_delete on public.fq_applications for delete to authenticated using (public.my_role() = 'dir');

-- notices: Director and Assistant Director post; people see notices for their audience
create policy notices_read on public.notices for select to authenticated using (
  public.my_role() = 'dir'
  or author = public.my_username()
  or audience = 'all'
  or (audience = 'deo'   and public.my_role() = 'deo')
  or (audience = 'entry' and public.my_role() in ('entry', 'ops'))
  or (audience = 'ad'    and public.my_role() = 'ad'));
create policy notices_insert on public.notices for insert to authenticated with check (
  public.my_role() in ('dir', 'ad') and author = public.my_username());
create policy notices_update on public.notices for update to authenticated
  using (author = public.my_username()) with check (author = public.my_username());
create policy notices_delete on public.notices for delete to authenticated using (
  author = public.my_username() or public.my_role() = 'dir');

-- documents: uploaded by Director, Assistant Director or DEO; shared with all DEOs, one district's DEOs, or private
create policy docs_read on public.documents for select to authenticated using (
  public.my_role() in ('dir', 'ad')
  or author = public.my_username()
  or (by_role <> 'deo' and (share = 'deos' or share = 'district:' || coalesce(public.my_district(), ''))));
create policy docs_insert on public.documents for insert to authenticated with check (
  public.my_role() in ('dir', 'ad', 'deo') and author = public.my_username());
create policy docs_update on public.documents for update to authenticated
  using (author = public.my_username()) with check (author = public.my_username());
create policy docs_delete on public.documents for delete to authenticated using (
  author = public.my_username() or public.my_role() = 'dir');

-- messages: you see messages you sent or received
create policy notes_read on public.notes for select to authenticated using (
  to_user = public.my_username() or from_user = public.my_username());
create policy notes_insert on public.notes for insert to authenticated with check (
  from_user = public.my_username() or to_user = public.my_username());
create policy notes_update on public.notes for update to authenticated
  using      (to_user = public.my_username() or from_user = public.my_username())
  with check (to_user = public.my_username() or from_user = public.my_username());
create policy notes_delete on public.notes for delete to authenticated using (
  to_user = public.my_username() or from_user = public.my_username());

-- settings: everyone reads, only the Director changes
create policy settings_read  on public.app_settings for select to authenticated using (true);
create policy settings_write on public.app_settings for all to authenticated
  using (public.my_role() = 'dir') with check (public.my_role() = 'dir');

-- default settings
insert into public.app_settings (key, value) values
  ('review', '{"deo": true, "entry": true}'),
  ('cols',   '{"grv": true, "deo": true}')
on conflict (key) do nothing;

-- =====================================================================
-- FILE STORAGE: private bucket "files", up to 25 MB per file.
-- Only signed-in users that have a role can read, upload or delete.
-- (File names are random, and the app only shows a file link to people
--  who can see the record it belongs to.)
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('files', 'files', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

create policy files_read   on storage.objects for select to authenticated
  using (bucket_id = 'files' and public.my_role() is not null);
create policy files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'files' and public.my_role() is not null);
create policy files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'files' and public.my_role() is not null);
