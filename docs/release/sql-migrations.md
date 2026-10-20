# Pending database pack after local completion

Use the intended Supabase project's SQL Editor as database owner. Confirm its project reference against `.env`. Do not rerun01, reset/drop objects to silence duplicates, or blindly `supabase db push`. SQL Editor execution does not automatically record CLI migration history.

## Backup and preflight

Pause release writes/scheduled sending and record deployed image/revision. Confirm a Supabase backup/PITR point and rehearse restoration in a separate disposable/staging project; SQL Editor is not a backup. An owner with a private database connection can additionally use `pg_dump --format=custom --file=asra3-before-launch.dump "$ASRA3_DB_URL"` (secret environment variable, no credential pasted into command history/chat). Verify `pg_restore --list asra3-before-launch.dump`, then restore/test separately using the provider's documented auth/storage/role recovery process. Never restore over production as a test. Preserve private `.env`, prior image and existing `.data` separately.

Run [preflight-launch.sql](../../scripts/sql/preflight-launch.sql), read-only. Baseline objects/pgcrypto must exist; record private counts. If any add-on objects exist, compare exact manifest and SQL Editor history; a table alone does not prove a migration complete. Stop/reconcile partial application before proceeding.

## Exact order

Already applied and excluded: `20261017000001_full_schema_and_super_admin.sql`.

| Order | File in supabase/migrations | Dependency/purpose | Transaction |
| --- | --- | --- | --- |
|02|20261019000002_oauth_sessions.sql|01 organizations; durable OAuth|wrap|
|03|20261019000003_phone_purchase_intents.sql|01 organizations; original purchase intents|wrap|
|04|20261019000004_durable_webhooks.sql|01 provider mappings/posts; acceptance/projection/outbox|wrap|
|05|20261019000005_conversation_control_projection.sql|04 event table; control trigger|wrap|
|06|20261020000006_manual_crm.sql|01 contacts/membership; additive CRM/RLS/import/retention|self BEGIN/COMMIT|
|07|20261020000007_saas_security.sql|01 auth/membership/policies; follows06; sessions/keys/allowances|self BEGIN/COMMIT|
|08|20261020000008_phone_lifecycle.sql|01 organizations +03 original intents; phone journal/rental evidence|wrap|
|09|20261020000009_campaigns.sql|01 organizations/auth.users; runtime requires06+07; local campaigns|wrap|

For each `wrap` file, open a separate new SQL Editor query:

```sql
BEGIN;
-- Paste this ONE complete named migration file here.
COMMIT;
```

For06/07 paste the complete file unchanged: they already have BEGIN/COMMIT. Do not nest another transaction around them. Execute the whole query, not selected statements. Run one file at a time and record success/time privately. Stop on any error; use `ROLLBACK;` if the session remains aborted, then confirm that transaction outcome before retry.04/05/07/08/09 contain ordinary CREATE objects and are not generally rerunnable.06's additive clauses do not make its policies/triggers safe to rerun blindly.

## Postflight and recovery

Run [check-launch-migrations.sql](../../scripts/sql/check-launch-migrations.sql) after all files. All objects/columns must exist, new tables RLS-enabled, server-only tables inaccessible to anon/authenticated, service_role granted required CRUD/RPC execution and triggers enabled. `crm_role`/`saas_member_*` intentionally allow authenticated execution for RLS; contacts/fields/audiences have scoped authenticated grants. Inspect policies, not just privileges. Compare baseline counts; CRM migration preserves original contact data. Queries return metadata/aggregate job states without secrets/customer rows.

Leave spending disabled/zero until administrator reviews real provider prerequisites. New durable credentials may require fresh verified sign-in; never seed fake balances/users/provider IDs into production.

On rollout failure stop the shared worker and retain durable records. Roll back app only to a revision compatible with additive schema/security. Do not drop tables or repeat purchases/messages. If restoring DB, stop all writers/worker, use rehearsed recovery and reconcile external actions since the recovery point before resuming. Restoring DB cannot undo purchased numbers/messages/calls.
