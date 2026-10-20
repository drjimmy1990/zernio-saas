# Zernio integration review and phased delivery plan

Date: 19 October 2026. Scope: the current local checkout, the supplied Zernio guides, installed SDK contracts, and limited read-only checks using the configured Zernio key.

**Verdict: Phase 1 does not pass.** There is substantial UI and service scaffolding, and some real Zernio calls, but several customer actions manufacture successful local results. Authentication defects also expose the shared connection and messaging infrastructure. A successful build is not evidence that a Facebook post or WhatsApp message reached its destination.

This is the initial audit snapshot and roadmap. The subsequent local repairs and their validation are recorded in [Phase 1A fixes](2026-10-19-phase-1a-fixes.md), [Phase 1B onboarding](2026-10-19-phase-1b-onboarding.md), [Phase 1C WhatsApp lifecycle](2026-10-19-phase-1c-whatsapp-lifecycle.md) and [Phase 1D Facebook lifecycle](2026-10-19-phase-1d-facebook-lifecycle.md). Findings, the capability matrix, and source line references below describe the pre-fix checkout unless stated otherwise. These reports do not certify a production deployment.

## Product understanding and scope

The intended product is Asra3: a customer-facing SaaS powered by Zernio. A customer signs in to an isolated workspace, connects their own business accounts, and manages publishing and conversations from the dashboard or developer API. The server owns provider credentials; the browser sees verified account state and actionable errors.

The user confirmed **both WhatsApp onboarding options**:

1. Connect an existing WhatsApp Business number, including an explicit choice between Cloud API onboarding and supported WhatsApp Business app coexistence.
2. Purchase a number through Zernio, complete the actual payment/compliance/activation steps, and connect the resulting number to WhatsApp.

These are separate provider workflows. A locally generated OTP, number, WABA ID, or approved-template record cannot stand in for either workflow.

The user confirmed **`asra3.com` as the deployment target**. Use `https://asra3.com/webhooks/zernio` for the Zernio subscription. Phase 1B now generates dashboard OAuth callbacks with a server-bound `asra3_oauth_state` nonce. The equivalent `/api/webhooks/zernio` route delegates to the same handler; register one canonical receiver to avoid duplicate subscriptions. The user changed the subscription; a subsequent read-only check confirmed the active destination is now `asra3.com/webhooks/zernio` with 80 events. Production signed delivery remains to be verified.

The supplied `zernio.txt` is reference material. Its opening explicitly says it contains guides, not the complete endpoint reference; use the current OpenAPI and installed SDK alongside it. Historical requirements in `ORIGINAL_REQUEST.md` provide context, including the earlier desire to remove dummy data; they are not new commands to reset data or execute purchases.

## Live observations

Read-only requests on 19 October 2026 returned:

| Check | Observed result | What it establishes |
| --- | --- | --- |
| Zernio `GET /profiles` | HTTP 200; 2 profiles, 1 with `externalId` | The configured key is accepted and can read those profiles |
| Zernio `GET /accounts` | HTTP 200; 2 accounts: `phone` and `sms` | No Facebook or WhatsApp account appeared in the account set accessible to this key |
| Zernio `GET /webhooks/settings` | HTTP 200; 1 active endpoint, 80 subscribed events | A webhook subscription exists |
| Webhook destination | Initially `techurity.si`; after the user's update, active at `asra3.com/webhooks/zernio`, 80 events | Destination now matches the intended deployment; signed production delivery remains unverified |
| Confirmed deployment reachability | `https://asra3.com/` returned 200; both webhook paths returned 405 to GET, without redirects | HTTPS host is reachable and the webhook paths reject GET; signed POST delivery and authentication remain unverified |
| Relevant subscriptions | `account.connected`, `message.received`, `whatsapp.number.activated` present | These events are subscribed, but actual delivery to this app is unverified |
| Local workspace file | 0 persisted workspaces/accounts | Local file state is empty; this does not establish the contents of Supabase |
| Configuration presence | Zernio key, webhook secret, session secret, Supabase URL/service key present | Presence only, not a test of every credential or deployment configuration |

Do not infer that other Zernio teams/keys have no connected accounts. These observations apply to the configured key. The user subsequently selected `asra3.com`; no live Zernio subscription was changed during the review or reachability check. GET 405 alone does not prove that the POST receiver is secure or processes events correctly.

## Confirmed findings, in repair order

Priorities: P0 blocks deployment because authorization or all-workspace data is exposed; P1 blocks core connection/workflow acceptance; P2 is an important correctness or recovery gap.

### F01 — P0: connection/service APIs trust a caller-supplied tenant

`src/app/api/connect/route.ts:197` reads `organizationId` directly from the request body, with a demo fallback, and performs no session validation. `src/app/api/services/route.ts:24` and `:188` accept an organization from query/body; they consult the cookie only when it is omitted, then fall back to a default tenant rather than rejecting anonymous access. Middleware only matches dashboard/admin pages (`src/middleware.ts:33`).

**Consequence:** a request can choose another organization for connection actions, workspace reads, and service mutations. The service GET response also includes developer keys and webhook objects (`src/app/api/services/route.ts:168`), increasing the impact of an unauthorized workspace read. Provider calls use the server's key.

**Repair:** authenticate every API request first, derive tenant membership from that identity, authorize each resource ID against that tenant, and expose a separate explicit admin operation if cross-tenant access is needed. Verify both anonymous denial and tenant A/B isolation before real messaging or purchasing.

### F02 — P0: an unissued API key can select a workspace with full access

`src/lib/storage/workspace-store.ts:1230` accepts any matching `tk_live_...` or `tk_test_...` string after lookup fails. It matches a normalized tenant name and returns a synthetic key with `full_access` at `:1250`.

**Evidence:** an isolated execution of the actual class resolved an unissued key to a seeded in-memory victim workspace with full access. No real tenant was queried or changed.

**Repair:** only stored, active, securely verified credentials authenticate. Unknown and revoked keys must fail; test fixtures belong in an isolated test harness.

### F03 — P0: workspace reset executes before authentication

`src/app/api/v1/[...path]/route.ts:472` honors a reset header before auth. At `:476`, both reset paths call `WorkspaceStore.resetMemoryAndDisk()` and return before the auth block begins at `:488`.

**Evidence:** an isolated invocation of the real POST handler returned 200 and invoked the substituted reset sink with zero authentication checks. The real reset endpoint was not called.

**Repair:** remove production reset hooks and place test cleanup outside the public application. This affects every workspace, so it belongs in Phase 1's shared baseline even though it is not platform-specific.

### F04 — P1: missing webhook secret permits unsigned state changes

`src/app/api/webhooks/zernio/route.ts:237` performs signature verification only if the secret exists and is not the recognized placeholder. Otherwise processing continues, trusts `profiles[0].externalId`, and persists the event.

**Evidence:** an isolated production-mode invocation with an absent secret accepted an unsigned account event and added its account to memory. The current `.env.local` does contain a secret; this finding describes the unsafe missing/misconfigured-secret behavior, not a claim that the live receiver is currently unsigned.

**Repair:** fail closed when signature configuration is unavailable, validate the envelope, and resolve trusted tenant/profile mappings. Preserve the existing raw-body HMAC and timing-safe comparison. Vendor guide: `zernio.txt:23701`, `:23929`.

### F05 — P1: provider profile failures are persisted as invented IDs

`src/lib/services/core-connect.service.ts:63` handles the documented existing-profile conflict, but every other error falls through to an invented profile ID at `:71`; that ID is then saved at `:75`.

**Consequence:** an outage, rejected key, or provider error can leave an organization mapped to a nonexistent profile, breaking subsequent connection operations and event routing.

**Repair:** reuse only the documented conflict result; otherwise preserve and surface the provider failure. Persist a mapping only after verified creation/retrieval. Reconcile existing mappings before reuse. Also model provider-returned profile assignment for purchased numbers rather than assuming one organization can only ever have one provider profile; the purchase guide describes automatic profile reassignment (`zernio.txt:41154`).

### F06 — P1: headless Facebook and WhatsApp selection lose required information

The dashboard callback parser (`src/app/dashboard/page.tsx:245`) drops Facebook's `userProfile` and `connect_token`. The wizard selection request (`src/components/dashboard/ConnectionWizardModal.tsx:759`) sends neither `userProfile` nor WhatsApp `wabaId`. The API normalizer reduces a WhatsApp number's WABA to display text (`src/app/api/connect/route.ts:302`) instead of retaining it as structured selection data. The service only forwards those fields if supplied (`src/lib/services/core-connect.service.ts:343`).

**Consequence:** final Facebook selection lacks its required user profile; the WhatsApp number picker cannot supply the documented WABA/number pair. The picker also does not normalize the documented `verified_name` and `display_phone_number` fields, making the number hard to identify.

**Contract:** Facebook callback decoding and selection: `zernio.txt:14822`, `:14871`; installed SDK `src/generated/types.gen.ts:21795`; current OpenAPI `POST /v1/connect/facebook/select-page`. WhatsApp number response and selection: `zernio.txt:45649`, `:45664`, `:45679`.

**Repair:** retain the exact typed selection context and short-lived connection proof, correlate it to the authenticated session, and validate the resulting account/profile server-side. The direct callback branch at `src/app/api/connect/route.ts:322` also creates a healthy record from caller-supplied IDs without a provider read; replace that with verified reconciliation. Missing `X-Connect-Token` alone is not asserted to guarantee failure because the current spec also supports bearer authentication.

### F07 — P1: purchased-number provisioning fabricates stock and ignores provider outcomes

`src/lib/services/telephony.service.ts:75` constructs available numbers from a local country catalog. `buyPhoneNumber` creates its own number ID/state before calling Zernio; the call at `:204` omits `profileId` and `purchaseIntentId`, ignores the returned number, and catches failures at `:213` before reporting local success.

**Consequence:** a rejected purchase can look active; a successful purchase can be detached from its real provider ID, profile, price, and KYC state. Retrying lacks the provider's purchase-intent protection.

**Repair:** use actual inventory/prices, submit the documented purchase request, store the returned number/profile IDs, preserve `202 kyc_required` and other intermediate states, and reuse a stable purchase intent. Vendor guide: `zernio.txt:41121` through `:41169`. Do not describe every number as immediately WhatsApp/SMS ready.

### F08 — P1: WhatsApp linking, OTP, templates, and test sends are simulated even with a key

`linkWhatsAppBusiness` creates fixed OTP `481-923`, a local WABA ID, and three approved templates (`src/lib/services/telephony.service.ts:257`), then marks the number linked without a provider request. The API's verification branch does not validate a submitted OTP before calling it (`src/app/api/v1/[...path]/route.ts:1694`).

`sendTestWhatsAppMessage` constructs a local message ID and sets `read` at `src/lib/services/telephony.service.ts:394`; its return value says delivered/read at `:419`. It never sends a provider request. The normal purchased-number inbox uses this same action for replies (`src/components/dashboard/LiveSmsAndWhatsAppInbox.tsx:99`). The public template endpoint also supplies invented approved templates (`src/app/api/v1/[...path]/route.ts:1741`).

**Repair:** complete real onboarding; synchronize actual templates/statuses; send through documented conversation/template endpoints with real account IDs and stable send intent; derive delivered/read/failed state from provider responses and webhooks. Surface template-required/closed-window errors. The guide explains Business app QR coexistence at `zernio.txt:45782`, hosted onboarding at `:45697`, and send restrictions/idempotency at `:47604`.

### F09 — P1: incoming WhatsApp data does not reach the purchased-number inbox consistently

The webhook writes incoming messages and delivery updates to `ws.inboxConversations` (`src/app/api/webhooks/zernio/route.ts:346`, `:391`). The purchased-number UI reads `ws.threads` through `TelephonyService.listNumbersAndCapabilities` (`src/lib/services/telephony.service.ts:1029`) and accepts `threads` props (`src/components/dashboard/LiveSmsAndWhatsAppInbox.tsx:29`). There is no reconciliation between these two paths.

The template handler expects `event.whatsapp` (`src/app/api/webhooks/zernio/route.ts:519`), but Zernio sends `event.template` (`zernio.txt:25119`). An isolated invocation with a documented rejection payload left the stored template `PENDING` instead of `REJECTED`. Number activation/suspension event names are listed as supported but have no state-transition handler in the receiver.

**Repair:** use one canonical, tenant-scoped conversation/message store, preserve account/number identity, process the actual template payload, and implement number activation/suspension/release transitions. A supported-event list is not implementation coverage.

### F10 — P1: the Facebook composer reports publication without publishing

`src/components/dashboard/wizards/SmartPostComposerWizard.tsx:167` sends to `/api/v1/posts` with `accountId: 'default'` and `mediaUrls`. The handler at `src/app/api/v1/[...path]/route.ts:1182` drops per-platform settings; at `:1225` it constructs a local ID, status, and URL, saves it, and dispatches `post.published` without calling Zernio. This is unconditional, including when the provider key is configured.

**Repair:** all UI and API publishing routes must use the real publishing service with selected Facebook Page account IDs, documented `mediaItems`, scheduling/timezone, and platform-specific fields. A scheduled post is not a published post. Read and display provider results and genuine platform URLs.

### F11 — P1: connection tests and health screens manufacture confirmation

The connection test does call the real publishing service, but its response builder at `src/app/api/connect/route.ts:620` ignores returned HTTP/post status and emits a delivered receipt with generated timing/token-life fields. Zernio can return HTTP 207 with a failed, partial, or retrying/scheduled post (`zernio.txt:15307`).

The account hub's `/api/v1/accounts/health` uses local state and hardcodes successful token/platform/webhook probes (`src/app/api/v1/[...path]/route.ts:915`). A different workspace path calls real health (`src/lib/services/core-connect.service.ts:451`), then silently falls back on failure at `:474`.

**Repair:** use one provider-backed health/result model; distinguish confirmed, pending, failed, stale, and unavailable states. A successful HTTP exchange is not delivery evidence.

### F12 — P1/P2: disconnect, reconnect, and callback failure recovery are incomplete

Disconnect removes only local data in all three entry points: `src/app/api/connect/route.ts:688`, `src/app/api/services/route.ts:210`, and `src/app/api/v1/[...path]/route.ts:826`. None invokes the provider's `DELETE /v1/accounts/{accountId}`.

Reconnect only resets the wizard (`src/components/dashboard/ConnectionWizardModal.tsx:834`) and omits `reconnectAccountId`; callback parsing ignores error/cancellation parameters (`src/app/dashboard/page.tsx:245`).

**Repair:** confirm remote disconnection before updating local state; reconnect the selected account with an identity guard; preserve selection context and callback URL; show cancellation, permissions, expired session, and provider request IDs accurately.

### F13 — P2: live posts and webhook retries can leave inconsistent persistence

Live post creation writes Supabase (`src/lib/services/publishing.service.ts:122`), while `listPosts` only reads the local workspace (`:265`). The dashboard refresh therefore misses those live records.

The webhook records local deduplication before the Supabase work, saves at `src/app/api/webhooks/zernio/route.ts:581`, and on retry returns early at `:276`. It also writes a database dedup marker before database effects and does not inspect returned database errors (`:607`). A failure after the local save can therefore suppress retry of unfinished database work. Outbound fan-out is awaited before acknowledgement; two slow registered destinations can exceed the provider's five-second acknowledgement limit (`zernio.txt:23909`). The outbound sender reports timeouts as queued at `src/lib/storage/workspace-store.ts:1384`, without persisting a retry job in that path.

**Repair:** establish one durable source of truth, persist the inbound event with processing state, perform effects/retries transactionally or through a durable worker/outbox, and acknowledge within the provider limit. Reconcile API reads with that same state.

## Current capability matrix

| Workflow | Status |
| --- | --- |
| Provider key and basic reads | Verified by limited live GETs |
| Facebook OAuth URL and Page-list calls | Real calls present; end-to-end consent not exercised |
| Facebook final Page selection | Required callback context missing |
| Existing WhatsApp connection | OAuth scaffolding present; selection and completion validation incomplete |
| Purchased WhatsApp number | Inventory, provisioning, linking, and receipts contain local simulation |
| WhatsApp send/receive and template state | Divergent stores and incorrect/simulated state transitions |
| Facebook main composer | Local success path; does not publish upstream |
| Health/reconnect/disconnect | Inconsistent health; reconnect and remote disconnect incomplete |
| Shared webhook delivery | Subscription exists; deployment destination and real delivery unverified |
| Tenant/security boundary | Does not pass |

## Phase-by-phase roadmap

Current local progress: Phase 1A–D, [Phase 2A Meta inbox](2026-10-19-phase-2a-meta-inbox.md), [Phase 2B comments/settings/control](2026-10-20-phase-2b-comments-settings.md) and [Phase 2C Instagram publishing](2026-10-20-phase-2c-instagram-publishing.md) are complete locally. Phase 1E remains pending owner deployment to asra3.com; the original findings and capability matrix above remain the initial audit snapshot. Remaining CRM/growth automation and other product capabilities belong to Phase 3 below.

| Checkpoint | Work | Exit criteria |
| --- | --- | --- |
| **1A — Shared safety and truthful state** | F01–F05; remove implicit live success simulation; authoritative tenant/profile/account mapping | Anonymous/foreign-tenant requests denied; unknown/revoked keys denied; no public reset; missing/bad signatures denied; provider failures cannot create successful local records |
| **1B — WhatsApp onboarding, both options** | Existing-number consent/coexistence; purchased-number inventory, purchase intent, KYC, activation; typed WABA selection | Actual account and number IDs reconcile with the intended profile; cancel/expiry/conflict/KYC states are recoverable; repeat purchase intent cannot create a second purchase; no active badge before provider confirmation |
| **1C — WhatsApp working lifecycle** | Template synchronization and approval; text/media/template sending; inbound conversations and receipt updates; eligible broadcast flow | Designated test recipient receives the agreed message; their reply appears once in the correct workspace and number inbox; real delivered/read/failed status; correct template/window rejection; duplicate/redelivered webhook safe; restart preserves state |
| **1D — Facebook working lifecycle** | Consent/Page picker; reconnect/disconnect; real composer and media; immediate/scheduled publishing; results and health | Correct Page saved; wrong-Page reconnect denied; real post ID/URL and status verified; scheduled→published/failed reconciled; partial/failed 207 shown correctly; remote disconnect confirmed |
| **1E — Phase 1 acceptance** | Validate the updated `asra3.com` receiver/signing configuration; UI→API→Zernio→webhook→UI journeys; two-tenant isolation and failure recovery | Evidence pack identifies each provider resource and outcome; no simulated result presented as live; signed events reach `https://asra3.com/webhooks/zernio` and are processed once; deployment callbacks reach Asra3; all Phase 1 blocking findings closed |
| **2 — Messenger and Instagram** | Facebook Page messaging permissions, inbox/replies, comments/private replies, handover; Instagram login/account selection, DMs and publishing; applicable limits | Each platform passes the same verified connection, send/receive, webhook, error, tenant-isolation, reconnect/disconnect lifecycle; separate acceptance evidence |
| **3 — Remaining product capabilities** | Prioritize remaining CRM/automation, voice/SMS, ads, analytics, commerce, and other channels in small slices | Each slice has a concrete customer journey and provider-backed acceptance tests before claiming feature parity |

“Full work” in Phase 1 means the complete customer lifecycle above, not implementing every advanced WhatsApp, advertising, or commerce endpoint in the vendor catalog. Advanced WhatsApp Flows, Business Agent, calling, groups, catalogs, and Facebook ads need their own selected scope after the core lifecycle passes. Existing capabilities must not be advertised as working just because a route returns 200.

## Verification performed and limitations

- `npm run typecheck`: passed.
- `npm run build`: passed. Next.js warned that `middleware` is deprecated in favor of `proxy`. Build configuration skips type checking, so the separate successful typecheck is relevant.
- Four isolated executions of actual application code confirmed: unissued-key authentication, reset before auth, unsigned webhook acceptance with missing secret, and ignored documented template payload. Filesystem writes were replaced by an in-memory sink and network access disabled. These are targeted code probes, not full HTTP or provider integration tests.
- Read-only Zernio profile/account/webhook checks: passed as described above. Credential values were not printed or stored in this report.
- Existing connection tests assert synthetic entities and health (`scripts/verify-connect-pipeline.mjs:113`, `:137`). Some broader scripts reset workspace files (`scripts/verify-api-v1-parity.mjs:659`, `scripts/test-full-platform-e2e.mjs:103`). They were inspected, not run against customer state. Their current success criteria do not certify real provider delivery.
- GitNexus query was attempted; keyword search is degraded because its FTS extension is missing. Security explain reports no indexed taint layer. Source and contract inspection were used; absence of graph findings is not a clean security result.
- Postman Orbit discovery returned direct Meta endpoints, not the requested Zernio integration contract. It was not used as a substitute for Zernio's guides/SDK/OpenAPI.
- One Sol 6.1 subagent completed an independent Facebook audit; other delegation attempts hit provider rate limits. Their unfinished work was completed in the primary review.
- No live OAuth journey, purchase, outbound message, post, production reset, or real webhook mutation was performed. Supabase contents and live deployed route behavior were not audited in this pass.

Current local status is tracked in the Phase 1A–D, Phase 2A and Phase 2B reports linked above. The owner confirmed on 19 October that they will deploy to asra3.com after local work is finished. Retain the [Phase 1E deployment/live acceptance checklist](2026-10-19-phase-1e-deployment-acceptance.md) while completing the ordered [Messenger/Instagram local work](2026-10-19-phase-2-messenger-instagram-audit.md). Production migrations, deployment and live acceptance remain pending; no local phase certifies live delivery.

## References

- Supplied guides: [zernio.txt](C:/Users/LOQ/Desktop/zernio.txt)
- [Zernio OpenAPI](https://zernio.com/openapi.json)
- [Zernio documentation index](https://docs.zernio.com/llms.txt)
- Installed SDK: `@zernio/node` 0.2.1214, `node_modules/@zernio/node/src/generated/types.gen.ts`
