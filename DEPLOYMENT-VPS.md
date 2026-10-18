# Ubuntu VPS Deployment Guide (Docker + aaPanel Nginx Reverse Proxy & SSL)

This guide covers deploying the **Asra3 (Zernio SaaS Platform)** from your Windows machine to your **Ubuntu VPS** running **Docker** and **aaPanel** (Nginx + Let's Encrypt SSL).

---

## 1. Push Code from Windows to GitHub (or Upload to VPS)

If using Git, push the repository to your private GitHub/GitLab repository, then SSH into your Ubuntu VPS:

```bash
mkdir -p /www/wwwroot/asra3.com
cd /www/wwwroot/asra3.com
git clone https://github.com/drjimmy1990/zernio-saas.git .
```

*(Alternatively, you can zip the folder on Windows excluding `node_modules` and `.next`, upload it via **aaPanel → Files** into `/www/wwwroot/asra3.com`, and click **Unzip**).*

---

## 2. Create `.env` on the Ubuntu VPS

Inside `/www/wwwroot/asra3.com`, create your `.env` file (or upload your `.env.local` from Windows and rename it to `.env`):

```bash
nano /www/wwwroot/asra3.com/.env
```

Paste your production environment variables:

```ini
# 1. Authentication & Session Security
SESSION_SECRET=replace_with_a_long_random_32_char_secret
ADMIN_PASSWORD=YourStrongAdminPassword2026!
CUSTOMER_PASSWORD=YourDefaultCustomerPassword2026!

# 2. Supabase Database Configuration (PostgreSQL)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# 3. Zernio Master Platform Configuration
ZERNIO_API_KEY=sk_...
ZERNIO_WEBHOOK_SECRET=whsec_...
ZERNIO_BASE_URL=https://zernio.com/api/v1

# 4. Public Domain & White-Label Brand Identity
NEXT_PUBLIC_APP_URL=https://asra3.com
NEXT_PUBLIC_BRAND_NAME=Asra3
NEXT_PUBLIC_BRAND_PRIMARY_COLOR=#4F46E5
NEXT_PUBLIC_BRAND_LOGO_URL=https://asra3.com/logo.png
```

> **Important:** Because Next.js bakes `NEXT_PUBLIC_*` variables into the client bundle at build time, always make sure `.env` is present in `/www/wwwroot/asra3.com/.env` **before** running `docker compose up -d --build`.

---

## 3. Build & Start the Docker Container on Ubuntu

On your Ubuntu VPS (via SSH or **aaPanel → Terminal**):

```bash
cd /www/wwwroot/asra3.com
docker compose up -d --build
```

Verify the container is running and healthy on `127.0.0.1:5651`:

```bash
docker ps
curl -I http://127.0.0.1:5651/api/v1/openapi.json
```

---

## 4. Configure aaPanel Website, SSL, and Nginx Reverse Proxy

1. Open **aaPanel** $\rightarrow$ go to **Website** $\rightarrow$ click **Add site**:
   * **Domain name:** `asra3.com` (and `www.asra3.com`)
   * **PHP Version:** Select **`Pure Static`**
   * Click **Submit**.
2. Click on `asra3.com` in the Website list $\rightarrow$ go to **SSL**:
   * Select **Let's Encrypt** $\rightarrow$ check your domain(s) $\rightarrow$ click **Apply**.
   * Turn ON **Force HTTPS**.
3. Still inside the `asra3.com` site settings $\rightarrow$ go to **Reverse proxy** $\rightarrow$ click **Add Reverse Proxy**:
   * **Proxy Name:** `nextjs-docker`
   * **Target URL:** `http://127.0.0.1:5651`
   * **Send Domain (`$host`):** `$host`
   * Click **Save**.
4. *(Recommended for Large Media Uploads & Webhooks)* Inside **Reverse proxy** $\rightarrow$ click **Config** (or go to **Config** in the site menu) and ensure these headers are inside the proxy block:
   ```nginx
   client_max_body_size 100M;
   proxy_http_version 1.1;
   proxy_set_header Upgrade $http_upgrade;
   proxy_set_header Connection 'upgrade';
   proxy_set_header Host $host;
   proxy_set_header X-Real-IP $remote_addr;
   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   proxy_set_header X-Forwarded-Proto $scheme;
   ```

---

## 5. Updating the Deployment in the Future

Whenever you update code and push to Git, run these 2 commands on the Ubuntu VPS:

```bash
cd /www/wwwroot/asra3.com
git pull && docker compose up -d --build
```
