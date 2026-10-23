# Verify and deploy database release 01–10

Use the intended existing Supabase project's SQL Editor as database owner. Confirm its project reference privately against deployment configuration. The latest owner report records01–09 as applied; this task has not verified production SQL and does not assume10 is applied. The [source manifest](migration-manifest.json) is not proof of live history. SQL Editor execution does not automatically update Supabase CLI migration history.

## Backup and read-only preflight

Pause application writes and scheduled sending, stop the shared worker, and record the deployed image/revision. Confirm a backup/PITR recovery point and rehearse restoration in a separate disposable or staging project. SQL Editor is not a backup. An owner with a private database connection can additionally use `pg_dump --format=custom --file=asra3-before-release.dump "$ASRA3_DB_URL"`; keep the secret in the environment, not command history or chat. Verify `pg_restore --list asra3-before-release.dump`, then restore/test separately. Preserve private configuration, the prior image and `.data` separately. Never restore over production as a test.

For an existing installation, run [preflight-launch.sql](../../scripts/sql/preflight-launch.sql). It reads baseline/add-on presence, roles and private aggregate baseline counts. Compare objects, signatures, privileges and transaction outcomes with SQL Editor history; a table alone does not prove a migration completed. If baseline objects are absent, stop and determine whether this is an intended fresh project. The existing-installation preflight's aggregate queries require the baseline schema.

- If01–09 are confirmed complete and10 is absent, apply **only10**.
- If10 is already present, run full postflight and reconcile its SQL Editor transaction record; do not rerun10.
- If behind or partly applied, identify the last completed migration and reconcile partial state before applying only missing files in order. Stop on ambiguity; do not reset/drop objects or blindly `supabase db push`.
- For an intentionally fresh Supabase project, verify it is empty of application objects and run01–10 in order. Supabase supplies the `auth` schema and `anon`, `authenticated` and `service_role` roles. This is not a reset procedure for an existing project.

## Exact source order

| Order | File in `supabase/migrations` | Purpose | Transaction |
| --- | --- | --- | --- |
|01|20261017000001_full_schema_and_super_admin.sql|Baseline application schema; fresh installations only|wrap|
|02|20261019000002_oauth_sessions.sql|Durable OAuth sessions|wrap|
|03|20261019000003_phone_purchase_intents.sql|Original purchase intent journal|wrap|
|04|20261019000004_durable_webhooks.sql|Webhook acceptance, projection and outbox|wrap|
|05|20261019000005_conversation_control_projection.sql|Conversation control event projection|wrap|
|06|20261020000006_manual_crm.sql|Additive CRM, RLS, import and retention|self|
|07|20261020000007_saas_security.sql|Sessions, keys, invitations, permissions and allowances|self|
|08|20261020000008_phone_lifecycle.sql|Phone operations and rental evidence|wrap|
|09|20261020000009_campaigns.sql|Local reviewed campaigns and atomic claims|wrap|
|10|20261022000010_customer_wallet.sql|Customer wallet, quotes/holds, recurring billing, tariffs and connection capacity|self|

For a `wrap` file, open a separate query and run the entire named file inside:

```sql
BEGIN;
-- Paste this ONE complete migration file here.
COMMIT;
```

For06,07 and10, paste the complete file unchanged; each already contains `BEGIN`/`COMMIT`. Do not add a nested transaction. Execute one whole file at a time, not a selection, and privately record the result/time. Stop on an error; use `ROLLBACK;` if the session remains aborted and verify its transaction outcome before retrying. These files are not generally safe to rerun.

Migration10 preserves existing tenant overrides and financial history; new customer wallets begin at zero. It updates the Starter template to $20/month and two connected accounts. No real payment receipt, balance, tariff or provider identifier should be fabricated to make a check pass.

## Postflight and recovery

After the release is complete, run both read-only checks:

1. [check-launch-migrations.sql](../../scripts/sql/check-launch-migrations.sql) covers the exact additive02–10 table/function/index inventory, RLS, CRUD/RPC privileges, relevant constraints, CRM metadata and aggregate operational state. All expected objects must be present. Server-only tables/RPCs deny `anon` and `authenticated`; `service_role` has required access. Documented CRM/RLS helper exceptions retain scoped authenticated grants.
2. [check-customer-billing.sql](../../scripts/sql/check-customer-billing.sql) provides a focused billing summary. Check object presence, RLS, denied customer/anonymous access, service execution and the Starter template (20 and2). Held-operation and unpaid-renewal totals are reconciliation work, not instructions to delete records.

The full verifier lists exact signatures and checks all CRUD grants, complementing the focused summary. Presence and permissions are metadata evidence; disposable PostgreSQL/PostgREST billing tests establish transaction behavior. Compare private baseline contact counts and preserved data before reopening writes.

Keep registration closed and provider-spending approvals bounded. Customers arrange payments through [support@asra3.com](mailto:support@asra3.com); only an administrator's verified received-payment entry credits the wallet. Migration10 activates no gateway.

On rollout failure stop the worker and retain durable state. Use only a prior image compatible with the additive schema or the rehearsed restore procedure. Reconcile external actions since the recovery point before resuming. Database restoration does not undo supplier purchases, messages, calls or customer payments; never erase holds or redispatch uncertain actions to clear a warning.
