# Asra3 — final local release review

20 October 2026. Target deployment: **https://asra3.com**. The working tree contains the implementation; no production database, deployment, purchase, call, post or message was executed in this pass.

The manual business-owner launch is implemented and locally verified. Deploy to a controlled environment after applying the pending SQL, then complete live acceptance before inviting general customer traffic. Local fixture tests cannot certify Meta permissions, Zernio account eligibility, email delivery or actual customer delivery.

## What is implemented

| Priority | Ready locally | Deliberately upcoming / live dependency |
|---|---|---|
| Manual CRM | Contacts, platform identities, multiple phones/emails, notes, tags, custom fields, duplicate review, CSV import/export, saved audiences, consent and manual inbox links; workspace isolation and role checks | Automation is Coming soon. Consent/DNC history is retained when contacts are archived; it cannot be silently purged. |
| SaaS and security | Verified signup, recovery, durable/revocable sessions, workspace membership/roles, last-owner protection, invitations, expiring hashed API keys, admin configuration/audit and controlled provider-spending allocations | Customer payment collection, checkout, upgrades and top-ups are Coming soon. Gateway, crypto and Egyptian payment methods remain undecided. Monthly post/account plan enforcement is also Coming soon; configured numbers must not be marketed as enforced limits. |
| Campaigns and reports | CRM-backed WhatsApp audiences, approved-template checks, reviewed drafts/schedules, atomic dispatch claims, recipient reconciliation, cancellation/results, date-filtered social and messaging reports and CSV export | Only provider-supplied metrics are shown; missing data stays unavailable. Provider costs are not estimated from invented rates. Unknown sends retain their reservation and require review. |
| Phones and advanced WhatsApp | Existing number onboarding plus reviewed number purchase/recovery, KYC and rental evidence, release reconciliation, SMS/call operations, templates and manually operated WhatsApp Flows | Actual availability, provider account funding, KYC, registration and Meta approval depend on the live account. AI answering is Coming soon. |
| Product and release | Integrated English/Arabic business dashboard, responsive browser checks, launch messaging, Docker non-root execution, private app binding, shared durable worker, SQL manifest/verifiers and deployment runbook | Owner must apply SQL, configure real public build values/private credentials and run live acceptance. CI is configured but has not been run on a remote runner in this pass. |

Existing Facebook/Instagram publishing, Messenger/Instagram inbox/comments/settings and WhatsApp integration were included in regression checks. Unsupported channels, ads and commerce remain outside this launch. Incoming Zernio webhooks are supported; customer-defined outgoing webhook setup is Coming soon.

## Review findings fixed

- The public API now resolves durable SaaS keys against current issuer/membership permissions. Legacy local keys, fake profile/wallet responses and cached mutation successes cannot authorize current actions. Management operations require the appropriate current role.
- Campaign dispatch uses an atomic claim, rechecks the exact approved audience/template and consent, verifies provider recipients, and does not automatically retry an uncertain provider write. Read-only reconciliation preserves unresolved spending.
- Direct WhatsApp sends use the same spending guard and CRM suppression checks as the dedicated phone flow. One template send cannot allocate twice through nested adapters.
- Consent chronology compares actual instants, including timezone offsets; withdrawal wins an equal timestamp. Duplicate/removed destinations and retained consent records are checked before sending.
- Spending uses integer amounts and organization locks. WhatsApp/campaign/SMS units share a UTC monthly limit, including uncertain attempts; a configured zero limit does not fall through to the plan default. This is a conservative attempted-message allowance, not a claimed provider billing total.
- Public docs no longer show an invented wallet or quota-usage response for `/me`. Advanced API catalog entries remain reference material, not certification that every catalog operation is implemented.

## Verification evidence

All provider traffic used isolated local fixtures. Disposable PostgreSQL containers used generated test credentials and no production data/volume.

| Check | Result |
|---|---|
| `npm run test:regression` | **277 passed**, 0 failed; 3 database-only cases covered by the PostgreSQL run |
| `npm run test:launch` | **71 passed**, 0 failed; 5 phone database-only cases passed separately |
| Final changed public API, services authorization and integrated browser tests | **76 passed**, 0 failed |
| `npm run test:launch:database` | Passed: baseline-only upgrade and fresh install of 01–09; existing contact preserved; campaign claim concurrency; monthly message limits; SaaS session/key/RLS/allowance checks; 5 phone storage cases and 4 webhook/control cases |
| CRM PostgreSQL check, included in launch suite | Passed: upgrade, row permissions, import, consent retention and persistence after restart |
| TypeScript / production build | Passed; build-time TypeScript checking enabled |
| ESLint | 0 errors; 168 non-blocking warnings remain, primarily unused legacy code and hook-dependency warnings |
| Dependency audit | 0 reported vulnerabilities |
| Built production HTTP smoke | **42 checks passed**, including anonymous API denial and both signed-webhook routes |
| Final Docker image and smoke | Passed: UID 1000, writable legacy data directory, no copied `.env` files, loopback binding, auth/signature boundaries and security headers |
| Git whitespace check | Passed |

The Next.js build still reports the existing `middleware` filename deprecation; it compiles and the protected-route smoke checks pass. Source migration to `proxy` can be done as a separate compatibility cleanup.

GitNexus was rebuilt successfully after an incomplete incremental run: 3,910 nodes and 223 execution flows. Comparison against `main` reports 214 changed symbols across 53 tracked files and 144 affected processes, rated **CRITICAL** because the accumulated changes span shared authentication, provider calls and application entry points. These are the expected Phase 1 through launch areas covered by the checks above; the rating is not a newly detected vulnerability. The comparison excludes untracked new files from its diff count, so it is not a complete file inventory. See [change-scope evidence](2026-10-20-launch-change-scope.json). No commit was made.

Local evidence logs are under the executing user's temporary directory: `asra3-regression-final.log`, `asra3-launch-final.log`, `asra3-integration-last.log`, `asra3-database-final.log`, `asra3-build-final.log`, `asra3-docker-final.log`, `asra3-production-smoke-final.log`, `asra3-container-smoke-final.log` and `asra3-lint-final.log`. Individual provider tests print their isolated Postman NDJSON paths.

## Exactly what the owner does next

You did **not** need to run SQL while this work was being completed. You can apply all pending additions now, **before deploying this build**.

1. Back up the intended Supabase project, the old deployment and private `.data`/configuration. Verify the backup can be restored in a separate environment.
2. Open the intended Supabase project's SQL Editor and run [the read-only preflight](../../scripts/sql/preflight-launch.sql). Confirm baseline 01 exists and reconcile any partially applied additions.
3. Run the eight files below **one at a time, in this order**. Do **not** run baseline 01 again. Stop on any error. Do not blindly use `supabase db push` for a database whose first migration was applied manually.

| Order | Exact migration | How to execute |
|---|---|---|
| 02 | [OAuth sessions](../../supabase/migrations/20261019000002_oauth_sessions.sql) | Wrap the whole file in `BEGIN;` / `COMMIT;` |
| 03 | [Phone purchase intents](../../supabase/migrations/20261019000003_phone_purchase_intents.sql) | Wrap |
| 04 | [Durable webhooks](../../supabase/migrations/20261019000004_durable_webhooks.sql) | Wrap |
| 05 | [Conversation control](../../supabase/migrations/20261019000005_conversation_control_projection.sql) | Wrap |
| 06 | [Manual CRM](../../supabase/migrations/20261020000006_manual_crm.sql) | Paste unchanged; it already contains its transaction |
| 07 | [SaaS security](../../supabase/migrations/20261020000007_saas_security.sql) | Paste unchanged; it already contains its transaction |
| 08 | [Phone lifecycle](../../supabase/migrations/20261020000008_phone_lifecycle.sql) | Wrap |
| 09 | [Campaigns](../../supabase/migrations/20261020000009_campaigns.sql) | Wrap |

4. Run [the read-only postflight](../../scripts/sql/check-launch-migrations.sql). Verify required objects, permissions and policies using [the detailed SQL instructions](../release/sql-migrations.md).
5. Follow [DEPLOYMENT-VPS.md](../../DEPLOYMENT-VPS.md). Fill the blank secrets privately, use real public Supabase values when building, configure verified-email SMTP/redirects, prepare `.data` for UID 1000, and start the app plus its one shared worker behind HTTPS.
6. Complete [live acceptance](../release/operations.md) on asra3.com. Verify account connections, incoming webhooks, recovery/revocation, worker progress and approved test destinations. Enable only the needed spending capability with a bounded admin allocation after its provider prerequisites are confirmed.

This is suitable for a **controlled manual-service launch after those steps**. Paid self-service launch and automation remain upcoming. Do not market unavailable metrics or unimplemented plan enforcement as completed capabilities.
