-- Additive manual CRM. Existing contacts/provider references/channels are retained.
begin;
alter table public.contacts add column if not exists company text not null default '';
alter table public.contacts add column if not exists phones text[] not null default '{}';
alter table public.contacts add column if not exists emails text[] not null default '{}';
alter table public.contacts add column if not exists identities jsonb not null default '[]';
alter table public.contacts add column if not exists notes jsonb not null default '[]';
alter table public.contacts add column if not exists consents jsonb not null default '[]';
alter table public.contacts add column if not exists inbox_links jsonb not null default '[]';
alter table public.contacts add column if not exists status text not null default 'lead';
alter table public.contacts add column if not exists owner_user_id uuid references auth.users(id) on delete set null;
alter table public.contacts add column if not exists do_not_contact boolean not null default false;
alter table public.contacts add column if not exists archived_at timestamptz;
alter table public.contacts add column if not exists revision bigint not null default 1;
alter table public.contacts add column if not exists duplicate_reviewed boolean not null default false;
-- Normalize only recognizable values. Do not discard pre-existing unconventional data.
update public.contacts set phones=array[regexp_replace(phone,'[\s().-]','','g')] where cardinality(phones)=0 and regexp_replace(phone,'[\s().-]','','g') ~ '^\+[1-9][0-9]{7,14}$';
update public.contacts set emails=array[lower(trim(email))] where cardinality(emails)=0 and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$';
create index if not exists crm_contacts_org_updated on public.contacts(organization_id,updated_at desc,id);
create index if not exists crm_contacts_phones on public.contacts using gin(phones);
create index if not exists crm_contacts_emails on public.contacts using gin(emails);
create index if not exists crm_contacts_tags on public.contacts using gin(tags);
create table if not exists public.crm_fields(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,name text not null,kind text not null check(kind in('text','number','boolean','date','select')),options text[] not null default '{}',archived_at timestamptz,created_at timestamptz not null default now(),unique(organization_id,name),check(length(name) between 1 and 100),check(cardinality(options)<=50));
create table if not exists public.crm_audiences(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,name text not null,contact_ids uuid[] not null,created_at timestamptz not null default now(),check(length(name) between 1 and 100),check(cardinality(contact_ids) between 1 and 1000));
create table if not exists public.crm_import_runs(organization_id uuid not null references public.organizations(id) on delete cascade,user_id uuid not null references auth.users(id),intent_key text not null,fingerprint text not null,result jsonb not null,created_at timestamptz not null default now(),primary key(organization_id,intent_key));

create or replace function public.crm_role(p_org uuid) returns text language sql stable security definer set search_path=public,pg_temp as $$select m.role from public.org_members m join public.organizations o on o.id=m.organization_id where m.organization_id=p_org and m.user_id=auth.uid() and o.status='active'$$;
revoke all on function public.crm_role(uuid) from public,anon;
grant execute on function public.crm_role(uuid) to authenticated,service_role;
drop policy if exists "Tenant members or super admin access contacts" on public.contacts;
create policy crm_contacts_read on public.contacts for select to authenticated using(public.crm_role(organization_id) in('owner','admin','editor','viewer'));
create policy crm_contacts_insert on public.contacts for insert to authenticated with check(public.crm_role(organization_id) in('owner','admin','editor'));
create policy crm_contacts_update on public.contacts for update to authenticated using(public.crm_role(organization_id) in('owner','admin','editor')) with check(public.crm_role(organization_id) in('owner','admin','editor'));
create policy crm_contacts_delete on public.contacts for delete to authenticated using(public.crm_role(organization_id) in('owner','admin') and archived_at is not null);
alter table public.crm_fields enable row level security;
alter table public.crm_audiences enable row level security;
alter table public.crm_import_runs enable row level security;
create policy crm_fields_read on public.crm_fields for select to authenticated using(public.crm_role(organization_id) in('owner','admin','editor','viewer'));
create policy crm_fields_write on public.crm_fields for all to authenticated using(public.crm_role(organization_id) in('owner','admin')) with check(public.crm_role(organization_id) in('owner','admin'));
create policy crm_audiences_read on public.crm_audiences for select to authenticated using(public.crm_role(organization_id) in('owner','admin','editor','viewer'));
create policy crm_audiences_write on public.crm_audiences for all to authenticated using(public.crm_role(organization_id) in('owner','admin','editor')) with check(public.crm_role(organization_id) in('owner','admin','editor'));
grant select,insert,update,delete on public.contacts,public.crm_fields,public.crm_audiences to authenticated;
grant all on public.contacts,public.crm_fields,public.crm_audiences,public.crm_import_runs to service_role;
revoke all on public.crm_import_runs from anon,authenticated;

create or replace function public.crm_guard_contact() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare item jsonb; field public.crm_fields; previous jsonb; k text; begin
 if TG_OP='UPDATE' and (new.id<>old.id or new.organization_id<>old.organization_id or new.zernio_contact_id is distinct from old.zernio_contact_id) then raise exception 'CRM identity is immutable' using errcode='23514';end if;
 perform pg_advisory_xact_lock(hashtextextended(new.organization_id::text,606));
 if new.status not in('lead','customer','inactive') or length(coalesce(new.display_name,''))>200 or length(new.company)>200 or cardinality(new.phones)>20 or cardinality(new.emails)>20 or cardinality(new.tags)>50 then raise exception 'Invalid contact fields' using errcode='23514';end if;
 if exists(select 1 from unnest(new.phones)p where p !~ '^\+[1-9][0-9]{7,14}$') or exists(select 1 from unnest(new.emails)e where e !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$') then raise exception 'Invalid normalized destination' using errcode='23514';end if;
 if new.owner_user_id is not null and not exists(select 1 from public.org_members where organization_id=new.organization_id and user_id=new.owner_user_id) then raise exception 'Foreign contact owner' using errcode='23514';end if;
 if jsonb_typeof(new.identities)<>'array' or jsonb_typeof(new.notes)<>'array' or jsonb_typeof(new.consents)<>'array' or jsonb_typeof(new.inbox_links)<>'array' or jsonb_typeof(new.custom_fields)<>'object' then raise exception 'Invalid contact JSON' using errcode='23514';end if;
 if jsonb_array_length(new.identities)>30 or jsonb_array_length(new.notes)>1000 or jsonb_array_length(new.consents)>1000 then raise exception 'Contact item limit reached' using errcode='23514';end if;
 for item in select value from jsonb_array_elements(new.identities) loop
  if jsonb_typeof(item)<>'object' or coalesce(item->>'platform','') !~ '^[a-z][a-z0-9_-]*$' or coalesce(item->>'handle',item->>'participantId','')='' or (item ? 'participantId' and coalesce(item->>'accountId','')='') or exists(select 1 from jsonb_object_keys(item)as keys(key) where key not in('platform','accountId','participantId','handle')) then raise exception 'Invalid scoped identity' using errcode='23514';end if;
 end loop;
 if TG_OP='UPDATE' then
  for previous in select value from jsonb_array_elements(old.consents) loop if not new.consents @> jsonb_build_array(previous) then raise exception 'Consent history cannot be removed' using errcode='23514';end if;end loop;
  for previous in select value from jsonb_array_elements(old.notes) loop if not new.notes @> jsonb_build_array(previous) then raise exception 'Note history cannot be removed' using errcode='23514';end if;end loop;
  if auth.role()<>'service_role' and new.inbox_links is distinct from old.inbox_links then raise exception 'Inbox links require server verification' using errcode='23514';end if;
 end if;
 if TG_OP='INSERT' and auth.role()<>'service_role' and new.inbox_links<>'[]'::jsonb then raise exception 'Inbox links require server verification' using errcode='23514';end if;
 for item in select value from jsonb_array_elements(new.consents) loop
  if TG_OP='UPDATE' and old.consents @> jsonb_build_array(item) then continue;end if;
  if jsonb_typeof(item)<>'object' or not item ?& array['channel','destination','purpose','status','source','recordedAt'] or coalesce(item->>'channel','') not in('whatsapp','sms','email','phone') or coalesce(item->>'purpose','') not in('marketing','transactional','call') or coalesce(item->>'status','') not in('granted','withdrawn') or coalesce(item->>'source','')='' or length(item->>'source')>500 or (item->>'recordedAt')::timestamptz > clock_timestamp() or (item->>'recordedAt')::timestamptz < clock_timestamp()-interval '1 minute' or not ((item->>'destination')=any(case when item->>'channel'='email' then new.emails else new.phones end)) then raise exception 'Invalid current consent event' using errcode='23514';end if;
 end loop;
 for item in select value from jsonb_array_elements(new.notes) loop
  if TG_OP='UPDATE' and old.notes @> jsonb_build_array(item) then continue;end if;
  if jsonb_typeof(item)<>'object' or not item ?& array['id','text','authorId','createdAt'] or length(coalesce(item->>'text','')) not between 1 and 5000 or not exists(select 1 from public.org_members where organization_id=new.organization_id and user_id=(item->>'authorId')::uuid) or (auth.role()<>'service_role' and (item->>'authorId')::uuid<>auth.uid()) then raise exception 'Invalid note' using errcode='23514';end if;
 end loop;
 for item in select value from jsonb_array_elements(new.inbox_links) loop
  if jsonb_typeof(item)<>'object' or not item ?& array['accountId','conversationId','platform','linkedAt'] or length(coalesce(item->>'accountId','')) not between 1 and 200 or length(coalesce(item->>'conversationId','')) not between 1 and 200 then raise exception 'Invalid verified inbox link' using errcode='23514';end if;
 end loop;
 for k in select jsonb_object_keys(new.custom_fields) loop
  if not exists(select 1 from public.crm_fields where organization_id=new.organization_id and id::text=k) and (TG_OP='INSERT' or (new.custom_fields->k) is distinct from (old.custom_fields->k)) then raise exception 'Unknown custom field' using errcode='23514';end if;
 end loop;
 for field in select * from public.crm_fields where organization_id=new.organization_id loop
  item=new.custom_fields->field.id::text;if item is null or item='null'::jsonb then continue;end if;
  if (field.kind='text' and (jsonb_typeof(item)<>'string' or length(item#>>'{}')>2000)) or (field.kind='number' and jsonb_typeof(item)<>'number') or (field.kind='boolean' and jsonb_typeof(item)<>'boolean') or (field.kind='date' and (jsonb_typeof(item)<>'string' or (item#>>'{}') !~ '^\d{4}-\d{2}-\d{2}$' or to_char((item#>>'{}')::date,'YYYY-MM-DD')<>item#>>'{}')) or (field.kind='select' and not (item#>>'{}')=any(field.options)) then raise exception 'Custom field type mismatch' using errcode='23514';end if;
 end loop;
 if TG_OP='INSERT' and not new.duplicate_reviewed and exists(select 1 from public.contacts c where c.organization_id=new.organization_id and (c.phones&&new.phones or c.emails&&new.emails)) then raise exception 'Duplicate contact needs explicit review' using errcode='23505';end if;
 new.updated_at=clock_timestamp();if TG_OP='UPDATE' then new.revision=old.revision+1;end if;return new;
end $$;
create trigger crm_contact_guard before insert or update on public.contacts for each row execute function public.crm_guard_contact();
create or replace function public.crm_retain_suppression() returns trigger language plpgsql set search_path=public,pg_temp as $$begin
 if old.do_not_contact or jsonb_array_length(old.consents)>0 then raise exception 'Consent and do-not-contact history must be retained; archive the contact' using errcode='23514';end if;
 return old;
end$$;
create trigger crm_contact_retention before delete on public.contacts for each row execute function public.crm_retain_suppression();
create or replace function public.crm_guard_audience() returns trigger language plpgsql set search_path=public,pg_temp as $$begin
 if exists(select 1 from unnest(new.contact_ids)as requested(contact_id) where not exists(select 1 from public.contacts c where c.id=requested.contact_id and c.organization_id=new.organization_id)) then raise exception 'Audience contains foreign contacts' using errcode='23514';end if;return new;end$$;
create trigger crm_audience_guard before insert or update on public.crm_audiences for each row execute function public.crm_guard_audience();

-- One transaction for the reviewed import; a repeated key replays its exact result.
create or replace function public.crm_import_contacts(p_org uuid,p_user uuid,p_key text,p_hash text,p_operations jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare op jsonb; c public.contacts; result jsonb; fingerprint text; previous public.crm_import_runs; created integer=0;updated integer=0; begin
 if not exists(select 1 from public.org_members m join public.organizations o on o.id=m.organization_id where m.organization_id=p_org and m.user_id=p_user and m.role in('owner','admin','editor') and o.status='active') then raise exception 'CRM writer denied' using errcode='42501';end if;
 if length(p_key) not between 1 and 200 or jsonb_typeof(p_operations)<>'array' or jsonb_array_length(p_operations)>500 then raise exception 'Invalid import' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_org::text,606));fingerprint=p_hash;select * into previous from public.crm_import_runs where organization_id=p_org and intent_key=p_key;
 if found then if previous.fingerprint<>fingerprint or previous.user_id<>p_user then raise exception 'Import key conflict' using errcode='40001';end if;return previous.result;end if;
 for op in select value from jsonb_array_elements(p_operations) loop
  if op->>'action' not in('create','update') then raise exception 'Invalid import decision' using errcode='22023';end if;
  c=jsonb_populate_record(null::public.contacts,op->'contact');
  if op->>'action'='create' then
   insert into public.contacts(organization_id,display_name,company,phones,emails,phone,email,identities,tags,custom_fields,status,duplicate_reviewed) values(p_org,c.display_name,coalesce(c.company,''),coalesce(c.phones,'{}'),coalesce(c.emails,'{}'),c.phones[1],c.emails[1],coalesce(c.identities,'[]'),coalesce(c.tags,'{}'),coalesce(c.custom_fields,'{}'),coalesce(c.status,'lead'),true);created=created+1;
  else
   update public.contacts set display_name=c.display_name,company=case when op->'contact' ? 'company' then c.company else company end,phones=case when op->'contact' ? 'phones' then c.phones else phones end,phone=case when op->'contact' ? 'phones' then c.phones[1] else phone end,emails=case when op->'contact' ? 'emails' then c.emails else emails end,email=case when op->'contact' ? 'emails' then c.emails[1] else email end,identities=case when op->'contact' ? 'identities' then c.identities else identities end,tags=case when op->'contact' ? 'tags' then c.tags else tags end,custom_fields=custom_fields||coalesce(c.custom_fields,'{}'),status=coalesce(c.status,status) where organization_id=p_org and id=(op->>'id')::uuid and revision=(op->>'revision')::bigint;
   if not found then raise exception 'Import contact changed' using errcode='40001';end if;updated=updated+1;
  end if;
 end loop;
 result=jsonb_build_object('created',created,'updated',updated);insert into public.crm_import_runs values(p_org,p_user,p_key,fingerprint,result,now());return result;
end$$;
revoke all on function public.crm_import_contacts(uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.crm_import_contacts(uuid,uuid,text,text,jsonb) to service_role;
commit;
