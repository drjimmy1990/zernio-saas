# Phase 2A — Messenger and Instagram connections and inbox

19 October 2026. Local implementation; deployment and live acceptance on **asra3.com** remain the owner's later step.

## Findings and changes

- Generic inbox replies previously delegated to WhatsApp regardless of channel. The new Meta service and shared dispatcher resolve the account's actual platform from the verified workspace profile. Messenger uses a connected Facebook Page; Instagram uses its professional account. Reads, replies and mark-read check both account ownership and the returned conversation identity. No caller profile or platform claim selects another tenant.
- Instagram setup offers direct Instagram Login or a Facebook-linked professional account. Reconnect preserves the provider's login method and original Instagram identity. The Facebook Page picker checks its linked Instagram account, rather than confusing a Page ID with an Instagram ID.
- The dashboard now shows real account-scoped Messenger/Instagram conversations, message history and requests alongside the existing WhatsApp inbox. Account/folder/thread changes discard stale responses and drafts. Viewing messages does not silently mark them read. Sending requires reviewing the recipient and content; accepting a request explicitly sends that first reply.
- Canonical provider results, cursor pagination, failed-account metadata and errors survive the cookie and public API adapters. Telephony-only keys cannot read Meta inboxes. Expired accounts and another app's control produce actionable errors. Ordinary replies are subject to Meta's 24-hour policy; the API does not invent an open window from an outgoing message's timestamp. The provider checks eligibility when no authoritative window metadata is available.
- A text-plus-attachment send can return HTTP 200 with `data.partialFailure`: the attachment succeeded while text failed. The UI calls this out and warns against resending the successful attachment. A returned internal conversation ID is not confused with the original platform thread ID.
- Both WhatsApp and Meta retain interrupted sends under the verified workspace profile. They require manual conversation review before composing another message. Successful message responses have documented 24-hour provider replay; a timeout/5xx may still follow platform acceptance, so a key alone cannot guarantee duplicate prevention. Empty history is not proof that a message was unsent.
- WhatsApp inbound media links require authentication. A new cookie-authenticated download route verifies the owned conversation, asks the provider to resolve the exact message attachment, and downloads only from the configured provider media endpoint. Browser-supplied URLs cannot select a destination, and redirects never receive provider credentials. Downloads have a 25MB size limit and a 20-second deadline; expired media remains an explicit provider error.
- Handover events use the documented `control.owner`, `ownerAppId` and `changedAt` fields. Migration `20261019000005_conversation_control_projection.sql` records control evidence atomically with the event journal, ordered by `changedAt`, independently for each tenant/account/thread. Standby metadata is retained. The UI still uses canonical provider conversation state.
- Legacy comments could acknowledge a fabricated local reply. All those public paths now return 501 before the old response cache, and their old dashboard actions were removed. Actual comments and selected messaging settings belong to Phase 2B.

## Verification

The local checkpoint is complete:

| Check | Result |
| --- | --- |
| Combined Phase 1A–2A regression | 219 tests: 216 passed, 3 database-dependent skips, 0 failures |
| Separate fresh PostgreSQL run | 4 passed, including the skipped transaction/control/outbox cases and baseline plus migrations 02–05 |
| Meta provider HTTP contract suite | 9 passed; 122 loopback requests through actual client/service/tenant verification |
| Authenticated WhatsApp media | 4 passed, including binary download, older-message resolution, foreign references, expiry, redirect refusal, size/type limits and Office download headers |
| Browser journeys | Connection choices/reconnect, Meta replies/requests/partial sends, WhatsApp interrupted-send recovery, account/profile isolation, authenticated media links and mobile Arabic layout passed |
| TypeScript and production build | Passed; pre-existing middleware-convention deprecation remains for later framework cleanup |
| Built-app HTTP smoke and Compose configuration | 26 checks passed; Compose configuration valid |
| GitNexus and whitespace check | Full index rebuild succeeded after an incremental failure; combined tracked worktree impact is critical (150 symbols, 115 flows, 36 files across all completed phases). Whitespace check passed. No commit or deployment. |

Browser fixtures now discover generated CSS instead of depending on a build-specific filename. The PostgreSQL run is disposable; production is unchanged.

The HTTP tests exercise the actual application client, tenant ownership helpers and service adapters against local Postman simulations. They cover successful responses, partial sends, 403/429, provider window denials, uncertain failures, foreign accounts/threads, request-folder limitations, and stable successful-response replay. The browser tests render the actual React components and generated CSS. They establish the tested local contracts, not real Meta consent, delivery or provider plan availability.

Run `npm run test:phase2a`, `npm run test:phase1c:database`, `npm run typecheck` and `npm run build`. The full regression command includes `scripts/tests/phase1a-*.test.mjs` through `phase1d-*.test.mjs` plus `phase2a-*.test.mjs`. `node scripts/tests/phase1a-http-smoke.mjs` checks the built application's anonymous boundaries and webhook aliases.

## Remaining phase boundaries

Instagram Login may not expose the requests folder; the provider reports `PLATFORM_LIMITATION`, and the regular inbox remains available. Meta cold recipient starts, reactions, typing, handover mutations and advanced messaging controls are not enabled here. Comment moderation/private replies/settings follow in Phase 2B; Instagram publishing follows in Phase 2C. Broader workflows, CRM, reviews, analytics and other platform features still require their later phases.

Live acceptance after deployment must use authorized business accounts: complete each applicable login method, reconnect the original identity, receive a customer-initiated message, send a reviewed reply and inspect actual receipt, test a permitted request, inspect the closed-window/control error, download a real WhatsApp attachment, and confirm durable webhook/outbox recovery. No live messages, purchases, account mutations or deployment were performed for this checkpoint.
