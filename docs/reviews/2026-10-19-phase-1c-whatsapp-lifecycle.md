# Phase 1C — WhatsApp messaging and durable webhooks

Date: 19 October 2026. Deployment target: **asra3.com**. This report covers the local implementation; production deployment and live Meta acceptance remain pending.

## Review outcome

The core WhatsApp journey now uses provider account, conversation, message, template and broadcast state. Both existing-number and purchased-number onboarding from Phase 1B feed the same WhatsApp inbox after Zernio confirms a connected account. A purchased phone number alone does not enable messaging.

The previous implementation could display locally invented sent/read messages and approved templates, read a different store from the incoming webhook, acknowledge events before reliable persistence, and lose customer webhook deliveries during a restart. Those paths have been replaced for this phase. Legacy automation broadcasts and verification OTPs could bypass the new flow; they now return explicit unavailable/retired responses.

This establishes local correctness under the tested contracts and failures. It does **not** establish that the configured production account has Meta permissions, approved templates, a working customer-service window or successful live delivery.

## Changes

- **Account and tenant checks:** the dashboard and public API use the authenticated organization and verify the selected provider account. Conversation and broadcast details must belong to that account. Inactive or disconnected accounts cannot send. Viewers cannot mutate; public API writes require the appropriate scope.
- **Actual messaging:** text, one HTTPS attachment, and supported templates use Zernio's documented inbox endpoints. Existing-conversation and new-recipient requests use their distinct contracts. Sends require a stable retry key, namespaced by organization and account. Incomplete responses cannot become successful local messages. Provider failure codes, pending states, rate limits and timeout uncertainty remain visible.
- **Templates and receipts:** template lists and custom template creation preserve provider approval status. Message reads display actual sent/delivered/read/failed state. The UI supports approved text templates; media-header template composition is currently available only through the API's supported fields. The application does not invent delivery timestamps or read checkmarks.
- **Inbox behavior:** the inbox reads canonical provider conversations/messages, with pagination and a 15-second refresh for the selected conversation. Account changes cannot display a late response from the previous account. An accepted send remains accepted if its subsequent refresh fails. A retry after reload retains the original send key for identical content.
- **Broadcasts:** select a connected account and approved template, create a real draft, add explicit opted-in recipient numbers, review it, then dispatch. The draft survives recipient-add failures and reloads. Approval and draft/recipient state are checked again before dispatch. Stable tenant-scoped keys protect retries. Counts and state come from the provider.
- **Incoming webhook durability:** signature validation and tenant/profile resolution precede a database transaction that journals the event, updates projections and inserts customer delivery jobs. Failed transactions return a retryable error. Duplicate events are safe; conflicting payloads using the same event ID are rejected. Receipt/content and template category/status clocks are independent, so late events cannot overwrite newer state.
- **Customer delivery worker:** a PostgreSQL outbox uses leases, backoff and restart recovery. The application acknowledges the provider without waiting for customer URLs. A protected internal endpoint drains jobs, and a Docker sidecar invokes it every 30 seconds. Delivery resolves and pins public DNS addresses, accepts HTTPS on port 443 and refuses redirects and private destinations.
- **Legacy entry points:** the inbox and telephony WhatsApp send adapters call the same provider service. Old response-cache records cannot restore fabricated successes. Legacy automation broadcast creation returns `410`; use `/api/v1/broadcasts`. `/verify` and `/verify/check` return `501` because their shared OTP implementation had no provider delivery or verification. WhatsApp Flows and other unsupported messaging operations return `501`.

## Main implementation files

| Area | Files |
| --- | --- |
| Provider lifecycle and request contracts | `src/lib/whatsapp/service.ts`, `broadcasts.ts`, `actions.ts` |
| Authenticated dashboard API | `src/app/api/whatsapp/route.ts` |
| Public API and legacy adapters | `src/app/api/v1/[...path]/route.ts`, `src/app/api/services/route.ts`, `src/lib/services/inbox-crm.service.ts`, `telephony.service.ts` |
| Customer UI | `src/components/dashboard/ProviderWhatsAppInbox.tsx`, `wizards/ThreeStepBroadcastWizard.tsx`, `hubs/TelephonyWhatsAppVoiceHub.tsx` |
| Durable event ingestion and delivery | `src/app/api/webhooks/zernio/route.ts`, `src/lib/webhooks/outbox.ts`, `delivery.ts` |
| Database and worker deployment | `supabase/migrations/20261019000004_durable_webhooks.sql`, `src/app/api/internal/webhooks/drain/route.ts`, `scripts/webhook-worker.mjs`, `Dockerfile`, `docker-compose.yml` |

## Verification

| Check | Result and boundary |
| --- | --- |
| Combined Phase 1A/1B/1C suite | **157 passed, 0 failed, 0 skipped**, with the disposable database configured |
| WhatsApp HTTP integration | 12 tests passed; 83 requests reached a local Postman simulation through the actual client/services, including draft, recipients and dispatch |
| Purchase HTTP regression | 7 tests passed; 41 requests reached the separate local provider simulation |
| Database and worker | Transaction rollback/retry, duplicate/collision/tenant rejection, event ordering, lease recovery, signature and retry/ack tests passed against actual PostgreSQL; HTTPS delivery restrictions passed |
| Fresh-database reproduction | `npm run test:phase1c:database` applied the baseline and all three new migrations, passed all 3 database/delivery tests and removed its disposable container |
| Browser journeys | Both actual-component scripts passed the inbox and broadcast failure/reload scenarios described below |
| Production HTTP smoke | **19 checks passed** against the locally built production server, including both signed webhook routes, anonymous WhatsApp denial and worker authentication |
| TypeScript/build | `npm run typecheck` and `npm run build` passed; build skips type validation, so the separate check is required. Existing middleware-to-proxy deprecation remains |
| Deployment configuration | `docker compose config --quiet` passed. No production container image or deployment was started |
| Diff/impact | `git diff --check` passed. GitNexus flags the combined tracked Phase 1A–1C diff as critical scope; new modules were also reviewed directly. No commit was created |

The full suite command was `node --test scripts/tests/phase1a-*.test.mjs scripts/tests/phase1b-*.test.mjs scripts/tests/phase1c-*.test.mjs` with `PHASE1C_PG_CONTAINER` set to the isolated test container. Without that variable the two database-dependent cases explicitly skip. `npm run test:phase1c:database` creates its own isolated database and runs those cases without production credentials. The separate run repeats existing assertions; it is not counted again in the 157 total.

The HTTP tests run the actual dispatcher, ownership checks, services and Zernio client against local Postman contract fixtures. They do not contact live recipients. The database tests use a disposable PostgreSQL 16 instance with minimal Supabase auth/role scaffolding; they do not use the production database. The SQL rejection messages for null outbox URLs and denied anonymous access are intentional assertions.

The browser checks run the actual React components against isolated dashboard API fixtures. They cover stale account responses, receipt display, stable retry keys after reload, accepted-send/failed-refresh handling, disconnected accounts, and retaining a broadcast draft across recipient failure and reload. Provider HTTP behavior is tested separately.

## Deployment requirements

1. Apply the baseline schema and migrations `20261019000002_oauth_sessions.sql`, `20261019000003_phone_purchase_intents.sql` and **`20261019000004_durable_webhooks.sql`** in the intended Supabase project. All were applied successfully to disposable local PostgreSQL; **none was applied to production in this work**. The new webhook transaction/outbox requires the service role.
2. Preserve the private auth/provider configuration from Phases 1A/1B, including `NEXT_PUBLIC_APP_URL=https://asra3.com`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `ZERNIO_API_KEY` and the matching `ZERNIO_WEBHOOK_SECRET`.
3. Configure a random server-only **`WEBHOOK_DRAIN_SECRET` of at least 32 characters**, with the same value for the app and worker. Deploy the app and `asra3-webhook-worker` from the updated Compose file. For another deployment system, invoke `POST /api/internal/webhooks/drain` with this bearer secret periodically. Do not expose the secret in client code. The included worker uses the private Compose service URL.
4. Keep the provider subscription pointed at **`https://asra3.com/webhooks/zernio`**. `/api/webhooks/zernio` remains an alias; register one canonical receiver. The user's subscription update was confirmed in the earlier review; this phase did not change it.
5. Validate the service-role permissions and real organization/profile mapping after deployment. Observe the event journal, projection and outbox, then confirm customer delivery and retry recovery. Customer endpoints must be public HTTPS on port 443. Outbox delivery is **at least once**; receivers must deduplicate the stable event ID. An ambiguous acknowledgement can result in another delivery.

## Remaining acceptance and phase boundaries

Phase 1E must exercise real opted-in recipients on the deployed app: both onboarding paths, approved-template and text/media sends, the actual customer-service window, incoming replies, delivered/read/failed receipts, two-tenant separation and restart/retry recovery. No live sends, number purchases, OAuth consent, production migration or deployment was performed in this phase.

The worker and SQL preserve durable event state; local file compatibility updates for older generic account/post screens remain best effort after commit. Facebook publishing, health, reconnect/disconnect and that reconciliation belong to **Phase 1D**, the next implementation checkpoint. Its initial audit findings remain open.

Messenger and Instagram remain **Phase 2**. Advanced WhatsApp Flows, Business Agent, calling, groups, catalogs, automation and other voice/SMS capabilities require separate selected work; this report does not certify them. The shared simulated OTP endpoints have been disabled until an actual provider verification flow exists.
