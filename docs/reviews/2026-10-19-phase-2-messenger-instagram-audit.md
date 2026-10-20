# Phase 2 Messenger and Instagram audit

19 October 2026. Read-only source/contract audit; no live requests, consent, messages or publishing performed. Phase1D final verification belongs to the parent task and is not asserted here. The user will deploy after local work; all live acceptance below remains pending deployment and authorized test accounts.

Updated local progress, 20 October: [Phase 2A connection and inbox](2026-10-19-phase-2a-meta-inbox.md), [Phase 2B comments, selected settings and thread control](2026-10-20-phase-2b-comments-settings.md) and [Phase 2C Instagram publishing](2026-10-20-phase-2c-instagram-publishing.md) are complete locally. The gap table and line references below preserve the initial source audit snapshot; consult the phase reports for repaired behavior and final evidence. Growth automation remains separate unfinished work. Live acceptance remains pending owner deployment.

## Evidence and limitations

GitNexus MCP query returned no results because its FTS extension was unavailable and the main index was older than current edits. MCP context for InboxCrmService.sendConversationReply resolved callers in services/route.ts and public handleApiV1, and its WhatsAppService.sendMessage callee, with lower-bound completeness. `node .gitnexus/run.cjs query inbox --repo zernio-saas` worked against the CLI index and located InboxCrmWorkflowsHub / LiveSmsAndWhatsAppInbox flows. Source and installed SDK are authoritative for this audit.

## Current gaps

| Area | Evidence | Required change |
|---|---|---|
| Instagram OAuth | src/app/api/connect/route.ts:75 forwards loginMethod; core-connect.service.ts accepts it; oauth-session.ts:16 handles select_account. ConnectionWizardModal has no loginMethod choice. | Expose an understandable direct Instagram vs Facebook Page choice; retain server nonce, connect_token, verified resources and reconnect identity. |
| Messenger/IG inbox | src/lib/whatsapp/actions.ts:60 rejects non-WhatsApp; service.ts:51 requires WhatsApp, :71 filters accounts and :82–92 hardcodes response platform. InboxCrmService:23–46 delegates generic-looking calls into this WhatsApp-only implementation. | Implement a dedicated Meta messaging service/dispatcher using owned account and conversation verification; preserve WhatsApp behavior. |
| Inbox UI | InboxCrmWorkflowsHub.tsx:101 fetches local comments; :293/:324/:337 invoke legacy comment-ID-only reply/like/hide paths. ProviderWhatsAppInbox is explicitly WhatsApp. | Add account-scoped Messenger/IG inbox; reject stale account-switch replies; keep read/accept/typing separate from send. |
| Comment success fabrication | src/app/api/v1/[...path]/route.ts:3026–3084 uses WorkspaceStore for comment list/create/reply/hide/like/delete. :3057 reply falls back to generated rep_ ID even if no comment exists. | Replace or intercept every comment route before legacy branches. Never report remote success from local updates. |
| Handover contract mismatch | Public route :2633 contains legacy local owner success, but existing conversations dispatcher intercepts these paths and returns 501. SDK sdk.gen.ts:4308 uses /thread-control, not /handover. | Preserve unsupported guard until a canonical provider-backed adapter is implemented. Translate any compatibility alias explicitly. |
| Account menus/settings | All /accounts paths now guarded; unsupported nested settings return 501. | Implement selected Messenger greeting/menu/ice-breakers and IG ice-breakers only with provider ownership and confirmed results. |
| Growth automations | inbox-crm.service.ts:51–107 can synthesize active record on unconfigured provider (:82), spreads arbitrary config after profileId (:95–96), generates new idempotency key per call and writes active locally irrespective of provider status. | Keep out of Phase2A/B acceptance; harden separately before enabling comment-to-DM automation. |
| Instagram publishing | publishing.service.ts:77 rejects any non-Facebook target; dedicated publishing UI is Facebook only. | Add deliberate IG media/content capability validation and target selection rather than simply widening allowed platforms. |

## Reusable contracts

- Installed SDK sdk.gen.ts:3993 listInboxConversations, :4061 getInboxConversation, :4127 getInboxConversationMessages, :4201 sendInboxMessage use provider /inbox/conversations and /{conversationId}/messages. Reuse current profile mapping, requireTenantAccounts, membership/role/scope gates, encrypted OAuth nonce storage, provider error envelope and stable-intent UI patterns.
- SDK :4180–4200 documents send idempotency: successful responses retained 24h; a 5xx/timeout may release the key after platform acceptance. Reconcile messages first and treat empty history as inconclusive, never blindly promise exactly-once delivery after ambiguous failure.
- SDK :4000–4022 lists create-conversation platforms and excludes Facebook/Instagram. Customer-initiated existing threads and message requests are the baseline; do not expose cold recipient sends for Meta channels. Accept-request actually sends the first reply, so it requires reviewed content and stable intent.
- SDK :4300–4313: /thread-control pass(targetAppId), take, request, release. Take/request require Facebook Page connection and appropriate primary receiver; Instagram Login returns platform_not_supported. Standby inbound has metadata.standby; sends may return 409 not_thread_owner. Control state changes require provider result/webhook confirmation.
- SDK :4689/:4731 lists /inbox/comments and /inbox/comments/{postId}. Reply/delete/hide require provider postId plus accountId/commentId, unlike current local comment-only aliases. Private reply :5001 is /inbox/comments/{postId}/{commentId}/private-reply.
- zernio.txt:2778 and :3618: ordinary Meta messages have 24-hour window; Messenger tags CONFIRMED_EVENT_UPDATE, POST_PURCHASE_UPDATE, ACCOUNT_UPDATE, HUMAN_AGENT; Instagram only HUMAN_AGENT with messagingType MESSAGE_TAG. Do not default a tag or treat it as blanket permission.
- SDK :4982–5008: one private reply per comment within 7 days. Non-follower IG interactive refusal may still consume it; details.privateReplyConsumed=true means never retry, privateReplyOutcome=unknown requires reconciliation. Prefer plain text initially. Buttons and quickReplies mutually exclusive.
- zernio.txt:3291–3297: both login methods support posting, analytics, comments and inbox. Direct default instagram_login requires professional account and no Page picker; facebook_login requires linked professional account/Page selection. Facebook Login is required for catalog audio and partnership labels (:3439/:3502). IG rolling publishing limit is 100 posts/24h (:3733); media formats/content types need explicit contract validation.

## Ordered local roadmap

### Phase 2A: connection and inbox

Locally complete; see the Phase 2A report linked above.

1. Instagram login choice and canonical account/login method display; reconnect identity tests for direct callback and Page selection. Reuse Facebook Page OAuth for Messenger rather than a fictitious separate Messenger account.
2. Meta service shared by cookie API and public v1 routes, owned account/thread verification, cursor/folder pagination and raw failedAccounts metadata. Start with conversations, messages, plain text/URL attachment reply and mark-read; add accept-request as reviewed send.
3. Extend dashboard inbox with channel/account selector, current-thread context, request folders, unknown/control-held/reconnect states and persistent stable intent after interruption. Do not invent delivered/read badges.
4. Local contract simulations: wrong tenant/account/thread, disabled/expired account, 24h denial, pending request acceptance, provider 429/403/503/timeout, stale UI fetch, same-key retries, ambiguous send reconciliation; real database webhook replay/control projection tests. Browser exercise actual component.

### Phase 2B: comments and selected settings

Implemented and verified locally; see the Phase 2B report linked above. The selected implementation uses canonical post/account/comment identities, plain-text public/private replies, hide/unhide/delete, the four Meta setting paths and provider thread control. Likes and top-level comment creation remain unavailable.

1. Intercept legacy comment paths immediately with 501 until provider implementation exists; define canonical postId/accountId/commentId fields and verify returned resource ownership before mutations.
2. Public reply, hide/unhide and delete with provider responses; private reply separate explicit review with one-shot/7-day/unknown-outcome states. Like only when supported (IG engagement likes are limited release, may require Facebook Login/reconnection); unsupported operations remain unavailable.
3. Implement selected greeting/menu/ice-breaker contracts with limits and locale handling. Add handover /thread-control only after primary receiver/login-method checks and control_changed webhook projection. No local fabricated owner switch.
4. Local acceptance: missing/foreign post/comment, consumed private reply, non-follower interactive failure, 502 unknown private reply, provider permissions, menu shape errors, handover request remains pending, standby send409 and unsupported direct IG take/request.

### Phase 2C: Instagram publishing

Implemented and verified locally; see the Phase 2C report linked above. The selected slice supports owned feed/carousel/Reel/Story targets, provider content/media preflight, returned rolling quota and canonical post outcomes. The installed SDK explicitly documents up to 20 carousel items and instructs comparison with returned quotaTotal rather than a fixed cap. Media dimensions/aspect ratio/duration remain unchecked by URL preflight; no local phase certifies live publication.

1. Extend existing provider publishing service/UI with IG professional accounts, feed image/carousel/Reel/Story media constraints, public downloadability, per-target platformSpecificData and explicit scheduling. Keep advanced catalog-audio/paid-partnership fields behind Facebook Login capability checks.
2. Preserve draft/publish/schedule/queue modes, stable create/update/retry keys, canonical provider post/platform states and HTTP207. Removal remains provider-record removal, not promised Instagram unpublishing.
3. Local simulations/browser: missing media, invalid type/aspect/URL, wrong platform/account, disconnected account, rate limit, permission error, delayed Reel processing, partial multi-target result, timeout reconciliation and retry of failed targets only.

## Live acceptance after user deployment

Use user-authorized owned Facebook Page and Instagram professional account, real consent/scopes and correctly configured inbound webhooks. Verify both applicable OAuth methods and reconnect original identity; customer initiates a conversation, operator sends reviewed reply and confirms platform receipt; verify request acceptance and closed-window rejection; exercise handover only with configured primary receiver/other app; create a real comment/private reply only with explicit authorized participants; publish one reviewed IG media draft/schedule/post and confirm actual platform URL/result. Validate webhook ordering/replay and recovery under real credentials. These gates cannot be satisfied by mocks, screenshots or code audit. Do not perform deployment or live mutations as part of this audit.
