-- READ ONLY. Run before any pending migration against the intended Supabase project.
begin transaction read only;
select current_database(),current_user,version();
select expected.name,to_regclass('public.'||expected.name) is not null as present from unnest(array['organizations','org_members','contacts','connected_accounts','posts','phone_numbers','platform_global_config','subscription_plan_templates'])expected(name);
select extname from pg_extension where extname='pgcrypto';
select rolname,rolbypassrls from pg_roles where rolname in('anon','authenticated','service_role')order by rolname;
-- Add-on table presence identifies prior partial/manual application; compare to release manifest.
select expected.name,to_regclass('public.'||expected.name) is not null as present from unnest(array[
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
])expected(name);
-- Record these aggregate baselines privately to compare after migration; no customer rows are exposed.
select 'organizations' as table_name,count(*) as row_count from public.organizations
union all select 'org_members',count(*) from public.org_members
union all select 'contacts',count(*) from public.contacts
union all select 'connected_accounts',count(*) from public.connected_accounts
union all select 'posts',count(*) from public.posts
union all select 'phone_numbers',count(*) from public.phone_numbers;
commit;
