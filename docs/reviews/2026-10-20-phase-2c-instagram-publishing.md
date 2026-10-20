# Phase 2C — Instagram publishing and provider preflight

20 October 2026. **Local implementation and integration verification complete.** Phase 1A–D and Phase 2A–C are locally complete. Phase 1E production migration, owner deployment to asra3.com and authorized live acceptance remain pending. This selected slice does not certify other channels, analytics, advertising, commerce or growth automation. No live calls, publication, deployment or commit was performed for this work.

## Selected contract

Publishing uses the existing owned Facebook post lifecycle and adds owned Instagram professional account targets. Direct Instagram Login supports baseline posting; account platform, profile, plan and connection state are verified locally before provider calls. Per-target customContent/customMedia override shared root fields. Baseline Instagram shapes are one feed image, 2–20 image/video carousel items, one video Reel, or exactly one image/video Story with platformSpecificData.contentType=story. Omit contentType for feed/carousel/Reel. Captions are limited to 2,200 characters; Stories do not display captions. Reel shareToFeed is optional.

The dashboard exposes baseline feed/carousel/Reel/Story and Reel feed-sharing choices. Advanced API fields retain installed SDK validation and provider eligibility; catalog audio and paid-partnership fields require verified account.metadata.loginMethod=facebook_login. Existing advanced post configuration remains visible for review rather than silently becoming baseline defaults.

| Public route | Contract |
| --- | --- |
| POST /api/v1/posts | Owned Facebook/Instagram draft, immediate, future schedule or queue; posts:write and stable Idempotency-Key/body alias, 1–255 characters |
| GET / PUT / PATCH / DELETE /api/v1/posts/{postId} | Read canonical owned record, update draft/schedule or remove provider record; removal does not guarantee platform unpublishing |
| POST /api/v1/posts/{postId}/retry | Retry failed targets using existing post identity and stable intent; current Instagram media/quota checks apply |
| POST /api/v1/validate/post | posts:write; owned platforms, content/media and target overrides; provider valid/errors/warnings without publishing |
| POST /api/v1/validate/media | posts:write; owned accountId and public HTTPS url; provider accessibility/contentType/size/type/platformLimits |
| GET /api/v1/accounts/{accountId}/instagram/publishing-limit | accounts:read or posts:write; returned quotaUsage, quotaTotal and quotaDurationSeconds |

Cookie /api/publishing actions validate_post/validate_media and instagram_limit share these services and existing tenant/role/origin gates. Public routes use the same actions and scope checks. Omitting all delivery-mode flags saves a draft; future scheduling retains explicit offset and IANA timezone. HTTP 207 with a persisted post may include an informational error string, warnings and partial/failed/scheduled target states: retain its ID, inspect post/platformResults and reconcile before retrying. An uncertain update/retry does not establish that another call is safe merely because the intent key is unchanged.

Provider post validation checks content/format rules; local account authorization supplements the provider’s content-only account handling. Media preflight checks public downloadability with HEAD/GET, MIME and size comparisons. Instagram submission requires matching declared JPEG/PNG images or MP4/MOV videos. It does not certify dimensions, aspect ratio, codec or duration. Unknown/null size or absent platform comparisons remain unverified. Publication acceptance is not platform publication; real states and URLs remain canonical.

Current Instagram quota is compared with returned quotaTotal and quotaDurationSeconds. No cap is hardcoded. Exhaustion blocks immediate publishing and failed-target retry; drafts and future schedules remain possible. A current observation does not reserve capacity for later publication.

## Contract evidence

- Installed SDK node_modules/@zernio/node/src/generated/types.gen.ts:7798 explicitly documents carousels up to 20 items; InstagramPlatformData uses contentType=story and infers default feed/Reel from media.
- Installed SDK sdk.gen.ts:30–36 says post validation does not publish, process media or track usage. Local services additionally require owned accounts.
- Installed SDK sdk.gen.ts:46–51 describes media HEAD/GET accessibility, content type and size checks. Dimensions/duration are outside that endpoint’s guarantees.
- Installed SDK sdk.gen.ts:2929–2936 says quotaUsage counts published containers in the rolling window and returned quotaTotal is authoritative when prose and live API values differ. Historical 100-post prose is not a hardcoded app cap.

## Local validation

**Final regression: 280 passed, three database-dependent skips, zero failures (283 total).** Run `node --test scripts/tests/phase*.test.mjs`; the final output is `asra3-phase2c-final.log` in the local temporary directory. The preceding Phase 2A disposable PostgreSQL run passed all four checks, covering those cases and the baseline plus migrations 02–05. Phase 2B/2C made no database changes.

The Instagram provider suite exercised the actual service, ownership checks and client across 406 loopback Postman requests (`phase2c-http-LXF8HG/simulation.ndjson` in the temporary directory). Ten Phase 2C browser journeys and the existing Facebook publishing browser journey passed. The styled desktop and 390px Arabic Story screenshots were visually reviewed. These fixtures do not establish live provider acceptance.

The separate TypeScript check and production build passed, as did all 30 production-server HTTP smoke checks. The build deliberately skips type validation, so the separate check is required. The existing Next.js middleware-to-proxy deprecation remains; lint is unavailable because the repository has no ESLint configuration.

The final cross-review fixes are covered by the passing suite: unsupported document drafts stay read-only; Reel-only options are omitted after format changes; captions use Unicode code-point length; unsuccessful replay retains an already-uncertain create across reloads; delayed reconciliation cannot show another profile's result; failed account refresh releases the busy state and clears unverified results; and SDK-shaped 207 error strings, warnings and per-platform details remain visible alongside the persisted post.

GitNexus upstream analysis reported HIGH impact for shared composer editing/submission/reconciliation/refresh (up to four direct callers and three flows through SimpleModeConsole/CustomerDashboardContent); that warning preceded the corrections. The publishing dispatcher was HIGH (three direct callers/three flows), while preserving the account inventory's enabled flag affected the CRITICAL account-health path (five direct callers/six flows); both were reported before their changes. Documentation exports were LOW (one direct API caller and one process group each). The final refreshed index contained 2,993 nodes, 7,862 edges and 216 flows. `detect_changes(scope=all)` reported cumulative critical risk across 163 symbols, 115 flows and 36 tracked files spanning all local phases; untracked additions are not fully represented. No commit was created.

Browser evidence: [desktop review](screenshots/phase2c-instagram-review-desktop.png), [partial result](screenshots/phase2c-instagram-partial-desktop.png), [Arabic mobile Story](screenshots/phase2c-instagram-story-mobile-rtl.png), and [Arabic mobile quota](screenshots/phase2c-instagram-quota-mobile-rtl.png).

## Remaining acceptance

Phase 2C is complete locally. Owner deployment and authorized real Instagram media/account checks remain in the [Phase 1E checklist](2026-10-19-phase-1e-deployment-acceptance.md). Remaining CRM/growth automation and other product capabilities continue as separate Phase 3 slices in the [overall roadmap](2026-10-19-phase-1-whatsapp-facebook.md), with the selected Meta contract history in the [Phase 2 audit](2026-10-19-phase-2-messenger-instagram-audit.md).
