# Phase 1E — Deployment and live acceptance

Date: 19 October 2026. **Pending owner deployment.** The owner confirmed they will deploy to **asra3.com** when local work is finished. Local tests do not close the live acceptance items below. Continue independent local phases while retaining these gates.

Local progress updated 20 October: Phase 1A–D and [Phase 2A Meta inbox](2026-10-19-phase-2a-meta-inbox.md) are locally complete. [Phase 2B comments/settings/control](2026-10-20-phase-2b-comments-settings.md) is complete locally. This checklist still requires the owner’s production migration/deployment and authorized live acceptance.

[Phase 2C Instagram publishing](2026-10-20-phase-2c-instagram-publishing.md) is complete locally. Its local acceptance must still be followed by reviewed real media publication, actual provider URL/state and signed event evidence on the intended deployment.

## Deployment inputs

1. Deploy the reviewed application and worker from `docker-compose.yml`, or run the equivalent private worker endpoint from the deployment system.
2. Apply the existing baseline schema and migrations `20261019000002_oauth_sessions.sql`, `20261019000003_phone_purchase_intents.sql`, `20261019000004_durable_webhooks.sql` and `20261019000005_conversation_control_projection.sql` to the intended Supabase project. They have been tested in disposable PostgreSQL; production application remains the owner's deployment step.
3. Set `NEXT_PUBLIC_APP_URL=https://asra3.com`, the intended Supabase public URL/key, server-only `SUPABASE_SERVICE_ROLE_KEY`, private `SESSION_SECRET`, `ZERNIO_API_KEY`, matching `ZERNIO_WEBHOOK_SECRET`, and a random `WEBHOOK_DRAIN_SECRET` of at least 32 characters. The app and worker must receive the same drain secret.
4. Use the confirmed canonical Zernio receiver `https://asra3.com/webhooks/zernio`. `/api/webhooks/zernio` is an alias to the same handler; one registered receiver avoids duplicate subscriptions. The receiver update was confirmed by the earlier read-only provider check.
5. Verify that the deployment starts the worker, retains its required runtime configuration and can reach the intended database/provider. Keep the organization-to-profile mapping tied to its actual provider `externalId`.

## Live evidence to collect

| Journey | Required observation |
| --- | --- |
| Sign-in and isolation | Two test workspaces see only their own accounts/resources. Anonymous, removed-member, viewer-write and foreign-account requests fail. |
| Existing WhatsApp number | User consent completes; the selected WABA and number produce the expected active account. Cancellation/expiry recover without a false connected badge. Validate Cloud API and the supported coexistence option separately. |
| Purchased number | Reviewed number/price leads to the actual provider purchase/payment/compliance state; repeat intent does not purchase again. After activation and consent, the correct number maps to its WhatsApp account. |
| WhatsApp send/receive | A designated opted-in recipient receives the agreed text/media/template. Their reply appears once in the correct inbox. Delivered/read/failed states follow actual receipts; window/template rejection is visible. |
| Broadcast | A reviewed draft and explicit opted-in recipients are retained across an interrupted request. Dispatch and failures match provider state. |
| Facebook connection | The intended Page is selected. Reconnecting another Page is rejected; revoked permissions produce a recoverable connection state. |
| Facebook publishing | A draft appears on refresh, an agreed post has a real Facebook URL, and a scheduled post changes to published or failed based on provider evidence. Verify partial/failed results where possible. |
| Instagram publishing | Reviewed owned professional account media produces actual feed/carousel/Reel/Story results where authorized, with real URL/state. Check provider MIME/accessibility/size and platform dimensions/duration separately; compare returned quota, verify future schedule behavior and reconcile partial/unknown outcomes using the persisted post. |
| Removal and disconnect | Removing a post record is distinguished from platform unpublishing. Account disconnection is confirmed by provider inventory before the UI clears it. |
| Signed webhooks | A genuine signed event reaches the registered receiver, resolves the intended tenant and is journaled once. Invalid signatures fail, and duplicate delivery does not duplicate effects. |
| Worker/restart recovery | Pending customer webhook jobs survive restart, retry a temporary failure and record success only after acknowledgment. Receivers deduplicate event IDs because delivery is at least once. |
| Messenger/Instagram inbox | Authorized customer initiates the thread; reviewed replies and request acceptance reach the correct platform account. Closed-window, permission and standby-owner failures are visible; receipts and control changes follow provider/webhook evidence. |
| Meta comments | An authorized organic post/comment is retrieved with native IDs. Reviewed public reply, hide/unhide/delete and a separately reviewed one-shot private reply produce actual platform results; consumed/unknown private outcomes never trigger automatic retry. |
| Selected Meta settings/control | GET/PUT/DELETE of greeting/menu/ice-breakers matches canonical provider settings. Configured primary receiver and receiving app permit authorized pass/take/request/release; pending requests do not fabricate owner changes. |

Record the deployment revision, time, anonymized resource identifiers, provider status/request IDs, relevant journal/outbox observations and the customer-visible outcome. Do not put credentials or customer message contents into the review report.

## Local checks before handoff

Run the combined phase tests, `npm run test:phase1c:database`, `npm run typecheck`, `npm run build`, `node scripts/tests/phase1a-http-smoke.mjs` and `docker compose config --quiet`. Browser fixtures and provider simulations supply complementary local evidence. None sends to a live recipient or replaces the live checks above.
