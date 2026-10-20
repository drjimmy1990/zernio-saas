# SQL timing and deployment handoff

20 October 2026. The owner reports running only the first main SQL schema. Production schema state has not been queried in this planning pass. These steps assume that file was `20261017000001_full_schema_and_super_admin.sql`; the read-only preflight checks the required baseline objects.

## Can the SQL wait?

**Yes.** All five selected local implementation phases can proceed using disposable PostgreSQL and controlled provider fixtures. Apply the completed migration pack after local work and before deploying/testing the new release against the intended Supabase database. No production SQL is needed from the owner to begin local development.

The current disposable harness, `npm run test:phase1c:database`, creates a temporary PostgreSQL 16 container with no public port or persistent volume, applies the baseline and add-ons, runs database tests, and removes its own container. It does not need production credentials. The launch implementation will extend this verification to new migrations and a baseline-only upgrade containing representative existing records.

Until migrations are applied to the real database, OAuth session persistence, purchase recovery and durable webhook/worker behavior cannot be accepted there. Do not deploy the new runtime first and expect those features to work without its schema. Existing code or a registered webhook URL alone does not prove signed events are being processed successfully.

## Current exact migration order

The first main file has already been reported as applied. **Do not run it again.** It contains policy creation and is not an upgrade script.

| Order | Pending file in `supabase/migrations` | Purpose/dependency |
| --- | --- | --- |
| 02 | `20261019000002_oauth_sessions.sql` | Encrypted OAuth session storage and server-only access; requires the baseline organizations table. |
| 03 | `20261019000003_phone_purchase_intents.sql` | Durable purchase state, locks and retry protection; requires baseline organizations. |
| 04 | `20261019000004_durable_webhooks.sql` | Event journal, projections, outbox and worker RPCs; requires baseline organizations/profile mapping, connected accounts, posts, support-run columns and pgcrypto. |
| 05 | `20261019000005_conversation_control_projection.sql` | Atomic Meta conversation-control trigger; requires the event/projection tables from 04. |
| Later | Additional migrations in the final release manifest | CRM, permissions/security, accounting/allowances and any campaign/phone storage changes. These files have not been implemented by this planning task; exact names/order will be supplied with the final pack. |

Files 04 and 05 use `CREATE TABLE`, `CREATE FUNCTION` and `CREATE TRIGGER`; they must not be blindly rerun. The `IF NOT EXISTS` statements in 02/03 also do not repair an existing table with a different structure. An “already exists” error requires inspection of existing/partially applied objects, not dropping tables or rerunning the main schema.

## What the owner should do after local work is finished

1. **Use the final release pack.** It will contain the complete numbered list, all required SQL files, verification queries and local upgrade-test results. The four files above are the current list, not a claim that no new migrations will be needed.
2. **Confirm the correct Supabase project.** Match its project reference/URL to the deployment's Supabase URL. Do not paste keys into chat or into a SQL query. Use the project database owner in SQL Editor.
3. **Take a recoverable backup first.** Use the project's database backup/export process and confirm how to restore it. Preserve application data outside PostgreSQL separately, including any existing `.data` storage still used by this release. Do not reset the database.
4. **Run the read-only preflight.** Open [check-phase1-2-migrations.sql](../../scripts/sql/check-phase1-2-migrations.sql), paste it into a new SQL Editor query, and run its sections. It reads only schema/privilege metadata, not customer messages or signing secrets. Baseline dependencies and pgcrypto must exist. If only the main schema is present, the new tables/functions/trigger should be missing; that is expected before add-ons. If some are already present, reconcile which files were applied before proceeding.
5. **Run each pending migration, in order, in its own transaction.** Start with 02, then 03, 04, 05, then the later files from the final manifest. For each file: open it, copy its entire contents, create a new SQL Editor query named after the migration, put `BEGIN;` above its contents and `COMMIT;` below, then Run. Wait for success before opening the next migration. Do not paste only a fragment of a function.
6. **If a migration fails, stop.** Do not run subsequent migrations or rewrite the SQL to bypass the error. Issue `ROLLBACK;` if that session still has an open/aborted transaction. Record the filename and error text for diagnosis. Previously committed files remain applied. Do not delete existing tables, data or policies to silence duplicates.
7. **Run the final verification script.** For today's 02–05 pack, all 12 listed relations/indexes must exist; all five server-only tables must have RLS; the 15 privilege rows must deny anon/authenticated access and allow service-role access; all six functions must exist with the same execution restriction; the control trigger must be enabled. Supabase's service role must retain its expected RLS bypass. The final release verification will extend these expected results for new schema. Object presence is a structural check, not a substitute for live acceptance.
8. **Refresh the API schema cache if needed.** After successful migration/verification, `NOTIFY pgrst, 'reload schema';` can refresh Supabase's API schema cache. An application “function not found” error still requires checking the project, exact function signature and privileges; do not expose a private RPC publicly to fix it.
9. **Configure and deploy the reviewed app and worker.** Follow the final deployment instructions below. Keep public access controlled until the live acceptance checklist passes.

Transaction wrapper for each file:

```sql
BEGIN;
-- Paste the ENTIRE contents of exactly one pending migration here.
COMMIT;
```

The wrapper itself applies no migration. Manual SQL Editor execution may not populate the Supabase CLI migration history. Do not switch to an unreviewed `supabase db push`/reset flow: it could try to apply the already-existing main schema. A future move to CLI migrations requires reconciling history with the actual database first.

## Deployment configuration and checks

No payment gateway credentials are required while customer payments remain Coming soon. Supabase authentication email delivery/redirects still need valid deployment configuration so signup verification, invitations and password recovery can be tested.

| Setting | Requirement |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | `https://asra3.com`, available before building the production client. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Correct project values at build and runtime. The public key does not replace database access policies. |
| `SUPABASE_SERVICE_ROLE_KEY` | Correct server-only credential; never a `NEXT_PUBLIC_*` value. |
| `SESSION_SECRET` | Strong private generated secret. Changing it invalidates sessions and can affect encrypted temporary OAuth context; plan rotations. |
| `ZERNIO_API_KEY`, `ZERNIO_WEBHOOK_SECRET` | Intended server-side account credential and matching webhook signing secret. |
| `WEBHOOK_DRAIN_SECRET` | Random secret of at least 32 characters, identical in the app and worker. |
| Feature/allowance configuration | Customer payments and automations disabled; exposed chargeable provider operations require approved account limits/allowances. Final exact configuration names will accompany the implementation. |

Register the canonical receiver `https://asra3.com/webhooks/zernio`; `/api/webhooks/zernio` is an alias, not a second required subscription. Confirm actual signed POST delivery after deployment. GET returning 405 does not verify webhook processing.

For the repository's Docker Compose deployment, the current default published port is **127.0.0.1:3008**, unless `PORT` is deliberately changed. The old `DEPLOYMENT-VPS.md` still mentions 5651 and lacks the worker secret; Phase 5 will correct that guide. The final runbook must match the actual deployment environment and release configuration.

From the deployment checkout, after the final schema and environment are ready:

```sh
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

Both `asra3-saas` and `asra3-webhook-worker` must be running; the app must pass its health check and the worker must authenticate to its private drain endpoint. Proxy HTTPS traffic to the configured app port, not directly to the worker. Inspect logs locally for startup/schema/permission failures, without sharing secrets.

Finally complete [live acceptance](2026-10-19-phase-1e-deployment-acceptance.md): two-workspace isolation, real OAuth/reconnect, authorized messages/purchases/calls/posts, actual provider results, signed events, and worker/restart recovery. The final release report will distinguish local test evidence from these production checks.

## What will be supplied at completion

One release handoff: final code, the complete additive migration manifest and SQL files, read-only verification queries, fresh/upgrade database test results, required settings, correct deployment/worker commands, backup/recovery notes, and a live test checklist. Failed production checks remain explicit launch blockers; they are not satisfied by local fixtures.
