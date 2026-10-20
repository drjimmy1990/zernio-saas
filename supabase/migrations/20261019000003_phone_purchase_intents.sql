-- Durable, server-only financial intent records. Apply through the normal migration workflow.
create table if not exists public.phone_purchase_intents (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  intent_id text not null,
  profile_id text not null,
  fingerprint text not null,
  state text not null default 'pending' check (state in ('pending', 'kyc_required', 'purchased', 'terminal')),
  attempted boolean not null default false,
  number_id text,
  kyc_url text,
  terminal_code text,
  lock_token text,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, intent_id)
);
-- Even ambiguous/payment/KYC requests reserve the profile until resolved with their original intent.
create unique index if not exists phone_purchase_intents_profile_open_idx
  on public.phone_purchase_intents (profile_id) where state <> 'terminal';
alter table public.phone_purchase_intents enable row level security;
revoke all on public.phone_purchase_intents from public, anon, authenticated;
grant all on public.phone_purchase_intents to service_role;

create or replace function public.acquire_phone_purchase_intent(
  p_organization_id uuid, p_profile_id text, p_intent_id text, p_fingerprint text, p_lock_token text
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare r public.phone_purchase_intents%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_profile_id, 0));
  select * into r from public.phone_purchase_intents
    where organization_id = p_organization_id and intent_id = p_intent_id for update;
  if found then
    if r.profile_id <> p_profile_id or r.fingerprint <> p_fingerprint then
      return jsonb_build_object('error_code', 'PURCHASE_INTENT_MISMATCH', 'message', 'Purchase intent parameters have changed.');
    end if;
    if r.lock_token is not null and r.locked_until > now() then
      return jsonb_build_object('error_code', 'PURCHASE_IN_PROGRESS', 'message', 'A purchase is processing. Retry the same intent.');
    end if;
  else
    if exists (select 1 from public.phone_purchase_intents where profile_id = p_profile_id and state <> 'terminal') then
      return jsonb_build_object('error_code', 'PROFILE_PURCHASE_EXISTS', 'message', 'This profile already has a purchase. Resume the original intent.');
    end if;
    insert into public.phone_purchase_intents (organization_id, intent_id, profile_id, fingerprint)
      values (p_organization_id, p_intent_id, p_profile_id, p_fingerprint);
  end if;
  update public.phone_purchase_intents set lock_token = p_lock_token, locked_until = now() + interval '90 seconds', updated_at = now()
    where organization_id = p_organization_id and intent_id = p_intent_id returning * into r;
  return to_jsonb(r);
end;
$$;

create or replace function public.update_phone_purchase_intent(
  p_organization_id uuid, p_intent_id text, p_lock_token text, p_state text, p_attempted boolean,
  p_number_id text, p_kyc_url text, p_terminal_code text, p_release boolean
) returns boolean language plpgsql security invoker set search_path = public as $$
begin
  update public.phone_purchase_intents set state = p_state, attempted = p_attempted,
    number_id = coalesce(p_number_id, number_id), kyc_url = coalesce(p_kyc_url, kyc_url), terminal_code = p_terminal_code,
    lock_token = case when p_release then null else lock_token end,
    locked_until = case when p_release then null else locked_until end, updated_at = now()
    where organization_id = p_organization_id and intent_id = p_intent_id and lock_token = p_lock_token;
  return found;
end;
$$;
revoke all on function public.acquire_phone_purchase_intent(uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.update_phone_purchase_intent(uuid, text, text, text, boolean, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.acquire_phone_purchase_intent(uuid, text, text, text, text) to service_role;
grant execute on function public.update_phone_purchase_intent(uuid, text, text, text, boolean, text, text, text, boolean) to service_role;
