# Asra3 — consolidated launch implementation and final review

20 October 2026. This plan supersedes the earlier broad Phase 3 roadmap. It follows the owner's five priorities and uses at most three subagents in total, reused for review. This document plans the work; it does not mark the new phases implemented.

## Scope decisions

- CRM is a manual customer-record system. Customer automations, automatic replies, sequences, bots and workflow execution remain **Coming soon**, enforced by the server as well as the UI.
- SaaS accounts, security, entitlements and accounting foundations are included. Customer checkout, payment collection, wallet top-ups and paid upgrades remain **Coming soon**. No gateway, cryptocurrency or Egyptian payment integration is selected now.
- Scheduled posts, explicitly scheduled broadcasts, webhook processing and internal delivery workers remain part of normal application operation. They are separate from the deferred customer automation product.
- This release concentrates on WhatsApp, Facebook, Messenger, Instagram and the selected phone capabilities. Other social channels, advertising and commerce integrations are outside this run and must not be advertised as operational.
- Existing Phase 1A–D/2A–C behavior and customer data must be preserved. No resets, live purchases/messages/posts, production SQL or deployment are part of local implementation.

## One implementation pass

Work proceeds through dependencies without asking the owner to approve each local phase. Narrow tests run as changes land; a separate cross-review and full regression follow the complete implementation. Unknown external permissions, provider limitations or required deployment inputs are reported explicitly rather than replaced by simulated success.

| Priority | Deliverables | Acceptance |
| --- | --- | --- |
| 1 — Manual CRM | Durable tenant-owned contacts; names/company, multiple phones/emails, platform identities, tags, notes, status, owner and configurable fields; search/filter/pagination; reviewed CSV import/export; duplicate detection/manual reconciliation; manual link from an owned inbox conversation; consent and do-not-contact records. Automation entry points are disabled. | A business owner can create, edit, find and export a contact after reload/restart; platform identities remain distinct; imports report invalid/duplicate rows; viewers cannot write; another workspace cannot access the data; database failure cannot claim a saved contact. |
| 2 — SaaS accounts, security and billing foundation | Email ownership/recovery and partial-signup recovery; password reset/session handling; workspace selection, invitations, member roles and last-owner protection; suspended/revoked-access checks and API-key lifecycle; validated and audited admin/plan changes; strict policy behavior on database errors; durable usage/allowance bookkeeping; disabled customer payments and self-credit APIs. | Unknown keys, removed members, unauthorized roles and missing/failed policy reads deny access; direct database permissions match app roles; failed admin writes do not become successful cached state; forged top-ups cannot add funds; concurrent/replayed paid operations cannot bypass limits. No receipt or collected revenue is invented. |
| 3 — Audiences, campaigns and reporting | CRM-backed saved audiences and reviewed recipient snapshots; opt-in/exclusion checks; draft/edit/delete, immediate send, schedule/reschedule and cancellation where supported; recipient-level results; social and messaging analytics for selected channels; date/timezone/account filters; previous-period comparison and customer exports. | Selected recipients match the reviewed snapshot and eligible contacts; cancelled campaigns do not claim to undo already-sent messages; uncertain outcomes reconcile the existing campaign; counts/statuses are provider evidence; unavailable metrics stay unavailable; stale data is labelled with its observation time; reports remain tenant/account scoped. |
| 4 — Phone lifecycle and advanced WhatsApp | Verified additional-number/profile associations and uncertain-purchase reconciliation; real release and billing confirmation; SMS capability/compliance, sending/inbox/receipts; permission-gated voice/WhatsApp calling and actual history/results; richer supported WhatsApp templates/media; manual WhatsApp Flows/forms lifecycle and sending. | No invented number, verification code, sent/read result, call transcript or recording; ownership, consent, permissions and cost allowances precede chargeable calls; retries do not create a second purchase/send; release is not declared complete without provider evidence; unsupported provider capabilities remain explicitly unavailable. AI answering agents and automatic workflows remain deferred. |
| 5 — Quality and release preparation | Consistent simple business-owner navigation; English/Arabic/RTL/mobile/accessibility checks; clear loading/empty/error/recovery states; removal of misleading controls, sample statistics and launch claims; remaining API security and abuse-limit checks; lint/CI, production build, deployment configuration, migration pack, backup/restore and rollback instructions; application/worker health and error visibility; contact export/removal, retention and privacy/support handoff. | All exposed launch journeys pass the integrated checks; existing channel regressions pass; missing secrets/schema fail clearly; automation/payments/out-of-scope APIs stay disabled; deployment instructions match the built application and worker; failures and stalled webhook work can be diagnosed; no secrets appear in client bundles, logs or exports. |

## Data and dependency decisions

1. **CRM owns business data in Asra3's database.** Extend the existing `public.contacts` structure through additive migrations; do not use process memory or a local JSON file as the production CRM source of truth. Store provider references separately from local contact IDs. New fields/child records must preserve existing real contact data.
2. **One customer can have multiple identities.** Normalize telephone/email values for duplicate checks; keep platform/account/participant scope for social identities. Display names alone must not merge customers. Unverified manual handles do not grant messaging permission or prove provider ownership.
3. **Consent is separate from being a contact.** Record destination/purpose, source, timestamp and withdrawal. Recording a contact or importing a CSV does not opt that person into campaigns. Audiences must honor channel-specific consent, opt-outs and do-not-contact status, including changes between draft review and dispatch. A CRM edit must not trigger synchronization, campaign enrollment or dispatch. Exports and destructive contact actions need explicit role checks as well as tenant ownership.
4. **Campaigns depend on CRM's durable contract.** Use an explicit reviewed recipient snapshot or a verified provider-contact mapping; never send an Asra3 UUID as a Zernio contact ID. Do not silently synchronize all CRM contacts into a provider automation product.
5. **Usage and money have different meanings.** Use existing plan/limit structures where suitable. Audited owner allocations are promotional/provider-spending allowances, not customer payments. Use exact monetary units and atomic reservation/settlement where funds or spending caps are involved. Unknown provider outcomes retain a reservation until reconciliation.
6. **Customer payments being unavailable does not make Zernio services free.** Chargeable numbers, messages, campaigns, SMS and calls need explicit capabilities and approved allowances. No automatic starter cash balance, self-credit route or unknown-cost fallback may fund them. Recurring phone rental obligations require separate tracking.
7. **Phone ownership changes affect shared infrastructure.** Do not simply remove the current one-purchase-per-profile guard. First implement documented additional-profile associations and verify every account/number still resolves to the correct organization; retain ambiguous purchase protection.
8. **Migrations are additive and centrally ordered.** Test both a fresh database and an upgrade from the owner's initial schema with representative existing records. Payment-gateway-specific tables are deferred. New migration filenames and the final object manifest are finalized with the implementation, not invented in this planning document.

## Team and file ownership

| Owner | Implementation work | Final cross-review |
| --- | --- | --- |
| Subagent 1 | CRM model, service/API and customer UI | SaaS permissions, account recovery and payment-disabled boundaries |
| Subagent 2 | SaaS accounts, security, policy and accounting/allowance foundation | Phone ownership, chargeable actions, retries and release confirmation |
| Subagent 3 | Phone lifecycle and selected advanced WhatsApp capabilities | CRM persistence, tenant isolation, imports and campaign audience mapping |
| Main agent | Campaigns/analytics, shared-route and schema integration, product quality, documentation and SQL/deployment handoff | Whole-product journeys, existing channels and reconciliation of all findings |

No nested subagents are used. The main agent owns integration points such as shared dispatchers, central types, migration numbering, package/build configuration and common dashboard hubs, or assigns one temporary owner explicitly. Agents agree on data/API contracts before dependent work; they do not independently modify the same shared files. GitNexus impact checks and user-visible HIGH/CRITICAL warnings precede symbol edits, as required by the repository.

## Final review and repair pass

After all five priorities are implemented, rotate reviewers as above and record actionable findings with severity and reproduction evidence. Fix the findings, then rerun the affected checks and final integrated suite. Completion requires:

- Real disposable PostgreSQL migration, RLS/permission, persistence, rollback, replay and concurrency checks, including upgrade from the initial schema with existing data.
- Actual application/service HTTP tests against controlled provider responses: permission rejection, rate limits, unavailable/malformed results, partial success and uncertain outcomes. No live customer operations.
- Actual UI journeys in English desktop and Arabic mobile for CRM, teams, audiences, campaigns, reports, phone operations and the Coming soon screens, including reload and workspace switching.
- Regression coverage for existing WhatsApp/Facebook/Messenger/Instagram connections, inboxes, comments/settings and publishing.
- TypeScript, configured lint, production build, production-server HTTP smoke, Docker/worker configuration and source-change review. No unresolved launch-blocking finding and no unverified feature advertised as complete.

The final review produces one release report separating **implemented and locally verified**, **intentionally Coming soon**, **provider/account restrictions**, and **live acceptance still required**. A test fixture or successful build is never described as proof of real delivery.

## SQL and owner handoff

The owner reported applying only the first main schema. **The remaining SQL can wait until local implementation is complete.** Development and database checks use disposable local PostgreSQL, not the owner's production database. Applying the pending migrations is required before deploying/testing the new release against that database.

The final delivery will include all still-pending migrations in order, the baseline-only upgrade test result, a preflight/verification script, exact deployment variables and commands, backup/recovery instructions, and the authorized live acceptance checklist. There is no need to execute SQL after each development phase.

Current exact migration order and safe manual steps are in [SQL and deployment handoff](2026-10-20-sql-and-deployment-handoff.md). Four add-ons already exist; later CRM/security/campaign/phone migrations will be appended to the final manifest. Do not rerun the first main schema or blindly run a migration command that assumes SQL Editor history was recorded by the CLI.

Local implementation can finish without a payment-gateway decision. Production acceptance still needs the owner to deploy, apply the final SQL pack, configure Supabase authentication/email and the app/worker, then use authorized real accounts and recipients for the selected live tests. Other platforms, ads, commerce, automation and payment collection do not block this scoped launch because they remain unavailable.
