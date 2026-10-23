# Asra3 Phase 1 — release baseline and manual payments

23 October 2026. Local implementation and verification against `main` at `59f73aad2bd2db199bc66a8eef8175a459639eca`, with the changes below still uncommitted. This is the release-readiness Phase 1 agreed after the full-project review, distinct from the older feature-development phase numbering.

## Outcome

Phase 1 is complete locally. The public website and customer billing workspace direct customers to **Contact us — support@asra3.com** to arrange payment with the administrator. English and Arabic copy explains that wallet credit follows verification of actual payment receipt and that online checkout is unavailable. Pricing, footer, product documentation, public guides and the machine-readable site summary now agree on this workflow.

The contact link is a `mailto:` link. It does not submit a payment, send email automatically or credit a wallet. Existing super-admin authorization, receipt evidence, unique payment references and replay protections remain enforced. Customer funds and provider-spending allocations remain separate. Gateway checkout, automatic gateway crediting, crypto and bank refunds remain unavailable.

The shared worker now warns when billing returns a positive `paymentDue` count, including unpaid-only cycles. Charged, unpaid and failed-review counts remain separate. The warning requests administrator review of wallet funding and continuing supplier rentals, contains aggregate counts only, and preserves the existing worker exit behavior. It is a log warning, not an email or external alert. Unpaid renewal does not release a supplier number.

## Documentation, migration inventory and CI

- The [release entry point](../release/README.md), [deployment guide](../../DEPLOYMENT-VPS.md) and related operational guides now cover migration **10** and manual administrator payments. Earlier dated reviews link here without rewriting their historical evidence.
- The [migration manifest](../release/migration-manifest.json) lists migrations **01–10**. Its additive object scope, migrations **02–10**, contains **30 tables, 45 exact function signatures and 11 explicit indexes**. Baseline objects and automatically created constraint indexes are outside those inventory counts.
- The [preflight](../../scripts/sql/preflight-launch.sql) and [full postflight](../../scripts/sql/check-launch-migrations.sql) include billing object presence, permissions and aggregate unpaid/held-fund status. The [focused billing checks](../../scripts/sql/check-customer-billing.sql) remain part of the handoff.
- [CI](../../.github/workflows/verify.yml) now runs `npm run test:billing` and `npm run test:billing:database` alongside the existing launch, regression, build and container checks. The billing suite includes browser contact checks and a new real-worker/loopback-HTTP regression test.

No new migration or migration DDL was added in this phase. The latest recorded owner report says migrations **01–09** were applied; production was not inspected and migration **10** remains unverified there. Follow [SQL verification and migration order](../release/sql-migrations.md). A database verified complete through 09 needs only the existing `20261022000010_customer_wallet.sql`; a fresh project needs 01–10 in order. Apply only confirmed missing migrations.

## Final local verification

| Check | Final result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass: 0 errors, 162 warnings |
| `npm run build` | Pass; existing Next.js middleware convention deprecation warning remains |
| `npm run test:regression` | 307 passed; 3 database-gated cases skipped in this invocation |
| `npm run test:launch` | 109 passed; 5 database-gated cases skipped in this invocation |
| `npm run test:billing` | 16 passed, 0 skipped |
| `npm run test:launch:database` | Pass: fresh 01–10 install, baseline upgrade preserving customer data, SaaS security/concurrency, 5 phone cases and 4 webhook/delivery cases |
| `npm run test:billing:database` | Pass: real PostgreSQL concurrency/RLS/dunning and billing service → API → Supabase HTTP → PostgreSQL integration |
| Read-only SQL verification | Pass on disposable PostgreSQL 16: baseline/full preflight, full/focused postflight, exact inventory, 28 server-only tables' RLS and individual CRUD grants, 9 billing RPC execution boundaries, Starter $20 / 2 accounts |
| Existing adversarial registration/security tests | 34 passed |
| Built production HTTP smoke | 42 checks passed, including both webhook paths and anonymous boundaries |
| Built production SEO/browser suite | 30 passed, including canonical URLs, closed/private routes, English/Arabic hydration and mobile RTL |
| Docker production build and smoke | Pass: non-root execution, writable legacy data directory, no env files, private binding, HTTP/auth/signature boundaries and security headers |
| `npm audit` | 0 vulnerabilities |
| Release Markdown links and `git diff --check` | Pass |

The separately executed database suites cover the database checks gated out of the ordinary test commands. Tests used local fixtures, loopback services and disposable containers. No production SQL, live customer payment, provider purchase, campaign delivery, outbound support email, deployment or search-engine submission was performed. A hosted GitHub Actions run has not been observed for these uncommitted changes.

## GitNexus review

The index was refreshed after the final source changes. Pre-edit impact checks identified the shared billing and landing components as HIGH impact, and their caller/process scope was reported before editing. The standalone worker and SQL scripts had incomplete graph coverage, so their package, container and verification consumers were traced directly.

Final `detect_changes --repo zernio-saas --scope compare --base-ref main` reported **MEDIUM** risk: 33 tracked files, 46 symbols and 4 execution flows, centered on the shared landing copy. These counts include pre-existing `AGENTS.md` and `CLAUDE.md` edits and exclude new untracked files, including this report and the worker test. Those new files were reviewed separately. Existing unrelated work was preserved.

## Next phase

Proceed to a controlled production pilot using the [release handoff](../release/README.md) and [operations checklist](../release/operations.md): verify the deployed revision and database, back up, apply only missing migration 10 if needed, deploy the reviewed app and single worker, then validate the administrator payment workflow and approved provider actions with real evidence. Keep registration closed in both the application and Supabase.

Assign an administrator to reconcile unpaid renewals, held funds, uncertain provider operations and continuing number rentals. Before increasing volume, configure and exercise worker/queue/unpaid-renewal alert delivery; logs alone do not establish monitoring. Gateway integration can be planned when the gateway is ready and is not required for this manual-payment pilot.
