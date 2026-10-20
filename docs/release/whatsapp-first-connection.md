# First WhatsApp connection on asra3.com

The platform administrator manages settings, plans and spending. Connections belong to a business account with a persisted workspace. Using the administrator identity as a customer workspace previously produced the misleading error **Tenant policy verification is unavailable** before any WhatsApp authorization request.

## Deploy the correction

In the VPS terminal, run each command in order. Stop if a command fails.

```bash
cd /www/wwwroot/asra3.com
git pull --ff-only origin main
docker compose --env-file .env build asra3-saas
docker compose --env-file .env up -d
docker compose --env-file .env ps
```

The app should be healthy and the worker running. This correction requires no new SQL or environment variables. Existing migrations 01–09 must already be installed.

## Create your business account

1. Open [Sign up](https://asra3.com/signup). Use an email address different from `ADMIN_EMAIL`; that address is reserved for platform administrator sign-in.
2. Enter your own business details and password, then submit the form.
3. Open the verification email. Complete verification and open the workspace. If needed, sign in again using the new business email. The verified session creates or recovers the business workspace.

New signups start on Starter. Its default platform list excludes WhatsApp. Assign a plan that includes WhatsApp before attempting the connection.

## Enable WhatsApp access for that business

1. Open [Sign in](https://asra3.com/login) and sign in with the platform administrator credentials. This replaces the current browser session and opens the administrator panel.
2. Open **3. Accounts & API Keys**.
3. Find the workspace created by the business signup. Do not create another unassigned organization with the quick-create form.
4. Under **Workspace plan**, select **Agency Omnichannel + Ads**, then click **Save plan**. Enterprise also includes WhatsApp in the default configuration. Wait for the confirmed plan badge to change. This assigns feature access; payment collection remains coming soon.
5. Click **Business sign-in** on that workspace and sign in with the business email and password.

Changing the plan preserves per-business overrides. If WhatsApp has been disabled globally or through a custom override, that restriction still applies.

## Connect the existing WhatsApp Business number

1. In the business dashboard, open the connection wizard and choose **WhatsApp Business**.
2. Choose **Meta Embedded Signup (OAuth)**.
3. For a number used in the WhatsApp Business app, choose the Business App/coexistence option. For Cloud API onboarding, choose Cloud API.
4. Click **Launch Meta Embedded Signup (OAuth)** and complete Meta's business, number and permission steps.
5. Return to Asra3 and complete any required selection. Check the resulting account status; a launched signup alone does not confirm a connection.

Buying a new number and sending messages have separate provider-spending approvals. Use **Spending allocations** in the administrator panel to review those limits before paid operations. A plan assignment alone does not fund provider charges or purchase a number.

## Verification of this correction

Local checks cover administrator/customer routing in the actual React components, explicit per-workspace plan saving and failure recovery, denial of the administrator identity before policy SQL, unchanged customer policy and authentication checks, and PostgreSQL plan changes preserving membership. The production Docker image is rebuilt. No live customer account or WhatsApp connection is created by these checks; the owner completes the signup above.
