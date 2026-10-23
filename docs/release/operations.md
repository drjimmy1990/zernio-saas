# Worker, health and controlled-pilot acceptance

The current source release includes migration10. Follow [SQL verification](sql-migrations.md) before starting it; the latest reported01–09 installation and migration10 still need confirmation against the intended database. No production migration, deployment, payment or live provider action is performed by this handoff.

App container port3008 maps to host `127.0.0.1:${PORT:-3008}`. Only the HTTPS proxy is public. Docker health reads `/api/v1/openapi.json`; it proves HTTP readiness, not database, provider, queue or delivery health. The worker has no HTTP healthcheck.

## Single shared worker

`asra3-webhook-worker` runs `scripts/webhook-worker.mjs` and POSTs three routes, using the same private `WEBHOOK_DRAIN_SECRET`:

- `/api/internal/webhooks/drain`: durable outgoing deliveries already queued by accepted provider events.
- `/api/internal/campaigns/drain`: reviewed due campaigns.
- `/api/internal/billing/drain`: recurring subscription/number charges from prepaid customer funds.

The campaign and billing URLs derive from `WEBHOOK_DRAIN_URL`. The worker waits30seconds after a cycle; request duration extends that interval. Use one worker and no duplicate cron. Starting it, including `--once`, can send due jobs and charge due recurring agreements. Review scheduled work and billing state before an authorized restart. Never expose its bearer token in browser/proxy URLs or logs.

```bash
docker compose ps
curl --fail --silent --show-error http://127.0.0.1:3008/api/v1/openapi.json >/dev/null
curl --fail --silent --show-error https://asra3.com/api/v1/openapi.json >/dev/null
docker compose logs --tail=100 asra3-saas asra3-webhook-worker
```

Inspect both processes after restart. HTTP401 indicates a drain-secret mismatch;503 requires database/schema/provider investigation. Worker logs include delivered/retry totals, campaign submissions/review stops, charged renewals and failed renewal review. The current worker also warns when billing reports `paymentDue`; this identifies unpaid invoices for administrator review, not a failed customer debit to retry under a new identifier.

## Reconciliation and unpaid renewal

Assign a named administrator to review worker exceptions and the read-only aggregate queries in [full postflight](../../scripts/sql/check-launch-migrations.sql) and [focused billing checks](../../scripts/sql/check-customer-billing.sql). Inspect overdue outbox jobs, uncertain/needs-review campaigns, unknown phone operations, provider allowance reservations, customer holds, unpaid recurring invoices and unresolved connection leases. Queue age and durable state matter even when logs are empty. An empty log does not prove polling or healthy delivery.

An unpaid wallet does **not** cancel supplier rental. Missing prior rental periods need reconciliation and block new paid actions; the system does not silently collect retrospective debt or automatically release numbers. Verify ownership, supplier price/status and original provider evidence, then use the existing operation's supported reconciliation action. Never delete queues/holds or resubmit a purchase/message with a new identifier to silence an alert. Provider-confirmed release stops future customer rental renewal; database restore cannot reverse an external purchase.

No external pager, billing email notification or worker-heartbeat alert is established by these logs. Before increasing pilot volume, configure queue-age/worker/dunning alerts and a response owner, and test that a missed cycle or unpaid renewal reaches them. Keep registration closed meanwhile.

## Customer payment handling

The gateway is not ready. Direct customers to [support@asra3.com](mailto:support@asra3.com) for administrator payment instructions. An administrator verifies funds were actually received, then records the exact wallet credit with a unique payment reference and receipt note. A support request alone never credits funds. Keep customer deposits separate from provider-spending allocations; granting one does not fund the other. Do not put credentials, card details or email-login links in support messages or receipt notes.

Confirming a reviewed subscription can debit the wallet. Number confirmation may incur real supplier cost. Wallet refunds are internal balance adjustments; automated bank refunds, checkout, crypto and gateway crediting remain unavailable. Preserve original references if a credit/refund outcome is uncertain.

## Provider webhook and live acceptance

Canonical incoming provider URL: `https://asra3.com/webhooks/zernio`, with the actual `ZERNIO_WEBHOOK_SECRET`; `/api/webhooks/zernio` remains a supported alias of the same handler. Configure one intended URL, not duplicate provider deliveries to both. `X-Zernio-Signature` is hex HMAC-SHA256 over the exact raw body. Tenant identity comes from verified provider-profile mapping. Unknown signatures/mappings are rejected; accepted events require durable storage. Customer-defined outgoing webhook setup remains Coming soon.

After current local tests/build/container and SQL checks, the owner separately authorizes live acceptance:

- Verify HTTPS, Supabase Site URL/redirect allowlist/SMTP/email confirmation/recovery, current membership and session/API-key revocation. Registration remains closed in both application and Supabase.
- Exercise approved CRM data, reload/export, viewer/other-workspace denial and retained DNC/archive/withdrawal suppression.
- Connect an approved existing WhatsApp account or reconcile an allocated number through actual Meta onboarding; confirm the intended business assets and permissions.
- Review exact number/destination/template/quote/allocation before enabling a bounded capability. Provider credit/Usage, stock, KYC, SMS registration and Meta grants still apply.
- Check canonical acceptance/history/receipt, delivery and real cost. Unknown outcomes retain original intents and reservations. Scheduled campaigns recheck consent at dispatch.
- Validate the manually verified payment-credit flow, enrolled subscription terms, wallet balance/history and unpaid-renewal review. No fake receipt or live charge is authorized by this checklist.
- Keep outbound PSTN/WhatsApp calls and new paid incoming routes blocked. SMS requires verified maximum supplier tariffs. AI/workflows and self-service outgoing webhook setup remain unavailable; monthly publishing quotas are not certified.

Keep backups/exports/logs private, assign retention/support ownership and preserve suppression records. `SESSION_SECRET` rotation invalidates cookies; rotate other keys through reviewed procedures and verify workers/accounts. Rotation does not reconcile money or external actions.
