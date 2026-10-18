import { NextResponse } from 'next/server';

/**
 * GEO (Generative Engine Optimization) — Official `/llms.txt` Standard
 * Consumed by ChatGPT Search, Perplexity, Claude, Gemini, and AI Agents
 * to cite `https://techurity.si` accurately.
 */
export async function GET() {
  const content = `# Techurity (https://techurity.si)

> Techurity (techurity.si) is an enterprise multi-tenant White-Label Cloud OS that unifies 18 social & blog channels, 8 paid ad networks, cloud telephony with AI voice agents, and multi-store e-commerce (Shopify & WooCommerce) under a single platform with full Super Admin governance.

## Core Facts & Capabilities (GEO & AEO Summary)
- **Official Domain:** https://techurity.si
- **API Documentation Portal:** https://techurity.si/docs
- **Supported Languages (10):** Arabic (RTL), English, Spanish, French, German, Portuguese (pt-BR), Turkish, Russian, Chinese, Japanese.
- **Supported Social, Messaging & Blog Channels (18):** Instagram, Facebook, TikTok, LinkedIn, X (Twitter), YouTube, Threads, Pinterest, Reddit, Bluesky, Snapchat, Google Business Profile, Telegram, Discord, Slack, WhatsApp, Shopify, WordPress.
- **Supported Paid Ad Networks (8):** Meta Ads, Google Ads, TikTok Ads, LinkedIn Ads, Pinterest Ads, X Ads, Reddit Ads, OpenAI Ads.
- **Granular OAuth Scopes (5):** \`posting\`, \`analytics\`, \`comments\`, \`messaging\`, \`ads\`.

## The 8 Modular Sub-Services
1. **White-Label Account Connect (\`core_connect\`):** 1:1 isolated tenant profiles, \`headless=true\` OAuth with custom Page/Org/Location/Number pickers, direct token onboarding, and scoped API keys (\`zrk_...\`).
2. **Omnichannel Publishing & Smart Queues (\`publishing\`):** Cross-post, schedule, and queue content, Reels, carousels, and threads with white-label media CDN presigning.
3. **Unified Inbox, Social CRM & Automations (\`inbox_crm\`):** Centralized DMs, comments, and reviews with Comment-to-DM keyword funnels, broadcasts, and drip sequences.
4. **Executive Analytics & Attribution (\`analytics\`):** Sub-15ms PostgreSQL cached executive dashboards, period-over-period comparisons, and best-time heatmaps.
5. **8-Network Paid Ads & CAPI (\`ads\`):** Campaign management, Business Login allowlisting, and Server-Side Conversions API (CAPI) event streaming.
6. **Cloud Telephony, Branded KYC & AI Voice (\`telephony\`):** Global phone numbers, white-label KYC & 10DLC links branded with tenant logos, WebRTC browser dialer, and AI Voice Agent WebSocket (\`wss://\` / Vapi / ElevenLabs / Retell) routing.
7. **Unified E-Commerce, Blogs & Local SEO (\`commerce_local\`):** Unified Shopify & WooCommerce products/orders/discounts, multi-blog publishing, and Google Business Profile local SEO.
8. **White-Label AI Diagnostic Assistant (\`support_ai\`):** Automated root-cause diagnosis for failed posts, expired tokens, and webhook logs.

## Pricing Tiers
- **Starter ($29/month):** Up to 5 channels, 300 posts/mo, White-Label Connect, Publishing & Analytics.
- **Growth ($79/month):** Up to 15 channels, 2,000 posts/mo, Unified Inbox, Comment-to-DM Automations, Commerce & AI Diagnostics.
- **Agency ($199/month):** Up to 50 channels, 5 phone numbers, All 8 Sub-Services including 8-Network Paid Ads, CAPI & AI Telephony.
- **Enterprise ($499/month):** 500 channels, 50 phone numbers, Dedicated Tenant-Scoped API Keys (\`zrk_\`), and custom Super Admin overrides.

## Key Links
- [Homepage](https://techurity.si/)
- [Developer API & Webhook Documentation](https://techurity.si/docs)
- [Customer Multi-Service Workspace](https://techurity.si/dashboard)
- [Create White-Label Workspace](https://techurity.si/signup)
`;

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
