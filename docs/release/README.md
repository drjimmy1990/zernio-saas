# Asra3 release handoff — 20 October 2026

Owner-run deployment handoff for `https://asra3.com`. Final local verification and the owner checklist are in [the final review](../reviews/2026-10-20-launch-final.md). Production deployment, SQL and live provider/payment actions have not been performed by this task.

The owner applied only migration01. **Local implementation/review is complete. Pull the source first, then apply pending SQL02..09 before starting the new application/worker.** Development uses disposable PostgreSQL. An existing deployment without add-ons cannot provide durable OAuth/webhooks/CRM/security/spending/campaign/phone features; missing storage fails closed.

1. Read the completed local review, then pull `main` from https://github.com/drjimmy1990/zernio-saas.git using the [Git deployment steps](../../DEPLOYMENT-VPS.md#get-the-release-with-git). Verify the commit reported with the push. No ZIP upload is required.
2. Follow [SQL migration instructions](sql-migrations.md): backup, read-only preflight,02..09 once in order, postflight.
3. Follow [VPS deployment](../../DEPLOYMENT-VPS.md): private secrets, real public build values, UID1000 mount, build, loopback/HTTPS health and shared worker.
4. Follow [operations/live acceptance](operations.md). Paid capabilities remain disabled until an administrator approves allowance/setup and the owner authorizes a specific live action.
5. Follow [search launch and old-result replacement](search-launch.md): verify the deployed Arabic/English pages and retired blog URLs, review Cloudflare access, submit the sitemap to the existing Google property and to Bing, then optionally send the prepared IndexNow payload. Search Console/Bing changes have not been made for you.

The exact files/object inventory are in [migration-manifest.json](migration-manifest.json). Read-only SQL: [preflight](../../scripts/sql/preflight-launch.sql), [release postflight](../../scripts/sql/check-launch-migrations.sql), [older Phase1/2 verifier](../../scripts/sql/check-phase1-2-migrations.sql).

Limits: payments/checkout/top-up, AI answering/workflows and customer-defined outgoing webhook management remain Coming soon; incoming provider webhook remains supported. Configured plan limits do not prove enforcement: monthly publishing/account enforcement is not certified. Phone quota and paid action allowances are checked in their service paths; the monthly WhatsApp/campaign/SMS attempted-unit gate passed local SQL checks. Provider billing/Usage access, Meta permissions, KYC, SMS registration and actual delivery remain live account prerequisites.

Focused handoff verification: both new read-only scripts executed against disposable PostgreSQL (baseline preflight43rows; full pack postflight324rows). All68manifest objects present;20server-only tables deny anon/authenticated CRUD and allow service_role; sensitive RPC privileges match the expected matrix. Metadata log: `TEMP/asra3-release-sql-verifier.log`. Root owns final integrated behavior/build/container checks.
