# Priority 4 — phone lifecycle and advanced WhatsApp

Status: implementation and focused local verification complete; root integration, security review and whole-product release checks remain in progress. No live number purchases, messages, posts, calls, production SQL or commits were performed.

## Customer journeys

`AdvancedPhoneWorkspace` is a named component with no required props, mounted by the main dashboard. Its Numbers, Connect WhatsApp, SMS inbox, Calls, Templates and Manual forms sections use the protected `/api/phone-lifecycle` endpoint. The connection section reuses the existing real-number WhatsApp onboarding and recovery component with its purchase controls hidden; additional purchases use the new durable, allowance-aware path. Existing-number connection and purchased-number recovery remain accessible.

- Numbers are resolved through the workspace's verified provider profile and fresh provider inventory/detail. An explicit additional-number choice stays in that profile; it does not create external profiles. Current country/type monthly pricing, requested SMS/WhatsApp capabilities, plan number quota and approved spending precede purchase. The provider purchase intent and local journal prevent a second dispatch. Unknown allocations reconcile only a unique new matching number from canonical inventory. KYC and provider billing checkout remain unresolved states.
- Release requires explicit review, rejects SIP-trunk-attached numbers, and is confirmed only after the provider release response and canonical released state agree. `release_reconcile` reads the original operation without dispatching another release. The saved rental obligation records the provider evidence. The release contract stops future provider rental; final invoices remain provider-controlled.
- SMS requires an active provider-hosted, SMS-capable and SMS-approved number, completed carrier compliance, explicit operator consent review, the CRM destination suppression check and a complete provider opt-out read. Plain-text sending is bounded to 670 characters. Provider acceptance is displayed separately from actual inbox delivery receipts. Unknown acceptance is never automatically retried. MMS and provider-scheduled SMS are unavailable in this workspace.
- PSTN and WhatsApp calls require a finite provider duration cap, refreshed provider estimate, operator review of that estimate, CRM destination consent, active provider capability and, for WhatsApp, a `start_call` permission grant. Recording and transcription overrides are disabled. Accepted `dialing` is distinct from final provider history. Settlement requires a matching ended/failed canonical call, USD billing and actual provider cost evidence; unknown costs remain reserved. A missing call identifier requires provider support rather than another call.
- Templates list actual Meta status and support reviewed header/body/footer/buttons/examples JSON creation. Approved utility/marketing templates can be sent to a recipient with body parameters and matching public HTTPS header media. The new journal prevents redispatch; the canonical WhatsApp sender owns spending enforcement. CRM purpose is marketing for marketing templates and transactional otherwise. Authentication-template sending is explicitly unavailable without an actual verification service.
- Manual WhatsApp Flows support draft creation, JSON upload and provider validation errors, preview, explicit publish/deprecate/delete review, canonical status confirmation, reviewed published-form sending and actual submitted responses. Only manual navigation forms are supported. Endpoint-backed forms, data exchange, external encryption setup and AI responses are unavailable. Form sending has a durable one-dispatch journal because the installed SDK does not promise an idempotency header for that operation.

Automation, AI answering, invented verification codes/transcripts/receipts, customer payment collection, arbitrary profile creation and unsupported replacement/softphone configuration are not exposed as working provider operations.

## Contract and integration

The installed `@zernio/node` generated contract is the source for provider paths, request fields and response shapes. Reads and mutations use the existing configured Zernio client; new chargeable/uncertain mutations explicitly disable rate-limit retries. The prior user-supplied provider document remains reference data and does not authorize live calls.

`runPhoneLifecycleAction(organizationId, action, input)` is the shared dispatcher for root's route/legacy alias integration. Cookie routes verify current workspace membership and role before calling it. Root's API-key aliases must perform their own tenant, scope and mutation-role checks. Existing simulated purchase/send/call aliases must remain blocked or delegate to this service; the old onboarding purchase path must not be independently dispatched.

| GET actions | Required identifiers |
| --- | --- |
| `workspace_access` | verified cookie tenant; returns current role |
| `numbers`, `offers`, `number`, `accounts` | optional country/type; `numberId` for detail |
| `conversations`, `messages` | `accountId`; `conversationId` for messages |
| `call_estimate`, `call_history`, `call_permission` | `channel`, owned `numberId` or WhatsApp `accountId`; destination for estimate/permission |
| `templates`, `flows`, `flow`, `flow_preview`, `flow_responses` | `accountId`; `flowId` for form detail |

| POST actions | Review/recovery requirements |
| --- | --- |
| `purchase`, `purchase_reconcile` | stable intent and reviewed country/type/price/features; original `operationKey` for reconciliation |
| `release`, `release_reconcile` | owned `numberId`, confirmation and stable intent; original operation for reconciliation |
| `sms_send` | owned number, destination/text, reviewed consent and stable intent |
| `call_start`, `call_reconcile` | supported channel, reviewed cents/consent and stable intent; original call operation |
| `template_create`, `template_send` | account and supported template data; sending additionally needs approved template, consent and stable intent |
| `flow_create`, `flow_upload`, `flow_publish`, `flow_delete`, `flow_deprecate`, `flow_send` | account/form, provider-valid definition; irreversible review or destination consent as applicable |

Migration `20261020000008_phone_lifecycle.sql` depends on the main organizations schema and migration 03's legacy purchase-intent table. It adds service-only RLS-protected `phone_lifecycle_operations`, `phone_rental_obligations` and `acquire_phone_lifecycle_operation`. Acquisition shares the legacy profile advisory lock and blocks an earlier pending/KYC onboarding purchase. A purchased/terminal legacy row does not prevent an explicitly approved additional number. Runtime paid actions also need migration 07's allowance foundation; CRM suppression needs migration 06. Apply the complete ordered migration pack before deployment, not individual production SQL during development.

Allowances default disabled/zero. Number purchase requires the purchase capability and reserves the quoted first monthly rental under `phone_rental`. Calls reserve the provider estimate for the configured duration cap. SMS and form sending use the administrator's persisted unit ceiling when the provider has no per-send quote; this allocation is labeled as an allocation, not a provider price. Reservations remain held when acceptance or actual cost is uncertain. Provider recurring rental and Meta direct call charges remain external billing obligations; this implementation does not certify a final invoice or collect payments. Canonical WhatsApp sender allowance enforcement is now integrated. The phone template adapter creates no second allocation; it retains the canonical reservation in successful/error journal evidence. Direct recipient/conversation sends also check CRM suppression before allowance, deriving template purpose from fresh approved provider category.

## Focused evidence

- `node --test scripts/tests/launch-phone-http.test.mjs`: **12 passed**, 0 failed, **206 provider HTTP requests** through local Postman simulation. Evidence: `TEMP/launch-phone-http-6SdBEJ/simulation.ndjson`. Actual phone modules and configured Zernio HTTP client execute against the SDK-shaped provider fixture. Durable storage, allowance and CRM boundary adapters are controlled test adapters in this HTTP suite; their SQL/security behavior is verified separately.
- `node --test scripts/tests/launch-phone-api.test.mjs scripts/tests/launch-phone-browser.test.mjs`: **5 passed**: 2 authorization/method-boundary tests and 3 browser journeys. Browser evidence includes desktop purchase review/reload recovery, editor consent and cost gates, viewer read-only controls, rich template sending, Arabic 390px forms and no horizontal overflow. Screenshots: `screenshots/launch-phone-review-desktop.png` and `screenshots/launch-phone-mobile-rtl.png`; visually inspected mobile layout.
- `node scripts/tests/launch-phone-postgres-check.mjs`: **5 passed**, no conditional skips in the disposable PostgreSQL run. Checks migration application after 01+03, RLS/table/RPC privileges, fingerprint replay, unresolved-intent block, organization isolation/constraints, concurrent purchase acquisition and legacy pending/KYC recovery guard. The standalone storage test intentionally skips without its disposable-container environment.
- Combined focused command over phone API/browser/HTTP/storage tests: **22 total, 17 passed, 5 conditional PostgreSQL skips, 0 failed**. Those five database cases separately passed in the disposable PostgreSQL harness above.
- Own phone modules have no current TypeScript errors. The latest full `npm run typecheck` passed after canonical CRM/allowance integration. Root owns final integrated build/test evidence.
- GitNexus impact calls were attempted before modifying new phone symbols. Earlier index lacked the new symbols; final refreshed impacts found CRITICAL dispatch (7 direct callers,8 processes) and canonical sendMessage (3 direct callers,7 processes). Warnings were reported before narrow edits and focused regression checks passed. Root owns the refreshed whole-change impact scan and final peer review. No commit was made.

Local fixtures establish request ownership, validation, replay and failure behavior; they do not establish real carrier stock, provider account billing/usage-plan access, KYC approval, SMS registration, Meta app/WABA/Flow permission, recipient call grants, duration enforcement or real delivery. Those remain prerequisites for the owner-approved live acceptance stage.

The repository has an npm lint script but no ESLint configuration, so lint was unavailable. Separate TypeScript and production build checks remain required; the updated production build also checks TypeScript. Existing Next middleware-to-proxy deprecation is outside this feature scope.
