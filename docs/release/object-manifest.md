# Source release object manifest — through migration10

The [machine-readable manifest](migration-manifest.json) records the complete01–10 source order and transaction modes. Its object inventory covers additions in02–10; baseline01 objects are excluded from those totals. It is not a production application ledger. The latest owner report says01–09 were applied; live state and migration10 require read-only verification.

There are **30 additive tables,45 function signatures and11 explicit indexes** in this inventory. Migration10 contributes **8 tables,9 functions and1 explicit index**, derived from its saved SQL. PostgreSQL-generated primary-key/unique-constraint indexes are excluded from the explicit-index count. Recheck the inventory whenever migrations change.

| Migration | Added objects |
| --- | --- |
|02|`oauth_sessions` and expiry index|
|03|`phone_purchase_intents`, open-profile unique index and acquire/update RPCs|
|04|Webhook event/projection/outbox tables, pending index and accept/claim/finish RPCs|
|05|Conversation-control projection function and event trigger|
|06|Additive contact fields; CRM fields/audiences/import runs; scoped policies, guard/retention/import functions and triggers|
|07|SaaS security/session/signup/invitation/key/audit/throttle/spending/allowance tables, RPCs and scoped policies|
|08|Phone operation/rental evidence tables and atomic acquire RPC|
|09|Campaign table, due/tenant indexes and claim RPC|
|10|Wallets, quotes, holds, ledger, recurring agreements/invoices, verified SMS tariffs and connection leases; nine billing RPCs and unique provider-settlement index|

Migration10's tables are `billing_wallets`, `billing_wallet_quotes`, `billing_wallet_holds`, `billing_wallet_ledger`, `billing_recurring_agreements`, `billing_recurring_invoices`, `billing_sms_tariffs` and `billing_connection_leases`. Its RPCs are `billing_credit_wallet`, `billing_create_quote`, `billing_reserve_wallet`, `billing_finish_wallet`, `billing_refund_wallet`, `billing_set_agreement`, `billing_charge_period`, `billing_stop_agreement` and `billing_connection_capacity`; the manifest gives full signatures. The explicit index is `billing_one_settlement_per_provider_reference`.

[Preflight](../../scripts/sql/preflight-launch.sql) detects baseline/add-on presence before upgrade. [Full postflight](../../scripts/sql/check-launch-migrations.sql) checks the exact inventory through10, table RLS, server-only CRUD/RPC privileges, scoped CRM helper exceptions, triggers/constraints, Starter price/capacity and aggregate work requiring review. [Focused billing postflight](../../scripts/sql/check-customer-billing.sql) is an additional summary, not a replacement for exact function/permission coverage.

Tables carrying credentials, financial intents and delivery state have no direct `anon`/`authenticated` access. Contacts/CRM fields/audiences retain current-role RLS grants. `crm_role` and `saas_member_*` intentionally allow authenticated execution for policies; sensitive billing/CRM/SaaS RPCs do not. Trigger functions execute through table mutation; their definitions do not establish direct API access. Metadata checks do not replace behavior tests or prove deployment.
