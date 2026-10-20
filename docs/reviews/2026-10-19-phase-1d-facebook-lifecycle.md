# Phase 1D — Facebook accounts and publishing

Date: 19 October 2026. Target: **asra3.com**. The product owner will deploy after the local work is finished. This report describes local implementation and testing, not live Meta acceptance.

## Findings and repairs

The original Facebook composer could return a locally generated post ID and URL without calling Zernio. Other routes read a different post store, and disconnect only removed local account data. Health views displayed successful checks that the provider had not confirmed. The repaired Facebook journey uses canonical provider reads and mutations.

- **Accounts:** inventory and health are fetched for the server-verified tenant profile. Foreign accounts are excluded. Missing health stays unknown, and an outage cannot restore a healthy badge from local cache. Reconnection binds the original account and Facebook Page identity into the encrypted OAuth session; a different Page cannot complete that reconnect.
- **Disconnection:** every dashboard/API entry point verifies ownership, calls Zernio, and confirms the account is absent from a fresh provider inventory before removing the local compatibility record. An ambiguous response retains a recoverable error.
- **Publishing:** create, list, detail, draft/schedule edits, retry and removal use provider endpoints. Writes validate owned active Facebook targets, plan permissions, media, schedule and mode. New posts default to explicit drafts. Scheduling requires a future ISO instant with an offset and a valid IANA timezone.
- **Truthful results:** HTTP 207, post status, platform results, warnings and real post URLs remain provider evidence. Accepted, scheduled, partial and failed responses never become an invented published receipt. Provider errors retain their diagnostic fields.
- **Retries:** create/update/retry require a stable caller key, namespaced by tenant and operation. Only post creation has the documented 24-hour provider replay guarantee. The composer retains the exact unconfirmed create request under the verified profile, including an in-progress 409 response; another workspace cannot replay it. Expired create intents and uncertain edits/retries require reviewing the existing post instead of automatic resubmission.
- **Media and queues:** uploads use an actual presigned URL and public URL; no simulated CDN fallback remains. Queue creation uses the verified profile. Queue listing/preview and preflight validation are explicitly unavailable in this phase instead of returning fabricated results.
- **Dashboard:** a focused Page composer replaces the old publishing screen and wizard internals. Users choose a Page, prepare text/media, review, then save a draft, schedule or publish. Account setup finishes with guidance to Publishing or Inbox; it no longer has a second inline test-post composer.
- **Destination and schedule integrity:** Facebook Page overrides inside publishing options are rejected; the verified account chooses the Page. Content-only API edits preserve custom destination settings. The simple composer only edits posts it can represent without losing advanced settings. Selected IANA timezones convert correctly, and daylight-saving gaps or repeated times require a different choice. Foreign or disconnected historical targets are omitted from lists with an explicit warning rather than breaking the entire list.
- **API adapters:** `/api/publishing`, `/api/accounts`, the existing service/connection APIs and public `/api/v1` routes share the new behavior. Current membership, role, tenant and key scopes are checked. Old response-cache entries cannot restore fabricated account, publishing or preflight successes. Unimplemented nested account settings return 501.

Removing a post through this API removes its **Zernio record**. It does not guarantee that an already published Facebook copy is deleted. The UI and API documentation say this explicitly.

## Verification status

The local Phase 1D checkpoint is complete. Live acceptance remains pending deployment.

| Check | Result |
| --- | --- |
| Combined Phase 1A–1D regression | 191 tests: 189 passed, 2 database-dependent skips, 0 failures |
| Separate fresh PostgreSQL lifecycle run | 3 passed, exercising the skipped database cases and migrations 02–04 |
| Facebook provider HTTP contract suite | 10 passed, 156 loopback provider requests through actual services/client |
| Browser journeys | Publishing and account fixtures passed; scheduling, pagination, removal, partial results, interrupted requests, account switching and mobile Arabic layout checked |
| Production HTTP smoke | 23 passed, including anonymous API boundaries and both webhook paths |
| TypeScript and production build | Passed |
| Docker Compose configuration and whitespace diff check | Passed |
| GitNexus combined worktree impact | Critical overall: 144 changed symbols, 108 affected flows, 35 tracked files across all Phase 1 work; no commit or deployment performed |

The provider HTTP tests use local Postman simulations through the actual application services/client. Browser fixtures render the actual React components against isolated application responses. These checks establish local behavior under the tested contracts; they do not establish Meta consent, permissions, live delivery or publication.

## Files and reproduction

- `src/lib/services/publishing.service.ts` and `src/lib/publishing/actions.ts`
- `src/lib/accounts/lifecycle.ts`, `src/lib/auth/oauth-session.ts` and `src/lib/services/core-connect.service.ts`
- `src/app/api/publishing/route.ts`, `src/app/api/accounts/route.ts`, existing connect/services/v1 adapters
- `src/components/dashboard/ProviderPublishingWorkspace.tsx`, `ProviderAccountsPanel.tsx` and their hub/wizard adapters
- `scripts/tests/phase1d-*.test.mjs` and `scripts/tests/phase1d-accounts-browser-*.cjs`

Run `npm run test:phase1d`, `npm run typecheck` and `npm run build`. The full Phase 1 regression command is `node --test scripts/tests/phase1a-*.test.mjs scripts/tests/phase1b-*.test.mjs scripts/tests/phase1c-*.test.mjs scripts/tests/phase1d-*.test.mjs`. Database-dependent cases explicitly skip without the disposable test database; run `npm run test:phase1c:database` to exercise those cases against fresh PostgreSQL.

## Boundaries

No live Facebook post, account disconnection, OAuth consent, number purchase, production migration or deployment was performed. Phase 1E's live acceptance checklist remains pending the owner's deployment and designated business accounts/recipients. Messenger and Instagram belong to Phase 2; other publishing platforms and advanced API catalog features are not certified by Phase 1D.

Canonical post/account views intentionally read Zernio rather than trusting local compatibility caches. The durable webhook journal/outbox remains the audit and delivery mechanism. Older unrelated aggregate screens and advanced product capabilities still require their later-phase review.
