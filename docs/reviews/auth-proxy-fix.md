# HTTPS reverse proxy authentication correction

Reviewed on 21 October 2026. This verifies the local release; the owner must still pull, rebuild and check sign-in on the VPS.

## Defect and correction

The auth and workspace mutation guards compared the browser Origin with the internal request URL. aaPanel terminates HTTPS and forwards to HTTP, so a legitimate request from `https://asra3.com` could return HTTP 403.

Both guards now use a shared comparison against `NEXT_PUBLIC_APP_URL`, falling back to `APP_URL` and, only when neither is set, the direct request URL. The configured URL must be HTTP(S) without embedded credentials. A malformed configuration fails closed with HTTP 503. Browser Origin must exactly equal its serialized origin; foreign/null/empty/malformed origins and cross-site Fetch Metadata remain denied. Forwarded headers cannot override the configured site. Signed-session verification, tenant ownership, current membership and role checks are unchanged.

GitNexus upstream analysis reported one direct caller for `originGuard` (LOW) and three direct callers across 29 processes for `requireTenantSession` (CRITICAL). This justified checking the wider auth, tenant, API-key and application suites. An independent agent reviewed the helper, both callers and test wiring with no blockers.

## Evidence

- Nine new proxy regression tests: seven failed against the previous guards; all nine passed after the correction. They exercise customer/admin sign-in, real signed workspace cookies, wrong passwords, tenant isolation, configuration errors, header spoofing and preserved direct/local behavior.
- Phase regression run: 274 passed and three opt-in database tests skipped. The WhatsApp HTTP fixture could not start because Postman reported a transient managed-manifest read error; all 12 affected tests passed in a separate rerun without code changes. The failed after-hook was a consequence of that same startup failure.
- Launch suite: 71 passed, five opt-in database tests skipped. No database schema changed in this fix.
- TypeScript and ESLint for the modified runtime files passed.
- Docker production image built successfully using only isolated public test settings, with the public URL set to `https://asra3.com`.
- Real HTTP against that image: anonymous logout with the public HTTPS Origin returned 200; a foreign Origin with spoofed forwarded headers returned 403; matching Origin with cross-site Fetch Metadata returned 403. Each Postman response assertion passed. The installed CLI returned exit code 1 for the expected 403 responses despite passing assertions. Its command-line header parser truncated a colon-containing Origin, so the final checks supplied the full headers and JSON through a pre-request script. A separate curl check also confirmed the legitimate request returned 200.

## Deployment

Use the existing `NEXT_PUBLIC_APP_URL=https://asra3.com`. No new SQL or environment variables are required. Pull the release, rebuild `asra3-saas`, and recreate the services with `docker compose --env-file .env up -d`. Next embeds the public URL at build time; restarting an older image is insufficient. Check sign-in at `https://asra3.com/login` after the application is healthy.
