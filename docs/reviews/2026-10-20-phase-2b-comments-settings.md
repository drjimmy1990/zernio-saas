# Phase 2B — Meta comments, selected messaging settings and thread control

20 October 2026. **Phase 2B complete locally.** This report covers the selected Phase 2B slice only. Phase 1A–D and Phase 2A are complete locally; Phase 1E production migration, owner deployment to asra3.com and live acceptance remain pending. No live provider calls, messages, comments, settings changes or deployment were performed for this slice.

## Implemented behavior

The comments service and cookie/public adapters resolve authenticated tenant membership and owned Facebook Page or Instagram professional accounts. Native organic post/comment identity is verified through provider lists before mutation; provider pagination is retained and ownership verification is bounded to 25 pages. Incomplete, cyclic or foreign-resource results fail closed. Partial account failures remain visible rather than becoming successful empty results. Paid/dark ad posts, likes, top-level comment creation and growth automation are outside this slice.

| Public route | Operation and scope |
| --- | --- |
| GET /api/v1/inbox/comments | Owned organic native posts; accounts:read or inbox:write; accountId required, cursor/limit/since/minComments optional |
| GET /api/v1/inbox/comments/{postId} | Owned native comments/replies; accountId required, cursor/limit/commentId optional |
| POST /api/v1/inbox/comments/{postId} | Public reply; inbox:write; accountId, commentId, message/text and stable intent key |
| DELETE /api/v1/inbox/comments/{postId} | Delete native comment; inbox:write; accountId and commentId query fields |
| POST /api/v1/inbox/comments/{postId}/{commentId}/private-reply | Separately reviewed plain-text private reply; inbox:write; accountId, message/text and stable intent key |
| POST / DELETE /api/v1/inbox/comments/{postId}/{commentId}/hide | Hide/unhide native comment; inbox:write; accountId required |
| GET / PUT / DELETE /api/v1/accounts/{accountId}/{messenger-greeting\|messenger-menu\|messenger-ice-breakers\|instagram-ice-breakers} | Canonical provider setting read/replace/reset; accounts:read for GET, accounts:write for changes |
| POST /api/v1/inbox/conversations/{conversationId}/thread-control | Owned Meta pass/take/request/release; inbox:write; accountId and action, targetAppId for pass |

/handover explicitly delegates to the same thread-control contract. Legacy /account-settings Meta aliases and unsupported comment aliases return 501. Cookie /api/comments and /api/messaging-settings use the same services with membership and editor/admin mutation gates. Dashboard comments and settings select owned accounts, retain account/post/comment context and reconcile provider state; control actions use the actual selected Meta inbox conversation.

Public/private comment sends require a stable Idempotency-Key, or JSON idempotencyKey alias, of 1–200 characters. Provider eligibility remains authoritative. Private reply is one per comment within 7 days. A consumed result forbids retry; an unknown result blocks automatic retry and requires review of canonical history. Provider acceptance is not delivery. Hide/delete/settings/control require provider acknowledgment; uncertain mutations instruct canonical refresh rather than reporting a local successful result.

Messenger settings use localized arrays with exactly one default locale and no duplicates. Greeting text is limited to 160 characters. Messenger ice breakers have at most 4 question/payload entries per locale, with questions at most 80 characters; Instagram PUT uses a flat list of up to 4 entries. Persistent menus have at most 3 top-level actions and one nested level of at most 5 actions; links use HTTP(S) without credentials. Other settings, including Telegram commands, are outside this selected implementation.

Thread take/request on Instagram require Facebook Login and a linked Page; primary receiver permissions remain provider-controlled. A request stays pending. confirmed requires matching provider control and a refreshed canonical conversation; an acknowledgment alone cannot switch ownership. Existing signed control-change projection and standby send denial retain their separate Phase 2A behavior.

## Local validation

Focused actual service/HTTP suites exercise tenant/account/post/comment identity, bounded pagination and partial failures, public/private outcomes including consumed/unknown errors, settings shape/locale validation and pending/confirmed thread state. Actual component browser journeys cover comments, private reply, account switching, settings and selected inbox control; actual API boundary checks cover anonymous access, removed members, viewer writes, scope denial and origin checks. OpenAPI and Postman examples describe the same canonical paths and consequential error/retry behavior.

The combined Phase 1A–2B suite passed 253 of 256 tests, with three database-dependent cases skipped and zero failures (`asra3-phase2b-final.log` in the local temporary directory). The separate disposable PostgreSQL run at the preceding Phase 2A checkpoint passed all four checks, covering these database cases; Phase 2B adds no database migration. After the final account-metadata correction, all 10 focused settings/control HTTP tests passed against 257 local provider requests, including a new regression proving that `metadata.loginMethod` determines both inbox display and handover capabilities and that a top-level lookalike cannot grant them.

- Comments: 14 actual service/HTTP tests, 212 provider requests; owned native resources, pagination, reply and moderation behavior, unknown/consumed private outcomes and canonical connection metadata.
- API boundaries: 42 tests in the shared authentication harness, including six Phase 2B cases for current membership/role, scope, origin, path identity, retired aliases, uncached provider results and explicit refusal of unsupported private-reply payloads.
- Browser: seven comments/settings journeys and one conversation-control journey passed. Private locks survive reloads and synchronize across tabs; pending settings require a fresh owned read and review; focused replies can be inspected and paginated. Desktop and Arabic mobile screenshots are in `screenshots/phase2b-*`; no 390px RTL overflow was observed.
- Separate TypeScript check and final production build passed. The existing Next.js middleware-to-proxy deprecation remains for a later cleanup phase.
- Thirty local production HTTP smoke checks passed, covering both signed webhook paths and anonymous API boundaries, including comments and messaging settings. No live deployment was tested.

GitNexus upstream impact for documentation exports was LOW (one direct API caller and two process groups for each export); the docs page had no indexed callers. The inbox account listing was CRITICAL (one indexed direct caller and six affected processes); the final settings ownership helper was HIGH (four direct callers and two processes). Both warnings were reported before the narrow metadata corrections. A refreshed index recorded 2,857 nodes, 7,550 edges and 209 flows. `detect_changes(scope=all)` reported cumulative critical risk across 153 changed symbols, 112 affected flows and 36 tracked files, spanning all previous phases; untracked additions are not fully represented in that diff summary. No commit was created.

## Remaining acceptance

Owner deployment and authorized live accounts must verify actual organic comment results, a separately reviewed private reply, provider settings and configured receiver/app control behavior. Retain the [Phase 1E checklist](2026-10-19-phase-1e-deployment-acceptance.md). [Phase 2C Instagram publishing and later capabilities](2026-10-19-phase-2-messenger-instagram-audit.md) remain unfinished and are not certified by this report.
