# Asra3 — current readiness and next phases

20 October 2026. Current planning checkpoint after Phase 2C, updated to the owner's five launch priorities. This document summarizes the latest phase reports; the original audit's failing capability matrix describes the pre-repair application. The detailed current plan is [consolidated launch implementation and review](2026-10-20-launch-execution-plan.md).

## Next phases, in order

The owner selected the five priorities below for one implementation pass followed by integrated review and repairs, using at most three subagents. Each area is checked against its applicable provider contract. These are planned phases, not completed capabilities or a promise that every vendor endpoint is supported. Customer automations and payment collection remain Coming soon; other channels, ads and commerce are excluded from this release.

| Phase | Work and completion target |
| --- | --- |
| 1 — Manual CRM | Durable contacts, platform identities, notes/tags/custom fields, search, reviewed import/export, manual inbox links and consent. Customer automations are disabled and labelled Coming soon. |
| 2 — SaaS accounts, billing foundation and security | Signup/recovery, teams/roles, plans/limits, administration, durable usage/allowances and permission/outage handling. Payments, self-credit and paid upgrades remain server-disabled pending a later gateway decision. |
| 3 — Campaign management and reporting | CRM-backed audiences, reviewed broadcasts, supported campaign lifecycle/results, social/message analytics, date filters and reports. Missing data remains unavailable rather than invented metrics. |
| 4 — Phone lifecycle and advanced WhatsApp | Additional-number reconciliation, real release/billing confirmation, SMS/calling and selected richer templates/manual WhatsApp Flows. Provider costs require approved allowances; AI automation is deferred. |
| 5 — Product quality and release preparation | Business-owner navigation, Arabic/English/mobile quality, truthful states, security, lint/CI, final review and repairs, complete regression, SQL pack and deployment/recovery instructions. |
| Deferred 1E — Owner deployment and live acceptance | After local work, the owner applies the final migrations, configures the app/worker and deploys to asra3.com. Then verify real account consent, signed incoming events, authorized messages/purchases/posts, delivery results and restart recovery. |

## Implemented and tested locally

| Area | Verified local scope |
| --- | --- |
| Core security | Current membership/role and selected API-key checks, tenant/account ownership, encrypted OAuth state, denied public resets and signed webhook handling for the reviewed journeys. This is not a full-project security certification. |
| WhatsApp onboarding | Existing-number Cloud API/supported coexistence and provider number purchasing with actual inventory contracts, price consent, payment/KYC/activation states and retained purchase intent. |
| WhatsApp messaging | Account inbox, text/media replies, supported templates, receipts and basic reviewed template broadcasts. |
| Facebook accounts and publishing | Page selection, account health, reconnect/disconnect, media upload, drafts, immediate/scheduled posts, canonical results and recovery. |
| Messenger and Instagram inbox | Owned conversations, history, replies, message requests, mark-read and applicable thread-control behavior. |
| Instagram publishing | Feed images, up to 20 carousel items, Reels and Stories; provider content/media preflight, returned quota, scheduling, saved edits and failed-target retry checks. |
| Meta comments and settings | Owned organic comments, public/plain-text private replies, hide/unhide/delete; Messenger greeting/menu/ice breakers and Instagram ice breakers. |
| Infrastructure and UI | Durable webhook journal/outbox worker, selected public API adapters/documentation and the reviewed English/Arabic desktop/mobile screens. |

Final regression checkpoint: **280 tests passed, 3 database-dependent tests skipped, 0 failures (283 total)**. The skipped database scenarios were covered by the earlier four-pass disposable PostgreSQL run. TypeScript, production build and 30 production-server HTTP smoke checks passed. These tests do not prove live Meta permissions or delivery.

## Still unfinished or deliberately limited

- Manual CRM, broader reporting, accounts/security/accounting foundations and selected phone services still need implementation/review. Customer automation and payment collection are intentionally Coming soon. Other channels, ads and commerce are outside the selected launch scope; existing screens/routes alone are not evidence of readiness.
- Number purchasing currently reserves one purchase per provider profile. Additional purchases/reconciliation and confirmed number release remain unfinished.
- WhatsApp's UI covers approved text templates; supported media-header fields are available through the API. Flows, calling, groups, catalogs and other advanced journeys are not covered by the completed core phase. Legacy simulated OTP routes remain unavailable.
- The basic publishing composer keeps advanced/multi-destination records read-only to preserve their data. Advanced Instagram API options are validated separately; queue listing/preview is not yet complete. Removing a provider post record does not promise platform unpublishing.
- Meta comment work covers organic posts; ad/dark-post comments, likes, top-level comment creation and broader account settings are outside the completed slice. Meta restrictions on unsolicited messages are platform constraints, not a promised future bypass.
- Signup email verification/partial-creation recovery, strict policy checks during database outages and the remaining API/security catalogue need review. Lint is not yet configured.
- Production migrations, deployed worker operation, real OAuth consent/permissions, purchases, message delivery, publishing and signed webhook delivery remain unverified. The configured webhook destination matching asra3.com does not close those checks.

## Evidence

- [Latest Phase 2C verification](2026-10-20-phase-2c-instagram-publishing.md)
- [WhatsApp onboarding and purchase limitations](2026-10-19-phase-1b-onboarding.md)
- [WhatsApp messaging and worker](2026-10-19-phase-1c-whatsapp-lifecycle.md)
- [Meta comments/settings scope](2026-10-20-phase-2b-comments-settings.md)
- [Deployment and live acceptance checklist](2026-10-19-phase-1e-deployment-acceptance.md)

This checkpoint adds a roadmap only; it does not implement the new launch phases or perform deployment/live mutations.
