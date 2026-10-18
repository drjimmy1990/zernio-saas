# Original User Request

## 2026-10-18T01:36:59Z

Transform **Techurity (`https://techurity.si`)** into a flagship, production-grade multilingual marketing, communications, and developer API platform powered by Zernio (`C:\Users\LOQ\Desktop\zernio.txt`), featuring a `zernio.com`-caliber interactive landing page and a complete step-by-step customer dashboard for buying virtual phone numbers, linking them to WhatsApp Business & AI Voice Agents, and connecting 18 social/messaging/store channels.

Working directory: `C:\Users\LOQ\zernio-saas-platform`
Integrity mode: `development`

Reference material:
- Zernio Full API Specification & Endpoints: `C:\Users\LOQ\Desktop\zernio.txt`
- Live Visual & Structural Benchmark: `https://zernio.com` and `https://docs.zernio.com`

## Requirements

### R1. Flagship `zernio.com`-Caliber Landing Page (`/`)
Redesign the homepage (`src/app/page.tsx`) so it delivers the visual craft, warm-cream/coral & deep-ink architectural grid, and rich interactive product mockups of `zernio.com` (with full RTL Arabic and 10-language support, plus Light & Dark themes):
1. **Hero & Live Omnichannel Stage:** Top announcement bar, high-impact headline & CTAs, AI Agent compatibility bar (Claude Code, Cursor, Codex, OpenClaw, n8n + 1-click Copy Setup Prompt), rising warm-coral blurred SVG arch backdrop, and a split macOS showcase window (`POST /v1/posts`) showing live code alongside concentric radar rings with floating Instagram, TikTok, LinkedIn, and WhatsApp status cards.
2. **Interactive Social Media Platform Showcase:** Horizontal interactive showcase of vibrant platform cards with authentic mini UI mockups inside each card:
   - **Instagram:** Mini Stories row, post feed, likes/comments, and Reel/Story/DM API badge.
   - **TikTok:** Vertical video player mockup with live view/like/comment counters.
   - **Facebook & Messenger:** Page post with nested comment replies and Comment-to-DM automation indicator.
   - **X (Twitter) & Threads:** Connected multi-post thread mockup.
   - **LinkedIn & YouTube:** Company page post & video studio manager mockups.
   - **Google Business & Shopify/WordPress:** 5-star review owner reply mockup and blog/product publishing badges.
3. **Phone Numbers, WhatsApp Business & AI Voice Showcase:** Dedicated visual Bento & interactive country-number finder section showing:
   - Searching & buying virtual phone numbers across 55+ countries (US, UK, UAE, Saudi Arabia, Egypt, etc.) with Local, Mobile, and Toll-Free options and pricing.
   - Connecting the purchased number to **WhatsApp Business** (showing a WhatsApp Broadcast composer + green WhatsApp message bubbles with blue double-checkmarks `✓✓`).
   - Connecting the purchased number to **AI Voice Agents & SMS/MMS** (showing an iPhone incoming/active AI Agent call screen with audio waveform + SMS delivery bubbles with tracking links).
4. **Interactive Advertising Showcase (8 Ad Networks):** 3-tab interactive split view (`Launch`, `Moderate`, `Report`) showing live campaign hierarchy (`Campaign → Ad Set → Ad`), budget automation, and unified ROAS/spend sparklines across Meta, Google, TikTok, LinkedIn, X, Pinterest, Reddit, and OpenAI Ads.
5. **Dark-Ink Developer & Agent Hub + Pricing + AEO FAQ + Footer:** Interactive 3-way integration showcase (`API 8 SDKs` with language switcher for Node, Python, Go, PHP, etc., `MCP Server` terminal, and `CLI` terminal), transparent 4-tier Pricing, structured FAQ, and giant outlined brand wordmark footer.

### R2. Step-by-Step Social & Messaging Connection Wizard in Customer Dashboard (`/dashboard`)
Build a clear, guided **Step-by-Step Connection Wizard** inside `/dashboard` (operating in Smart Hybrid mode: full interactive step-by-step UI flow that also calls live Zernio API endpoints when `ZERNIO_API_KEY` is configured) so customers can see and execute the exact connection process for every platform:
1. **Step 1 — Select Platform & Connection Method:** Visual grid of all 18 platforms grouped by category (Social & Video: Instagram, Facebook, TikTok, YouTube, X, LinkedIn, Threads, Snapchat, Pinterest, Reddit, Bluesky; Messaging: WhatsApp Business, Telegram, Discord, Slack; Blogs & Local: Google Business, Shopify, WordPress), clearly displaying how each connects (OAuth 2.0 1-Click Redirect vs Bot Token / Store API Key).
2. **Step 2 — Authenticate & Authorize:** Interactive authentication step showing the OAuth popup/redirect handshake or direct credential input (e.g., Telegram Bot Token, Shopify Admin Token, WordPress Application Password).
3. **Step 3 — Select Target Page / Business Account / Channel:** After authentication, allow the customer to pick which specific Facebook Page, Instagram Business Account, LinkedIn Company Page, YouTube Channel, or Google Business Location to bind to their profile.
4. **Step 4 — Connection Verified & Ready:** Display the connected account card with live token health badge, connected handle (`@username`), platform icon, last sync time, quick **"Test Post / Test Message"** action, and reconnect/disconnect controls.

### R3. End-to-End Phone Number Marketplace & WhatsApp / AI Voice Linking Flow (`/dashboard`)
Provide a complete, dedicated **Phone Numbers & WhatsApp Linking** workflow inside `/dashboard` and `/api/services` so customers can buy a number from Zernio and bind it to WhatsApp Business, SMS, or an AI Voice Agent step by step:
1. **Step 1 — Search & Buy Virtual Numbers:** Interactive marketplace where customers filter available numbers by Country (US `+1`, UK `+44`, UAE `+971`, Saudi Arabia `+966`, Egypt `+20`, etc.), Number Type (`Local`, `Mobile`, `Toll-Free`), and capabilities (`WhatsApp`, `Voice`, `SMS`), and click **"Buy Number"** (`POST /v1/phone-numbers/buy`).
2. **Step 2 — Bind Number to WhatsApp Business (Step-by-Step):**
   - Select any purchased number and click **"Link to WhatsApp Business"**.
   - Walk through: (a) Business Display Name & Category setup, (b) Verification method (`SMS OTP` or `Voice Call OTP` auto-captured on the Zernio virtual number, or `QR Code` scan), (c) WhatsApp Template sync (`order_update`, `winter_sale_50`, `welcome_offer`), and (d) Live **"Send Test WhatsApp Message / Broadcast"** directly from the dashboard.
3. **Step 3 — Bind Number to AI Voice Agent & SMS:**
   - Configure an AI Voice Agent on the purchased number (Agent Name, Language/Dialect, System Prompt, Voice Persona, Human Call-Transfer Number) and trigger a simulated or live outbound test call with real-time transcript preview.

### R4. Unified Publishing, Inbox, Ads, Docs, Admin & 10-Language Consistency
Ensure all remaining platform views (`/dashboard` composer/inbox/ads/commerce/API tabs, `/docs` Fumadocs portal, `/admin` Super Admin panel, `/login`, `/signup`) work seamlessly together with zero broken CSS variables, full 10-language dictionary support (`ar` default RTL, `en`, `es`, `fr`, `de`, `pt-BR`, `tr`, `ru`, `zh`, `ja`), and complete SEO/GEO/AEO endpoints.

## Acceptance Criteria

### Programmatic Build & Route Verification
- [ ] `npx tsc --noEmit` completes with exit code 0 and zero type errors.
- [ ] `npm run build` succeeds with zero build or prerender errors across all routes (`/`, `/dashboard`, `/docs`, `/admin`, `/login`, `/signup`, `/api/connect`, `/api/services`, `/api/admin`, `/api/auth`, `/llms.txt`).
- [ ] Zero undefined CSS custom properties exist across `src/` (every `var(--...)` used in `.tsx` files is defined in `src/app/globals.css` for both `light` and `dark` themes).

### Functional & Interactive Verification
- [ ] **Homepage (`/`):** Renders the Hero with rising coral ramp + dual code/radar window, the interactive Social Platform cards with mini feed mockups (Instagram, TikTok, Facebook, X, LinkedIn, Google Business), the Phone Number + WhatsApp Business + Voice AI visual showcase, the 3-mode Advertising showcase (`Launch`, `Moderate`, `Report`), and the Dark-Ink Developer Hub (`API 8 SDKs`, `MCP`, `CLI`).
- [ ] **Customer Connection Wizard (`/dashboard`):** Clicking any of the 18 platforms opens the multi-step Connection Wizard (Method → Auth/OAuth → Select Page/Account → Verified Connected Account) and persists the newly connected account via `/api/connect`.
- [ ] **Phone Number Purchase & WhatsApp Linking (`/dashboard`):** Customers can search numbers by country, purchase a number, walk through the step-by-step "Link Number to WhatsApp Business" wizard (Display Name → OTP/QR Verification → Template Selection → Send Test WhatsApp Message), and see the number marked as `WhatsApp Linked ✓` and `Voice AI Active ✓`.


## 2026-10-18T01:41:48Z

USER ADDITION TO REQUIREMENTS:

The user explicitly emphasized:
"و بردو في اننا نشتري رقم و نستقبل عليه رسايل و نعمل منه مكالمات كمان"
("Also, when we buy a phone number, the customer must be able to RECEIVE messages (SMS / WhatsApp) on that purchased number AND MAKE / RECEIVE phone calls from that number directly!")

Please ensure R1 (Homepage) and R3 (Customer Dashboard `/dashboard` + `/api/services`) explicitly include and verify:
1. **Receiving & Sending SMS/Messages on Purchased Numbers:**
   - Each purchased number has a dedicated **Live SMS & WhatsApp Inbox** view in `/dashboard` showing incoming messages (including incoming OTPs, customer replies, and SMS/MMS threads) with a button to **"Simulate Incoming SMS"** and **"Send Outbound SMS"** from the selected purchased number (`POST /v1/messages/sms` / `GET /v1/messages`).
2. **Making & Receiving Phone Calls from Purchased Numbers:**
   - An interactive **Web Phone Dialer & Call Console** in `/dashboard` where the customer selects one of their purchased numbers (`fromNumber`), dials a destination phone number (`toNumber`), chooses whether to place a **Direct Voice Call** or an **AI Voice Agent Call** (`POST /v1/calls/initiate`), sees the active call status/timer/waveform & live transcript, and views the **Call History Log** (Inbound & Outbound calls, duration, recording/transcript status).
3. Ensure these capabilities are also prominently showcased visually on the Homepage (`/`).


## 2026-10-18T03:35:38Z

CRITICAL USER FEEDBACK (HIGHEST PRIORITY):

The user explicitly tested the live app and stated:
"امال ازاي بيدخهل الداش بورد من غير تسجيل دخول و حاسس في dummy data"
("How is it entering the dashboard without logging in?! And I feel there is dummy data!")

Requirements:
1. Enforce Real Login / Auth Protection on `/dashboard` and `/admin`:
   - An unauthenticated visitor MUST NOT access `/dashboard` or `/admin` directly; must redirect to `/login?redirect=...`.
   - Route protection via `src/middleware.ts` + session validation in `/dashboard` and `/admin` against `/api/auth`.
   - Clean up `/login`: remove cheesy "Quick Demo Persona" buttons; genuine production SaaS login (Email + Password + Google + link to signup).
   - Update `Navbar.tsx` based on real auth session: show login/signup when logged out; hide `/admin`; when logged in show user info, dashboard link, admin link if super_admin, and working Logout button (`POST /api/auth` `{ action: 'logout' }`) that clears cookie and redirects to `/login`.
2. Remove Pre-Filled Dummy Data from Customer Workspaces:
   - Workspaces must start 100% CLEAN (EMPTY) by default:
     - `connectedAccounts: []` (0 until connected via wizard)
     - `posts: []` (0 until created)
     - `phoneNumbers: []` (0 until purchased)
     - `calls: []` and `smsMessages: []` (0 until made/received)
     - `campaigns: []` (0 until launched)
   - High-craft Empty States in every dashboard tab.
   - Real persistence for authenticated tenant session (with file persistence e.g. `.data/store.json` across restarts) scoped to authenticated user's `tenantId`.


## 2026-10-18T13:10:13Z

Close all remaining feature, API, and Dashboard UI gaps between the current SaaS platform (C:\Users\LOQ\zernio-saas-platform) and the complete Zernio specification (C:\Users\LOQ\Desktop\zernio.txt), delivering 100% parity across all 8 Zernio resource families in both the REST API v1 (/api/v1/...) and the interactive Customer Dashboard (/dashboard) with a seamless Dual-Mode experience for both normal everyday users and advanced power users/developers.

Working directory: C:\Users\LOQ\zernio-saas-platform
Integrity mode: development

Reference specification: C:\Users\LOQ\Desktop\zernio.txt (51,483 lines covering Zernio Core, Content & Scheduling, Inbox/CRM, Analytics, Advertising, Platform APIs, Telephony, Developer & Admin Settings).

## Requirements

### R1. Complete Zernio API v1 Resource Parity (src/app/api/v1/[...path]/route.ts)
Expand the REST API v1 gateway and OpenAPI 3.1 / Postman specifications so that every resource family documented in C:\Users\LOQ\Desktop\zernio.txt is functional, authenticated via Authorization: Bearer tk_live_..., enforced by tenant quotas/scopes, and persisted in WorkspaceStore:
1. Core, Connect & Account Settings:
   - /api/v1/account-groups (GET, POST, PUT, DELETE — cross-posting account groups).
   - /api/v1/accounts/health & /api/v1/accounts/{accountId}/health (live token probe, permissions check, WhatsApp platformConnection & inboundWebhookSubscribed diagnostic).
   - /api/v1/accounts/{accountId}/messenger-menu, /messenger-ice-breakers, /messenger-greeting, /instagram-ice-breakers, /telegram-commands (GET, PUT, DELETE).
   - Headless OAuth selection flow (/api/v1/connect/{platform}/select for selecting Facebook Pages, Instagram business accounts, LinkedIn Organizations, Pinterest Boards, Google Business locations, and Ad Accounts).
2. Content, Queue Scheduling & Pre-Flight Validation:
   - /api/v1/queue/slots & /api/v1/queue/preview (GET, POST, DELETE — manage recurring weekly queue time slots and preview upcoming scheduled queue).
   - /api/v1/media/presign (POST — generate uploadUrl and publicUrl for media uploads).
   - /api/v1/validate/post & /api/v1/validate/media (POST — pre-flight validation checking platform character limits, video aspect ratios, durations, and required platform settings before publishing).
   - Content-hash duplicate post protection on POST /api/v1/posts (reject identical (platform, accountId, content) within 24h with 409 and existingPostId, plus Idempotency-Key header replay).
3. Unified Inbox, Social CRM, Broadcasts, Sequences & ManyChat Workflows:
   - /api/v1/inbox/comments (GET, POST, DELETE — list post comments across platforms, public reply, private DM reply, hide/unhide, like).
   - /api/v1/inbox/reviews (GET, POST — list and reply to Facebook Page & Google Business Profile star reviews).
   - /api/v1/inbox/mentions (GET — list brand mentions across connected accounts).
   - /api/v1/contacts & /api/v1/custom-fields (GET, POST, PATCH, DELETE — cross-platform CRM contact records, tags, channels, and custom field definitions).
   - /api/v1/broadcasts & /api/v1/broadcasts/{id}/send (GET, POST — bulk WhatsApp template / SMS / DM broadcast campaigns with recipient tracking).
   - /api/v1/sequences (GET, POST — multi-step drip campaign sequences and contact enrollments).
   - /api/v1/workflows (GET, POST, PATCH — ManyChat-style branching conversation automations triggered by DM keywords, comments, story mentions, or postbacks with message, wait, condition, and AI/human handoff nodes).
4. Telephony, Branded Calling, Verify OTP, RCS, WebRTC & WhatsApp Cloud:
   - /api/v1/verify & /api/v1/verify/check (POST — managed turnkey OTP phone verification for end users).
   - /api/v1/branded-calling/identities (GET, POST — Display Identity Record with business name, logo, and call reason on callee screens).
   - /api/v1/rcs/agents & /api/v1/rcs/messages (GET, POST — verified branded RCS business messaging with rich cards/carousels).
   - /api/v1/sms/registration & /api/v1/phone-numbers/porting (GET, POST — US 10DLC / Toll-Free / Alphanumeric Sender ID registration, KYC bundles, and number porting requests).
   - /api/v1/voice/browser-token (POST — WebRTC browser calling session token) & ElevenLabs / Retell AI Voice bridge settings.
   - /api/v1/whatsapp/templates, /api/v1/whatsapp/flows, and /api/v1/business-agent (GET, POST — WhatsApp template CRUD, interactive WhatsApp Flows, and Meta Business Agent provisioning).
5. Advertising, Commerce, Blogs, Google Business & Inbox Analytics:
   - /api/v1/ads/ctwa & /api/v1/ads/call (POST — Click-to-WhatsApp and Click-to-Call ad creation with Idempotency-Key).
   - /api/v1/ads/audiences, /api/v1/ads/targeting, /api/v1/ads/library, /api/v1/lead-gen/forms, and /api/v1/tracking-tags (GET, POST — custom audiences, targeting search, Meta/LinkedIn Ad Library spy tool, instant lead forms & leads retrieval, and Meta/TikTok/Google/LinkedIn pixels).
   - /api/v1/blogs (GET, POST — manage WordPress & Shopify blog articles).
   - /api/v1/commerce/products, /api/v1/commerce/orders, /api/v1/commerce/discounts, and /api/v1/google-business/services (GET, POST — unified store products, orders, discount codes, and Google Business Profile menus/services/offers).
   - /api/v1/analytics/best-times, /api/v1/analytics/content-decay, and /api/v1/inbox-analytics (GET — best time to post, content decay curves, and inbox day-by-hour volume & SLA response-time heatmap).

### R2. Dual-Mode Customer Dashboard (/dashboard) — Easy for Normal Users & Powerful for Advanced Users
Upgrade the Customer Dashboard (src/app/dashboard/page.tsx and modular consoles in src/components/dashboard/) so 100% of Zernio's capabilities can be operated visually from the browser without writing a single line of code, featuring a persistent Experience Mode Switcher (Simple Mode vs Advanced Pro Mode):
1. Simple Mode (for Normal Users & Small Business Owners):
   - Clean, jargon-free Arabic/English interface with 1-Click Guided Wizards:
     - Buy Number & Link WhatsApp in 60s Wizard
     - Smart Post Composer with automatic pre-flight check & Best-Time suggestion
     - 3-step Broadcast Wizard for WhatsApp/SMS/Instagram
     - 1-click ManyChat Preset Templates
     - Simple Click-to-WhatsApp (CTWA) Ad Launcher
2. Advanced Mode (for Power Users, Marketers & Agencies):
   - Unlocks advanced tabs and sub-panels inside each hub:
     - Connect & Accounts Hub: Live Account Health Inspector, Account Groups manager, Headless Page/Location Picker, Messenger Ice Breakers / Persistent Menu / Telegram Bot Commands editor.
     - Publishing & Queue Hub: Weekly Queue Slots Calendar, Pre-Flight Media/Post Validator, Blog Articles manager (WordPress/Shopify).
     - Inbox, CRM & Workflows Hub: Unified DMs + Comments + Star Reviews + Mentions tabs, CRM Contacts & Custom Fields table, Broadcasts & Drip Sequences manager, and Visual Branching Workflow Builder (Trigger -> Condition -> Wait -> Message / AI Handover).
     - Telephony, WhatsApp & Voice Hub: In-Browser WebRTC Softphone Dialer, WhatsApp Templates & Flows Studio, Meta Business Agent toggle, Branded Calling Identity & 10DLC/Porting/RCS/Verify OTP panels, ElevenLabs/Retell Voice integration.
     - Ads, Commerce & Analytics Hub: Click-to-WhatsApp & Click-to-Call Ad Builder, Instant Lead Gen Forms & Leads table, Pixels & Tracking Tags manager, Competitor Ad Library Search, Best-Time-to-Post & Inbox Response Heatmap.

### R3. Interactive Bilingual Developer Docs (/docs) & Clean State
Update src/app/docs/page.tsx so all new Zernio resources and endpoints are documented in Arabic and English with live interactive execution (Try It Live), updated OpenAPI 3.1 & Postman exports, and zero dummy data in .data/workspaces.json.

## Acceptance Criteria

### Build & Type Safety
- [ ] npx tsc --noEmit exits with code 0 with zero TypeScript errors.
- [ ] All routes compile cleanly on the running Next.js server (http://localhost:3000).

### Objective API v1 Verification
- [ ] Automated HTTP test script verifies 200/201 JSON responses across all new Zernio endpoint groups: /api/v1/accounts/health, /api/v1/account-groups, /api/v1/queue/slots, /api/v1/validate/post, /api/v1/inbox/comments, /api/v1/inbox/reviews, /api/v1/contacts, /api/v1/broadcasts, /api/v1/sequences, /api/v1/workflows, /api/v1/verify, /api/v1/branded-calling/identities, /api/v1/rcs/agents, /api/v1/whatsapp/templates, /api/v1/ads/ctwa, /api/v1/lead-gen/forms, /api/v1/blogs, and /api/v1/inbox-analytics.
- [ ] GET /api/v1/openapi.json returns a valid OpenAPI 3.1 spec containing all added paths.

### Dashboard Dual-Mode Verification
- [ ] /dashboard renders the Simple Mode / Advanced Mode switcher in the top bar and exposes visual UI controls for every Zernio capability in both Arabic (RTL) and English (LTR).
- [ ] .data/workspaces.json is reset to {"workspaces":{}} after automated tests finish so new users start with a 100% clean workspace.
