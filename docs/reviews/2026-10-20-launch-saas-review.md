# SaaS security and provider allowance foundation

20 October 2026. Implemented locally; live deployment acceptance remains separate.

## Saved implementation

- Supabase signup sends verification without auto-confirming an email or issuing a workspace cookie. Verified login provisions/reuses the workspace transactionally, recovering interrupted registration. Recovery verifies the token with Supabase, revokes application sessions and keys, changes the password and rechecks revocation. Durable throttling and same-origin mutation checks are enforced.
- Customer sessions have persisted identifiers and a security version. Each protected request verifies the current user, email ownership, session, membership and active organization. Previous nonpersisted cookies must sign in again. Platform administrator sessions require explicitly configured private credentials and are invalidated by credential rotation; known public sample passwords are rejected.
- `/api/saas` owns authenticated settings, workspace switching, recipient-bound expiring invitations, owner role changes and removal with a locked last-owner check, session revocation, and expiring read/write API keys. Keys are shown once and stored as SHA256 hashes; old local plaintext keys are retired. Each resolution checks current issuer membership, active tenant, verified user, expiry, revocation and scope.
- Global/plan/tenant administrator writes are persisted and audited in one PostgreSQL transaction. Failed writes cannot create successful cache state. Tenant deletion archives and revokes access while retaining data. Provider credential minting has no fake fallback. Reporting records no collected customer revenue and leaves unobserved provider costs unavailable.
- Effective policy reads are durable and fail closed. Missing global/plan/workspace or failed reads cannot grant a default agency policy. `null` inherits, `[]` denies, and `0` remains a zero quota. Server admin clients require the service-role key; the anonymous-key fallback is removed.
- Migration `20261020000007_saas_security.sql` is additive and transactional. Security, keys, invitations, spending and audit tables are server-only. Authenticated global-config access is revoked; baseline broad member delivery/account/paid writes are restricted. CRM's own contact policies remain intact. Sensitive RPCs cannot be invoked by anonymous/authenticated database roles.
- Provider allowances use durable integer USD minor units, org locks, immutable operation intent, reserve/settle/release entries and administrator allocations. Defaults are zero/disabled. Message ceilings and max units are explicitly approved and labelled **admin spending allocation, not provider quote**. Unknown outcome/cost retains its reservation. Provider-confirmed overrun is recorded and disables further spending. New legacy-wallet initializers are zero; existing financial records are preserved.
- Canonical WhatsApp sends reserve internally before either recipient or conversation dispatch. Replays and changed payloads under an existing intent cannot redispatch; provider 429 retries are disabled. Success preserves the actual provider message ID and pending cost reservation; errors preserve provider fields plus the reservation identifier.
- `SaasWorkspace` needs no props and fetches cookie context. English/Arabic settings cover teams, invites, keys, sessions, allowances and Coming soon payments. Administrator settings allow explicit promotional allocations and message approvals. A confirmed key survives a failed follow-up refresh.

## Local evidence

- `node --test scripts/tests/launch-saas-http.test.mjs`: 10 checks, actual Supabase SDK over loopback HTTP, including verification/recovery/partial signup, outages/throttling, revocation, key issuer and policy semantics.
- `node --test scripts/tests/launch-saas-whatsapp.test.mjs`: 4 checks, actual canonical service and Zernio client against Postman simulation, 40 HTTP requests. No provider network traffic. Disabled/insufficient/outage allocation blocks dispatch; permission/429/malformed/unknown responses retain reservation and prevent replay.
- `node --test scripts/tests/launch-saas-browser.test.mjs`: 5 checks. Owner invitation/key flow, Arabic 390px viewer isolation/no overflow, administrator allocation ceilings, confirmed-key refresh failure and uncertain allocation intent retained across reload. Screenshots: `launch-saas-desktop.png`, `launch-saas-mobile-rtl.png`, `launch-saas-admin-desktop.png` under `docs/reviews/screenshots`.
- `node scripts/tests/launch-saas-postgres-check.mjs`: disposable PostgreSQL16, baseline plus ordered migrations through07, existing customer/contact preservation, last owner, manager denial, same-intent replay, concurrent budget competition, settlement evidence, key/session revocation, global secret/RPC/direct membership write denial, invitation ownership/one-shot acceptance, transactional admin rollback and archive. No production SQL or external writes.
- TypeScript passes. No commits or deployment. Existing earlier fixture loaders require new SaaS auth/allowance mocks and superseded signup assertions must use verification semantics; their legacy failures are not a passing combined regression claim.

## Root integration and acceptance still required

1. Replace public bearer `WorkspaceStore.resolveApiKey` and old key CRUD dispatchers with `SaasApiKeyService.resolve/create/revoke`; enforce read/write required scope. This integration belongs to root.
2. `/api/admin` must use `requireTenantAccess` and canonical superadmin role so direct cookie decoding cannot bypass credential rotation or same-origin mutation protections. Root owns this route integration.
3. Phone template adapters must avoid a second allowance around the now-reserving canonical WhatsApp service. The phone owner was notified; keep reservation evidence in its operation for reconciliation. Campaign owner controls campaign reservations.
4. Mount administrator SaaS settings if needed and preserve legitimate webhook management in a dedicated protected settings view. Customer payment collection, self-credit, automation, ads and commerce remain server-disabled by root dispatchers.
5. Re-run combined channel/auth tests after fixture integration, final build and production smoke. Configure private server keys, app origin, Supabase email confirmation/SMTP and redirect allowlists; apply all pending SQL in order only after backup. Email delivery and authorized provider operations require separate owner live acceptance.

GitNexus upstream analyses preceded existing-symbol edits. Shared database/auth/policy/initializer edits had CRITICAL blast radii and canonical WhatsApp send HIGH; parent/user warnings were delivered. New unindexed symbols reported UNKNOWN, not proof of safety.

## Final integration update

The root integration is complete. Legacy auth/API fixtures were updated for verified email and durable security, and the public API/services/admin routes use the current security boundary. Combined verification and remaining launch limits are recorded in [the final review](2026-10-20-launch-final.md). Earlier fixture failures above are historical, not the final result.
