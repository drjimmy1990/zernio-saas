// =============================================================================
// COMPLETE ZERNIO & MULTI-TENANT SAAS TYPE DEFINITIONS
// Covers all 16 Social/Blog Platforms, 8 Ad Platforms, 5 OAuth Scopes,
// 8 Sub-Services, 10 Zernio Resource Groups, and Super Admin Governance.
// =============================================================================

export const ALL_SOCIAL_PLATFORMS = [
  'instagram',
  'facebook',
  'tiktok',
  'linkedin',
  'twitter',
  'youtube',
  'threads',
  'pinterest',
  'reddit',
  'bluesky',
  'snapchat',
  'googlebusiness',
  'telegram',
  'discord',
  'slack',
  'whatsapp',
  'shopify',
  'wordpress',
] as const;

export type SocialPlatform = (typeof ALL_SOCIAL_PLATFORMS)[number];

export const ALL_AD_PLATFORMS = [
  'metaads',
  'googleads',
  'linkedinads',
  'tiktokads',
  'pinterestads',
  'xads',
  'redditads',
  'openaiads',
] as const;

export type AdPlatform = (typeof ALL_AD_PLATFORMS)[number];

export const ALL_OAUTH_SCOPES = [
  'posting',
  'analytics',
  'comments',
  'messaging',
  'ads',
] as const;

export type OAuthScopeArea = (typeof ALL_OAUTH_SCOPES)[number];

// Platforms that accept the `scopes` query parameter on GET /v1/connect/{platform}
// Per docs (line 14758): Bluesky, Telegram, Discord, Snapchat and WhatsApp have no reducible consent screen.
export const PLATFORMS_SUPPORTING_SCOPES: ReadonlySet<SocialPlatform> = new Set([
  'facebook',
  'instagram',
  'linkedin',
  'twitter',
  'tiktok',
  'youtube',
  'threads',
  'reddit',
  'pinterest',
  'googlebusiness',
  'slack',
]);

// Platforms requiring a post-OAuth secondary selection step (or headless=true)
export const SECONDARY_SELECTION_STEPS = {
  facebook: 'select_page',
  linkedin: 'select_organization',
  pinterest: 'select_board',
  googlebusiness: 'select_location',
  snapchat: 'select_public_profile',
  whatsapp: 'select_phone_number',
  instagram: 'select_account', // When loginMethod=facebook_login
} as const;

export type SecondarySelectionStep =
  (typeof SECONDARY_SELECTION_STEPS)[keyof typeof SECONDARY_SELECTION_STEPS];

export const ALL_SUB_SERVICES = [
  'core_connect',
  'publishing',
  'inbox_crm',
  'analytics',
  'ads',
  'telephony',
  'commerce_local',
  'support_ai',
] as const;

export type SubServiceKey = (typeof ALL_SUB_SERVICES)[number];

export const ALL_ZERNIO_RESOURCE_GROUPS = [
  'publishing',
  'engagement',
  'messages',
  'contacts',
  'analytics',
  'ads',
  'telephony',
  'accounts',
  'billing',
  'webhooks',
] as const;

export type ZernioResourceGroup = (typeof ALL_ZERNIO_RESOURCE_GROUPS)[number];

export interface SubServiceDefinition {
  key: SubServiceKey;
  title: string;
  tagline: string;
  zernioResourceGroups: ZernioResourceGroup[];
  requiredScopes: OAuthScopeArea[];
  endpointsCount: number;
  capabilities: string[];
  whiteLabelNotes: string;
}

export const SUB_SERVICE_CATALOG: Record<SubServiceKey, SubServiceDefinition> = {
  core_connect: {
    key: 'core_connect',
    title: 'Core Tenant & White-Label Connect',
    tagline: '1:1 customer profiles, headless=true OAuth pickers, scoped API keys & health checks',
    zernioResourceGroups: ['accounts', 'webhooks'],
    requiredScopes: [],
    endpointsCount: 92,
    capabilities: [
      'Automatic Zernio Profile per customer (POST /v1/profiles with externalId)',
      'Headless OAuth (headless=true) — build your own Page, Org, Board, Location & Number pickers',
      'Granular OAuth scope filtering (posting, analytics, comments, messaging, ads)',
      'Direct credential onboarding for Bluesky, WordPress, Shopify, Telegram & WhatsApp',
      'Account Groups (/v1/account-groups) for 1-click multi-brand cross-posting',
      'Proactive Account Health monitoring (/v1/accounts/health) & auto-reconnect alerts',
      'Per-tenant Scoped API Keys (zrk_ / sk_) with disabledResourceGroups & read/write locks',
      'Per-customer Zernio cost attribution (GET /v1/usage?range=cycle&groupBy=profile)',
    ],
    whiteLabelNotes: '100% white-label selection screens with headless=true; native platform OAuth dialog shows Zernio app.',
  },
  publishing: {
    key: 'publishing',
    title: 'Omnichannel Social Publishing & Queues',
    tagline: 'Publish, schedule, drip-queue & bulk-import content across 16 platforms',
    zernioResourceGroups: ['publishing', 'engagement'],
    requiredScopes: ['posting', 'comments'],
    endpointsCount: 64,
    capabilities: [
      'Publish now, schedule in any IANA timezone, or save drafts across 16 platforms',
      'Per-customer recurring Queue Schedules (/v1/queue/slots & queuedFromProfile)',
      'CSV Bulk Upload (/v1/posts/bulk-upload) with dryRun=true pre-validation',
      'Custom Branded Media CDN via Supabase Storage or Zernio presigned uploads',
      'Pre-flight media & post validation (/v1/validate/media, /v1/validate/post)',
      'Instagram Reels, Carousels, Collaborators, Trial Reels, Stories & First Comment',
      'LinkedIn PDF/Document carousels & @mention resolution (/v1/linkedin-mentions)',
      'X (Twitter) threads, polls, geo-tagging, quote posts & engagement (/v1/twitter-engagement)',
      'Reddit subreddit search & flairs, Discord custom webhook persona, TikTok video downloader',
    ],
    whiteLabelNotes: '100% white-label when serving media via your own Supabase Storage CDN URLs.',
  },
  inbox_crm: {
    key: 'inbox_crm',
    title: 'Unified Inbox, CRM & Growth Automations',
    tagline: 'DMs, comments, reviews, mentions, broadcasts, sequences, workflows & AI bots',
    zernioResourceGroups: ['messages', 'contacts', 'engagement'],
    requiredScopes: ['messaging', 'comments'],
    endpointsCount: 92,
    capabilities: [
      'Unified real-time DM Inbox (Instagram, Facebook, WhatsApp, X, Telegram, Bluesky, Reddit, Slack, SMS, RCS, iMessage)',
      'Typing indicators, mark-as-read receipts & idempotent reply delivery',
      'Unified Post Comments (/v1/comments), FB & Google Reviews (/v1/reviews) & Mentions (/v1/mentions)',
      'Cross-platform Contact CRM (/v1/contacts) & Custom Fields (/v1/custom-fields)',
      'Comment-to-DM Growth Automations (/v1/comment-automations) with keyword triggers',
      'Multi-channel Broadcast campaigns (/v1/broadcasts) with WhatsApp templates & FB/IG message tags',
      'Linear Drip Sequences (/v1/sequences) with automatic reply/unsubscribe exit',
      'Event-driven Visual Branching Workflows (/v1/workflows) & @zernio/chat-sdk-adapter bots',
    ],
    whiteLabelNotes: '100% white-label inside your Supabase Realtime UI.',
  },
  analytics: {
    key: 'analytics',
    title: 'Analytics & Business Intelligence Engine',
    tagline: '3-window sync worker, 1-call executive dashboards, attribution & heatmaps',
    zernioResourceGroups: ['analytics'],
    requiredScopes: ['analytics'],
    endpointsCount: 36,
    capabilities: [
      '1-Call Customer Executive Dashboard (GET /v1/analytics/dashboard with compare=previous_period)',
      '3-Window Background Sync Worker (Hourly 30d hot window, Weekly 366d long-tail, Onboarding backfill)',
      'Dual Attribution Daily Metrics (attribution=publish vs attribution=received)',
      'Follower growth curves (daily, weekly, monthly granularity)',
      'Best Time to Post heatmaps, Content Decay curves & Format Breakdown',
      'On-demand External Post Sync (POST /v1/posts/sync-external) for native app posts',
      'Inbox Analytics: message volume, day-by-hour heatmaps, response times & top accounts',
    ],
    whiteLabelNotes: '100% white-label; served directly from your Supabase PostgreSQL cache.',
  },
  ads: {
    key: 'ads',
    title: 'Cross-Platform Ads & Performance Marketing',
    tagline: 'Manage campaigns, creatives, CAPI, audiences & lead forms across 8 ad networks',
    zernioResourceGroups: ['ads'],
    requiredScopes: ['ads'],
    endpointsCount: 245,
    capabilities: [
      '8 Ad Networks in 1 API: Meta, Google (Search/PMax/Demand Gen/GAQL), LinkedIn, TikTok, Pinterest, X, Reddit & OpenAI Ads',
      'Headless Ad Account connection & Business Login with adAccountIds allowlisting',
      'Full Campaign -> Ad Set -> Ad hierarchy, Creative Library, Ad Previews & A/B Creative Testing',
      '1-Click Organic Post Boosting & Click-to-WhatsApp (CTWA) / Click-to-Message / Call Ads',
      'Custom & Lookalike Audiences + Customer Match hashed CRM uploads (/v1/ad-audiences)',
      'Targeting Discovery, Reach Estimates, Bid Forecasts & Public Ad Library Competitor Spy',
      'Server-Side Conversions API (CAPI) with Event Match Quality & Pixel / Google Tag management',
      'Facebook Instant Lead Gen Forms (/v1/lead-gen) & Meta Commerce Product Catalogs (/v1/product-catalogs)',
    ],
    whiteLabelNotes: '100% white-label with headless=true and Facebook Login for Business.',
  },
  telephony: {
    key: 'telephony',
    title: 'Cloud Telephony, AI Voice, SMS, RCS & WhatsApp',
    tagline: 'Global numbers, white-label KYC/10DLC, WebRTC softphone, AI voice agents & WhatsApp Cloud',
    zernioResourceGroups: ['telephony'],
    requiredScopes: [],
    endpointsCount: 243,
    capabilities: [
      'Buy or port phone numbers globally (/v1/phone-numbers/purchase, /v1/phone-numbers/porting)',
      'White-Label Hosted KYC Links (POST /v1/phone-numbers/kyc/share with your companyName, logoUrl & brandColor)',
      'PSTN Voice Calling, IVR, Business Hours, Voicemail, Call Recording & AI Transcription',
      'In-Browser WebRTC Softphone Dialer (POST /v1/voice/calls/web + @telnyx/webrtc)',
      '24/7 AI Voice Agents over wss:// bidirectional audio or SIP (Vapi, ElevenLabs, Retell)',
      'Branded Calling (show business name, logo & call reason on recipient phone) + white-label share link',
      'SMS/MMS sending, STOP opt-out exports & White-Label US 10DLC / Toll-Free registration links',
      'Verified RCS Business Messaging (rich cards & carousels) + Managed OTP Verification (/v1/verify)',
      'WhatsApp Cloud API + App Coexistence + Templates + Flows + Groups + Calling + Meta Business Agent + iMessage',
    ],
    whiteLabelNotes: 'KYC, 10DLC & Branded Calling support no-login share links (KYC supports custom logo/color/brandName); WhatsApp supports headless & credential connect.',
  },
  commerce_local: {
    key: 'commerce_local',
    title: 'E-Commerce, Blogs & Local Business Suite',
    tagline: 'Unified Shopify & WooCommerce API, multi-blog publishing & Google Business Local SEO',
    zernioResourceGroups: ['publishing', 'accounts'],
    requiredScopes: ['posting'],
    endpointsCount: 109,
    capabilities: [
      'Unified Commerce API (/v1/commerce) over Shopify & WooCommerce stores',
      'Manage Products, Variants, Options, Images, Multi-Location Inventory, Collections & Discounts/Coupons',
      'Manage Sales Channels, Markets, Metafields, Store Pages, Navigation Menus & Meta Catalog Sync',
      'Multi-Platform Blog Engine (/v1/blogs) for Shopify Blogs, WordPress.com & Self-Hosted WordPress',
      'Google Business Profile Local Suite: Multi-location posts, Events, Offers, Services & Food Menus, Verification',
    ],
    whiteLabelNotes: '100% white-label; supports direct Shopify Admin tokens & WordPress Application Passwords.',
  },
  support_ai: {
    key: 'support_ai',
    title: 'White-Label AI Diagnostics Assistant',
    tagline: 'Embedded root-cause diagnosis for failed posts & broken social connections',
    zernioResourceGroups: ['accounts', 'publishing'],
    requiredScopes: [],
    endpointsCount: 3,
    capabilities: [
      'Embedded "Diagnose with AI" button on any failed post (postId), account (accountId), or customer profile (profileId)',
      'Idempotent async execution (POST /v1/support/runs) with webhook delivery (support.run.completed)',
      'Configurable per-question cost cap (maxCostUsd: $0.50 to $3.00) & tenant monthly budget enforcement',
    ],
    whiteLabelNotes: '100% white-label — forward your customer questions with context IDs and render the answer natively.',
  },
};

export interface WhiteLabelBranding {
  companyName: string;
  logoUrl: string;
  primaryColor: string;
  language: 'en' | 'es' | 'pt-BR';
}

export interface EffectiveTenantPolicy {
  organizationId: string;
  organizationName: string;
  zernioProfileId: string | null;
  planKey: string;
  status: 'active' | 'suspended' | 'past_due' | 'Archived';
  enforceHeadlessOAuth: boolean;
  whiteLabelBranding: WhiteLabelBranding;
  enabledSubServices: SubServiceKey[];
  allowedPlatforms: SocialPlatform[];
  allowedAdPlatforms: AdPlatform[];
  allowedOAuthScopes: OAuthScopeArea[];
  disabledZernioResourceGroups: ZernioResourceGroup[];
  quotas: {
    maxConnectedAccounts: number;
    maxMonthlyPosts: number;
    maxMonthlyMessages: number;
    maxManagedAds: number;
    maxPhoneNumbers: number;
    maxAiSupportUsd: number;
    maxXApiSpendUsd: number;
  };
}
