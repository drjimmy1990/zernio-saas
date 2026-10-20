# Phase 1A — shared authorization and connection integrity

19 October 2026. Local implementation checkpoint for the [phased review](2026-10-19-phase-1-whatsapp-facebook.md). The WhatsApp and Facebook integration is not yet production-ready. This checkpoint repairs shared boundaries that must hold before implementing the remaining provider workflows.

## Changes

- Connection and service requests authenticate before dispatch, derive the workspace from the session, reject a different requested workspace, and reject cross-origin browser mutations. Account IDs are verified against the tenant's provider profile before supported account operations.
- Protected connection/service requests and the developer API's cookie-authenticated requests recheck current Supabase membership and active organization status. Removed members lose access without waiting for cookie expiry. Owners/admins manage credentials and connections; editors may publish and manage inbox content; viewers cannot mutate. Restricted roles cannot obtain API keys/webhook secrets or gain broader access through cached responses.
- Unknown or revoked keys cannot authenticate. Removed the production workspace reset endpoints/header. Idempotency replay is bound to the authenticated principal, current scopes, method, route, and request content; conflicting content returns 409. Legacy unbound cache records are ignored.
- Customer passwords are verified through Supabase. Removed public customer/admin password fallbacks, arbitrary admin personas/email-prefix elevation, plaintext password storage, guessed tenant membership, and fabricated user IDs. Signup must persist an actual UUID organization and owner membership before issuing a session. Signup starts on Starter; the browser cannot award paid-plan entitlements. The signup UI reflects that rule.
- Session signing fails closed for an absent or known public secret; malformed/expired claims are rejected. The fake Google login action was removed, and login redirects are restricted to application paths.
- Profile creation propagates provider errors. Only the documented external-ID conflict can recover an existing profile, whose ID and tenant external ID are verified. Saved profile mappings are verified before use, and failed database writes cannot create a successful local mapping.
- OAuth callback, selection, and credential completion reconcile the returned account with the provider before saving it. Returned account activity/reconnection state replaces fabricated token expiry and granted-scope claims.
- Credential requests use per-platform field allowlists. A browser cannot replace the authenticated tenant's `profileId` or inject provider request controls before the account ownership check.
- Headless selection rejects missing/simulated authorization tokens. The unfinished Snapchat public-profile selection step is blocked with 501 because its old request could overwrite the destination profile; implementing its documented selection contract is deferred to that platform's phase.
- Connection verification uses actual provider post IDs, statuses, and URLs when available. A pending, failed, or partial result cannot report successful publication. The generic WhatsApp/message test now returns an explicit unsupported response instead of inventing delivery/read receipts. Actual messaging is Phase 1C.
- Both webhook routes require a configured signing secret and exact raw-body HMAC signature. Malformed envelopes are rejected. Signed provider test events are acknowledged without touching customer state or forwarding events. Documented `event.template` payloads update only the matching account/template identity.
- A signed event must match the database's organization/profile mapping before any tenant write or forwarding. Inconsistent account/profile identity is rejected; a database lookup failure returns 503 for retry. Unscoped global events are acknowledged without tenant writes. Multi-profile events currently return 409 because forwarding their entire payload to a single tenant is unsafe; safe split routing belongs with webhook lifecycle work.

## Configuration and deployment

Read-only provider checks confirmed the user-updated active subscription targets **https://asra3.com/webhooks/zernio**, with 80 events. Local `NEXT_PUBLIC_APP_URL` also targets `asra3.com`.

The local `ADMIN_PASSWORD` still contained a known public demo password. It was replaced with a cryptographically generated private value in ignored `.env.local`. The local `SESSION_SECRET` was also rotated to invalidate pre-fix cookies. Neither value was printed or committed. To sign in locally, read the `ADMIN_PASSWORD` setting in that file; restart the local server if it has not reloaded its environment.

No production deployment or production secret change was performed. When deploying, configure a private admin password and rotate the production session secret too, so previously issued unsafe sessions cannot survive the release. Configure the Zernio webhook secret to match the active subscription. Existing users require real Supabase authentication and `org_members` records; old plaintext-file identities are not silently assigned to workspaces. Historical fabricated profile mappings must be reconciled to the correct provider profile and external ID before affected connections can continue.

## Validation

**Final isolated regression result: 70 tests passed, 0 failed.** Run `npm run test:phase1a` to repeat them. The suite loads actual TypeScript modules with controlled provider/database/filesystem substitutes and no outbound network. It exercises authorization failures, current membership/role enforcement, account/profile ownership, provisioning failures, key revocation, replay boundaries, login redirects, webhook signatures/test events/template identity, and truthful publication outcomes. These tests establish local behavior, not successful Meta consent or real delivery.

`npm run typecheck` passes separately from the production build, which deliberately skips type validation. `npm run build` passes, with the existing Next.js middleware-to-proxy deprecation warning.

After building, `node scripts/tests/phase1a-http-smoke.mjs` starts an isolated production server on loopback with fresh temporary signing secrets. Its 16 HTTP checks verify both webhook paths accept signed test events, reject missing/bad signatures and malformed envelopes, and reject anonymous connection/service/developer/reset requests. The server is stopped afterward. This is not a signed delivery from Zernio to the deployed site.

GitNexus impact checks were run before symbol edits. Individual results were UNKNOWN/lower-bound because the index lacks caller/extraction metadata. Direct caller searches supplemented them. `detect_changes(scope: all)` flagged critical aggregate impact across shared authentication, API entry points, and profile provisioning. Actual diffs were reviewed because stale line mappings can name adjacent untouched symbols. No commit was created.

## Remaining work, in order

1. **1B — both WhatsApp onboarding paths.** Preserve WABA/phone selection and OAuth context. Replace invented inventory/purchases with actual prices, stable purchase intent, returned resource IDs, KYC and activation state. Cover consent cancellation/expiry and retry recovery.
2. **1C — WhatsApp lifecycle.** Real linking, templates, sends, inbound messages and receipt reconciliation; one durable conversation source; number lifecycle events and reliable webhook retries. Local OTP/template/message simulations remain in these uncompleted paths.
3. **1D — Facebook lifecycle.** Preserve Facebook selection context, guard reconnect identity, disconnect remotely, wire the main composer to publishing, and replace hardcoded health probes. The corrected connection verification action does not fix the separate main composer.
4. **1E — acceptance on asra3.com.** Deployment configuration, designated test accounts/recipient, actual consent, signed incoming deliveries, sends/replies, posts, restart persistence and failure recovery. The configured key's earlier account read exposed only phone/SMS accounts; it did not establish an available WhatsApp or Facebook test account.
5. **Phase 2 — Messenger and Instagram**, then remaining product capabilities.

Additional signup work remains: email ownership verification and recovery/cleanup when user creation succeeds but organization or membership persistence fails. Such failures now deny a session, but may leave an orphan auth user requiring support reconciliation. No live signup, number purchase, message, post, or remote disconnection was performed during these repairs.

This is not a complete security audit of the remaining API catalogue. Fine-grained API-key permission coverage, billing/credit handling, and the existing live-health/simulation paths need review with the relevant later feature phases. The developer API now rejects an inactive resolved policy before dispatch/replay and requires account-read scope for both health endpoints, but its underlying policy resolver can still use cached fallback policy during database errors; strict outage handling for bearer-key policy verification remains to be hardened before production acceptance. Bluesky's documented credential `state` contract is also deferred to its platform phase; this change blocks caller-controlled routing state without claiming that onboarding is complete.
