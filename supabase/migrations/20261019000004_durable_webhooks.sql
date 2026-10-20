-- Event acceptance and effects commit together; only the service role may call these RPCs.
create table public.zernio_webhook_events (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 event_id text not null, profile_id text not null, payload jsonb not null,
 accepted_at timestamptz not null default now(), primary key(organization_id,event_id)
);
-- Audit projection, not the canonical customer inbox. Independent clocks prevent a
-- late message.sent from replacing a read receipt and a category from replacing status.
create table public.zernio_webhook_projection (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 resource_key text not null, event_type text not null, event_at timestamptz not null,
 payload jsonb not null, primary key(organization_id,resource_key)
);
create table public.zernio_webhook_outbox (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 event_id text not null, endpoint_id text not null, url text not null, secret text not null, payload jsonb not null,
 attempts integer not null default 0, available_at timestamptz not null default now(),
 lease_token text, lease_until timestamptz, delivered_at timestamptz, last_status integer,
 unique(organization_id,event_id,endpoint_id),
 foreign key(organization_id,event_id) references public.zernio_webhook_events(organization_id,event_id) on delete cascade
);
create index zernio_outbox_pending on public.zernio_webhook_outbox(available_at) where delivered_at is null;
alter table public.zernio_webhook_events enable row level security;
alter table public.zernio_webhook_projection enable row level security;
alter table public.zernio_webhook_outbox enable row level security;
revoke all on public.zernio_webhook_events,public.zernio_webhook_projection,public.zernio_webhook_outbox from public,anon,authenticated;
grant all on public.zernio_webhook_events,public.zernio_webhook_projection,public.zernio_webhook_outbox to service_role;

create function public.accept_zernio_webhook(p_organization_id uuid,p_profile_id text,p_payload jsonb,p_endpoints jsonb)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare eid text:=p_payload->>'id'; et text:=p_payload->>'event'; key text; clock timestamptz;
 acc text:=coalesce(p_payload#>>'{account,accountId}',p_payload#>>'{account,id}'); endpoint jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text,0));
 if not exists(select 1 from organizations where id=p_organization_id and zernio_profile_id=p_profile_id) or
    (p_payload#>>'{account,profileId}' is not null and p_payload#>>'{account,profileId}'<>p_profile_id) or
    (p_payload#>>'{number,profileId}' is not null and p_payload#>>'{number,profileId}'<>p_profile_id) then
   return jsonb_build_object('error','Webhook tenant mapping mismatch');
 end if;
 if eid is null or et is null then raise exception 'Invalid event'; end if;
 if exists(select 1 from zernio_webhook_events where organization_id=p_organization_id and event_id=eid and payload<>p_payload) then
   return jsonb_build_object('error','Webhook event identifier reused with different content');
 end if;
 insert into zernio_webhook_events values(p_organization_id,eid,p_profile_id,p_payload,now()) on conflict do nothing;
 if not found then return jsonb_build_object('deduplicated',true); end if;
 clock:=coalesce((p_payload->>'statusAt')::timestamptz,(case when et in ('message.received','message.sent') then p_payload#>>'{message,sentAt}' end)::timestamptz,(p_payload->>'timestamp')::timestamptz,now());
 if et like 'message.%' then
   key:='message:'||coalesce(acc,'')||':'||(p_payload#>>'{message,id}')||':'||
     case when et in ('message.delivered','message.read','message.played','message.failed') then 'receipt' else 'content' end;
 elsif et like 'whatsapp.template.%' then
   key:='template:'||acc||':'||(p_payload#>>'{template,templateId}')||':'||et;
 elsif et like 'whatsapp.number.%' then key:='number:'||(p_payload#>>'{number,id}');
 elsif et like 'whatsapp.account.%' then key:='account:'||acc||':'||et;
 end if;
 if key is not null then
   insert into zernio_webhook_projection values(p_organization_id,key,et,clock,p_payload)
   on conflict(organization_id,resource_key) do update set event_type=excluded.event_type,event_at=excluded.event_at,payload=excluded.payload
   where excluded.event_at>zernio_webhook_projection.event_at or
    (excluded.event_at=zernio_webhook_projection.event_at and
     array_position(array['message.failed','message.delivered','message.read','message.played'],excluded.event_type)>
     coalesce(array_position(array['message.failed','message.delivered','message.read','message.played'],zernio_webhook_projection.event_type),0));
 end if;
 if et='account.connected' and acc is not null then
   if exists(select 1 from connected_accounts where zernio_account_id=acc and organization_id<>p_organization_id) then raise exception 'Account belongs to another tenant'; end if;
   insert into connected_accounts(organization_id,zernio_account_id,zernio_profile_id,platform,username,is_active,health_status,needs_reconnect)
   values(p_organization_id,acc,p_profile_id,coalesce(p_payload#>>'{account,platform}','unknown'),p_payload#>>'{account,username}',true,'healthy',false)
   on conflict(zernio_account_id) do update set is_active=true,health_status='healthy',needs_reconnect=false,updated_at=now();
 elsif et='account.disconnected' then
   update connected_accounts set is_active=false,health_status='disconnected',needs_reconnect=true,updated_at=now()
   where zernio_account_id=acc and organization_id=p_organization_id;
 elsif et in ('post.scheduled','post.published','post.partial','post.failed','post.cancelled','post.recycled') then
   update posts set status=coalesce(p_payload#>>'{post,status}',status),platforms=coalesce(p_payload#>'{post,platforms}','[]'::jsonb),
    published_at=coalesce((p_payload#>>'{post,publishedAt}')::timestamptz,published_at),updated_at=now()
    where zernio_post_id=p_payload#>>'{post,id}' and organization_id=p_organization_id;
 elsif et in ('support.run.completed','support.run.failed') then
   update ai_support_runs set status=coalesce(p_payload->>'status','completed'),answer=p_payload->>'answer',
    cost_usd=coalesce((p_payload->>'costUsd')::numeric,0),finished_at=now()
    where zernio_run_id=p_payload->>'runId' and organization_id=p_organization_id;
 end if;
 for endpoint in select value from jsonb_array_elements(p_endpoints) loop
   insert into zernio_webhook_outbox(organization_id,event_id,endpoint_id,url,secret,payload)
   values(p_organization_id,eid,endpoint->>'id',endpoint->>'url',endpoint->>'secret',jsonb_build_object(
    'id',eid,'event',et,'createdAt',coalesce(p_payload->>'timestamp',now()::text),'tenantId',p_organization_id,'data',p_payload));
 end loop;
 return jsonb_build_object('deduplicated',false);
end $$;

create function public.claim_zernio_webhook_outbox(p_token text,p_limit integer)
returns setof public.zernio_webhook_outbox language sql security invoker set search_path=public as $$
 update zernio_webhook_outbox set lease_token=p_token,lease_until=now()+interval '60 seconds',attempts=attempts+1
 where id in (select id from zernio_webhook_outbox where delivered_at is null and available_at<=now()
  and (lease_until is null or lease_until<now()) order by available_at limit least(25,greatest(1,p_limit)) for update skip locked)
 returning *;
$$;
create function public.finish_zernio_webhook_outbox(p_id uuid,p_token text,p_status integer,p_success boolean)
returns boolean language plpgsql security invoker set search_path=public as $$
begin
 update zernio_webhook_outbox set last_status=p_status,delivered_at=case when p_success then now() else null end,
  available_at=now()+make_interval(secs=>least(3600,30*power(2,least(attempts,7))::integer)),lease_token=null,lease_until=null
 where id=p_id and lease_token=p_token and delivered_at is null;
 return found;
end $$;
revoke all on function public.accept_zernio_webhook(uuid,text,jsonb,jsonb),public.claim_zernio_webhook_outbox(text,integer),public.finish_zernio_webhook_outbox(uuid,text,integer,boolean) from public,anon,authenticated;
grant execute on function public.accept_zernio_webhook(uuid,text,jsonb,jsonb),public.claim_zernio_webhook_outbox(text,integer),public.finish_zernio_webhook_outbox(uuid,text,integer,boolean) to service_role;
