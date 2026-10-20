-- READ ONLY. Checks the initial schema and Phase 1/2 migration objects.
-- It does not apply migrations, invoke application RPCs or read customer/secrets rows.
-- Run in the intended Supabase project's SQL Editor as the project database owner.
-- Later launch migrations will extend the final release verification manifest.

-- 1. Presence: before add-ons, only the four baseline tables should exist.
-- After 02-05, every item listed here should be present.
select name, to_regclass('public.' || name) is not null as present
from unnest(array[
  'organizations', 'connected_accounts', 'posts', 'ai_support_runs',
  'oauth_sessions', 'phone_purchase_intents',
  'zernio_webhook_events', 'zernio_webhook_projection', 'zernio_webhook_outbox',
  'oauth_sessions_expiry_idx', 'phone_purchase_intents_profile_open_idx',
  'zernio_outbox_pending'
]) as expected(name);

-- 2. Baseline column dependencies: every row should be true.
with expected(table_name, column_name) as (values
  ('organizations', 'id'), ('organizations', 'zernio_profile_id'),
  ('connected_accounts', 'organization_id'), ('connected_accounts', 'zernio_account_id'),
  ('connected_accounts', 'zernio_profile_id'), ('connected_accounts', 'platform'),
  ('connected_accounts', 'username'), ('connected_accounts', 'is_active'),
  ('connected_accounts', 'health_status'), ('connected_accounts', 'needs_reconnect'),
  ('connected_accounts', 'updated_at'),
  ('posts', 'organization_id'), ('posts', 'zernio_post_id'),
  ('posts', 'status'), ('posts', 'platforms'),
  ('posts', 'published_at'), ('posts', 'updated_at'),
  ('ai_support_runs', 'organization_id'), ('ai_support_runs', 'zernio_run_id'),
  ('ai_support_runs', 'status'), ('ai_support_runs', 'answer'),
  ('ai_support_runs', 'cost_usd'), ('ai_support_runs', 'finished_at')
)
select e.table_name, e.column_name, exists (
  select 1 from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = e.table_name and c.column_name = e.column_name
) as present
from expected e;

-- Required extension; expect pgcrypto.
select extname from pg_extension where extname = 'pgcrypto';

-- Expected Supabase roles: service_role bypasses RLS; anon/authenticated do not.
select rolname, rolbypassrls
from pg_roles where rolname in ('anon', 'authenticated', 'service_role')
order by rolname;

-- Baseline uniqueness used by webhook upserts; inspect the reported constraints.
select c.relname as table_name, pg_get_constraintdef(k.oid) as definition
from pg_constraint k
join pg_class c on c.oid = k.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and k.contype in ('p', 'u')
  and c.relname in ('organizations', 'connected_accounts', 'posts', 'ai_support_runs')
order by c.relname, k.conname;

-- 3. After 02-05: 15 rows, RLS true throughout.
-- anon/authenticated: all permission columns false. service_role: all true.
select c.relname as table_name, c.relrowsecurity as rls_enabled, r.role,
  has_table_privilege(r.role, c.oid, 'SELECT') as can_select,
  has_table_privilege(r.role, c.oid, 'INSERT') as can_insert,
  has_table_privilege(r.role, c.oid, 'UPDATE') as can_update,
  has_table_privilege(r.role, c.oid, 'DELETE') as can_delete
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join (values ('anon'), ('authenticated'), ('service_role')) r(role)
where n.nspname = 'public'
  and c.relname in ('oauth_sessions', 'phone_purchase_intents',
    'zernio_webhook_events', 'zernio_webhook_projection', 'zernio_webhook_outbox')
order by c.relname, r.role;

-- 4. After 02-05: all six functions present (18 rows across roles).
-- anon/authenticated cannot execute. service_role can execute.
with expected(signature) as (values
  ('public.acquire_phone_purchase_intent(uuid,text,text,text,text)'),
  ('public.update_phone_purchase_intent(uuid,text,text,text,boolean,text,text,text,boolean)'),
  ('public.accept_zernio_webhook(uuid,text,jsonb,jsonb)'),
  ('public.claim_zernio_webhook_outbox(text,integer)'),
  ('public.finish_zernio_webhook_outbox(uuid,text,integer,boolean)'),
  ('public.project_zernio_conversation_control()')
)
select signature, to_regprocedure(signature) is not null as present, r.role,
  case when to_regprocedure(signature) is not null then
    has_function_privilege(r.role, to_regprocedure(signature)::oid, 'EXECUTE')
  end as can_execute
from expected
cross join (values ('anon'), ('authenticated'), ('service_role')) r(role)
order by signature, r.role;

-- 5. After 05: exactly one enabled (O) AFTER INSERT FOR EACH ROW trigger.
select t.tgname, t.tgenabled, pg_get_triggerdef(t.oid) as definition
from pg_trigger t
where t.tgrelid = to_regclass('public.zernio_webhook_events')
  and t.tgname = 'zernio_conversation_control_projection'
  and not t.tgisinternal;
