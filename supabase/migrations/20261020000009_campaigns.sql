-- Manual reviewed campaigns. Scheduling is local so consent is checked at dispatch.
create table public.asra3_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references auth.users(id),
  account_id text not null,
  name text not null check (length(name) between 1 and 120),
  template jsonb not null,
  contact_ids uuid[] not null,
  audience_snapshot jsonb not null,
  audience_hash text not null,
  status text not null default 'draft' check (status in ('draft','scheduled','dispatching','sending','completed','failed','cancelled','needs_review','uncertain')),
  scheduled_at timestamptz,
  provider_id text,
  reservation_id uuid,
  operation_token text,
  step text,
  result jsonb,
  error text,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, provider_id)
);
create index asra3_campaigns_due on public.asra3_campaigns(scheduled_at) where status = 'scheduled';
create index asra3_campaigns_tenant on public.asra3_campaigns(organization_id, created_at desc);
alter table public.asra3_campaigns enable row level security;
revoke all on public.asra3_campaigns from public, anon, authenticated;
grant select, insert, update, delete on public.asra3_campaigns to service_role;

create function public.claim_asra3_campaign(p_organization_id uuid, p_id uuid, p_token text)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare r public.asra3_campaigns%rowtype;
begin
  select * into r from public.asra3_campaigns where organization_id=p_organization_id and id=p_id for update;
  if not found then return null; end if;
  if r.status not in ('draft','scheduled') or r.operation_token is not null then return null; end if;
  if r.status='scheduled' and r.scheduled_at>now() then return null; end if;
  update public.asra3_campaigns set status='dispatching',operation_token=p_token,
    step='checking',revision=revision+1,updated_at=now()
  where id=p_id and organization_id=p_organization_id returning * into r;
  return to_jsonb(r);
end $$;
revoke all on function public.claim_asra3_campaign(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.claim_asra3_campaign(uuid,uuid,text) to service_role;
