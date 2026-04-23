create extension if not exists pgcrypto;

create table if not exists public.employee_allowlist (
  id bigint generated always as identity primary key,
  uid text not null unique,
  first_name text not null,
  middle_initial text,
  last_name text not null,
  display_name text not null,
  store_name text not null,
  is_active boolean not null default true,
  last_imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employee_accounts (
  id bigint generated always as identity primary key,
  auth_user_id uuid not null unique,
  uid text not null unique references public.employee_allowlist(uid) on update cascade,
  email text not null,
  access_enabled boolean not null default true,
  email_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.protected_resources (
  id bigint generated always as identity primary key,
  slug text not null unique,
  title text not null,
  resource_type text not null check (resource_type in ('file', 'external_link', 'page')),
  external_url text,
  storage_bucket text,
  storage_path text,
  internal_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_employee_allowlist_updated_at on public.employee_allowlist;
create trigger trg_employee_allowlist_updated_at
before update on public.employee_allowlist
for each row execute function public.set_updated_at();

drop trigger if exists trg_employee_accounts_updated_at on public.employee_accounts;
create trigger trg_employee_accounts_updated_at
before update on public.employee_accounts
for each row execute function public.set_updated_at();

drop trigger if exists trg_protected_resources_updated_at on public.protected_resources;
create trigger trg_protected_resources_updated_at
before update on public.protected_resources
for each row execute function public.set_updated_at();

alter table public.employee_allowlist enable row level security;
alter table public.employee_accounts enable row level security;
alter table public.protected_resources enable row level security;

drop policy if exists "authenticated users can read own employee account" on public.employee_accounts;
create policy "authenticated users can read own employee account"
on public.employee_accounts
for select
to authenticated
using (auth.uid() = auth_user_id);

drop policy if exists "authenticated users can read own allowlist row" on public.employee_allowlist;
create policy "authenticated users can read own allowlist row"
on public.employee_allowlist
for select
to authenticated
using (
  exists (
    select 1
    from public.employee_accounts ea
    where ea.uid = employee_allowlist.uid
      and ea.auth_user_id = auth.uid()
      and ea.access_enabled = true
  )
);

drop policy if exists "authenticated users can read active resources" on public.protected_resources;
create policy "authenticated users can read active resources"
on public.protected_resources
for select
to authenticated
using (is_active = true);

insert into storage.buckets (id, name, public)
values
  ('site-private-files', 'site-private-files', false),
  ('site-private-media', 'site-private-media', false)
on conflict (id) do nothing;
