# Integrated manual launch browser review

20 October 2026. Actual React components and generated application CSS were bundled for local browser fixtures. Only Next navigation/link adapters and API responses were replaced; all traffic was restricted to the loopback fixture. No provider sends, production SQL or deployment were performed.

## Repairs

- CRM follows the shared locale when mounted in BusinessWorkspace and LaunchInboxWorkspace. Deferred operations, errors and audience results are guarded against workspace changes; CSV and scoped drafts are cleared when verification changes or fails.
- Permanent deletion cannot erase consent or do-not-contact records. API and before-delete SQL guards preserve archived suppression, including service-role deletion. CSV blank records preserve the original decision row numbers.
- Campaign owner repaired search= query mapping, template/account review invalidation and role permissions found during this review.
- Public landing copy now describes manual Facebook/Instagram/WhatsApp/CRM/report/phone tools. Paid plans, automation, advertising and commerce are labelled Coming soon. Fabricated SDK examples and synced status were removed; screenshots remain explicitly illustrative. Docs identify advanced unsupported live actions as Coming soon, current asra3_ keys and local-UUID/provider-ID separation. llms.txt reflects the same scope.

## Evidence

`node --test scripts/tests/launch-business-browser.test.mjs`: five journeys passed. Authenticated customer navigation covers CRM contact detail, saved-audience campaign draft, exclusions, search, changed-template acknowledgement reset, report unavailable values/export, inbox/comments/CRM/campaign navigation, automation Coming soon, team settings and advanced navigation. Arabic390 covers current locale changes and no page overflow. Viewer/anonymous gates, administrator allocation mounting, unavailable costs and disabled legacy key mint are verified. Public EN/AR and docs Coming soon claims are checked. No campaign dispatch or schedule occurs.

CRM service/browser checks: 13 passed. Disposable PostgreSQL baseline upgrade/roles/retention/import/restart: one passed. Existing actual provider browser regressions: 20 passed across publishing, Meta inbox, WhatsApp uncertain writes, comments and selected settings. `npx tsc --noEmit` passed.

Screenshots: `screenshots/launch-business-desktop.png`, `launch-business-mobile-rtl.png`, `launch-business-reports-mobile-rtl.png`, `launch-admin-tenant-readonly.png`, `launch-landing-desktop.png`, `launch-landing-mobile-rtl.png`. AR business/reports images were visually inspected for readable flow and page overflow.

## Limits

This is local integrated evidence, not real provider or deployed acceptance. It is a focused security/UX cross-review, not a complete audit. SaaS snapshot lists cap rows (members200; invitations/keys/sessions/reservations100); that scale qualification was sent to the SaaS owner. Final shared build, SQL ordering and production/live acceptance remain root/owner gates. Customer automation/sync and payment collection remain Coming soon. Advanced provider resource catalog entries do not establish launch availability.
