# Prepaid billing: implementation and release steps

The commercial pilot now has a separate customer wallet, reviewed retail quotes, atomic reservations, settlement/refunds, and recurring subscription/number agreements. Registration remains closed. Online payment collection remains **Coming soon**; no gateway or cryptocurrency processor has been activated.

## Prices and charge rules

| Item | Customer rule |
| --- | --- |
| Starter | $20/month, two connected accounts |
| Extra account | $8/month, selected when enrolling |
| Number rental | Supplier monthly price / 0.60, rounded up to USD cents; $3 becomes $5 |
| Wallet top-up | At least $10; administrator records only a verified receipt |
| SMS admission | At least $2 available, or the full reviewed charge when larger |
| Call admission | At least $5 available, or the full reviewed maximum when larger; outbound calls are currently unavailable |

The minimum balances are admission thresholds, not additional fees. A 40% gross margin is different from a 40% markup. It excludes hosting, support, payment charges, taxes and unallocated supplier expenses. Sub-cent supplier estimates are conservatively rounded upward before applying the retail margin. No net-profit claim is made.

Facebook Page and Messenger share one connected account; Instagram and WhatsApp are separate. Zernio's first two free connections apply to the whole provider team, not to each customer. Existing private-beta overrides remain in place until commercial enrollment. Enrollment checks existing social accounts and requires enough paid extras. Commercial connection attempts reserve capacity one at a time; an unresolved attempt is retained until provider inventory confirms completion. Reconnects verify the original account identity.

Starter renews on its enrollment anniversary, with month-end dates clamped to the month's last day. Stopping renewal preserves the paid period. Mid-cycle quantity/plan changes are still unavailable. Number rental is charged in full on activation and again on the first day of each UTC month. There is no first-month proration or automatic current-month rental refund. The reviewed number price is retained for renewal.

## Money and failure handling

- Customer money is stored in `billing_*`. Existing `saas_allowances` continue to limit the platform's provider spending; they are not customer deposits.
- Server-created quotes bind the workspace, exact action, request identifier, price version and five-minute expiry. The client cannot supply a cheaper authoritative price.
- PostgreSQL serializes reservations within a workspace. Concurrent operations cannot spend the same available funds.
- A customer charge cannot exceed its approved reservation or make the balance negative. Supplier excess is recorded separately as a business loss. Provider references cannot settle two reservations.
- Confirmed pre-acceptance rejection releases a hold. Timeouts, ambiguous responses and uncertain allocations retain the original intent and hold. Do not retry with a new identifier to bypass reconciliation.
- SMS requires a verified upper-bound tariff for the sender/destination route, including all applicable carriers. No tariffs are seeded from public “from” prices. GSM-7 extension characters and UTF-16 multipart segments are counted. The reviewed SMS retail charge is fixed and charged on provider acceptance, which does not guarantee delivery. Individual supplier cost remains unknown when no per-message cost evidence exists.
- Meta bills WhatsApp template and Meta calling charges to the customer's WABA. These are not deducted again from the Asra3 wallet.
- Provider-spending allocations are still required in addition to customer funds. Crediting one does not credit the other.

## What remains unavailable or operationally manual

Outbound PSTN and WhatsApp calls, and enabling new incoming paid routes, remain blocked. The reviewed documentation establishes a forwarded-call duration cap, but not a verified outbound spending cutoff. Existing routes can be disabled; existing routes may still incur supplier charges and must be reviewed before a commercial launch.

SMS sending remains blocked until an administrator has evidence of a route's maximum supplier cost. A floor price from the public rate table is not such evidence. Verify tariff scope, all-carrier coverage, expiry and source before adding a tariff; never guess these values. Incoming SMS costs can still form part of the platform's supplier expenses and are not invented as customer usage charges.

There is no automatic number release on insufficient funds. A wallet shortfall does not stop Zernio's rental. The renewal worker verifies number ownership/state and the captured supplier price before charging. Released numbers stop future customer renewal. Missing or unpaid prior rental periods require administrator reconciliation and block new paid actions; they are not silently collected as retrospective customer debt. Review these exceptions promptly to control the business's supplier exposure.

Pending KYC/allocation still needs reconciliation with the provider, and a real purchase/delivery test on the owner's account. No live number, SMS, call, payment, or external message was purchased or sent during this implementation. Automated gateway crediting, bank refunds, crypto, live rate feeds, mid-cycle upgrades and automated release policy are not enabled. These limitations mean this is a controlled pilot, not an unrestricted public billing launch.

## Deployment — Ubuntu / aaPanel

1. Pull the code without rebuilding yet:

   ```bash
   cd /www/wwwroot/asra3.com
   git pull --ff-only origin main
   ```

2. Open Supabase → SQL Editor. Run the **entire** file `supabase/migrations/20261022000010_customer_wallet.sql` once. You already ran 02–09; do not rerun the main schema or those migrations. Migration 10 adds the billing tables/RPCs and updates the Starter template. Existing tenant overrides and balances are preserved; new customer wallets begin at zero.

3. Run `scripts/sql/check-customer-billing.sql` in SQL Editor. All `present` values must be true. `row_security` and `server_can_execute` must be true; `anon_can_read`, `customer_can_write` and `customer_can_execute` must be false. Starter should show 20 and 2. Nonzero held/pending counts are items to reconcile, not a reason to delete rows.

4. Keep `PUBLIC_REGISTRATION_ENABLED=false` in the deployment environment. No new secret or payment gateway variable is needed. The existing `WEBHOOK_DRAIN_SECRET` also protects the billing renewal worker.

5. Build and restart:

   ```bash
   cd /www/wwwroot/asra3.com
   docker compose --env-file .env config --quiet
   docker compose --env-file .env up -d --build --force-recreate asra3-saas asra3-webhook-worker
   docker compose ps
   docker compose logs --tail=30 asra3-webhook-worker
   ```

6. In Asra3, open `/admin` → **Spending allocations** → **Balance and subscription**. Select the test customer's workspace. Record a credit only for a real confirmed payment, using its unique reference and receipt note. Keep any needed provider-spending allocation separate. Do not enter a provider API key or mail password into a receipt note.

7. Sign in as the test customer (`dr.gimy@gmail.com`). Open **Team and settings** → **Balance and subscription** to verify the balance and review the subscription. Use **Phone and WhatsApp** to review a number quote. Confirming a subscription deducts its monthly price; confirming a number purchase can incur real supplier costs. Review the quoted amount and renewal date before confirming. Refresh the history afterward and use the original operation's reconciliation action if its result is uncertain.

If migration 10 has not been applied, financial operations fail closed. If a migration fails, stop before rebuilding and inspect the SQL error; do not delete existing billing rows or rerun a partial selection of the migration.

## Validation

Run `npm run test:billing` for the pricing, enrollment, segmentation and browser tests. Run `npm run test:billing:database` with Docker available for the isolated PostgreSQL/PostgREST checks. Both database scripts create temporary test containers and clean them up; they do not use the live Supabase database.

- Real PostgreSQL: concurrent holds, idempotent credit/refund/settlement, reservation cap, supplier overruns/losses, renewal/dunning and access controls, connection capacity concurrency.
- Real application billing services and API → Supabase SDK → isolated PostgREST → PostgreSQL: tenant/role boundaries, quote binding and expiry, duplicate operations, charge caps, unknown supplier cost, recurring renewal/cancellation and month-end dates.
- Actual phone service with local Postman provider simulations: quote/hold ordering, unavailable tariffs, price changes, ambiguous provider responses, capacity failure refunds, ownership and no repeat dispatch.
- Browser checks: retail quotes and preserved request IDs, English/Arabic billing, account selection and unsupported call controls.

## Reviewed supplier references

- https://docs.zernio.com/pricing
- https://docs.zernio.com/pricing/phone-numbers
- https://docs.zernio.com/pricing/calls
- https://docs.zernio.com/pricing/sms
- https://docs.zernio.com/pricing/whatsapp
- https://docs.zernio.com/usage/get-sms-usage
- https://docs.zernio.com/usage/get-calls-usage

Public prices are reference material. Live provider quotes and verified tariff evidence control paid actions.
