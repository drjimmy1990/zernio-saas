# Saved release object manifest

Baseline01 is already applied. The machine-readable [manifest](migration-manifest.json) lists exact pending02..09 files/transaction modes, 22 tables, 36 functions and 10 indexes from the saved migration source. Recheck if migrations change before release. Sensitive function privileges are server-only, with explicit RLS helper exceptions. The read-only verifier checks presence, privileges, RLS, constraints and operational aggregate state; final integration tests establish behavior.

| Migration | Added objects |
| --- | --- |
|02|oauth_sessions + expiry index|
|03|phone_purchase_intents + open-profile unique index + acquire/update RPCs|
|04|zernio_webhook_events/projection/outbox + pending index + accept/claim/finish RPCs|
|05|project_zernio_conversation_control function + event trigger|
|06|contacts additive fields; crm_fields/audiences/import_runs; CRM RLS/guard/retention/import functions and triggers|
|07|saas_user_security/sessions/signup_workspaces/invitations/api_keys/audit/auth_limits/spending_limits/allowances/allowance_reservations/allowance_ledger; security/session/key/admin/allowance/RLS RPCs and scoped policy replacement|
|08|phone_lifecycle_operations/rental_obligations + atomic acquire RPC; blocks unresolved legacy03 purchase|
|09|asra3_campaigns + due/tenant indexes + claim RPC|

Tables that carry server credentials, financial intents or delivery state have no direct anon/authenticated access. Contacts/CRM fields/audiences retain current-role RLS grants. crm_role and saas_member_read/write intentionally allow authenticated execution; crm_import_contacts and sensitive saas RPCs do not. Trigger functions execute by table mutation and their default privileges differ from public RPCs; do not infer direct API access from a trigger definition.
