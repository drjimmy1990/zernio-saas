-- READ ONLY: release02..09 metadata and aggregate operational verification.
-- No migration application, customer rows, keys, tokens or URLs are returned.
begin transaction read only;
-- Required objects: every row should be present=true after the full pending pack.
select name,to_regclass('public.'||name) is not null as present from unnest(array[
 'oauth_sessions',
 'phone_purchase_intents',
 'zernio_webhook_events',
 'zernio_webhook_projection',
 'zernio_webhook_outbox',
 'crm_fields',
 'crm_audiences',
 'crm_import_runs',
 'saas_user_security',
 'saas_sessions',
 'saas_signup_workspaces',
 'saas_invitations',
 'saas_api_keys',
 'saas_audit',
 'saas_auth_limits',
 'saas_spending_limits',
 'saas_allowances',
 'saas_allowance_reservations',
 'saas_allowance_ledger',
 'phone_lifecycle_operations',
 'phone_rental_obligations',
 'asra3_campaigns'
]) expected(name);
select signature,to_regprocedure(signature) is not null as present from unnest(array[
 'public.acquire_phone_purchase_intent(uuid,text,text,text,text)',
 'public.update_phone_purchase_intent(uuid,text,text,text,boolean,text,text,text,boolean)',
 'public.accept_zernio_webhook(uuid,text,jsonb,jsonb)',
 'public.claim_zernio_webhook_outbox(text,integer)',
 'public.finish_zernio_webhook_outbox(uuid,text,integer,boolean)',
 'public.project_zernio_conversation_control()',
 'public.crm_role(uuid)',
 'public.crm_guard_contact()',
 'public.crm_retain_suppression()',
 'public.crm_guard_audience()',
 'public.crm_import_contacts(uuid,uuid,text,text,jsonb)',
 'public.saas_require_manager(uuid,uuid,boolean)',
 'public.saas_provision_signup(uuid,text)',
 'public.saas_issue_session(uuid,uuid,timestamptz)',
 'public.saas_revoke_sessions(uuid,uuid)',
 'public.saas_recover_access(uuid)',
 'public.saas_auth_throttle(text,integer)',
 'public.saas_change_member(uuid,uuid,uuid,text)',
 'public.saas_accept_invitation(uuid,text,text)',
 'public.saas_spending_capability(uuid,text)',
 'public.saas_reserve_allowance(uuid,text,text,bigint,text,text,integer,text)',
 'public.saas_finish_allowance(uuid,uuid,bigint,text,jsonb,text)',
 'public.saas_grant_allowance(uuid,text,bigint,text,text)',
 'public.saas_resolve_api_key(text,text)',
 'public.saas_create_api_key(uuid,uuid,text,text[],timestamptz,text,text)',
 'public.saas_revoke_api_key(uuid,uuid,uuid)',
 'public.saas_invite_member(uuid,uuid,text,text,text)',
 'public.saas_revoke_invitation(uuid,uuid,uuid)',
 'public.saas_configure_spending(uuid,text,text,boolean,bigint,integer,text)',
 'public.saas_admin_patch(text,text,jsonb,text)',
 'public.saas_admin_create_workspace(text,text,jsonb,text)',
 'public.saas_archive_workspace(uuid,text)',
 'public.saas_member_read(uuid)',
 'public.saas_member_write(uuid)',
 'public.acquire_phone_lifecycle_operation(uuid,text,text,text,text,jsonb)',
 'public.claim_asra3_campaign(uuid,uuid,text)'
]) expected(signature);
select name,to_regclass('public.'||name) is not null as present from unnest(array[
 'oauth_sessions_expiry_idx',
 'phone_purchase_intents_profile_open_idx',
 'zernio_outbox_pending',
 'crm_contacts_org_updated',
 'crm_contacts_phones',
 'crm_contacts_emails',
 'crm_contacts_tags',
 'saas_sessions_user',
 'asra3_campaigns_due',
 'asra3_campaigns_tenant'
]) expected(name);
-- All new tables must have RLS=true. contacts is listed separately below.
select expected.name,c.relrowsecurity as rls_enabled from unnest(array[
 'oauth_sessions',
 'phone_purchase_intents',
 'zernio_webhook_events',
 'zernio_webhook_projection',
 'zernio_webhook_outbox',
 'crm_fields',
 'crm_audiences',
 'crm_import_runs',
 'saas_user_security',
 'saas_sessions',
 'saas_signup_workspaces',
 'saas_invitations',
 'saas_api_keys',
 'saas_audit',
 'saas_auth_limits',
 'saas_spending_limits',
 'saas_allowances',
 'saas_allowance_reservations',
 'saas_allowance_ledger',
 'phone_lifecycle_operations',
 'phone_rental_obligations',
 'asra3_campaigns'
]) expected(name)
left join pg_class c on c.oid=to_regclass('public.'||expected.name) order by name;
-- Server-only tables: anon/authenticated false; service_role true for all CRUD.
select expected.name,r.role,
 coalesce(has_table_privilege(r.role,c.oid,'SELECT'),false) as can_select,
 coalesce(has_table_privilege(r.role,c.oid,'INSERT'),false) as can_insert,
 coalesce(has_table_privilege(r.role,c.oid,'UPDATE'),false) as can_update,
 coalesce(has_table_privilege(r.role,c.oid,'DELETE'),false) as can_delete
from unnest(array[
 'oauth_sessions',
 'phone_purchase_intents',
 'zernio_webhook_events',
 'zernio_webhook_projection',
 'zernio_webhook_outbox',
 'crm_import_runs',
 'saas_user_security',
 'saas_sessions',
 'saas_signup_workspaces',
 'saas_invitations',
 'saas_api_keys',
 'saas_audit',
 'saas_auth_limits',
 'saas_spending_limits',
 'saas_allowances',
 'saas_allowance_reservations',
 'saas_allowance_ledger',
 'phone_lifecycle_operations',
 'phone_rental_obligations',
 'asra3_campaigns'
]) expected(name) left join pg_class c on c.oid=to_regclass('public.'||expected.name)
cross join (values('anon'),('authenticated'),('service_role'))r(role) order by name,role;
select relrowsecurity as contacts_rls from pg_class where oid=to_regclass('public.contacts');
-- These authenticated CRM table grants are constrained by current-member RLS policies.
select c.relname,r.role,has_table_privilege(r.role,c.oid,'SELECT') as can_select,
 has_table_privilege(r.role,c.oid,'INSERT') as can_insert,has_table_privilege(r.role,c.oid,'UPDATE') as can_update,
 has_table_privilege(r.role,c.oid,'DELETE') as can_delete
from pg_class c cross join(values('anon'),('authenticated'),('service_role'))r(role)
where c.oid in(to_regclass('public.contacts'),to_regclass('public.crm_fields'),to_regclass('public.crm_audiences')) order by c.relname,r.role;
-- Sensitive server RPCs: anon/authenticated false; service_role true.
-- Exceptions crm_role and saas_member_* are separately listed: authenticated needs execution for RLS.
select signature,r.role,case when to_regprocedure(signature) is not null then has_function_privilege(r.role,to_regprocedure(signature)::oid,'EXECUTE') else false end as can_execute
from unnest(array[
 'public.acquire_phone_purchase_intent(uuid,text,text,text,text)',
 'public.update_phone_purchase_intent(uuid,text,text,text,boolean,text,text,text,boolean)',
 'public.accept_zernio_webhook(uuid,text,jsonb,jsonb)',
 'public.claim_zernio_webhook_outbox(text,integer)',
 'public.finish_zernio_webhook_outbox(uuid,text,integer,boolean)',
 'public.project_zernio_conversation_control()',
 'public.crm_import_contacts(uuid,uuid,text,text,jsonb)',
 'public.saas_require_manager(uuid,uuid,boolean)',
 'public.saas_provision_signup(uuid,text)',
 'public.saas_issue_session(uuid,uuid,timestamptz)',
 'public.saas_revoke_sessions(uuid,uuid)',
 'public.saas_recover_access(uuid)',
 'public.saas_auth_throttle(text,integer)',
 'public.saas_change_member(uuid,uuid,uuid,text)',
 'public.saas_accept_invitation(uuid,text,text)',
 'public.saas_spending_capability(uuid,text)',
 'public.saas_reserve_allowance(uuid,text,text,bigint,text,text,integer,text)',
 'public.saas_finish_allowance(uuid,uuid,bigint,text,jsonb,text)',
 'public.saas_grant_allowance(uuid,text,bigint,text,text)',
 'public.saas_resolve_api_key(text,text)',
 'public.saas_create_api_key(uuid,uuid,text,text[],timestamptz,text,text)',
 'public.saas_revoke_api_key(uuid,uuid,uuid)',
 'public.saas_invite_member(uuid,uuid,text,text,text)',
 'public.saas_revoke_invitation(uuid,uuid,uuid)',
 'public.saas_configure_spending(uuid,text,text,boolean,bigint,integer,text)',
 'public.saas_admin_patch(text,text,jsonb,text)',
 'public.saas_admin_create_workspace(text,text,jsonb,text)',
 'public.saas_archive_workspace(uuid,text)',
 'public.acquire_phone_lifecycle_operation(uuid,text,text,text,text,jsonb)',
 'public.claim_asra3_campaign(uuid,uuid,text)'
]) expected(signature) cross join(values('anon'),('authenticated'),('service_role'))r(role) order by signature,role;
select signature,r.role,case when to_regprocedure(signature) is not null then has_function_privilege(r.role,to_regprocedure(signature)::oid,'EXECUTE') else false end as can_execute
from unnest(array['public.crm_role(uuid)','public.saas_member_read(uuid)','public.saas_member_write(uuid)']) expected(signature)
cross join(values('anon'),('authenticated'),('service_role'))r(role) order by signature,role;
-- Inspect expected enabled trigger definitions and scoped RLS policy roles/conditions.
select t.tgname,c.relname,t.tgenabled,pg_get_triggerdef(t.oid) as definition from pg_trigger t join pg_class c on c.oid=t.tgrelid
where not t.tgisinternal and t.tgname in('zernio_conversation_control_projection','crm_contact_guard','crm_contact_retention','crm_audience_guard') order by t.tgname;
select tablename,policyname,roles,cmd,qual,with_check from pg_policies where schemaname='public' and(tablename in('contacts','crm_fields','crm_audiences') or policyname like 'saas_scoped_%') order by tablename,policyname;
-- Added CRM columns: all present=true. Existing contact values must survive migration06.
with expected(name)as(select unnest(array['company','phones','emails','identities','notes','consents','inbox_links','status','owner_user_id','do_not_contact','archived_at','revision','duplicate_reviewed']))
select name,exists(select 1 from information_schema.columns where table_schema='public' and table_name='contacts' and column_name=name) as present from expected;
select rolname,rolbypassrls from pg_roles where rolname in('anon','authenticated','service_role') order by rolname;
select extname from pg_extension where extname='pgcrypto';
-- Presence alone does not prove immutable tenant keys or replay uniqueness: inspect constraints.
select c.relname,k.conname,pg_get_constraintdef(k.oid) as definition from pg_constraint k join pg_class c on c.oid=k.conrelid where c.oid in(to_regclass('public.phone_lifecycle_operations'),to_regclass('public.phone_rental_obligations'),to_regclass('public.saas_allowance_reservations'),to_regclass('public.asra3_campaigns')) order by c.relname,k.conname;
-- Aggregate job/allowance health only. Nonzero counts require review, not an automatic reset.
select count(*) filter(where delivered_at is null) as pending,
 count(*) filter(where delivered_at is null and available_at<now()-interval '10 minutes') as overdue,
 max(attempts) as max_attempts from public.zernio_webhook_outbox;
select status,count(*) from public.asra3_campaigns group by status order by status;
select state,count(*) from public.phone_lifecycle_operations group by state order by state;
select state,count(*) from public.saas_allowance_reservations group by state order by state;
commit;
