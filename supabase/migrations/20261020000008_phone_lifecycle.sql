-- Server-only operation intents. A dispatched/unknown intent is never dispatched again.
create table public.phone_lifecycle_operations (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 operation_key text not null, kind text not null, profile_id text not null,
 fingerprint text not null, state text not null default 'prepared' check(state in ('prepared','dispatched','confirmed','unknown','failed')),
 input jsonb not null, result jsonb, provider_id text, reservations jsonb not null default '[]'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key(organization_id,operation_key)
);
create table public.phone_rental_obligations (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 number_id text not null, profile_id text not null, monthly_cents integer not null check(monthly_cents>=0),
 state text not null check(state in ('pending','active','released')), evidence jsonb not null,
 updated_at timestamptz not null default now(), primary key(organization_id,number_id)
);
alter table public.phone_lifecycle_operations enable row level security;
alter table public.phone_rental_obligations enable row level security;
revoke all on public.phone_lifecycle_operations,public.phone_rental_obligations from public,anon,authenticated;
grant all on public.phone_lifecycle_operations,public.phone_rental_obligations to service_role;
create function public.acquire_phone_lifecycle_operation(p_org uuid,p_key text,p_kind text,p_profile text,p_fingerprint text,p_input jsonb)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare r public.phone_lifecycle_operations%rowtype;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_profile,0));
 select * into r from phone_lifecycle_operations where organization_id=p_org and operation_key=p_key;
 if found then
  if r.fingerprint<>p_fingerprint or r.kind<>p_kind or r.profile_id<>p_profile then raise exception 'Operation intent changed'; end if;
  return to_jsonb(r)||jsonb_build_object('replayed',true);
 end if;
 if p_kind='purchase' and exists(select 1 from public.phone_purchase_intents where profile_id=p_profile and state in ('pending','kyc_required')) then
  raise exception 'Reconcile the previous onboarding purchase before another number';
 end if;
 if p_kind='purchase' and exists(select 1 from phone_lifecycle_operations where organization_id=p_org and profile_id=p_profile and kind='purchase' and state in ('prepared','dispatched','unknown')) then
  raise exception 'Reconcile the previous purchase before another number';
 end if;
 insert into phone_lifecycle_operations(organization_id,operation_key,kind,profile_id,fingerprint,input)
 values(p_org,p_key,p_kind,p_profile,p_fingerprint,p_input) returning * into r;
 return to_jsonb(r)||jsonb_build_object('replayed',false);
end $$;
revoke all on function public.acquire_phone_lifecycle_operation(uuid,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.acquire_phone_lifecycle_operation(uuid,text,text,text,text,jsonb) to service_role;
