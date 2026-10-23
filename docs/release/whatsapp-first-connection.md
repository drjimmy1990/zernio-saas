# First WhatsApp connection during the private pilot

The platform administrator manages settings, plans and spending. Connections belong to a confirmed business user with an existing workspace membership. The administrator identity cannot connect customer channels.

Before deploying, follow [the current release handoff](README.md) and [SQL verification through10](sql-migrations.md). Rebuilding a correction does not establish that the schema is current. The latest reported01–09 installation and migration10 must be checked against the intended project.

## Use an existing business account

1. Keep public registration closed in both the application and Supabase, as described in [private testing](private-testing.md). The signup page intentionally has no registration form.
2. Sign in with the confirmed existing customer's account and owned workspace. Use an address different from `ADMIN_EMAIL`.
3. If access needs recovery, follow [email authentication setup](supabase-auth-setup.md). Do not create another unassigned organization to work around missing membership.

Only after explicit public-launch acceptance should registration be reopened and a new verified signup tested. Earlier instructions to create a new business signup during private testing are superseded by this flow.

## Review WhatsApp access for that business

1. Sign in as the platform administrator and open **Accounts & API Keys**.
2. Locate the customer's exact workspace and review its plan, global enabled platforms/scopes and tenant overrides.
3. Save an appropriate returned plan only if needed. Migration10's Starter template includes WhatsApp; existing private-beta overrides are preserved. Agency/Enterprise access is not required solely because an earlier Starter template excluded WhatsApp.
4. Wait for the confirmed plan state, then use **Business sign-in** and authenticate as the customer. Sign in again after a plan change to refresh displayed session information.

Plan assignment grants feature access; it does not fund a customer wallet or provider charges. Commercial enrollment checks existing connected-account count and reviewed extras; Facebook Page/Messenger count together, while Instagram and WhatsApp count separately.

## Connect the existing WhatsApp Business number

1. In the business dashboard, open the connection wizard and choose **WhatsApp Business**.
2. Choose **Meta Embedded Signup (OAuth)**.
3. For a number used in the WhatsApp Business app, choose the Business App/coexistence option; for Cloud API onboarding, choose Cloud API.
4. Launch Meta Embedded Signup and complete consent only for the intended business, number and permissions.
5. Return to Asra3, complete required selection and verify account status. Launching signup alone does not prove connection.

Number purchase and messages require their own reviewed intents and bounded provider-spending approvals. Customer-paid phone actions also require sufficient wallet funds and valid reviewed prices. The gateway is not ready: contact [support@asra3.com](mailto:support@asra3.com) for administrator payment instructions; only an actual verified receipt permits a manual wallet credit.

Outbound calls/new paid incoming routes remain blocked, and SMS requires verified maximum tariff evidence. No account, number purchase, message or payment is created by this guide. Owner-approved live acceptance must verify provider permissions and actual results.
