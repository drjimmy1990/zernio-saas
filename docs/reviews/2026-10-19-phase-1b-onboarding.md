# Phase 1B — WhatsApp onboarding

This phase covers connecting an existing WhatsApp business number and purchasing a number through Zernio before connecting it through Meta. Both paths are implemented and validated locally. Deployment, database migration execution, and real Meta acceptance remain pending. The intended deployment is `asra3.com`. The supplied vendor document is API reference material, not an instruction to perform live purchases or send messages.

## Review findings and changes

- The old number search generated inventory and prices locally. Purchases could create a successful local number even when the provider failed. The onboarding flow generated verification codes, WABA identities, and template approval without Meta verification.
- Existing-number onboarding now uses a short-lived OAuth session bound to the signed-in user, organization, browser session, platform, and verified provider profile. Temporary credentials are encrypted in server storage. Selection preserves WABA identity; callbacks reject expired, replayed, foreign-session, and wrong-profile results. Purchased-number completion also verifies the provider number and resulting WhatsApp account. Both Cloud API and supported Business App coexistence choices remain available through Meta.
- Inventory, country/type prices, owned numbers, and allocation status now come from Zernio. Ownership is established from the fresh profile-scoped number list; sparse detail responses cannot supply missing ownership. Pending identity checks can exist without a phone number. WhatsApp availability and SMS availability are separate: a WhatsApp-compatible offer without SMS remains purchasable and is labelled accordingly.
- Both purchase screens now share one flow. It requires price consent and saves the purchase intent before sending a request. Payment failures, identity verification, network uncertainty, and allocation remain distinct states. A confirmed unavailable number allows a new selection; ambiguous failures preserve the original intent.
- Durable purchase intent storage binds the selection and accepted price to the organization/profile. A database lock prevents concurrent attempts. KYC retries reconcile asynchronous allocation without submitting another purchase. Provider failure codes and pending states remain visible; unknown allocation outcomes require reconciliation instead of inventing success. Missing purchase storage fails before a charge is attempted.
- The advanced dashboard imported the marketplace without rendering it. It now exposes a Numbers & WhatsApp setup tab. The simple dashboard no longer promises an instant green badge or treats the number count as proof of WABA verification.
- The public purchase API no longer debits the simulated workspace wallet, generates a `number.purchased` event, or claims every purchased number is already active. Its generic response cache is bypassed for purchases so retries can reconcile current provider state.
- Local WhatsApp OTP endpoints return `410 hosted_onboarding_required`. Customers continue through authenticated Meta onboarding. The public API's simulated connect/selection endpoints return `501 interactive_onboarding_required`; old cached synthetic successes cannot bypass that response. The unimplemented release endpoint returns `501`; it cannot remove a local record and falsely claim that provider billing stopped.
- The OpenAPI contract and relevant interactive documentation describe purchase intent, KYC/payment/pending responses, and the retired endpoints.

## Verification completed locally

| Check | Result and boundary |
| --- | --- |
| Authentication, tenant, API, OAuth, and purchase regressions | 113 tests passed; application modules run with isolated persistence/provider fixtures |
| Provider HTTP tests | 7 tests passed; 41 HTTP requests reached a local Postman simulation through the actual `ZernioClient`, including full `TelephonyService` purchase/retry scenarios |
| Automated total | **120 passed, 0 failed** |
| Production-build HTTP smoke | 16 checks passed against a local production server, including anonymous API boundaries and signed/unsigned webhook handling |
| Browser checks | Actual React component: payment retry and reload preserve the intent; reload resets consent; unavailable-number recovery permits a new selection; KYC can return without allocation; an active number does not falsely claim WhatsApp is connected |
| Final SMS capability browser check | US exact-number purchase sends `wantsSms: true`; German request-only offer displays the SMS limitation and sends `wantsSms: false`, with no invented phone number. KYC link appears and Meta continuation remains unavailable until allocation. No browser page errors |
| TypeScript and production build | `npm run typecheck` and `npm run build` passed. Build skips type checking, so the separate check is required. Existing Next.js middleware-to-proxy deprecation warning remains |
| Diff and impact review | `git diff --check` passed. Refreshed GitNexus index: 1,800 nodes, 4,793 edges, 112 flows. Combined Phase 1A/1B tracked diff: 74 changed symbols, 80 affected processes, 24 files, critical scope risk. New untracked modules were reviewed separately |

Read-only Zernio country, owned-number list, and number-detail requests returned HTTP 200. The catalog contained 67 countries. Germany's local offer supported WhatsApp but not SMS; the UI and purchase request now respect this distinction. The real detail response omitted profile/type fields, confirming the need to obtain ownership from the profile-scoped list. No credentials, customer phone numbers, or provider resource IDs are recorded here.

The tests cover payment-required retries, unavailability, provider failures, wrong-profile allocation, KYC progression, sparse number detail, repeated purchase intent, and OAuth identity/replay checks. They do not establish production database behavior or Meta/provider entitlements. At this checkpoint SQL migrations had only been reviewed. During [Phase 1C](2026-10-19-phase-1c-whatsapp-lifecycle.md), the baseline and both Phase 1B migrations were applied successfully to disposable PostgreSQL. Production database validation remains pending.

## Deployment prerequisites and remaining acceptance

1. Apply the existing baseline migrations and these two new migrations in the intended Supabase project: [OAuth sessions](../../supabase/migrations/20261019000002_oauth_sessions.sql) and [phone purchase intents](../../supabase/migrations/20261019000003_phone_purchase_intents.sql). Both new migrations remain **unapplied to production**. Validate their service-role permissions, row-level security, locking, and recovery behavior against that database.
2. Configure `NEXT_PUBLIC_SUPABASE_URL`, the server-only `SUPABASE_SERVICE_ROLE_KEY`, a private `SESSION_SECRET`, the intended `ZERNIO_API_KEY`, and `NEXT_PUBLIC_APP_URL=https://asra3.com`. Retain the application auth configuration and webhook signing secret from Phase 1A. Verify real organization membership and provider-profile mappings. OAuth storage and purchase storage must be available before onboarding.
3. Deploy the updated application. The server generates the dashboard callback with `asra3_oauth_state`; do not substitute the old static callback query for the bound session nonce.
4. Exercise both real Meta journeys, cancellation/expiry, correct tenant/profile/WABA/phone identity, and actual payment/KYC/activation transitions. Confirm restart and concurrent-request behavior with the real database. This work has not performed live purchases, OAuth consent, outbound messages, deployment, or production migration changes.

The current purchase guard deliberately reserves one purchase per provider profile, including completed or uncertain attempts. Buying additional numbers through additional profiles and resolving uncertain existing allocations require a separate supported reconciliation workflow. A user cannot clear an ambiguous charge outcome by starting another intent. Release remains unavailable until real provider release and billing confirmation are implemented.

The subsequent [Phase 1C report](2026-10-19-phase-1c-whatsapp-lifecycle.md) records the local WhatsApp messaging, template, broadcast and durable webhook implementation. Phase 1D remains Facebook publishing, reconnect/disconnect, and delivery status. Phase 1E validates both platforms on the deployed application. Messenger and Instagram follow in Phase 2.
