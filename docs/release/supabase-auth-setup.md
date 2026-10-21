# Production email authentication setup

Applying the SQL migrations creates application tables and functions. Supabase Authentication URL settings, email confirmation and SMTP settings must also be configured in the Supabase dashboard. A confirmation email linking to localhost indicates that the production authentication URL configuration or an email template still points to a development address.

## Configure the existing production Supabase project

1. Open the project used by the deployed application's `NEXT_PUBLIC_SUPABASE_URL`. Do not create a replacement project.
2. Under **Authentication → URL Configuration**, set **Site URL** to `https://asra3.com`.
3. Add `https://asra3.com/recovery` to **Redirect URLs** and save. The application uses this route for signup confirmation and password recovery. Remove obsolete localhost URLs from the production project's allowlist if they are no longer needed.
4. Under **Authentication → Sign In / Providers → Email**, retain email sign-in and **Confirm email**. Do not enable automatic confirmation to work around an email delivery problem. New users must verify their email before a workspace session is issued.
5. Under the Authentication email/SMTP settings, enable **custom SMTP** for production. Enter the SMTP host, port, username and password supplied by the actual mail provider, together with its verified sender address and sender name. Use the provider's supported TLS settings. Do not copy example credentials or invent values. Complete any sender-domain DNS verification required by that provider.
6. Review the confirmation and recovery email templates. Use Supabase's generated confirmation URL, normally `{{ .ConfirmationURL }}`, and remove any hardcoded localhost links. Save changes. Do not expose SMTP passwords, authentication tokens or email-link URLs in screenshots or logs.

Supabase's default email service has recipient restrictions and low sending limits; configuring URL settings alone does not make it suitable for production delivery. The exact SMTP failure must be checked against the provider's configuration and Supabase Authentication logs. Application errors now distinguish email delivery unavailability, registration restrictions, rate limits and password requirements without exposing provider details or whether an account exists.

## Get a fresh link and sign in

For an already-confirmed user, Supabase intentionally returns a successful signup-resend response without sending another confirmation email. It can also return the same neutral response for an unknown address, so the public response does not establish account existence or mail delivery. The project owner can check **Authentication → Users**, open the exact user, and inspect **Email confirmed at** / confirmation status. If confirmed, use sign-in or password recovery instead of repeatedly requesting signup confirmation. Successful password recovery delivery alone does not establish the user's confirmation status.

1. Open `https://asra3.com/recovery` and enter the email address used for signup.
2. Select **Resend verification** for an unconfirmed signup, or **Send recovery link** if resetting an existing account's password. Wait if the service reports a rate limit.
3. Open the newly received email privately. Existing messages retain their old URLs and may have expired; changing project settings does not rewrite them. Do not reuse a link containing access or refresh tokens that was shared publicly.
4. Complete confirmation on the production recovery page. If the account is already confirmed, use `https://asra3.com/login` with its existing password instead of creating another account.
5. After verification, customer sign-in provisions or restores the customer's Starter workspace. The platform administrator account belongs to `/admin`; it cannot connect business channels from the customer dashboard.

For WhatsApp entitlement, the administrator can open **Accounts & API Keys**, locate this exact customer workspace, choose an appropriate returned plan such as Agency or Enterprise, and select **Save plan**. Confirm that WhatsApp is enabled globally. Customer messaging may also require administrator spending allocations. This assigns access; it does not collect payment. Sign in with the customer's account to connect its business channels.

After changing deployment environment values, recreate the application and worker as described in `DEPLOYMENT-VPS.md`. Changes to public build-time configuration require rebuilding the image; Supabase dashboard URL/SMTP changes themselves do not require an application rebuild.
