# aaPanel: old HTML after deployment

For the current source release through migration10, follow [the release handoff](README.md) and verify the database before restarting the app/worker. The observations below describe earlier cached responses; compare them with the exact deployed revision before taking action.

The public bare `/`, `/signup`, and `/login` URLs were observed serving older HTML and JavaScript, while unique `?release=...` requests returned current content. The old signup bundle contains four paid plans; the current bundle contains the Starter notice and email-verification handling. Both bundles returned HTTP 200. HTML reported `CF-Cache-Status: DYNAMIC` and `x-nextjs-cache: HIT`, without `Age`; those headers alone do not identify the layer retaining the older response.

The app now renders signup, login, and recovery at request time. Auth pages and protected API/dashboard/admin routes use private, non-storable responses. This prevents new compliant caches from storing these responses; it does **not** invalidate responses already stored by a proxy. Public marketing pages and hashed static assets retain their normal caching behavior.

## Compare the running Docker app with the public URL

Run on the VPS. The checkout is `/www/wwwroot/asra3.com`; the Compose app listens on host loopback port **3008** by default. Do not assume a host `.next` directory exists: the production build runs inside Docker.

```bash
cd /www/wwwroot/asra3.com
git rev-parse --short HEAD
docker compose ps
docker compose port asra3-saas 3008
docker compose exec -T asra3-saas cat /app/.next/BUILD_ID
```

Use the published port above if it differs from 3008. These GET requests create no accounts and send no email:

```bash
PORT=3008
STAMP=$(date +%s)
for PATHNAME in signup login recovery; do
  for VARIANT in plain query; do
    SUFFIX=""
    [ "$VARIANT" = query ] && SUFFIX="?release=$STAMP"
    curl -sS -A 'Mozilla/5.0' -H 'Host: asra3.com' \
      -D "/tmp/asra3-$PATHNAME-origin-$VARIANT.headers" \
      "http://127.0.0.1:$PORT/$PATHNAME$SUFFIX" \
      -o "/tmp/asra3-$PATHNAME-origin-$VARIANT.html"
    curl -sS -A 'Mozilla/5.0' \
      -D "/tmp/asra3-$PATHNAME-public-$VARIANT.headers" \
      "https://asra3.com/$PATHNAME$SUFFIX" \
      -o "/tmp/asra3-$PATHNAME-public-$VARIANT.html"
  done
done
grep -iE '^HTTP/|^cache-control:|^cf-cache-status:|^age:|^x-nextjs-cache:' /tmp/asra3-*.headers
grep -oE '<title>[^<]*|/_next/static/chunks/[^" ]+' /tmp/asra3-*.html
```

Both origin variants should have current content and `Cache-Control` containing `private` and `no-store` (Next.js may also add `no-cache`, `max-age=0`, or `must-revalidate`). If origin is current but public bare URLs are old, inspect the proxy/upstream routing and cache. If origin itself is old, check the deployed image/build rather than clearing a browser cache. Different content between origin variants warrants investigation of the running app before assuming a proxy cause.

## Inspect the active nginx configuration

Find the nginx executable rather than guessing a site configuration path. The aaPanel fallback below is used only if that executable exists. Output is filtered to routing/cache directives; do not post full configuration or environment files containing credentials.

```bash
if command -v nginx >/dev/null 2>&1; then
  sudo nginx -T 2>&1 | grep -nE 'asra3\.com|proxy_pass|proxy_cache|fastcgi_cache|expires|Cache-Control'
elif [ -x /www/server/nginx/sbin/nginx ]; then
  sudo /www/server/nginx/sbin/nginx -T 2>&1 | grep -nE 'asra3\.com|proxy_pass|proxy_cache|fastcgi_cache|expires|Cache-Control'
fi
```

In aaPanel, inspect the site's reverse proxy cache settings and any inherited nginx cache configuration. Disable caching for HTML/auth pages and `/api`, `/dashboard`, and `/admin`; ensure the proxy respects upstream private/no-store headers and preserves query strings. Keep caching for hashed `/_next/static/` assets. Review any Cloudflare cache rules separately; `DYNAMIC` on the observed HTML is not proof of a Cloudflare cache hit. An existing stored response needs a targeted, owner-authorized invalidation in the layer proven to hold it. Do not delete guessed cache directories or blindly replace nginx configuration.
