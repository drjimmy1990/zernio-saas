-- Temporary OAuth material is encrypted by the application before storage.
create table if not exists public.oauth_sessions (
  id text primary key check (id ~ '^[a-f0-9]{64}$'),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id text not null,
  session_hash text not null,
  platform text not null,
  profile_id text not null,
  redirect_url text not null,
  expires_at timestamptz not null,
  status text not null check (status in ('pending', 'selecting', 'processing', 'consumed', 'failed')),
  selection_step text,
  encrypted_context text,
  expected_phone_number text,
  purchased_number_id text,
  created_at timestamptz not null default now()
);
create index if not exists oauth_sessions_expiry_idx on public.oauth_sessions (expires_at);
alter table public.oauth_sessions enable row level security;
revoke all on public.oauth_sessions from anon, authenticated;
grant all on public.oauth_sessions to service_role;
