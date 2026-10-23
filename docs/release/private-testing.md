# Private testing and registration

Public registration is closed by default. Existing customer accounts and the platform administrator can still sign in; account recovery remains available. This is the controlled pilot through migration10. Verify the [current database release](sql-migrations.md) before rebuilding; the registration switch alone does not establish that required migrations are installed.

## Deploy the registration closure

```bash
cd /www/wwwroot/asra3.com
git pull --ff-only origin main
docker compose --env-file .env up -d --build --force-recreate asra3-saas asra3-webhook-worker
docker compose ps
```

Changing the registration switch itself requires no SQL. The current application release does require the confirmed schema through10. The server-only `PUBLIC_REGISTRATION_ENABLED` setting defaults to closed when absent and opens registration only when its value is exactly `true`. During testing, leave it unset or set it to `false`. If using both `.env` and `.env.local`, keep their values consistent because `.env.local` takes precedence in Compose.

The `/signup` page shows **Registration coming soon** in English or Arabic. `POST /api/auth` with `action: signup` returns `403` with code `registration_closed` before any provider registration or email call. Confirmed provider users without an existing workspace membership cannot automatically provision a new workspace while registration is closed.

## Close direct Supabase registration too

In the existing production Supabase project, open **Authentication → Sign In / Providers** and turn off **Allow new users to sign up**, then save. Keep email sign-in, email confirmation and SMTP enabled so existing users can still log in and recover access.

The application's registration switch cannot change the Supabase project setting. Both layers must be closed: the application blocks new workspace access, while the Supabase setting blocks direct provider account creation.

## Test feature access

Use the existing customer's confirmed account and owned workspace. Through **Admin → Accounts & API Keys**, assign **Enterprise** to that workspace. Global enabled platforms and scopes must include the features being tested, and any tenant overrides must permit them. This uses normal audited entitlements; it does not grant platform administrator access or charge the customer.

Sign out and back in after changing the plan to refresh the plan displayed in the session. Server capability checks read the current database policy.

Enterprise unlocks implemented features permitted by current policy. Coming soon features, provider permissions and availability, tenant isolation, authentication, rate limits, purchase confirmations and administrator spending allocations still apply. An entitlement grant does not supply provider credit, customer wallet funds or an unlimited spending allocation. Existing beta overrides remain until commercial enrollment; review account count and price before enrolling.

The payment gateway is not ready. Customers contact [support@asra3.com](mailto:support@asra3.com) for administrator payment instructions. Credit a wallet only after verifying the received payment and recording its unique receipt/reference. Do not create a fake receipt to test billing; use isolated fixtures for simulated money. Keep customer funds and provider-spending allocations separate. Outbound calls/new paid incoming routes remain blocked, SMS needs verified tariff evidence, and unpaid wallet renewal does not release supplier numbers.

## Verify after deployment

1. Open `/signup` in a private browser window. Confirm the Coming soon notice appears and no registration form is present.
2. Run this safe registration-gate probe; it contains no credentials or user data:

   ```bash
   curl -i https://asra3.com/api/auth \
     -H 'Origin: https://asra3.com' \
     -H 'Content-Type: application/json' \
     --data '{"action":"signup"}'
   ```

   Expect HTTP `403` and `"code":"registration_closed"`.
3. Sign in with the existing test customer. Check channel connection access and CRM. Complete Meta consent only for the intended business assets.

## Reopen when testing is complete

1. Review the test workspace's plan and spending allocations; restore its intended plan through Admin and save.
2. Enable **Allow new users to sign up** in Supabase, retaining email confirmation.
3. Set `PUBLIC_REGISTRATION_ENABLED=true` in the server environment and recreate the app and worker. This is a runtime setting; a rebuild is unnecessary when only this value changes.
4. Verify a new registration, email confirmation, and first customer login end to end before announcing availability.
