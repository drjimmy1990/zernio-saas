-- Additive SaaS security, invitations and promotional provider-spending allowances.
-- Customer payments are unavailable. These records never represent collected cash.
begin;
create table public.saas_user_security (
 user_id uuid primary key references auth.users(id) on delete cascade,
 version integer not null default 1, revoked_before timestamptz, disabled boolean not null default false
);
create table public.saas_sessions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 organization_id uuid not null references public.organizations(id) on delete cascade,
 created_at timestamptz not null default now(), expires_at timestamptz not null, revoked_at timestamptz
);
create index saas_sessions_user on public.saas_sessions(user_id);
create table public.saas_signup_workspaces (
 user_id uuid primary key references auth.users(id) on delete cascade,
 organization_id uuid not null unique references public.organizations(id) on delete cascade
);
create table public.saas_invitations (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 email text not null, role text not null check(role in ('admin','editor','viewer')),
 token_hash text not null unique, invited_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(), expires_at timestamptz not null,
 accepted_at timestamptz, accepted_by uuid references auth.users(id), revoked_at timestamptz
);
create table public.saas_api_keys (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 created_by uuid not null references auth.users(id), name text not null, prefix text not null,
 token_hash text not null unique, scopes text[] not null, created_at timestamptz not null default now(),
 expires_at timestamptz not null, revoked_at timestamptz
);
create table public.saas_audit (
 id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete set null,
 actor_id text not null, action text not null, resource text not null,
 before_data jsonb, after_data jsonb, created_at timestamptz not null default now()
);
create table public.saas_auth_limits (key text primary key, window_at timestamptz not null, attempts integer not null);
create table public.saas_spending_limits (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 capability text not null check(capability in ('phone_purchase','phone_rental','sms_send','voice_call','whatsapp_send','campaign_send')),
 enabled boolean not null default false, unit_ceiling_minor bigint check(unit_ceiling_minor > 0),
 max_units_per_operation integer check(max_units_per_operation > 0), primary key(organization_id,capability)
);
create table public.saas_allowances (
 organization_id uuid primary key references public.organizations(id) on delete cascade,
 currency text not null default 'USD' check(currency='USD'), available_minor bigint not null default 0 check(available_minor>=0),
 reserved_minor bigint not null default 0 check(reserved_minor>=0), spent_minor bigint not null default 0 check(spent_minor>=0),
 overrun_minor bigint not null default 0 check(overrun_minor>=0)
);
create table public.saas_allowance_reservations (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 capability text not null, operation_key text not null, amount_minor bigint not null check(amount_minor>=0),
 quote_source text not null, provider_resource_id text, units integer, intent_fingerprint text,
 state text not null default 'reserved' check(state in('reserved','settled','released')),
 actual_minor bigint, provider_reference text, evidence jsonb, release_reason text,
 created_at timestamptz not null default now(), finished_at timestamptz,
 unique(organization_id,capability,operation_key)
);
create table public.saas_allowance_ledger (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 kind text not null check(kind in('admin_grant','reserve','settle','release')),
 amount_minor bigint not null check(amount_minor>=0), currency text not null default 'USD' check(currency='USD'),
 reservation_id uuid references public.saas_allowance_reservations(id), operation_key text not null,
 actor_id text not null, reason text not null, evidence jsonb, created_at timestamptz not null default now(),
 unique(organization_id,kind,operation_key)
);

-- Private security/accounting tables are only accessed through service-role orchestration.
do $$ declare tab text; begin
 foreach tab in array array['saas_user_security','saas_sessions','saas_signup_workspaces','saas_invitations','saas_api_keys','saas_audit','saas_auth_limits','saas_spending_limits','saas_allowances','saas_allowance_reservations','saas_allowance_ledger'] loop
 execute format('alter table public.%I enable row level security',tab);
 execute format('revoke all on public.%I from public,anon,authenticated',tab);
 execute format('grant select,insert,update,delete on public.%I to service_role',tab);
 end loop;
end $$;

create function public.saas_require_manager(p_org uuid,p_actor uuid,p_owner_only boolean default false)
returns text language plpgsql security definer set search_path=public as $$
declare actor_role text; begin
 select m.role into actor_role from org_members m join organizations o on o.id=m.organization_id
 where m.organization_id=p_org and m.user_id=p_actor and o.status='active';
 if actor_role is null or (p_owner_only and actor_role<>'owner') or (not p_owner_only and actor_role not in('owner','admin')) then raise exception 'Workspace management is not permitted'; end if;
 return actor_role;
end $$;

create function public.saas_provision_signup(p_user_id uuid,p_name text)
returns uuid language plpgsql security definer set search_path=public as $$
declare org uuid; begin
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
 if exists(select 1 from saas_user_security where user_id=p_user_id and disabled) then raise exception 'Disabled account';end if;
 select organization_id into org from saas_signup_workspaces where user_id=p_user_id;
 if org is not null then return org; end if;
 select organization_id into org from org_members where user_id=p_user_id order by created_at limit 1;
 if org is not null then return org; end if;
 org:=gen_random_uuid();
 insert into organizations(id,name,slug,plan_key,status) values(org,left(p_name,160),'workspace-'||org::text,'starter','active');
 insert into org_members(organization_id,user_id,role) values(org,p_user_id,'owner');
 insert into saas_signup_workspaces values(p_user_id,org);
 insert into saas_user_security(user_id) values(p_user_id) on conflict do nothing;
 insert into saas_audit(organization_id,actor_id,action,resource,after_data) values(org,p_user_id::text,'signup','organization',jsonb_build_object('plan','starter'));
 return org;
end $$;

create function public.saas_issue_session(p_user_id uuid,p_org uuid,p_expires_at timestamptz)
returns jsonb language plpgsql security definer set search_path=public as $$
declare security saas_user_security; session_id uuid; begin
 perform pg_advisory_xact_lock(hashtextextended(p_org::text,1));
 insert into saas_user_security(user_id) values(p_user_id) on conflict do nothing;
 select * into security from saas_user_security where user_id=p_user_id for update;
 if security.disabled or not exists(select 1 from org_members m join organizations o on o.id=m.organization_id where m.user_id=p_user_id and m.organization_id=p_org and o.status='active') then raise exception 'Session access unavailable'; end if;
 insert into saas_sessions(user_id,organization_id,expires_at) values(p_user_id,p_org,p_expires_at) returning id into session_id;
 return jsonb_build_object('sessionId',session_id,'securityVersion',security.version);
end $$;

create function public.saas_revoke_sessions(p_user_id uuid,p_session_id uuid default null)
returns boolean language plpgsql security definer set search_path=public as $$ begin
 if p_session_id is null then
 insert into saas_user_security(user_id,version,revoked_before) values(p_user_id,2,now()) on conflict(user_id) do update set version=saas_user_security.version+1,revoked_before=now();
 update saas_sessions set revoked_at=now() where user_id=p_user_id and revoked_at is null;
 else update saas_sessions set revoked_at=now() where user_id=p_user_id and id=p_session_id; end if;
 return true;
end $$;

create function public.saas_recover_access(p_user_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$ begin
 perform saas_revoke_sessions(p_user_id,null);
 update saas_api_keys set revoked_at=now() where created_by=p_user_id and revoked_at is null;
 insert into saas_audit(actor_id,action,resource) values(p_user_id::text,'password_recovery_revoke',p_user_id::text);
 return true;
end $$;

create function public.saas_auth_throttle(p_key text,p_limit integer default 8)
returns boolean language plpgsql security definer set search_path=public as $$
declare used integer; begin
 insert into saas_auth_limits values(p_key,now(),1) on conflict(key) do update
 set attempts=case when saas_auth_limits.window_at<now()-interval '15 minutes' then 1 else saas_auth_limits.attempts+1 end,
 window_at=case when saas_auth_limits.window_at<now()-interval '15 minutes' then now() else saas_auth_limits.window_at end returning attempts into used;
 return used<=p_limit;
end $$;

create function public.saas_change_member(p_org uuid,p_actor uuid,p_user uuid,p_role text)
returns boolean language plpgsql security definer set search_path=public as $$
declare old_role text; begin
 perform pg_advisory_xact_lock(hashtextextended(p_org::text,1));
 perform saas_require_manager(p_org,p_actor,true);
 if p_role is not null and p_role not in('owner','admin','editor','viewer') then raise exception 'Invalid member role'; end if;
 select role into old_role from org_members where organization_id=p_org and user_id=p_user for update;
 if old_role is null then raise exception 'Member not found'; end if;
 if old_role='owner' and p_role is distinct from 'owner' and (select count(*) from org_members where organization_id=p_org and role='owner')<=1 then raise exception 'Keep at least one workspace owner'; end if;
 if p_role is null then delete from org_members where organization_id=p_org and user_id=p_user;
 else update org_members set role=p_role where organization_id=p_org and user_id=p_user; end if;
 update saas_sessions set revoked_at=now() where organization_id=p_org and user_id=p_user;
 update saas_api_keys set revoked_at=now() where organization_id=p_org and created_by=p_user and revoked_at is null;
 insert into saas_audit(organization_id,actor_id,action,resource,before_data,after_data) values(p_org,p_actor::text,'member_change',p_user::text,to_jsonb(old_role),to_jsonb(p_role));
 return true;
end $$;

create function public.saas_accept_invitation(p_user uuid,p_email text,p_token_hash text)
returns uuid language plpgsql security definer set search_path=public as $$
declare invite saas_invitations; begin
 select * into invite from saas_invitations where token_hash=p_token_hash for update;
 if invite.id is null or invite.email<>lower(p_email) or invite.expires_at<=now() or invite.revoked_at is not null or invite.accepted_at is not null then raise exception 'Invitation unavailable'; end if;
 perform pg_advisory_xact_lock(hashtextextended(invite.organization_id::text,1));
 perform saas_require_manager(invite.organization_id,invite.invited_by);
 insert into org_members(organization_id,user_id,role) values(invite.organization_id,p_user,invite.role) on conflict do nothing;
 update saas_invitations set accepted_at=now(),accepted_by=p_user where id=invite.id;
 insert into saas_audit(organization_id,actor_id,action,resource,after_data) values(invite.organization_id,p_user::text,'invitation_accept',invite.id::text,jsonb_build_object('role',invite.role));
 return invite.organization_id;
end $$;

create function public.saas_spending_capability(p_organization_id uuid,p_capability text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare lim saas_spending_limits; begin
 if not exists(select 1 from organizations where id=p_organization_id and status='active') then return jsonb_build_object('error_code','workspace_unavailable','status',403); end if;
 select * into lim from saas_spending_limits where organization_id=p_organization_id and capability=p_capability;
 if lim.enabled is distinct from true then return jsonb_build_object('error_code','spending_disabled','status',403,'message','This provider spending capability has not been approved.'); end if;
 return jsonb_build_object('enabled',true,'unitCeilingMinor',lim.unit_ceiling_minor,'maxUnitsPerOperation',lim.max_units_per_operation);
end $$;

create function public.saas_reserve_allowance(p_organization_id uuid,p_capability text,p_operation_key text,p_amount_minor bigint,p_quote_source text,p_provider_resource_id text,p_units integer,p_intent_fingerprint text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare item saas_allowance_reservations; lim saas_spending_limits; amount bigint; capability_result jsonb; message_limit bigint; used_units bigint; begin
 perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text,2));
 select * into item from saas_allowance_reservations where organization_id=p_organization_id and capability=p_capability and operation_key=p_operation_key;
 if item.id is not null then
 if item.quote_source<>p_quote_source or item.provider_resource_id is distinct from p_provider_resource_id or item.units is distinct from p_units or item.intent_fingerprint is distinct from p_intent_fingerprint or (p_units is null and item.amount_minor is distinct from p_amount_minor) then return jsonb_build_object('error_code','allowance_intent_conflict','status',409); end if;
 return jsonb_build_object('reservationId',item.id,'state',item.state,'amountMinor',item.amount_minor,'currency','USD','quoteSource',item.quote_source,'replayed',true);
 end if;
 capability_result:=saas_spending_capability(p_organization_id,p_capability); if capability_result ? 'error_code' then return capability_result; end if;
 -- Count attempted message units, including uncertain operations, in the UTC month.
 -- This uses the same organization lock as spending reservations, so parallel sends
 -- cannot both consume the last permitted unit. Released no-charge attempts are excluded.
 if p_capability in ('whatsapp_send','campaign_send','sms_send') then
   select coalesce(v.custom_max_monthly_messages,p.max_monthly_messages) into message_limit
   from organizations o join subscription_plan_templates p on p.plan_key=o.plan_key
   left join org_feature_overrides v on v.organization_id=o.id
   where o.id=p_organization_id and p.is_active=true;
   if message_limit is null or message_limit<0 then return jsonb_build_object('error_code','message_policy_unavailable','status',403); end if;
   select coalesce(sum(coalesce(units,1)),0) into used_units from saas_allowance_reservations
   where organization_id=p_organization_id and capability in ('whatsapp_send','campaign_send','sms_send')
     and state<>'released' and created_at >= date_trunc('month',now() at time zone 'UTC') at time zone 'UTC';
   if used_units+coalesce(p_units,1)>message_limit then return jsonb_build_object('error_code','monthly_message_limit','status',409,'message','The workspace monthly message limit has been reached.'); end if;
 end if;
 select * into lim from saas_spending_limits where organization_id=p_organization_id and capability=p_capability;
 if p_units is not null then
 if p_units<1 or lim.unit_ceiling_minor is null or lim.max_units_per_operation is null or p_units>lim.max_units_per_operation then return jsonb_build_object('error_code','spending_units_not_approved','status',409,'message','Approve a per-unit ceiling and explicit maximum unit count before sending.'); end if;
 amount:=p_units::bigint*lim.unit_ceiling_minor;
 else amount:=p_amount_minor; end if;
 if amount is null or amount<0 or amount>9007199254740991 or coalesce(length(p_operation_key),0)=0 or coalesce(length(p_quote_source),0)=0 then return jsonb_build_object('error_code','invalid_allowance','status',400); end if;
 insert into saas_allowances(organization_id) values(p_organization_id) on conflict do nothing;
 update saas_allowances set available_minor=available_minor-amount,reserved_minor=reserved_minor+amount where organization_id=p_organization_id and available_minor>=amount;
 if not found then return jsonb_build_object('error_code','allowance_exhausted','status',409,'message','The approved provider-spending allowance is insufficient.'); end if;
 insert into saas_allowance_reservations(organization_id,capability,operation_key,amount_minor,quote_source,provider_resource_id,units,intent_fingerprint) values(p_organization_id,p_capability,p_operation_key,amount,p_quote_source,p_provider_resource_id,p_units,p_intent_fingerprint) returning * into item;
 insert into saas_allowance_ledger(organization_id,kind,amount_minor,reservation_id,operation_key,actor_id,reason) values(p_organization_id,'reserve',amount,item.id,p_operation_key,'system',p_quote_source);
 return jsonb_build_object('reservationId',item.id,'state',item.state,'amountMinor',amount,'currency','USD','quoteSource',p_quote_source,'replayed',false);
end $$;

create function public.saas_finish_allowance(p_organization_id uuid,p_reservation_id uuid,p_actual_minor bigint,p_provider_reference text,p_evidence jsonb,p_release_reason text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare item saas_allowance_reservations; amount bigint; begin
 perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text,2));
 select * into item from saas_allowance_reservations where id=p_reservation_id and organization_id=p_organization_id for update;
 if item.id is null then return jsonb_build_object('error_code','reservation_not_found','status',404); end if;
 if p_evidence is null or jsonb_typeof(p_evidence)<>'object' or p_evidence='{}'::jsonb then return jsonb_build_object('error_code','provider_evidence_required','status',400); end if;
 if item.state<>'reserved' then
 if item.evidence=p_evidence and ((item.state='settled' and item.actual_minor is not distinct from p_actual_minor and item.provider_reference is not distinct from p_provider_reference and p_release_reason is null) or (item.state='released' and item.release_reason=p_release_reason and p_actual_minor is null)) then return jsonb_build_object('state',item.state,'replayed',true); end if;
 return jsonb_build_object('error_code','reservation_finish_conflict','status',409); end if;
 if p_release_reason is not null then
 if length(trim(p_release_reason))=0 then return jsonb_build_object('error_code','release_reason_required','status',400);end if;
 update saas_allowances set available_minor=available_minor+item.amount_minor,reserved_minor=reserved_minor-item.amount_minor where organization_id=p_organization_id;
 update saas_allowance_reservations set state='released',evidence=p_evidence,release_reason=p_release_reason,finished_at=now() where id=item.id;
 insert into saas_allowance_ledger(organization_id,kind,amount_minor,reservation_id,operation_key,actor_id,reason,evidence) values(p_organization_id,'release',item.amount_minor,item.id,item.operation_key,'system',p_release_reason,p_evidence);
 return jsonb_build_object('state','released','replayed',false);
 end if;
 amount:=p_actual_minor;
 if amount is null or amount<0 or amount>9007199254740991 or coalesce(length(p_provider_reference),0)=0 then return jsonb_build_object('error_code','invalid_settlement','status',400); end if;
 update saas_allowances set overrun_minor=overrun_minor+greatest(0,amount-item.amount_minor-available_minor),available_minor=greatest(0,available_minor+item.amount_minor-amount),reserved_minor=reserved_minor-item.amount_minor,spent_minor=spent_minor+amount where organization_id=p_organization_id;
 update saas_allowance_reservations set state='settled',actual_minor=amount,provider_reference=p_provider_reference,evidence=p_evidence,finished_at=now() where id=item.id;
 insert into saas_allowance_ledger(organization_id,kind,amount_minor,reservation_id,operation_key,actor_id,reason,evidence) values(p_organization_id,'settle',amount,item.id,item.operation_key,'system',p_provider_reference,p_evidence);
 -- Actual cost can exceed a ceiling: keep the evidence, disable spending for manual review.
 if amount>item.amount_minor then update saas_spending_limits set enabled=false where organization_id=p_organization_id; end if;
 return jsonb_build_object('state','settled','replayed',false,'exceededReservation',amount>item.amount_minor);
end $$;

create function public.saas_grant_allowance(p_organization_id uuid,p_actor_id text,p_amount_minor bigint,p_operation_key text,p_reason text)
returns jsonb language plpgsql security definer set search_path=public as $$ begin
 if p_actor_id<>'usr_super_admin' then raise exception 'Platform administrator allocation required'; end if;
 if p_amount_minor<0 or p_amount_minor>9007199254740991 or coalesce(length(p_reason),0)=0 then raise exception 'Invalid promotional allocation'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text,2));
 if exists(select 1 from saas_allowance_ledger where organization_id=p_organization_id and kind='admin_grant' and operation_key=p_operation_key) then
 if not exists(select 1 from saas_allowance_ledger where organization_id=p_organization_id and kind='admin_grant' and operation_key=p_operation_key and amount_minor=p_amount_minor and reason=p_reason) then raise exception 'Allocation intent conflict'; end if;
 return jsonb_build_object('replayed',true); end if;
 insert into saas_allowances(organization_id,available_minor) values(p_organization_id,p_amount_minor) on conflict(organization_id) do update set available_minor=saas_allowances.available_minor+p_amount_minor;
 insert into saas_allowance_ledger(organization_id,kind,amount_minor,operation_key,actor_id,reason) values(p_organization_id,'admin_grant',p_amount_minor,p_operation_key,p_actor_id,p_reason);
 insert into saas_audit(organization_id,actor_id,action,resource,after_data) values(p_organization_id,p_actor_id,'allowance_grant',p_operation_key,jsonb_build_object('amountMinor',p_amount_minor,'reason',p_reason));
 return jsonb_build_object('replayed',false);
end $$;

create function public.saas_resolve_api_key(p_hash text,p_scope text default null)
returns jsonb language plpgsql security definer set search_path=public as $$ declare k saas_api_keys; r text; begin
 select * into k from saas_api_keys where token_hash=p_hash and revoked_at is null and expires_at>now();
 if not found then return jsonb_build_object('error_code','invalid_key','status',401,'message','Invalid or expired API key.'); end if;
 select m.role into r from org_members m join organizations o on o.id=m.organization_id where m.organization_id=k.organization_id and m.user_id=k.created_by and o.status='active';
 if r is null or exists(select 1 from saas_user_security where user_id=k.created_by and disabled) then return jsonb_build_object('error_code','revoked_access','status',403,'message','API key issuer no longer has workspace access.'); end if;
 if p_scope is not null and (not p_scope=any(k.scopes) or (p_scope='write' and r='viewer')) then return jsonb_build_object('error_code','key_scope','status',403,'message','API key scope or current role does not permit this action.'); end if;
 return jsonb_build_object('organizationId',k.organization_id,'userId',k.created_by,'role',r,'scopes',k.scopes,'keyId',k.id);
end $$;

create function public.saas_create_api_key(p_organization_id uuid,p_actor_id uuid,p_name text,p_scopes text[],p_expires_at timestamptz,p_prefix text,p_hash text)
returns jsonb language plpgsql security definer set search_path=public as $$ declare k saas_api_keys; begin
 perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text,1));
 perform saas_require_manager(p_organization_id,p_actor_id);
 if not p_scopes<@array['read','write']::text[] or cardinality(p_scopes)=0 or p_expires_at<=now() or p_expires_at>now()+interval '366 days' then raise exception 'Invalid API key configuration'; end if;
 insert into saas_api_keys(organization_id,created_by,name,prefix,token_hash,scopes,expires_at) values(p_organization_id,p_actor_id,p_name,p_prefix,p_hash,p_scopes,p_expires_at) returning * into k;
 insert into saas_audit(organization_id,actor_id,action,resource,after_data) values(p_organization_id,p_actor_id::text,'api_key_create',k.id::text,jsonb_build_object('name',p_name,'scopes',p_scopes,'expiresAt',p_expires_at));
 return to_jsonb(k)-'token_hash';
end $$;

create function public.saas_revoke_api_key(p_organization_id uuid,p_actor_id uuid,p_key_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$ begin
 perform saas_require_manager(p_organization_id,p_actor_id);
 update saas_api_keys set revoked_at=coalesce(revoked_at,now()) where id=p_key_id and organization_id=p_organization_id;
 if not found then raise exception 'API key not found in workspace'; end if;
 insert into saas_audit(organization_id,actor_id,action,resource) values(p_organization_id,p_actor_id::text,'api_key_revoke',p_key_id::text); return true;
end $$;

create function public.saas_invite_member(p_organization_id uuid,p_actor_id uuid,p_email text,p_role text,p_hash text)
returns jsonb language plpgsql security definer set search_path=public as $$ declare v saas_invitations; begin
 perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text,1));
 perform saas_require_manager(p_organization_id,p_actor_id);
 if p_role not in ('admin','editor','viewer') or length(p_email)>254 or p_email !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$' then raise exception 'Invalid invitation'; end if;
 update saas_invitations set revoked_at=now() where organization_id=p_organization_id and email=lower(p_email) and accepted_at is null and revoked_at is null;
 insert into saas_invitations(organization_id,email,role,token_hash,invited_by,expires_at) values(p_organization_id,lower(p_email),p_role,p_hash,p_actor_id,now()+interval '7 days') returning * into v;
 insert into saas_audit(organization_id,actor_id,action,resource,after_data) values(p_organization_id,p_actor_id::text,'invitation_create',v.id::text,jsonb_build_object('email',v.email,'role',v.role)); return to_jsonb(v)-'token_hash';
end $$;

create function public.saas_revoke_invitation(p_organization_id uuid,p_actor_id uuid,p_invitation_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$ begin
 perform saas_require_manager(p_organization_id,p_actor_id);
 update saas_invitations set revoked_at=coalesce(revoked_at,now()) where id=p_invitation_id and organization_id=p_organization_id and accepted_at is null;
 if not found then raise exception 'Invitation not found or already accepted'; end if;
 insert into saas_audit(organization_id,actor_id,action,resource) values(p_organization_id,p_actor_id::text,'invitation_revoke',p_invitation_id::text); return true;
end $$;

create function public.saas_configure_spending(p_organization_id uuid,p_actor_id text,p_capability text,p_enabled boolean,p_unit_ceiling_minor bigint,p_max_units integer,p_reason text)
returns jsonb language plpgsql security definer set search_path=public as $$ declare v saas_spending_limits; begin
 if p_actor_id<>'usr_super_admin' or coalesce(length(p_reason),0)=0 then raise exception 'Administrator and allocation reason required'; end if;
 if p_enabled and p_capability in ('campaign_send','whatsapp_send') and (p_unit_ceiling_minor is null or p_max_units is null) then raise exception 'Message spending requires an approved unit ceiling and maximum'; end if;
 insert into saas_spending_limits(organization_id,capability,enabled,unit_ceiling_minor,max_units_per_operation) values(p_organization_id,p_capability,p_enabled,p_unit_ceiling_minor,p_max_units) on conflict(organization_id,capability) do update set enabled=excluded.enabled,unit_ceiling_minor=excluded.unit_ceiling_minor,max_units_per_operation=excluded.max_units_per_operation returning * into v;
 insert into saas_audit(organization_id,actor_id,action,resource,after_data) values(p_organization_id,p_actor_id,'spending_configure',p_capability,to_jsonb(v)||jsonb_build_object('reason',p_reason)); return to_jsonb(v);
end $$;

-- Server-managed entitlement, credential and delivery records must not be directly writable by members.
create function public.saas_admin_patch(p_kind text,p_resource text,p_patch jsonb,p_actor_id text)
returns jsonb language plpgsql security definer set search_path=public as $$ declare previous jsonb; updated jsonb; r record; ov org_feature_overrides; begin
 if p_actor_id<>'usr_super_admin' or jsonb_typeof(p_patch)<>'object' then raise exception 'Administrator settings denied'; end if;
 if p_kind='global' then
  select to_jsonb(g) into previous from platform_global_config g where id=1 for update;
  if previous is null then raise exception 'Global policy missing'; end if;
  r=jsonb_populate_record(null::platform_global_config,previous||p_patch);
  update platform_global_config set brand_name=r.brand_name,brand_logo_url=r.brand_logo_url,brand_primary_color=r.brand_primary_color,enforce_headless_oauth=r.enforce_headless_oauth,enabled_platforms=r.enabled_platforms,enabled_ad_platforms=r.enabled_ad_platforms,enabled_oauth_scopes=r.enabled_oauth_scopes,enabled_subservices=r.enabled_subservices,default_max_support_cost_usd=r.default_max_support_cost_usd,updated_at=now() where id=1 returning to_jsonb(platform_global_config.*) into updated;
 elsif p_kind='plan' then
  select to_jsonb(p) into previous from subscription_plan_templates p where plan_key=p_resource for update;
  if previous is null then raise exception 'Unknown plan'; end if;
  r=jsonb_populate_record(null::subscription_plan_templates,previous||p_patch);
  update subscription_plan_templates set display_name=r.display_name,monthly_price_usd=r.monthly_price_usd,enabled_subservices=r.enabled_subservices,allowed_platforms=r.allowed_platforms,allowed_ad_platforms=r.allowed_ad_platforms,allowed_oauth_scopes=r.allowed_oauth_scopes,disabled_zernio_resource_groups=r.disabled_zernio_resource_groups,max_connected_accounts=r.max_connected_accounts,max_monthly_posts=r.max_monthly_posts,max_monthly_messages=r.max_monthly_messages,max_managed_ads=r.max_managed_ads,max_phone_numbers=r.max_phone_numbers,max_ai_support_usd=r.max_ai_support_usd,max_x_api_spend_usd=r.max_x_api_spend_usd,updated_at=now() where plan_key=p_resource returning to_jsonb(subscription_plan_templates.*) into updated;
 elsif p_kind='tenant' then
  perform pg_advisory_xact_lock(hashtextextended(p_resource,2));
  perform pg_advisory_xact_lock(hashtextextended(p_resource,1));
  select to_jsonb(o) into previous from organizations o where id=p_resource::uuid for update;
  if previous is null then raise exception 'Unknown workspace'; end if;
  r=jsonb_populate_record(null::organizations,previous||p_patch);
  update organizations set plan_key=r.plan_key,status=r.status,white_label_config=coalesce(previous->'white_label_config','{}'::jsonb)||coalesce(p_patch->'white_label_config','{}'::jsonb),updated_at=now() where id=p_resource::uuid returning to_jsonb(organizations.*) into updated;
  insert into org_feature_overrides(organization_id) values(p_resource::uuid) on conflict do nothing;
  select * into ov from org_feature_overrides where organization_id=p_resource::uuid for update;
  ov=jsonb_populate_record(ov,p_patch);
  update org_feature_overrides set force_headless_mode=ov.force_headless_mode,custom_enabled_subservices=ov.custom_enabled_subservices,custom_allowed_platforms=ov.custom_allowed_platforms,custom_allowed_ad_platforms=ov.custom_allowed_ad_platforms,custom_allowed_oauth_scopes=ov.custom_allowed_oauth_scopes,custom_disabled_resource_groups=ov.custom_disabled_resource_groups,custom_max_connected_accounts=ov.custom_max_connected_accounts,custom_max_monthly_posts=ov.custom_max_monthly_posts,custom_max_monthly_messages=ov.custom_max_monthly_messages,custom_max_managed_ads=ov.custom_max_managed_ads,custom_max_phone_numbers=ov.custom_max_phone_numbers,custom_max_ai_support_usd=ov.custom_max_ai_support_usd,custom_max_x_api_spend_usd=ov.custom_max_x_api_spend_usd,updated_at=now() where organization_id=p_resource::uuid;
  updated=updated||jsonb_build_object('override',to_jsonb(ov));
  if r.status<>'active' then update saas_sessions set revoked_at=now() where organization_id=p_resource::uuid and revoked_at is null;update saas_api_keys set revoked_at=now() where organization_id=p_resource::uuid and revoked_at is null; end if;
 else raise exception 'Unknown settings group'; end if;
 insert into saas_audit(actor_id,action,resource,before_data,after_data) values(p_actor_id,'admin_patch_'||p_kind,p_resource,previous,updated);
 return updated;
end $$;
create function public.saas_admin_create_workspace(p_name text,p_plan_key text,p_branding jsonb,p_actor_id text)
returns jsonb language plpgsql security definer set search_path=public as $$ declare v organizations;begin
 if p_actor_id<>'usr_super_admin' or length(trim(p_name)) not between 1 and 160 or not exists(select 1 from subscription_plan_templates where plan_key=p_plan_key and is_active) then raise exception 'Invalid administrator workspace creation';end if;
 insert into organizations(name,slug,plan_key,white_label_config)values(trim(p_name),'workspace-'||gen_random_uuid()::text,p_plan_key,p_branding) returning * into v;
 insert into saas_audit(organization_id,actor_id,action,resource,after_data)values(v.id,p_actor_id,'admin_workspace_create',v.id::text,to_jsonb(v));return to_jsonb(v);
end$$;
create function public.saas_archive_workspace(p_organization_id uuid,p_actor_id text)
returns boolean language plpgsql security definer set search_path=public as $$ begin
 if p_actor_id<>'usr_super_admin' then raise exception 'Administrator required'; end if;
 perform saas_admin_patch('tenant',p_organization_id::text,jsonb_build_object('status','Archived'),p_actor_id);return true;
end $$;

drop policy if exists "Anyone authenticated can read global config" on public.platform_global_config;
revoke all on public.platform_global_config from anon,authenticated;
revoke insert,update,delete on public.organizations,public.org_members,public.org_feature_overrides,public.subscription_plan_templates,public.connected_accounts,public.phone_numbers,public.tenant_usage_snapshots,public.admin_audit_logs from anon,authenticated;

create function public.saas_member_read(p_organization_id uuid)
returns boolean language sql security definer stable set search_path=public as $$
 select exists(select 1 from org_members m join organizations o on o.id=m.organization_id where m.organization_id=p_organization_id and m.user_id=auth.uid() and o.status='active');
$$;
create function public.saas_member_write(p_organization_id uuid)
returns boolean language sql security definer stable set search_path=public as $$
 select exists(select 1 from org_members m join organizations o on o.id=m.organization_id where m.organization_id=p_organization_id and m.user_id=auth.uid() and m.role in ('owner','admin','editor') and o.status='active');
$$;
do $$ declare t text; p record; begin
 for t in select unnest(array['connected_accounts','account_groups','posts','queue_schedules','inbox_conversations','inbox_messages','growth_automations','analytics_dashboard_cache','ad_campaigns','phone_numbers','commerce_stores','ai_support_runs']) loop
 for p in select policyname from pg_policies where schemaname='public' and tablename=t loop execute format('drop policy %I on public.%I',p.policyname,t); end loop;
 execute format('create policy saas_scoped_read on public.%I for select to authenticated using (public.saas_member_read(organization_id))',t);
 -- Direct writes to delivery/account/paid/automation records bypass service validation. Server only.
 revoke insert,update,delete on public.connected_accounts,public.inbox_messages,public.inbox_conversations,public.growth_automations,public.ad_campaigns,public.phone_numbers,public.commerce_stores,public.ai_support_runs from authenticated;
 if t in ('account_groups','posts','queue_schedules') then execute format('create policy saas_scoped_write on public.%I for all to authenticated using (public.saas_member_write(organization_id)) with check (public.saas_member_write(organization_id))',t); end if;
 end loop;
end $$;

-- Revoke function EXECUTE's default PUBLIC grant, including helpers used inside RPCs.
do $$ declare fn record; begin
 for fn in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'saas_%' loop
 execute format('revoke all on function %s from public,anon,authenticated',fn.signature);
 execute format('grant execute on function %s to service_role',fn.signature);
 end loop;
end $$;
grant execute on function public.saas_member_read(uuid),public.saas_member_write(uuid) to authenticated;
commit;
