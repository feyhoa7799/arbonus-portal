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

create table if not exists public.registration_nonces (
  id bigint generated always as identity primary key,
  nonce text not null unique,
  uid text not null references public.employee_allowlist(uid) on update cascade,
  email text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.security_events (
  id bigint generated always as identity primary key,
  event_type text not null,
  uid text,
  email text,
  ip_address text,
  success boolean not null default false,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_security_events_event_created_at
  on public.security_events (event_type, created_at desc);

create index if not exists idx_security_events_ip_created_at
  on public.security_events (ip_address, created_at desc);

create index if not exists idx_security_events_uid_created_at
  on public.security_events (uid, created_at desc);

create index if not exists idx_security_events_email_created_at
  on public.security_events (email, created_at desc);

create index if not exists idx_registration_nonces_uid_created_at
  on public.registration_nonces (uid, created_at desc);

create index if not exists idx_registration_nonces_email_created_at
  on public.registration_nonces (email, created_at desc);

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
alter table public.registration_nonces enable row level security;
alter table public.security_events enable row level security;

drop policy if exists "authenticated users can read own employee account" on public.employee_accounts;
drop policy if exists "authenticated users can read own allowlist row" on public.employee_allowlist;
drop policy if exists "authenticated users can read active resources" on public.protected_resources;

insert into storage.buckets (id, name, public)
values
  ('site-private-files', 'site-private-files', false),
  ('site-private-media', 'site-private-media', false)
on conflict (id) do nothing;

create or replace function public.hook_enforce_employee_signup(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_uid text;
  requested_nonce text;
  requested_email text;
  allowlist_exists boolean;
  active_account_exists boolean;
  matched_nonce_id bigint;
begin
  requested_uid := lower(trim(coalesce(event->'user'->'user_metadata'->>'uid', '')));
  requested_nonce := trim(coalesce(event->'user'->'user_metadata'->>'reg_nonce', '')));
  requested_email := lower(trim(coalesce(event->'user'->>'email', '')));

  if requested_uid = '' or requested_nonce = '' or requested_email = '' then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 403,
        'message', 'Registration denied.'
      )
    );
  end if;

  select exists (
    select 1
    from public.employee_allowlist
    where uid = requested_uid
      and is_active = true
  )
  into allowlist_exists;

  if not allowlist_exists then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 403,
        'message', 'Registration denied.'
      )
    );
  end if;

  select exists (
    select 1
    from public.employee_accounts
    where uid = requested_uid
      and access_enabled = true
  )
  into active_account_exists;

  if active_account_exists then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 403,
        'message', 'Registration denied.'
      )
    );
  end if;

  update public.registration_nonces
  set used_at = now()
  where nonce = requested_nonce
    and uid = requested_uid
    and lower(email) = requested_email
    and used_at is null
    and expires_at > now()
  returning id into matched_nonce_id;

  if matched_nonce_id is null then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 403,
        'message', 'Registration denied.'
      )
    );
  end if;

  return '{}'::jsonb;
end;
$$;

grant execute
  on function public.hook_enforce_employee_signup
  to supabase_auth_admin;

revoke execute
  on function public.hook_enforce_employee_signup
  from authenticated, anon, public;