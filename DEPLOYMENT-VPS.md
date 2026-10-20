# Owner deployment to Ubuntu/aaPanel — asra3.com

The local integration checks and review are complete; production deployment/live provider actions have not been performed. Deploy from the Git repository using the steps below. The owner has applied only SQL01. Pulling the source can happen first, but pending migrations02..09 must be applied before starting the new application/worker. Follow [SQL backup/preflight/order/postflight](docs/release/sql-migrations.md). Never rerun01/reset/drop or blindly db-push to resolve differences.

## Get the release with Git

Repository: https://github.com/drjimmy1990/zernio-saas.git. Release branch: `main`. Use the release commit reported with the push to verify the revision you deploy. Keep the checkout in `/opt/asra3`, outside aaPanel's public website root. If the existing private checkout has another location, use that location consistently in these commands.

For an existing checkout, record the old revision and check for server edits before pulling:

```bash
cd /opt/asra3
git remote -v
git status --short
git rev-parse HEAD
git pull --ff-only origin main
git log -1 --oneline
```

If `git status --short` shows source edits, preserve/reconcile them before pulling; stop if Git reports a conflict or refuses the fast-forward. Do not use a hard reset or clean command to discard server files. Git leaves the ignored private `.env` and `.data` in place.

For a first Git deployment only, clone into a new directory owned by your deployment user:

```bash
sudo install -d -o "$(id -un)" -g "$(id -gn)" /opt/asra3
git clone --branch main --single-branch https://github.com/drjimmy1990/zernio-saas.git /opt/asra3
cd /opt/asra3
git log -1 --oneline
```

Clone only when `/opt/asra3` is empty; preserve an existing non-Git installation and its configuration first. If GitHub requests authentication, use a deployment SSH key or Git credential manager/token flow; never put a token in the repository URL or share it in chat. No ZIP upload is required.

After pulling, back up the database/private configuration and pause writes and scheduled sending for the migration window. Stop the existing worker if it is running: `docker compose --env-file .env stop asra3-webhook-worker`. Complete the pending SQL pack and postflight before the build/start steps below. These commands do not run SQL automatically.

## Reviewed release and private configuration

The aaPanel website proxies requests to the application; it must not serve the source directory or `.env`. Record/back up the deployed image/revision and private data before replacing the running release. On first setup, create `.env` from [.env.example](.env.example) with real values; on updates preserve the existing `.env` and compare it with the current example for added variable names. Never overwrite real configuration with the example. Do not copy an old development `.env.local`: Compose reads it after `.env` and can override values.

Set actual public Supabase URL/anonymous key, `NEXT_PUBLIC_APP_URL=https://asra3.com`, brand and logo. Compose supplies these as Docker build arguments; Next embeds them in the browser bundle. Rebuild after public-value changes. The public anonymous key is not the service-role key.

Set server-only Supabase service key, Zernio key/base URL, actual webhook signing secret, exact administrator email/password, private `SESSION_SECRET` and distinct `WEBHOOK_DRAIN_SECRET`32+characters shared by application/worker. Generate signing/bearer secrets with `openssl rand -hex 32` and save privately; never reuse sample passwords. Customer passwords/recovery use Supabase Auth; configure Site URL, redirect allowlist, confirmation and SMTP for `https://asra3.com`.

To configure the administrator login and session secret, run `python3 scripts/configure-admin.py` directly in the server terminal. Enter your administrator email and a unique password of at least16characters, then repeat the password; typing is hidden. The helper writes only `ADMIN_EMAIL`, `ADMIN_PASSWORD` and a generated `SESSION_SECRET` to `.env`, removes overrides for those names from `.env.local`, and preserves provider/worker settings. It does not print secrets. Rerunning replaces these credentials and invalidates existing browser sessions. Apply saved values with `docker compose --env-file .env up -d --force-recreate asra3-saas asra3-webhook-worker`; an image rebuild is unnecessary for these server-only values.

The default host port is3008; container port stays3008. A changed `PORT` must match Nginx and health commands. Protect `.env` mode600. Runner UID1000 (`node`) needs ownership of the persistent mount:

```bash
cd /opt/asra3
chmod 600 .env
mkdir -p .data
# Back up existing .data privately before changing ownership.
sudo chown -R 1000:1000 .data
sudo chmod 700 .data
```

`.data` preserves legacy workspace configuration only. Durable CRM/security/sessions/keys/consent/allowances/phone/campaign intents/webhook queues use PostgreSQL and fail closed when unavailable. The volume is not a database backup.

## Build, start and verify

```bash
cd /opt/asra3
docker compose --env-file .env config --quiet
docker compose --env-file .env build asra3-saas
docker compose --env-file .env up -d
docker compose ps
curl --fail --silent --show-error http://127.0.0.1:3008/api/v1/openapi.json >/dev/null
docker compose logs --tail=100 asra3-saas asra3-webhook-worker
```

Build checks TypeScript and requires real public Supabase values. The app runs non-root and the worker waits for app health. Avoid displaying expanded Compose configuration/secrets in support logs. The one shared worker processes both queued webhook deliveries and reviewed due campaigns; do not also run a duplicate cron scheduler.

## HTTPS proxy

In aaPanel create `asra3.com`, point DNS to the VPS, install Let's Encrypt and force HTTPS. Reverse proxy to `http://127.0.0.1:3008` (or chosen host port), preserving Host/forwarded headers. Keep the app port loopback-only. Add www only with matching DNS/certificate/redirects.

```nginx
client_max_body_size 100M;
proxy_http_version 1.1;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

Verify `https://asra3.com/api/v1/openapi.json`, sign-in and protected workspace behavior. Configure actual incoming provider webhook at `https://asra3.com/api/webhooks/zernio`; signature verification is mandatory. Follow [worker/health/live acceptance](docs/release/operations.md). OpenAPI HTTP200 alone does not prove schema, permissions or delivery.

## Update and recover

For each update, record/back up the previous release, pull with `git pull --ff-only origin main`, verify the release commit, apply only confirmed pending migrations, then rebuild and verify app/worker. A successful pull updates the source; the running containers change only after rebuilding/restarting. Payments, AI/automation and self-service outgoing webhook setup remain Coming soon. Configured plan limits are not universally enforced quotas; monthly publishing/account enforcement is not certified.

If rollout fails stop `asra3-webhook-worker`, retain durable pending/unknown jobs and use a compatible prior image or tested restore. Do not drop schema, erase reservations or resend original actions. External actions after the backup point require provider reconciliation before restored jobs resume. Owner deploys/authorizes live acceptance after local completion.
