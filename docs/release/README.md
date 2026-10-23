# Asra3 controlled-pilot release — 23 October 2026

This is the current deployment entry point for `https://asra3.com`, including customer-wallet migration **10**. Earlier dated reviews describe the release they tested; they do not establish the current production revision, database state or live provider acceptance.

The latest recorded owner report says migrations **01–09 were applied**. This release task has not inspected production SQL, and migration10's application is unverified. Follow [SQL verification and migration order](sql-migrations.md): confirm the actual state using read-only checks and SQL Editor history, then apply only confirmed missing files. An installation complete through09 needs only10. A fresh Supabase project needs01–10 in order. Never rerun an applied migration to resolve a documentation mismatch.

1. Record the deployed revision and back up the intended database, private configuration and legacy `.data`. Follow [VPS deployment](../../DEPLOYMENT-VPS.md) to obtain the reviewed source before starting the new worker.
2. Complete [preflight, migrations and postflight](sql-migrations.md), including customer billing. The [manifest](migration-manifest.json) inventories the source release; it is not a production migration ledger.
3. Build with real public values, retain private credentials and deploy the app plus its single worker. That worker processes webhook delivery, campaigns and billing renewals.
4. Keep registration closed in both application and Supabase. Follow [private testing](private-testing.md), [email authentication setup](supabase-auth-setup.md) and [operations/live acceptance](operations.md).
5. Run only specifically reviewed live pilot actions. Verify canonical provider results, actual delivery and reconciliation. Local fixtures do not certify Meta permissions, provider credit, KYC, SMS registration, SMTP or delivery.
6. Follow [search launch](search-launch.md) after the public pages show this release. Search-engine submissions and production indexing are separate owner actions.

## Customer payments during the pilot

The payment gateway is not ready. Customers contact the administrator at [support@asra3.com](mailto:support@asra3.com) for payment instructions. An administrator records wallet credit only after verifying that payment was actually received, with its unique receipt/reference. An email, requested top-up or plan assignment is not evidence of payment and does not automatically credit the wallet. Do not send passwords, API keys, card details or email-login links to support.

Customer wallet funds and provider-spending allocations are separate controls; paid actions may require both. Starter enrollment, reviewed recurring charges and approved wallet adjustments are implemented. Online checkout, automatic gateway crediting, bank refunds, crypto and mid-cycle plan changes remain unavailable. See the [billing implementation and restrictions](../reviews/2026-10-22-prepaid-billing.md).

Outbound PSTN/WhatsApp calls and new paid incoming routes remain blocked. SMS requires verified maximum supplier-tariff evidence. Unpaid customer renewal does not stop supplier number rental or release a number. Assign an administrator to reconcile unpaid invoices, uncertain operations and held funds. AI answering/workflows and customer-defined outgoing webhook setup remain Coming soon. Monthly publishing quotas are not certified; commercial connection capacity is checked at enrollment/connection, while existing private-beta policy overrides remain in place.

Current local validation is recorded in the [23 October release baseline](../reviews/2026-10-23-release-baseline.md). Historical test counts and earlier migration02–09 evidence are not fresh migration10 or production acceptance results.
