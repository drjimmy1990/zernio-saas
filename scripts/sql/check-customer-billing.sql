-- READ ONLY. Run after migration 10. No customer details or credentials are returned.
begin transaction read only;
select name,to_regclass('public.'||name) is not null as present
from unnest(array['billing_wallets','billing_wallet_quotes','billing_wallet_holds',
 'billing_wallet_ledger','billing_recurring_agreements','billing_recurring_invoices',
 'billing_sms_tariffs','billing_connection_leases']) as expected(name);
select c.relname,c.relrowsecurity as row_security,
 has_table_privilege('anon',c.oid,'SELECT') as anon_can_read,
 has_table_privilege('authenticated',c.oid,'UPDATE') as customer_can_write
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in('billing_wallets','billing_wallet_quotes',
 'billing_wallet_holds','billing_wallet_ledger','billing_recurring_agreements',
 'billing_recurring_invoices','billing_sms_tariffs','billing_connection_leases');
select p.proname,has_function_privilege('authenticated',p.oid,'EXECUTE') as customer_can_execute,
 has_function_privilege('service_role',p.oid,'EXECUTE') as server_can_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname like 'billing_%';
select plan_key,monthly_price_usd,max_connected_accounts
from public.subscription_plan_templates where plan_key='starter';
select count(*) as held_operations from public.billing_wallet_holds where state='held';
select count(*) as renewals_awaiting_funds from public.billing_recurring_invoices where state='dunning';
commit;
