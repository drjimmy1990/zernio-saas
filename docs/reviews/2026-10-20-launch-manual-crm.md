# Manual CRM implementation

20 October 2026. Durable manual CRM implemented locally. The source of truth is Asra3's Supabase database; this work performs no provider contact synchronization, customer automation, messaging, production SQL or deployment.

## Scope and preservation

Migration `20261020000006_manual_crm.sql` extends the baseline `public.contacts` table additively. Existing names, primary phones/emails, provider contact IDs, channels and legacy custom fields remain intact. Recognizable phones and emails are copied into normalized destination arrays. Unconventional legacy values are retained and require correction before they can become eligible campaign destinations.

Contacts support company, multiple phones/emails, scoped platform identities, typed configurable fields, tags, lead/customer/inactive status, workspace-member owner, append-only notes, explicit consent/withdrawal history, do-not-contact, archive/restore and owner/admin permanent removal of archived records without consent or do-not-contact history. Editing uses a revision check; database failures do not fall back to memory/file storage or claim a saved result. Platform handles remain manual and unverified. A manual inbox link verifies the provider account/conversation identity before saving and sends no message.

`/api/crm` reads canonical contacts with name/company/primary-phone/email search, status/tag/platform/owner filters and pagination; it also reads fields and audiences. The actual business-owner screen exposes creation/editing, contact detail, notes, consent, platform identities, search/filter, typed fields, manual linking and reviewed imports. English desktop and Arabic 390px screenshots are in `screenshots/launch-crm-*`.

## Permissions and import/export

Cookie requests use the shared verified tenant/current-membership/active-workspace checks and origin protection. Writers recheck current role and active organization. Viewers read only; owners/admins/editors manage contacts and exports; field creation and permanent removal require owner/admin. Replacement PostgreSQL RLS removes the baseline's permissive viewer-write contact policy. SQL triggers validate destination formats, scoped identities, owner membership, custom-field types, append-only consent/note history, current consent timestamps and verified server-only inbox links. Local IDs/provider references cannot be changed through contact editing.

CSV input is bounded to 2MB/500 rows and supports RFC4180 quoted commas, newlines and quotes. Preview shows invalid rows, duplicates in the file and existing phone/email/platform matches. Every row defaults to skip and needs an explicit skip/create/update decision. Updating a duplicate requires its current revision. An atomic import RPC rolls back all rows on failure and replays the exact result under its stable key; the browser retains its import/key on uncertain failure. Export includes archived contacts and consent/note/identity data, uses pagination up to 10,000 contacts and escapes spreadsheet formula cells. Export is a customer-data handoff, not an automatic consent import.

## Audience and phone contracts

`resolveCampaignAudience(organizationId, contactIds)` from `@/lib/crm/audience` returns normalized deduplicated `phones`, eligible local `contactIds`, stable consent evidence and explicit `excluded` reasons. Only current explicit WhatsApp marketing consent is eligible. Missing/archived/do-not-contact records are excluded. Suppression checks other matching workspace records and retained consent destinations, so an unselected duplicate withdrawal cannot be bypassed by choosing a granted duplicate. Evidence has no read-time timestamp; campaigns can hash/recompare it before dispatch. Local UUIDs are never sent as Zernio contact IDs.

`assertDestinationConsent({organizationId,channel,phone,purpose})` from `@/lib/crm/consent` checks durable matching-destination suppression for reviewed phone/SMS/WhatsApp actions. It does not grant consent itself; the caller still requires explicit operator/customer consent under its flow. Matching reads are paged and fail closed, rather than loading every CRM record or silently truncating at the database's default limit.

## Local evidence and limits

- Fourteen focused CRM checks passed: nine actual TypeScript service/API checks, four actual React/CSS browser journeys and one disposable PostgreSQL baseline-upgrade/RLS/import/restart journey. No production provider calls or customer actions were used.
- PostgreSQL proves representative baseline records survive the additive migration; viewer/foreign writes fail, editor writes and reviewed duplicate creation work, forged consent/link/type/owner changes are denied, import rollback/replay works and contacts survive database restart.
- API/service checks cover failed storage, tenant filters, current roles, revision conflicts, no provider-ID insertion, server consent time, native conversation identity, global duplicate withdrawal/DNC suppression, CSV quoting/decisions and unsupported automation.
- Browser checks cover customer create/reload with two platform identities, typed fields, notes/consent, eligible audience preview, import decisions, viewer restrictions, unconfirmed writes and Arabic mobile state isolation/overflow.
- Shared TypeScript checks passed after integrated modules were present; final build and combined regression are owned by the main agent.

Limits: custom fields are created with a stable type; changing/removing a definition is intentionally not exposed in this initial manual editor. Native inbox linking currently uses explicit account/conversation IDs, with server verification; it is not automatic identity resolution. Audiences save explicit selections, not dynamic automation segments. Import is limited to 500 rows and export to 10,000; larger batches require splitting/review. Migration06 must be applied in order before using CRM against the owner's database. Existing process/file CRM records are not silently imported into production: only the baseline durable contacts are migrated; separately reviewed CSV import is available for other real customer records.


Final review also corrected consent ordering across timezone offsets; equal instants prefer withdrawal. Focused tests cover this behavior in campaign and direct-send eligibility. See [combined release evidence](2026-10-20-launch-final.md).
