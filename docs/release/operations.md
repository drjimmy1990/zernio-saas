# Worker, health and owner-approved acceptance

App container port3008 maps to host `127.0.0.1:${PORT:-3008}`. Only HTTPS proxy is public. Docker health reads `/api/v1/openapi.json`; that proves HTTP readiness, not DB/provider/queue/delivery health.

The single `asra3-webhook-worker` runs `scripts/webhook-worker.mjs`, POSTing both `/api/internal/webhooks/drain` and `/api/internal/campaigns/drain` with shared private `WEBHOOK_DRAIN_SECRET`, then waiting30seconds after a cycle. Campaign URL derives from `WEBHOOK_DRAIN_URL`. Do not also run duplicate cron. `--once` can dispatch due campaigns/outbox jobs: use only when authorized. Never expose bearer token in browser/proxy URLs/logs.

```bash
docker compose ps
curl --fail --silent --show-error http://127.0.0.1:3008/api/v1/openapi.json >/dev/null
curl --fail --silent --show-error https://asra3.com/api/v1/openapi.json >/dev/null
docker compose logs --tail=100 asra3-saas asra3-webhook-worker
```

Inspect both processes after restart;401 means drain secret mismatch,503 needs DB/schema/provider investigation. Aggregate queries at end of release SQL verifier identify overdue outbox, uncertain/needs_review campaigns, unknown phone intents and reserved allowances. Review original intent/canonical provider history. Never clear queues/reservations or redispatch to silence alerts. Empty logs do not prove polling; inspect process and queue age. PostgreSQL jobs survive worker restart.

Incoming provider URL: `https://asra3.com/api/webhooks/zernio`, actual `ZERNIO_WEBHOOK_SECRET`. `X-Zernio-Signature` is hex HMAC-SHA256 of exact raw body. Tenant comes from verified provider-profile mapping. Unknown signatures/mappings rejected; accepted events require durable storage. Self-service outgoing customer webhook setup is Coming soon.

After final local build/tests/container and SQL verification, owner separately approves live acceptance:

- Verify HTTPS, Supabase Site URL/redirect allowlist/SMTP/email confirmation/recovery, current membership and session/API-key revocation.
- Exercise real approved CRM data, reload/export, viewer/other-workspace denial, retained DNC/archive/withdrawal suppression.
- Connect approved existing WhatsApp or recover allocated number through actual Meta onboarding; verify account permissions.
- Review exact number/destination/template/quote/allocation before enabling needed capability and bounded allowance. Provider Usage/card, stock/KYC/SMS registration/call grants still apply. No automatic live purchase/message is part of runbook.
- Check canonical provider acceptance/history/receipt and real cost. Unknown retains original intent/reservation; settle/release only from provider evidence. Local schedules recheck consent at dispatch; shared worker runs only reviewed due campaigns.
- Confirm payments/AI/automation/outgoing-webhook setup remain Coming soon. Do not label metadata limits, monthly publishing/account enforcement or all channels as certified.

Keep backups/exports/logs private, assign retention/support ownership and preserve suppression records when removing active contacts. `SESSION_SECRET` rotation invalidates cookies; rotate provider/service keys through reviewed staged procedures and verify worker/accounts. Rotation does not reconcile paid operations. Production/live acceptance was not executed by this task.
