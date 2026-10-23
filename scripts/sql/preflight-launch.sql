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
 'asra3_campaigns',
 'billing_wallets',
 'billing_wallet_quotes',
 'billing_wallet_holds',
 'billing_wallet_ledger',
 'billing_recurring_agreements',
 'billing_recurring_invoices',
 'billing_sms_tariffs',
 'billing_connection_leases'
])expected(name);
-- Billing signatures/index help detect partial migration10 application; presence alone is not completion.
select signature,to_regprocedure(signature) is not null as present from unnest(array[
 'public.billing_credit_wallet(uuid,bigint,text,text,jsonb)',
 'public.billing_create_quote(uuid,text,text,bigint,bigint,timestamptz,text,text)',
 'public.billing_reserve_wallet(uuid,uuid,text,text)',
 'public.billing_finish_wallet(uuid,uuid,bigint,bigint,text,jsonb,text)',
 'public.billing_refund_wallet(uuid,uuid,bigint,text,text,jsonb)',
 'public.billing_set_agreement(uuid,text,text,bigint,text,text,jsonb)',
 'public.billing_charge_period(uuid,uuid,timestamptz,timestamptz,jsonb)',
 'public.billing_stop_agreement(uuid,text,text,jsonb)',
 'public.billing_connection_capacity(uuid,text,text[],integer,boolean,text)'
]) expected(signature);
select name,to_regclass('public.'||name) is not null as present from unnest(array[
 'billing_one_settlement_per_provider_reference'
]) expected(name);
-- Record these aggregate baselines privately to compare after migration; no customer rows are exposed.
select 'organizations' as table_name,count(*) as row_count from public.organizations
union all select 'org_members',count(*) from public.org_members
union all select 'contacts',count(*) from public.contacts
union all select 'connected_accounts',count(*) from public.connected_accounts
union all select 'posts',count(*) from public.posts
union all select 'phone_numbers',count(*) from public.phone_numbers;
commit;
