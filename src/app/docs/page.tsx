'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import type { SubServiceKey } from '@/types/platform';
import {
  Rocket,
  Layers,
  Globe,
  ShieldCheck,
  Shield,
  Search,
  Copy,
  Check,
  FileText,
  ExternalLink,
  Play,
  Terminal,
  ChevronRight,
  BookOpen,
  Download,
  Key,
  Lock,
  Phone,
  MessageSquare,
  Share2,
  BarChart3,
  Megaphone,
  ShoppingBag,
  Sliders,
  Sparkles,
  Bot,
  Radio,
  FileCheck,
} from 'lucide-react';
import TryItLiveConsole from '@/components/docs/TryItLiveConsole';

export type CodeLang = 'nodejs' | 'python' | 'curl';

export type DocSectionId =
  | 'quickstart'
  | 'overview'
  | 'platforms'
  | 'auth_webhooks'
  // Family 1: Core & Accounts
  | 'ep_me'
  | 'ep_accounts_health'
  | 'ep_account_health_id'
  | 'ep_profiles'
  | 'ep_connect'
  | 'ep_connect_select'
  | 'ep_accounts'
  | 'ep_account_groups'
  | 'ep_account_menus'
  // Family 2: Content & Publishing
  | 'ep_posts'
  | 'ep_posts_list'
  | 'ep_queue_slots'
  | 'ep_queue_preview'
  | 'ep_media_presign'
  | 'ep_validate_post'
  | 'ep_validate_media'
  // Family 3: Unified Inbox & CRM
  | 'ep_messages_conversations'
  | 'ep_messages_create'
  | 'ep_messages_send'
  | 'ep_messages_search'
  | 'ep_messages_actions'
  | 'ep_inbox_comments'
  | 'ep_inbox_reviews'
  | 'ep_inbox_mentions'
  | 'ep_contacts'
  | 'ep_custom_fields'
  | 'ep_broadcasts'
  | 'ep_sequences'
  | 'ep_workflows'
  | 'ep_inbox'
  // Family 4: Telephony & Voice
  | 'ep_numbers_search'
  | 'ep_numbers_buy'
  | 'ep_numbers_list'
  | 'ep_numbers_porting'
  | 'ep_sms_send'
  | 'ep_sms_otp'
  | 'ep_sms_registration'
  | 'ep_voice_call'
  | 'ep_voice_token'
  | 'ep_telephony'
  | 'ep_verify_otp'
  | 'ep_verify_check'
  | 'ep_branded_calling'
  | 'ep_rcs_agents'
  | 'ep_rcs_messages'
  | 'ep_wa_link'
  | 'ep_wa_verify'
  | 'ep_wa_send'
  | 'ep_wa_templates'
  | 'ep_wa_flows'
  | 'ep_business_agent'
  // Family 5: Advertising (8 Networks)
  | 'ep_ads_ctwa'
  | 'ep_ads_call'
  | 'ep_ads_audiences'
  | 'ep_ads_targeting'
  | 'ep_ads_library'
  | 'ep_lead_gen'
  | 'ep_tracking_tags'
  | 'ep_ads'
  // Family 6: Commerce & Local
  | 'ep_blogs'
  | 'ep_google_services'
  | 'ep_commerce_products'
  | 'ep_commerce_orders'
  | 'ep_commerce_discounts'
  | 'ep_commerce'
  // Family 7: Analytics & Insights
  | 'ep_analytics'
  | 'ep_analytics_best_times'
  | 'ep_analytics_decay'
  | 'ep_inbox_analytics'
  // Family 8: Webhooks & Admin
  | 'ep_webhooks'
  | 'ep_openapi_spec'
  | 'ep_postman_spec'
  | 'ep_admin_reset';

export interface EndpointParamSpec {
  name: string;
  type: string;
  required: boolean;
  in: 'path' | 'query' | 'body';
  descEn: string;
  descAr: string;
}

export interface EndpointSpec {
  id: DocSectionId;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  liveApiPath: string;
  requiredScope: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  subService: SubServiceKey;
  action: string;
  params: EndpointParamSpec[];
  samplePayload: Record<string, unknown>;
  nodejs?: string;
  python?: string;
  curl?: string;
  response: Record<string, unknown>;
}

export interface ResourceCardItem {
  title: string;
  titleAr: string;
  count: string;
  desc: string;
  descAr: string;
  targetSection: DocSectionId;
}

export const RESOURCE_GROUPS: Array<{
  groupTitle: string;
  groupTitleAr: string;
  cards: ResourceCardItem[];
}> = [
  {
    groupTitle: '1. Core Workspace & Social Connect',
    groupTitleAr: '1. الأساسيات وربط القنوات الاجتماعية (Core & Connect)',
    cards: [
      {
        title: 'Workspace, Quotas & Wallet (/me)',
        titleAr: 'فحص مساحة العمل والحصص والمحفظة (/me)',
        count: 'GET /api/v1/me',
        desc: 'Inspect active workspace identity, plan quotas, rate limits, and Telecom Credit Wallet balance.',
        descAr: 'استعراض بيانات مساحة العمل، حدود الباقة، ورصيد محفظة الاتصالات.',
        targetSection: 'ep_me',
      },
      {
        title: 'Platform Connection Health Probes',
        titleAr: 'فحص صحة اتصال القنوات والتوكنات',
        count: 'GET /api/v1/accounts/health',
        desc: 'Live diagnostic probes across connected Facebook, Instagram, LinkedIn, and WhatsApp channels.',
        descAr: 'فحص فوري لصلاحية التوكنات وحالة التنبيهات لجميع القنوات المربوطة.',
        targetSection: 'ep_accounts_health',
      },
      {
        title: 'Profiles & Brand Groups',
        titleAr: 'الملفات والمجموعات (Profiles)',
        count: 'POST /api/v1/profiles',
        desc: 'Manage profiles to group social accounts, queue slots, and campaigns per brand or client.',
        descAr: 'إدارة ملفات الحسابات لتجميع قنوات كل علامة تجارية أو عميل في مساحة عمل مستقلة.',
        targetSection: 'ep_profiles',
      },
      {
        title: 'Headless OAuth & Entity Selector',
        titleAr: 'الربط الفوري واختيار الصفحات (Headless OAuth)',
        count: 'POST /api/v1/connect/{platform}',
        desc: 'Generate white-label OAuth authorization URLs or select specific Facebook pages / IG accounts.',
        descAr: 'توليد روابط تفويض للعميل واختيار الصفحات وحسابات إنستغرام بضغطة زر واحدة.',
        targetSection: 'ep_connect',
      },
    ],
  },
  {
    groupTitle: '2. Publishing, Queue & Pre-Flight Validation',
    groupTitleAr: '2. النشر الموحد، الجدولة الذكية، والفحص المسبق',
    cards: [
      {
        title: 'Multi-Platform Posts & 24h Duplicate Guard',
        titleAr: 'نشر وجدولة المنشورات مع منع التكرار',
        count: 'POST /api/v1/posts',
        desc: 'Publish or schedule posts across 26 platforms with Idempotency-Key and 24-hour content-hash protection.',
        descAr: 'نشر فوري أو مجدول عبر 26 منصة مع حماية من تكرار المنشور خلال 24 ساعة.',
        targetSection: 'ep_posts',
      },
      {
        title: 'Weekly Queue Slots Schedule',
        titleAr: 'خانات النشر الأسبوعية الذكية (Queue Slots)',
        count: 'GET /api/v1/queue/slots',
        desc: 'Define recurring weekly posting windows per profile and inspect optimal publishing slots.',
        descAr: 'ضبط أوقات النشر الدورية لكل بروفايل واستعراض الخانات القادمة.',
        targetSection: 'ep_queue_slots',
      },
      {
        title: 'Calendar Queue Preview Forecast',
        titleAr: 'معاينة تقويم النشر الحقيقي (Queue Preview)',
        count: 'GET /api/v1/queue/preview',
        desc: 'Retrieve calendar forecast without synthetic posts or phantom entries.',
        descAr: 'استعراض تقويم الجدولة الفعلي بدون منشورات وهمية.',
        targetSection: 'ep_queue_preview',
      },
      {
        title: 'Pre-Flight Character & Media Validators',
        titleAr: 'الفحص المسبق للحدود والوسائط (Pre-Flight)',
        count: 'POST /api/v1/validate/post',
        desc: 'Validate character limits, hashtags, and media aspect ratios before dispatching to networks.',
        descAr: 'فحص عدد الحروف وأبعاد الصور والفيديو قبل إرسال المنشور للمنصات.',
        targetSection: 'ep_validate_post',
      },
    ],
  },
  {
    groupTitle: '3. Unified Inbox, Social CRM & Visual Workflows',
    groupTitleAr: '3. صندوق الوارد الموحد، إدارة العملاء، والأتمتة البصرية',
    cards: [
      {
        title: 'Omnichannel Conversations & Live Messages',
        titleAr: 'المحادثات الموحدة والرسائل الفورية',
        count: 'GET /api/v1/inbox/conversations',
        desc: 'Unified two-way messaging across WhatsApp, Instagram DM, Facebook Messenger, and Telegram.',
        descAr: 'إدارة محادثات العملاء عبر جميع القنوات في صندوق وارد موحد لحظي.',
        targetSection: 'ep_messages_conversations',
      },
      {
        title: 'Public Comments Moderation & Replies',
        titleAr: 'إدارة التعليقات والردود العامة (Comments)',
        count: 'POST /api/v1/inbox/comments',
        desc: 'Fetch top-level comments, post public replies, like, hide, or delete comments programmatically.',
        descAr: 'قراءة التعليقات والرد عليها وإخفائها أو حذفها برمجياً عبر الـ API.',
        targetSection: 'ep_inbox_comments',
      },
      {
        title: 'Customer Star Reviews & Mentions',
        titleAr: 'تقييمات النجوم وإشارات العلامة التجارية',
        count: 'GET /api/v1/inbox/reviews',
        desc: 'Monitor Google Business & Facebook reviews, post merchant responses, and track brand mentions.',
        descAr: 'متابعة تقييمات العملاء والرد عليها ورصد الإشارات (Mentions) فور حدوثها.',
        targetSection: 'ep_inbox_reviews',
      },
      {
        title: 'CRM Contacts, Broadcasts & Branching Workflows',
        titleAr: 'جهات الاتصال، الحملات الجماعية، وسير العمل التفرعي',
        count: 'POST /api/v1/workflows',
        desc: 'Manage CRM contacts, send bulk broadcasts, trigger drip sequences, and execute ManyChat-style visual workflows.',
        descAr: 'إدارة جهات الاتصال وإرسال حملات البث وتشغيل أتمتة الرسائل وسلاسل المتابعة.',
        targetSection: 'ep_workflows',
      },
    ],
  },
  {
    groupTitle: '4. Cloud Telephony, Virtual Numbers & Voice AI',
    groupTitleAr: '4. الاتصالات السحابية، الأرقام الافتراضية، وذكاء الصوت',
    cards: [
      {
        title: 'Virtual Numbers in 55+ Countries',
        titleAr: 'أرقام افتراضية في أكثر من 55 دولة',
        count: 'GET /api/v1/phone-numbers/available',
        desc: 'Search, buy, and instantly provision virtual mobile and toll-free numbers supporting WhatsApp, SMS & Voice.',
        descAr: 'البحث عن أرقام افتراضية وشرائها فوراً مع دعم واتساب والرسائل والمكالمات.',
        targetSection: 'ep_numbers_search',
      },
      {
        title: 'Turnkey SMS / Voice OTP Verification',
        titleAr: 'نظام التحقق الفوري عبر OTP (SMS & Voice)',
        count: 'POST /api/v1/verify',
        desc: 'Send and verify 6-digit OTP codes with automatic rate limiting and fallback.',
        descAr: 'إرسال وتأكيد أكواد التحقق للمستخدمين برمجياً بحماية عالية.',
        targetSection: 'ep_verify_otp',
      },
      {
        title: 'WebRTC Browser Softphone & Voice Calls',
        titleAr: 'هاتف الويب الافتراضي (WebRTC) والمكالمات الصوتية',
        count: 'POST /api/v1/voice/browser-token',
        desc: 'Mint client calling tokens for browser softphones and trigger AI voice receptionist calls.',
        descAr: 'توليد توكنات الاتصال الصوتي عبر المتصفح وتشغيل موظف الاستقبال الذكي.',
        targetSection: 'ep_voice_token',
      },
      {
        title: 'WhatsApp Cloud API, Templates & Flows',
        titleAr: 'واتساب الرسمي، القوالب، واستمارات Flows',
        count: 'POST /api/v1/whatsapp/templates',
        desc: 'Manage official Meta HSM templates, interactive WhatsApp Flows forms, and business AI agents.',
        descAr: 'إدارة قوالب واتساب المعتمدة من ميتا واستمارات Flows التفاعلية.',
        targetSection: 'ep_wa_templates',
      },
    ],
  },
  {
    groupTitle: '5. Advertising & Lead Generation (8 Networks)',
    groupTitleAr: '5. الإعلانات المدفوعة وتوليد العملاء المحتملين (8 شبكات)',
    cards: [
      {
        title: 'Click-to-WhatsApp (CTWA) & Call Ads',
        titleAr: 'إعلانات النقرة للواتساب والاتصال الهاتفي',
        count: 'POST /api/v1/ads/ctwa',
        desc: 'Launch targeted Click-to-WhatsApp and Click-to-Call campaigns across Meta, TikTok, and Google.',
        descAr: 'إنشاء حملات إعلانية لتحويل العملاء مباشرة إلى محادثة واتساب أو اتصال هاتفي.',
        targetSection: 'ep_ads_ctwa',
      },
      {
        title: 'Instant Lead Generation Forms & Leads',
        titleAr: 'استمارات توليد العملاء والبيانات الملتقطة',
        count: 'POST /api/v1/lead-gen/forms',
        desc: 'Build instant on-platform lead capture forms and stream submitted leads into CRM.',
        descAr: 'إنشاء نماذج جمع بيانات العملاء واستقبال الإدخالات في نظام الـ CRM لحظياً.',
        targetSection: 'ep_lead_gen',
      },
      {
        title: 'Ad Library Spy & Competitor Intelligence',
        titleAr: 'مكتبة الإعلانات والبحث التنافسي (Ad Spy)',
        count: 'GET /api/v1/ads/library',
        desc: 'Search active competitor campaigns, ad creatives, and targeting angles across Meta and TikTok.',
        descAr: 'البحث في إعلانات المنافسين النشطة وتحليل نماذج النصوص والصور.',
        targetSection: 'ep_ads_library',
      },
      {
        title: 'Tracking Pixels & Server-Side CAPI',
        titleAr: 'بكسلات التتبع و Conversions API (CAPI)',
        count: 'POST /api/v1/conversions',
        desc: 'Deploy tracking pixels and dispatch SHA-256 hashed server-side conversion events.',
        descAr: 'إرسال أحداث الشراء والتحويل السحابية المشفرة (Meta CAPI & TikTok Events).',
        targetSection: 'ep_ads',
      },
    ],
  },
  {
    groupTitle: '6. Platform APIs: Blogs & Unified Commerce',
    groupTitleAr: '6. واجهات المنصات: التدوين والتجارة الإلكترونية',
    cards: [
      {
        title: 'Multi-Platform Blog Articles (WordPress & Shopify)',
        titleAr: 'نشر مقالات المدونة (ووردبريس وشوبيفاي)',
        count: 'POST /api/v1/blogs',
        desc: 'Create, schedule, and publish rich SEO blog posts simultaneously across WordPress and Shopify stores.',
        descAr: 'نشر المقالات والتدوينات المتوافقة مع السيو عبر ووردبريس ومتاجر شوبيفاي معاً.',
        targetSection: 'ep_blogs',
      },
      {
        title: 'Google Business Profile Local SEO Services',
        titleAr: 'خدمات الملف التجاري من جوجل (Google Business Services)',
        count: 'POST /api/v1/google-business/services',
        desc: 'Add and sync service catalog items on Google Maps and Local Search listings.',
        descAr: 'إضافة ومزامنة قائمة الخدمات والأسعار على خرائط جوجل ومحرك البحث المحلي.',
        targetSection: 'ep_google_services',
      },
      {
        title: 'Unified Store Catalog (Products CRUD)',
        titleAr: 'كتالوج المتجر الموحد (المنتجات)',
        count: 'GET /api/v1/commerce/products',
        desc: 'Create, inspect, and update products across TikTok Shop, Instagram Shop, and Shopify.',
        descAr: 'إدارة وتحديث المنتجات والمخزون عبر منصات المتاجر الاجتماعية.',
        targetSection: 'ep_commerce_products',
      },
      {
        title: 'Multi-Channel Orders & Universal Discounts',
        titleAr: 'الطلبات الموحدة وأكواد الخصم الترويجية',
        count: 'POST /api/v1/commerce/orders',
        desc: 'Record customer purchases, sync inventory, and generate universal coupon discount codes.',
        descAr: 'تسجيل عمليات الشراء ومزامنة المخزون وإنشاء كوبونات الخصم عبر القنوات.',
        targetSection: 'ep_commerce_orders',
      },
    ],
  },
  {
    groupTitle: '7. Advanced Analytics, Heatmaps & SLAs',
    groupTitleAr: '7. التحليلات المتقدمة، خرائط التفاعل، وقياس الأداء',
    cards: [
      {
        title: 'Cross-Network Unified Performance Analytics',
        titleAr: 'تحليلات الأداء الشامل عبر المنصات',
        count: 'GET /api/v1/analytics',
        desc: 'Aggregated impressions, engagement rates, and follower growth across all social channels.',
        descAr: 'رصد المشاهدات ومعدلات التفاعل ونمو المتابعين لجميع القنوات مجتمعة.',
        targetSection: 'ep_analytics',
      },
      {
        title: 'Best Time to Post Heatmap Recommendations',
        titleAr: 'خريطة أفضل أوقات النشر (Best Times Heatmap)',
        count: 'GET /api/v1/analytics/best-times',
        desc: 'Empirical hourly and day-of-week engagement recommendations tailored to your audience.',
        descAr: 'توصيات دقيقة بالساعات والأيام الأكثر تفاعلاً لجمهورك على كل منصة.',
        targetSection: 'ep_analytics_best_times',
      },
      {
        title: 'Content Decay Engagement Curves',
        titleAr: 'منحنيات اضمحلال التفاعل وعمر المنشور (Content Decay)',
        count: 'GET /api/v1/analytics/content-decay',
        desc: 'Calculate half-life and engagement velocity across posts, Reels, and TikTok videos.',
        descAr: 'قياس نصف عمر المنشور وسرعة استهلاك المحتوى حسب المنصة والنوع.',
        targetSection: 'ep_analytics_decay',
      },
      {
        title: 'Unified Inbox SLAs & Response Time Heatmap',
        titleAr: 'مؤشرات استجابة الرسائل ومعدلات الخدمة (Inbox SLAs)',
        count: 'GET /api/v1/inbox-analytics',
        desc: 'Hourly message volume, first-response time averages, resolution rates, and agent SLA compliance.',
        descAr: 'معدلات سرعة الرد على العملاء، أوقات الذروة، ونسب إنجاز تذاكر الدعم.',
        targetSection: 'ep_inbox_analytics',
      },
    ],
  },
  {
    groupTitle: '8. Webhooks, Specs & Admin Reset',
    groupTitleAr: '8. الـ Webhooks، مواصفات الـ API، وإعادة الضبط',
    cards: [
      {
        title: 'Outbound Webhooks with HMAC-SHA256 Signatures',
        titleAr: 'إشعارات الـ Webhook الموقعة بتشفير HMAC',
        count: 'POST /api/v1/webhooks',
        desc: 'Register HTTPS webhook subscribers with cryptographic signature verification using whsec_... secrets.',
        descAr: 'تسجيل روابط الـ Webhook لاستقبال الأحداث اللحظية مع توقيع أمني لمنع التلاعب.',
        targetSection: 'ep_webhooks',
      },
      {
        title: 'OpenAPI 3.1 & Postman 2.1 Export Specifications',
        titleAr: 'مواصفات OpenAPI 3.1 ومجموعة Postman الكاملة',
        count: 'GET /api/v1/openapi.json',
        desc: '110 paths and 100 operations ready for direct import into Postman, Insomnia, or AI coding agents.',
        descAr: 'مواصفات كاملة جاهزة للاستيراد الفوري في Postman و Cursor و Insomnia.',
        targetSection: 'ep_openapi_spec',
      },
      {
        title: 'Clean Workspace Reset Teardown',
        titleAr: 'إعادة ضبط مساحة العمل للحالة النظيفة (22 Bytes)',
        count: 'POST /api/v1/workspaces/reset',
        desc: 'Reset in-memory state and disk cache back to strictly 22-byte {"workspaces":{}} baseline.',
        descAr: 'إعادة ضبط الذاكرة والتخزين على القرص إلى الحالة النظيفة الأصلية بدقة 22 بايت.',
        targetSection: 'ep_admin_reset',
      },
    ],
  },
];

export const ENDPOINT_SPECS: Record<string, EndpointSpec> = {
  // ==========================================
  // FAMILY 1: CORE WORKSPACE & SOCIAL CONNECT
  // ==========================================
  ep_me: {
    id: 'ep_me',
    method: 'GET',
    path: '/v1/me',
    liveApiPath: '/api/v1/me',
    requiredScope: 'full_access / any active key',
    titleEn: 'Inspect Workspace, Plan Quotas & Telecom Wallet',
    titleAr: 'فحص الحساب، حدود الباقة، ورصيد محفظة الاتصالات (/me)',
    descEn:
      'Returns the authenticated organization, active API key scopes, real-time quota usage (connected accounts, monthly posts, virtual phone numbers), and Telecom Credit Wallet balance.',
    descAr:
      'يعيد تفاصيل مساحة العمل، صلاحيات مفتاح الـ API الحالي، استهلاك الحصص الفعلي، ورصيد محفظة الاتصالات بالدولار.',
    subService: 'core_connect',
    action: 'inspect_me',
    params: [],
    samplePayload: {},
    response: {
      success: true,
      data: {
        workspace: { organizationId: 'org_acme', organizationName: 'Acme Corp', planKey: 'growth' },
        auth: { keyName: 'Default Workspace Key', scopes: ['full_access'] },
        quotas: {
          connectedAccounts: { used: 3, max: 25 },
          monthlyPosts: { used: 14, max: 500 },
          phoneNumbers: { used: 1, max: 5 },
          apiRequestsPerMinute: 120,
        },
        wallet: { balanceUsd: 50.0, monthlySpentUsd: 3.0, currency: 'USD' },
      },
    },
  },
  ep_accounts_health: {
    id: 'ep_accounts_health',
    method: 'GET',
    path: '/v1/accounts/health',
    liveApiPath: '/api/v1/accounts/health',
    requiredScope: 'accounts:read',
    titleEn: 'Cross-Platform Connected Channel Health Probes',
    titleAr: 'فحص صحة اتصال القنوات والتوكنات المربوطة',
    descEn:
      'Runs live health diagnostics across all connected social channels in the workspace, checking token expiration, permissions, and webhook delivery status.',
    descAr:
      'يجري فحصاً تشخيصياً لحالة الاتصال وصلاحية التوكنات لجميع القنوات والحسابات المربوطة في مساحة العمل.',
    subService: 'core_connect',
    action: 'probe_health',
    params: [],
    samplePayload: {},
    response: {
      success: true,
      data: {
        summary: { total: 3, healthy: 3, degraded: 0, expired: 0 },
        accounts: [
          { id: 'acc_fb_01', platform: 'facebook', name: 'Acme Official', status: 'healthy', tokenExpiresAt: '2027-01-01' },
          { id: 'acc_ig_01', platform: 'instagram', name: '@acme_store', status: 'healthy', tokenExpiresAt: '2027-01-01' },
        ],
      },
    },
  },
  ep_account_health_id: {
    id: 'ep_account_health_id',
    method: 'GET',
    path: '/v1/accounts/{id}/health',
    liveApiPath: '/api/v1/accounts/acc_facebook_demo/health',
    requiredScope: 'accounts:read',
    titleEn: 'Single Account Diagnostic Probe',
    titleAr: 'فحص تشخيصي لحساب محدد بالمعرف',
    descEn: 'Executes a targeted diagnostic health probe on a specific social account by its unique identifier.',
    descAr: 'ينفذ فحصاً تشخيصياً دقيقاً لقناة محددة للتحقق من صلاحية وصول الـ API وصحة الربط.',
    subService: 'core_connect',
    action: 'probe_single_account',
    params: [
      { name: 'id', type: 'string', required: true, in: 'path', descEn: 'Account unique identifier', descAr: 'معرف الحساب المربوط' },
    ],
    samplePayload: {},
    response: {
      success: true,
      data: {
        id: 'acc_facebook_demo',
        platform: 'facebook',
        status: 'healthy',
        latencyMs: 42,
        permissionsValid: true,
      },
    },
  },
  ep_profiles: {
    id: 'ep_profiles',
    method: 'POST',
    path: '/v1/profiles',
    liveApiPath: '/api/v1/profiles',
    requiredScope: 'accounts:write',
    titleEn: 'Create a Brand Profile',
    titleAr: 'إنشاء ملف حسابات لعلامة تجارية أو عميل (Create Profile)',
    descEn:
      'Creates a logical profile container to group social accounts, queue schedules, and analytics for a specific brand or sub-tenant.',
    descAr:
      'ينشئ ملفاً مستقلاً لتجميع الحسابات الاجتماعية وجدول النشر لعلامة تجارية أو عميل داخل تطبيقك.',
    subService: 'core_connect',
    action: 'create_profile',
    params: [
      { name: 'name', type: 'string', required: true, in: 'body', descEn: 'Display name of the brand profile', descAr: 'اسم العلامة التجارية أو الملف' },
      { name: 'timezone', type: 'string', required: false, in: 'body', descEn: 'IANA timezone (e.g. Asia/Riyadh)', descAr: 'المنطقة الزمنية لجدولة المنشورات' },
    ],
    samplePayload: { name: 'Acme Global Brand', timezone: 'Asia/Riyadh' },
    response: {
      success: true,
      data: { id: 'prof_m2k9x81', name: 'Acme Global Brand', timezone: 'Asia/Riyadh', connectedChannelsCount: 0 },
    },
  },
  ep_connect: {
    id: 'ep_connect',
    method: 'POST',
    path: '/v1/connect/{platform}',
    liveApiPath: '/api/v1/connect/facebook',
    requiredScope: 'accounts:write',
    titleEn: 'Connect Channel or Generate Headless OAuth URL',
    titleAr: 'ربط حساب اجتماعي أو توليد رابط OAuth (18 منصة)',
    descEn:
      'Generates a headless OAuth redirect URL for end-users (when mode="oauth_url") OR directly connects a channel using an access token/handle.',
    descAr:
      'يولّد رابط مصادقة OAuth لتوجيه عميلك للموافقة بضغطة واحدة، أو يربط القناة مباشرة باستخدام التوكن.',
    subService: 'core_connect',
    action: 'start_oauth',
    params: [
      { name: 'platform', type: 'string', required: true, in: 'path', descEn: 'Platform identifier (facebook, instagram, linkedin, tiktok, etc.)', descAr: 'اسم المنصة المراد ربطها' },
      { name: 'mode', type: '"oauth_url" | "direct"', required: false, in: 'body', descEn: 'Pass "oauth_url" to get an authorization redirect URL', descAr: 'اختر oauth_url للحصول على رابط تفويض' },
      { name: 'redirectUri', type: 'string', required: false, in: 'body', descEn: 'Callback URL after authorization', descAr: 'رابط العودة بعد إتمام المصادقة' },
    ],
    samplePayload: { mode: 'direct', accountName: 'Asra3 Official', platformAccountId: 'act_100234' },
    response: {
      success: true,
      message: 'Account connected successfully.',
      data: { id: 'acc_facebook_mve4p9p9', platform: 'facebook', name: 'Asra3 Official', status: 'connected' },
    },
  },
  ep_connect_select: {
    id: 'ep_connect_select',
    method: 'POST',
    path: '/v1/connect/{platform}/select',
    liveApiPath: '/api/v1/connect/facebook/select',
    requiredScope: 'accounts:write',
    titleEn: 'Headless OAuth Entity Selection',
    titleAr: 'اختيار صفحات فيسبوك وحسابات إنستغرام برمجياً',
    descEn: 'Selects and binds specific Facebook pages, Instagram professional accounts, or LinkedIn company pages discovered during OAuth.',
    descAr: 'يختار ويربط الصفحات أو الحسابات المكتشفة بعد تفويض الـ OAuth تلقائياً.',
    subService: 'core_connect',
    action: 'select_oauth_entity',
    params: [
      { name: 'platform', type: 'string', required: true, in: 'path', descEn: 'Platform key', descAr: 'معرف المنصة' },
      { name: 'selectedEntityId', type: 'string', required: true, in: 'body', descEn: 'Target Page or Account ID', descAr: 'معرف الصفحة أو الحساب المطلوب ربطه' },
    ],
    samplePayload: { selectedEntityId: 'page_991823712', entityType: 'page' },
    response: {
      success: true,
      data: { connectedAccountId: 'acc_fb_99182', status: 'active', entityName: 'Acme Regional Store' },
    },
  },
  ep_accounts: {
    id: 'ep_accounts',
    method: 'GET',
    path: '/v1/accounts',
    liveApiPath: '/api/v1/accounts',
    requiredScope: 'accounts:read',
    titleEn: 'List Connected Social Channel Accounts',
    titleAr: 'استعراض الحسابات والقنوات المربوطة',
    descEn: 'Lists all connected social accounts across Facebook, Instagram, LinkedIn, TikTok, X, WhatsApp, and Google Business.',
    descAr: 'يعيد قائمة بكافة القنوات والحسابات المربوطة مع حالتها وتاريخ آخر نشاط.',
    subService: 'core_connect',
    action: 'list_accounts',
    params: [],
    samplePayload: {},
    response: {
      success: true,
      data: [
        { id: 'acc_fb_01', platform: 'facebook', name: 'Acme Official', status: 'connected' },
        { id: 'acc_ig_01', platform: 'instagram', name: '@acme_store', status: 'connected' },
      ],
    },
  },
  ep_account_groups: {
    id: 'ep_account_groups',
    method: 'GET',
    path: '/v1/account-groups',
    liveApiPath: '/api/v1/account-groups',
    requiredScope: 'accounts:read',
    titleEn: 'Cross-Posting Account Groups CRUD',
    titleAr: 'مجموعات الحسابات للنشر المتزامن (Account Groups)',
    descEn: 'Retrieve, create, or modify groups of social accounts to target with a single publishing or campaign request.',
    descAr: 'إدارة وتجميع الحسابات في باقات (مثل: قنوات الخليج، قنوات الإعلانات) للنشر الموحد.',
    subService: 'core_connect',
    action: 'list_groups',
    params: [
      { name: 'profileId', type: 'string', required: false, in: 'query', descEn: 'Filter by brand profile', descAr: 'تصفية حسب معرف البروفايل' },
    ],
    samplePayload: {},
    response: {
      success: true,
      data: [
        { id: 'grp_mena_01', name: 'MENA Flagships', accountIds: ['acc_fb_01', 'acc_ig_01'] },
      ],
    },
  },
  ep_account_menus: {
    id: 'ep_account_menus',
    method: 'PUT',
    path: '/v1/accounts/{id}/messenger-menu',
    liveApiPath: '/api/v1/accounts/acc_facebook_demo/messenger-menu',
    requiredScope: 'accounts:write',
    titleEn: 'Configure Persistent Menu & Ice Breakers',
    titleAr: 'ضبط القائمة الدائمة وأسئلة الترحيب (Messenger Menu & Ice Breakers)',
    descEn: 'Configures the Facebook Messenger persistent menu, greeting text, Instagram DM ice breakers, or Telegram bot commands.',
    descAr: 'يضبط القوائم التفاعلية ورسائل الترحيب السريعة لمحادثات ماسنجر وإنستغرام وبوتات تليجرام.',
    subService: 'core_connect',
    action: 'update_menu',
    params: [
      { name: 'id', type: 'string', required: true, in: 'path', descEn: 'Connected account ID', descAr: 'معرف الحساب' },
      { name: 'menuItems', type: 'array', required: true, in: 'body', descEn: 'Array of interactive menu buttons', descAr: 'أزرار القائمة الدائمة' },
    ],
    samplePayload: {
      menuItems: [
        { type: 'web_url', title: 'Visit Website', url: 'https://asra3.com' },
        { type: 'postback', title: 'Contact Support', payload: 'MENU_SUPPORT' },
      ],
    },
    response: {
      success: true,
      message: 'Persistent menu configured successfully.',
    },
  },

  // ==========================================
  // FAMILY 2: PUBLISHING & QUEUE SCHEDULING
  // ==========================================
  ep_posts: {
    id: 'ep_posts',
    method: 'POST',
    path: '/v1/posts',
    liveApiPath: '/api/v1/posts',
    requiredScope: 'posts:write',
    titleEn: 'Create Post with 24h Duplicate Guard & Idempotency-Key',
    titleAr: 'نشر وجدولة المنشورات مع منع التكرار ومفتاح التطابق',
    descEn:
      'Creates and publishes or schedules posts across 26 platforms. Features 24-hour content-hash duplicate prevention (returns 409) and Idempotency-Key header replay support.',
    descAr:
      'نشر فوري أو مجدول عبر 26 منصة. يدعم منع التكرار خلال 24 ساعة ومفتاح Idempotency-Key لتفادي تكرار الطلبات.',
    subService: 'publishing',
    action: 'create_post',
    params: [
      { name: 'content', type: 'string', required: true, in: 'body', descEn: 'Post caption or message body', descAr: 'نص المنشور' },
      { name: 'platforms', type: 'string[]', required: true, in: 'body', descEn: 'Target platforms (facebook, instagram, x, linkedin, etc.)', descAr: 'المنصات المستهدفة' },
      { name: 'publishNow', type: 'boolean', required: false, in: 'body', descEn: 'Publish immediately (true) or schedule (false)', descAr: 'نشر فوري أم جدولة' },
      { name: 'scheduledFor', type: 'ISO8601 string', required: false, in: 'body', descEn: 'Target UTC datetime if scheduling', descAr: 'تاريخ وتوقيت النشر المجدول' },
      { name: 'mediaUrls', type: 'string[]', required: false, in: 'body', descEn: 'Array of image/video CDN URLs', descAr: 'روابط الصور أو الفيديو المرفقة' },
    ],
    samplePayload: {
      content: 'Launching our updated API v1 documentation and interactive console! 🚀',
      platforms: ['facebook', 'instagram', 'linkedin'],
      publishNow: true,
    },
    response: {
      success: true,
      message: 'Post published successfully across 3 channels.',
      data: {
        id: 'post_1729257600_ab',
        status: 'published',
        publishedAt: '2026-10-18T18:00:00Z',
        platforms: ['facebook', 'instagram', 'linkedin'],
      },
    },
  },
  ep_posts_list: {
    id: 'ep_posts_list',
    method: 'GET',
    path: '/v1/posts',
    liveApiPath: '/api/v1/posts',
    requiredScope: 'posts:read',
    titleEn: 'List Published & Scheduled Posts',
    titleAr: 'استعراض المنشورات المنشورة والمجدولة',
    descEn: 'Retrieves published, scheduled, or queued posts filtered by status, platform, or date range.',
    descAr: 'يعيد قائمة بالمنشورات المنشورة والمجدولة مع إمكانية التصفية حسب الحالة والمنصة.',
    subService: 'publishing',
    action: 'list_posts',
    params: [
      { name: 'status', type: 'string', required: false, in: 'query', descEn: 'Filter: published | scheduled | draft', descAr: 'تصفية حسب الحالة' },
      { name: 'limit', type: 'number', required: false, in: 'query', descEn: 'Items per page (max 100)', descAr: 'عدد العناصر في الصفحة' },
    ],
    samplePayload: {},
    response: {
      success: true,
      data: [
        { id: 'post_01', content: 'Hello World', status: 'published', platforms: ['facebook'] },
      ],
    },
  },
  ep_queue_slots: {
    id: 'ep_queue_slots',
    method: 'GET',
    path: '/v1/queue/slots',
    liveApiPath: '/api/v1/queue/slots',
    requiredScope: 'posts:read',
    titleEn: 'Recurring Weekly Posting Slots Schedule',
    titleAr: 'جدول خانات النشر الأسبوعية الذكية',
    descEn: 'Inspect or configure the recurring weekly publishing windows (e.g. Mon 09:00, Wed 14:00, Fri 18:00) per brand profile.',
    descAr: 'استعراض وضبط أوقات وخانات النشر التلقائية لكل أسبوع.',
    subService: 'publishing',
    action: 'get_slots',
    params: [
      { name: 'profileId', type: 'string', required: false, in: 'query', descEn: 'Brand profile ID', descAr: 'معرف البروفايل' },
    ],
    samplePayload: {},
    response: {
      success: true,
      data: {
        slots: [
          { day: 'monday', time: '09:00' },
          { day: 'wednesday', time: '14:00' },
          { day: 'friday', time: '18:00' },
        ],
        upcomingSlots: ['2026-10-19T09:00:00Z', '2026-10-21T14:00:00Z'],
      },
    },
  },
  ep_queue_preview: {
    id: 'ep_queue_preview',
    method: 'GET',
    path: '/v1/queue/preview',
    liveApiPath: '/api/v1/queue/preview',
    requiredScope: 'posts:read',
    titleEn: 'Calendar Queue Preview Forecast',
    titleAr: 'معاينة تقويم النشر الحقيقي بدون منشورات وهمية',
    descEn: 'Returns a real calendar forecast of upcoming queued posts and open publishing slots without synthesizing fake posts.',
    descAr: 'يعيد تقويم الجدولة الفعلي للمنشورات القادمة والخانات المفتوحة بدون أي منشورات وهمية.',
    subService: 'publishing',
    action: 'preview_queue',
    params: [
      { name: 'days', type: 'number', required: false, in: 'query', descEn: 'Number of days to forecast (default 7)', descAr: 'عدد أيام التوقع' },
    ],
    samplePayload: {},
    response: {
      success: true,
      data: {
        totalQueued: 2,
        forecast: [
          { slotTime: '2026-10-19T09:00:00Z', status: 'filled', postId: 'post_01' },
          { slotTime: '2026-10-21T14:00:00Z', status: 'open' },
        ],
      },
    },
  },
  ep_media_presign: {
    id: 'ep_media_presign',
    method: 'POST',
    path: '/v1/media/presign',
    liveApiPath: '/api/v1/media/presign',
    requiredScope: 'posts:write',
    titleEn: 'Direct-to-Cloud Upload URL Presigning',
    titleAr: 'توليد روابط رفع الوسائط المباشرة للسحابة (Presign)',
    descEn: 'Mints secure, pre-signed S3/GCS upload URLs and public CDN URLs for images and videos before post creation.',
    descAr: 'يولّد روابط رفع مشفرة وآمنة لرفع الصور والفيديوهات مباشرة للسحابة قبل النشر.',
    subService: 'publishing',
    action: 'presign_media',
    params: [
      { name: 'filename', type: 'string', required: true, in: 'body', descEn: 'Original filename with extension', descAr: 'اسم الملف وامتداده' },
      { name: 'contentType', type: 'string', required: true, in: 'body', descEn: 'MIME type (image/png, video/mp4)', descAr: 'نوع الملف MIME' },
    ],
    samplePayload: { filename: 'product_launch.png', contentType: 'image/png' },
    response: {
      success: true,
      data: {
        uploadUrl: 'https://s3.eu-central-1.amazonaws.com/asra3-media-vault/presigned_xyz',
        publicUrl: 'https://cdn.asra3.com/media/2026/product_launch.png',
        expiresIn: 3600,
      },
    },
  },
  ep_validate_post: {
    id: 'ep_validate_post',
    method: 'POST',
    path: '/v1/validate/post',
    liveApiPath: '/api/v1/validate/post',
    requiredScope: 'posts:read',
    titleEn: 'Pre-Flight Character & Rule Validator',
    titleAr: 'الفحص المسبق لقواعد وقيود المنصات (Pre-Flight Validator)',
    descEn: 'Checks post length, hashtag rules, and platform constraints across all selected networks before posting.',
    descAr: 'يفحص طول النص والوسوم وقيود المنصات لتجنب أخطاء النشر قبل إرسال المنشور.',
    subService: 'publishing',
    action: 'validate_post',
    params: [
      { name: 'content', type: 'string', required: true, in: 'body', descEn: 'Post content to test', descAr: 'نص المنشور للفحص' },
      { name: 'platforms', type: 'string[]', required: true, in: 'body', descEn: 'Target networks', descAr: 'المنصات المختارة' },
    ],
    samplePayload: {
      content: 'Special promo! #tech #startup',
      platforms: ['x', 'instagram', 'linkedin'],
    },
    response: {
      success: true,
      data: {
        valid: true,
        networkChecks: {
          x: { passed: true, characters: 30, limit: 280 },
          instagram: { passed: true, characters: 30, limit: 2200 },
          linkedin: { passed: true, characters: 30, limit: 3000 },
        },
      },
    },
  },
  ep_validate_media: {
    id: 'ep_validate_media',
    method: 'POST',
    path: '/v1/validate/media',
    liveApiPath: '/api/v1/validate/media',
    requiredScope: 'posts:read',
    titleEn: 'Pre-Flight Media Aspect Ratio & Format Validator',
    titleAr: 'فحص أبعاد وصيغ الوسائط (Media Validator)',
    descEn: 'Validates image/video dimensions, file size, and aspect ratios against platform specifications (e.g., 9:16 for Reels/TikTok).',
    descAr: 'يتأكد من توافق أبعاد الفيديو أو الصور (مثل 9:16 للريلز وتيك توك) وحجم الملف مع متطلبات المنصات.',
    subService: 'publishing',
    action: 'validate_media',
    params: [
      { name: 'mediaUrl', type: 'string', required: true, in: 'body', descEn: 'Public URL of media file', descAr: 'رابط ملف الوسائط' },
      { name: 'targetPlatform', type: 'string', required: true, in: 'body', descEn: 'Target network (tiktok, reels, etc.)', descAr: 'المنصة المستهدفة' },
    ],
    samplePayload: { mediaUrl: 'https://cdn.asra3.com/media/demo_reel.mp4', targetPlatform: 'tiktok' },
    response: {
      success: true,
      data: { valid: true, dimensions: { width: 1080, height: 1920 }, aspectRatio: '9:16', durationSec: 15 },
    },
  },

  // ==========================================
  // FAMILY 3: UNIFIED INBOX & SOCIAL CRM
  // ==========================================
  ep_messages_conversations: {
    id: 'ep_messages_conversations',
    method: 'GET',
    path: '/v1/inbox/conversations',
    liveApiPath: '/api/v1/inbox/conversations',
    requiredScope: 'messages:read',
    titleEn: 'List Omnichannel Conversations',
    titleAr: 'جلب المحادثات الموحدة عبر القنوات (/conversations)',
    descEn:
      'Fetches active and archived two-way customer conversations across WhatsApp, Instagram DM, Facebook Messenger, and Telegram.',
    descAr:
      'استعراض المحادثات النشطة مع العملاء من مختلف القنوات في واجهة واحدة.',
    subService: 'inbox_crm',
    action: 'list_conversations',
    params: [
      { name: 'status', type: 'string', required: false, in: 'query', descEn: 'Filter: "open" | "closed"', descAr: 'تصفية حسب الحالة' },
      { name: 'limit', type: 'number', required: false, in: 'query', descEn: 'Default: 20', descAr: 'عدد النتائج' },
    ],
    samplePayload: {},
    response: {
      success: true,
      data: [
        { id: 'conv_demo_01', platform: 'whatsapp', contact: { name: 'Sarah Ahmed', phone: '+966501234567' }, unreadCount: 1 },
      ],
    },
  },
  ep_messages_create: {
    id: 'ep_messages_create',
    method: 'POST',
    path: '/v1/inbox/conversations',
    liveApiPath: '/api/v1/inbox/conversations',
    requiredScope: 'messages:write',
    titleEn: 'Initiate Direct Conversation or Outreach',
    titleAr: 'بدء محادثة جديدة أو إرسال قالب رسمي',
    descEn: 'Initiates a new customer conversation or opens a template window on WhatsApp Cloud or Instagram.',
    descAr: 'بدء محادثة جديدة مع عميل أو إرسال قالب تسويقي معتمد.',
    subService: 'inbox_crm',
    action: 'start_conversation',
    params: [
      { name: 'platform', type: 'string', required: true, in: 'body', descEn: 'Target channel', descAr: 'القناة المستهدفة' },
      { name: 'recipientId', type: 'string', required: true, in: 'body', descEn: 'Customer phone or handle', descAr: 'رقم هاتف أو معرف العميل' },
      { name: 'initialMessage', type: 'string', required: true, in: 'body', descEn: 'Message text or template ID', descAr: 'الرسالة الافتتاحية' },
    ],
    samplePayload: { platform: 'whatsapp', recipientId: '+966501234567', initialMessage: 'Welcome to Asra3 VIP!' },
    response: {
      success: true,
      data: { conversationId: 'conv_new_881', status: 'initiated', timestamp: '2026-10-18T18:00:00Z' },
    },
  },
  ep_messages_send: {
    id: 'ep_messages_send',
    method: 'POST',
    path: '/v1/inbox/conversations/{id}/messages',
    liveApiPath: '/api/v1/inbox/conversations/conv_demo_01/messages',
    requiredScope: 'messages:write',
    titleEn: 'Send Message into Conversation Thread',
    titleAr: 'إرسال رسالة داخل محادثة قائمة',
    descEn: 'Dispatches a text, image, document, or audio note into an existing conversation thread.',
    descAr: 'إرسال رد نصي أو ملف أو صورة داخل محادثة العميل.',
    subService: 'inbox_crm',
    action: 'send_thread_message',
    params: [
      { name: 'id', type: 'string', required: true, in: 'path', descEn: 'Conversation ID', descAr: 'معرف المحادثة' },
      { name: 'text', type: 'string', required: true, in: 'body', descEn: 'Message text', descAr: 'نص الرسالة' },
    ],
    samplePayload: { text: 'Thank you for reaching out! How can our concierge assist you today?' },
    response: {
      success: true,
      data: { messageId: 'msg_88129', status: 'sent', sentAt: '2026-10-18T18:01:00Z' },
    },
  },
  ep_messages_search: {
    id: 'ep_messages_search',
    method: 'GET',
    path: '/v1/inbox/conversations/search',
    liveApiPath: '/api/v1/inbox/conversations/search',
    requiredScope: 'messages:read',
    titleEn: 'Two-Way Full-Text Message Search',
    titleAr: 'البحث الشامل في الرسائل والمحادثات',
    descEn: 'Performs two-way full-text searching across all historical customer messages and agent replies.',
    descAr: 'بحث نصي فوري في كافة رسائل العملاء والردود السابقة.',
    subService: 'inbox_crm',
    action: 'search_messages',
    params: [
      { name: 'q', type: 'string', required: true, in: 'query', descEn: 'Search query string', descAr: 'كلمة البحث' },
    ],
    samplePayload: {},
    response: {
      success: true,
      data: { totalMatches: 1, results: [{ conversationId: 'conv_demo_01', snippet: 'assist you today?' }] },
    },
  },
  ep_messages_actions: {
    id: 'ep_messages_actions',
    method: 'POST',
    path: '/v1/inbox/conversations/{id}/handover',
    liveApiPath: '/api/v1/inbox/conversations/conv_demo_01/handover',
    requiredScope: 'messages:write',
    titleEn: 'Bot-to-Human Handover & Agent Assignment',
    titleAr: 'تحويل المحادثة لموظف بشري (Bot Handover)',
    descEn: 'Transfers control of a conversation between automated bot flows and human agents.',
    descAr: 'تحويل المحادثة من الرد الآلي إلى موظف خدمة العملاء البشري بسلاسة.',
    subService: 'inbox_crm',
    action: 'handover_conversation',
    params: [
      { name: 'id', type: 'string', required: true, in: 'path', descEn: 'Conversation ID', descAr: 'معرف المحادثة' },
      { name: 'target', type: '"human" | "bot"', required: true, in: 'body', descEn: 'Target recipient', descAr: 'جهة التحويل' },
    ],
    samplePayload: { target: 'human', agentId: 'agent_nour_01' },
    response: {
      success: true,
      message: 'Conversation handed over to human agent successfully.',
    },
  },
  ep_inbox_comments: {
    id: 'ep_inbox_comments',
    method: 'POST',
    path: '/v1/inbox/comments',
    liveApiPath: '/api/v1/inbox/comments',
    requiredScope: 'messages:write',
    titleEn: 'Public Comments Moderation & Top-Level Posting',
    titleAr: 'إدارة التعليقات ونشر تعليق جديد',
    descEn: 'Fetches comments on social posts, posts public comments or replies, and manages comment visibility.',
    descAr: 'قراءة التعليقات على المنشورات وإرسال ردود عامة أو إخفاء التعليقات غير اللائقة.',
    subService: 'inbox_crm',
    action: 'create_comment',
    params: [
      { name: 'postId', type: 'string', required: true, in: 'body', descEn: 'Post ID', descAr: 'معرف المنشور' },
      { name: 'text', type: 'string', required: true, in: 'body', descEn: 'Comment text', descAr: 'نص التعليق' },
    ],
    samplePayload: { postId: 'post_demo_01', text: 'Great insights! Thanks for sharing.' },
    response: {
      success: true,
      data: { commentId: 'comm_99182', status: 'posted' },
    },
  },
  ep_inbox_reviews: {
    id: 'ep_inbox_reviews',
    method: 'GET',
    path: '/v1/inbox/reviews',
    liveApiPath: '/api/v1/inbox/reviews',
    requiredScope: 'messages:read',
    titleEn: 'Customer Star Reviews & Merchant Replies',
    titleAr: 'تقييمات النجوم وردود المتجر (Reviews)',
    descEn: 'Inspect customer star reviews across Google Business Profile and Facebook pages, and submit merchant responses.',
    descAr: 'متابعة تقييمات العملاء والرد عليها برمجياً.',
    subService: 'inbox_crm',
    action: 'list_reviews',
    params: [
      { name: 'minRating', type: 'number', required: false, in: 'query', descEn: 'Minimum star rating (1-5)', descAr: 'أدنى تقييم' },
    ],
    samplePayload: {},
    response: {
      success: true,
      data: [
        { id: 'rev_01', rating: 5, author: 'Fahad', comment: 'Exceptional service and quick delivery!' },
      ],
    },
  },
  ep_inbox_mentions: {
    id: 'ep_inbox_mentions',
    method: 'GET',
    path: '/v1/inbox/mentions',
    liveApiPath: '/api/v1/inbox/mentions',
    requiredScope: 'messages:read',
    titleEn: 'Cross-Network Brand Mentions Feed',
    titleAr: 'إشارات العلامة التجارية عبر المنصات (Mentions)',
    descEn: 'Monitors public brand mentions, tags, and story replies across X, Instagram, and Facebook.',
    descAr: 'رصد إشارات العلامة التجارية في المنشورات والقصص.',
    subService: 'inbox_crm',
    action: 'list_mentions',
    params: [],
    samplePayload: {},
    response: {
      success: true,
      data: [
        { platform: 'x', author: '@tech_reviewer', text: 'Loving the new @asra3 platform features!' },
      ],
    },
  },
  ep_contacts: {
    id: 'ep_contacts',
    method: 'POST',
    path: '/v1/contacts',
    liveApiPath: '/api/v1/contacts',
    requiredScope: 'contacts:write',
    titleEn: 'Unified Social CRM Contacts Directory',
    titleAr: 'دليل جهات اتصال العملاء الموحد (CRM Contacts)',
    descEn: 'Creates and synchronizes customer contacts with phone numbers, emails, social handles, custom fields, and tags.',
    descAr: 'إدارة وتحديث بيانات جهات الاتصال وربط أرقام الهواتف والحسابات الاجتماعية والوسوم.',
    subService: 'inbox_crm',
    action: 'create_contact',
    params: [
      { name: 'name', type: 'string', required: true, in: 'body', descEn: 'Contact full name', descAr: 'اسم العميل' },
      { name: 'phone', type: 'string', required: false, in: 'body', descEn: 'E.164 phone number', descAr: 'رقم الهاتف' },
      { name: 'tags', type: 'string[]', required: false, in: 'body', descEn: 'Segmentation tags', descAr: 'وسوم التصنيف' },
    ],
    samplePayload: { name: 'Sultan Al-Otaibi', phone: '+966551234567', tags: ['vip', 'enterprise'] },
    response: {
      success: true,
      data: { id: 'cnt_99812', name: 'Sultan Al-Otaibi', phone: '+966551234567', tags: ['vip', 'enterprise'] },
    },
  },
  ep_custom_fields: {
    id: 'ep_custom_fields',
    method: 'POST',
    path: '/v1/custom-fields',
    liveApiPath: '/api/v1/custom-fields',
    requiredScope: 'contacts:write',
    titleEn: 'CRM Contact Custom Fields Schema Definition',
    titleAr: 'تعريف الحقول المخصصة لجهات الاتصال (Custom Fields)',
    descEn: 'Defines custom attributes (e.g. tier, loyaltyPoints, preferredLanguage) for omnichannel CRM contacts.',
    descAr: 'تعريف حقول إضافية مخصصة لبيانات العملاء.',
    subService: 'inbox_crm',
    action: 'create_custom_field',
    params: [
      { name: 'key', type: 'string', required: true, in: 'body', descEn: 'Unique field key', descAr: 'مفتاح الحقل' },
      { name: 'label', type: 'string', required: true, in: 'body', descEn: 'Display label', descAr: 'اسم الحقل الظاهر' },
      { name: 'type', type: 'string', required: true, in: 'body', descEn: 'string | number | boolean', descAr: 'نوع البيانات' },
    ],
    samplePayload: { key: 'loyaltyTier', label: 'Loyalty Tier', type: 'string' },
    response: {
      success: true,
      data: { key: 'loyaltyTier', label: 'Loyalty Tier', type: 'string', created: true },
    },
  },
  ep_broadcasts: {
    id: 'ep_broadcasts',
    method: 'POST',
    path: '/v1/broadcasts',
    liveApiPath: '/api/v1/broadcasts',
    requiredScope: 'messages:write',
    titleEn: 'Bulk Broadcast Marketing Campaigns',
    titleAr: 'حملات البث الجماعي للعملاء (Broadcasts)',
    descEn: 'Creates and immediately dispatches bulk targeted broadcast messages across WhatsApp or SMS channels.',
    descAr: 'إنشاء وإرسال حملات الرسائل الجماعية لشرائح العملاء.',
    subService: 'inbox_crm',
    action: 'create_broadcast',
    params: [
      { name: 'title', type: 'string', required: true, in: 'body', descEn: 'Broadcast campaign title', descAr: 'عنوان الحملة' },
      { name: 'channel', type: 'string', required: true, in: 'body', descEn: 'whatsapp | sms', descAr: 'القناة' },
      { name: 'content', type: 'string', required: true, in: 'body', descEn: 'Message body or template', descAr: 'نص الرسالة' },
    ],
    samplePayload: { title: 'Ramadan Special Offer', channel: 'whatsapp', content: 'Special 30% savings code: RAMADAN30' },
    response: {
      success: true,
      data: { broadcastId: 'bc_99812', status: 'queued', recipientCount: 150 },
    },
  },
  ep_sequences: {
    id: 'ep_sequences',
    method: 'POST',
    path: '/v1/sequences',
    liveApiPath: '/api/v1/sequences',
    requiredScope: 'messages:write',
    titleEn: 'Linear Drip Marketing Sequences',
    titleAr: 'سلاسل الرسائل التتابعية (Drip Sequences)',
    descEn: 'Configures automated linear drip sequences with step delays, triggers, and contact enrollment.',
    descAr: 'إنشاء سلاسل الرسائل المجدولة تلقائياً للتفاعل مع العملاء عبر فترات زمنية.',
    subService: 'inbox_crm',
    action: 'create_sequence',
    params: [
      { name: 'name', type: 'string', required: true, in: 'body', descEn: 'Sequence name', descAr: 'اسم السلسلة' },
      { name: 'steps', type: 'array', required: true, in: 'body', descEn: 'Array of sequential messages with delayHours', descAr: 'خطوات السلسلة مع التأخير الزمني' },
    ],
    samplePayload: {
      name: 'Onboarding Welcome Nurture',
      steps: [
        { delayHours: 0, text: 'Welcome aboard! Here is your quickstart guide.' },
        { delayHours: 48, text: 'Have you connected your social accounts yet?' },
      ],
    },
    response: {
      success: true,
      data: { id: 'seq_10023', name: 'Onboarding Welcome Nurture', status: 'draft', stepsCount: 2 },
    },
  },
  ep_workflows: {
    id: 'ep_workflows',
    method: 'POST',
    path: '/v1/workflows',
    liveApiPath: '/api/v1/workflows',
    requiredScope: 'messages:write',
    titleEn: 'Visual Branching Automation State Machine (ManyChat-Style)',
    titleAr: 'سير العمل التفرعي والأتمتة البصرية (Visual Workflows)',
    descEn:
      'Creates ManyChat-style visual branching workflows with trigger nodes, condition logic, delays, and message action nodes.',
    descAr:
      'إنشاء مخططات الأتمتة التفاعلية مع شروط تفرعية ومحفزات لحظية وردود مخصصة.',
    subService: 'inbox_crm',
    action: 'create_workflow',
    params: [
      { name: 'name', type: 'string', required: true, in: 'body', descEn: 'Workflow automation name', descAr: 'اسم سير العمل' },
      { name: 'nodes', type: 'array', required: true, in: 'body', descEn: 'Visual graph node definitions', descAr: 'عقد المخطط التفرعي' },
    ],
    samplePayload: {
      name: 'Lead Qualification Funnel',
      nodes: [
        { id: 'node_1', type: 'trigger', config: { event: 'inbound_message' } },
        { id: 'node_2', type: 'action_message', config: { text: 'Are you interested in Enterprise?' } },
      ],
    },
    response: {
      success: true,
      data: { id: 'wf_99812', name: 'Lead Qualification Funnel', status: 'paused', executions: 0 },
    },
  },
  ep_inbox: {
    id: 'ep_inbox',
    method: 'POST',
    path: '/v1/inbox/automations',
    liveApiPath: '/api/v1/inbox/conversations',
    requiredScope: 'messages:write',
    titleEn: 'Inbox Auto-DM & Comment-to-DM Rules',
    titleAr: 'قواعد الرد التلقائي وتحويل التعليقات لرسائل خاصة',
    descEn: 'Configures keyword-triggered Comment-to-DM automated outreach rules across Instagram and Facebook.',
    descAr: 'تحويل أي تعليق يحتوي على كلمة معينة إلى رسالة خاصة تلقائياً في إنستغرام وماسنجر.',
    subService: 'inbox_crm',
    action: 'create_auto_dm',
    params: [
      { name: 'keywords', type: 'string[]', required: true, in: 'body', descEn: 'Trigger words (e.g. price, link)', descAr: 'الكلمات المفتاحية' },
      { name: 'dmText', type: 'string', required: true, in: 'body', descEn: 'Direct message to send', descAr: 'نص الرسالة الخاصة' },
    ],
    samplePayload: { keywords: ['link', 'price'], dmText: 'Check out the official pricing here: https://asra3.com/pricing' },
    response: {
      success: true,
      data: { ruleId: 'rule_dm_01', status: 'active' },
    },
  },

  // ==========================================
  // FAMILY 4: CLOUD TELEPHONY & VOICE
  // ==========================================
  ep_numbers_search: {
    id: 'ep_numbers_search',
    method: 'GET',
    path: '/v1/phone-numbers/available',
    liveApiPath: '/api/v1/phone-numbers/available',
    requiredScope: 'telephony:read',
    titleEn: 'Search Virtual Numbers Catalog (55+ Countries)',
    titleAr: 'البحث عن أرقام افتراضية في أكثر من 55 دولة',
    descEn: 'Searches inventory of virtual mobile, local, and toll-free numbers supporting WhatsApp, SMS, Voice, and OTP.',
    descAr: 'البحث في كتالوج الأرقام الافتراضية الدولية مع تصفية حسب الدولة والمزايا.',
    subService: 'telephony',
    action: 'search_numbers',
    params: [
      { name: 'country', type: 'string', required: false, in: 'query', descEn: 'ISO 2-letter country code (US, GB, SA, AE, EG)', descAr: 'رمز الدولة' },
      { name: 'type', type: 'string', required: false, in: 'query', descEn: 'mobile | local | toll_free', descAr: 'نوع الرقم' },
    ],
    samplePayload: {},
    response: {
      success: true,
      data: [
        { phoneNumber: '+12025550192', country: 'US', type: 'mobile', capabilities: ['sms', 'voice', 'whatsapp'], monthlyPriceUsd: 2.0 },
      ],
    },
  },
  ep_numbers_buy: {
    id: 'ep_numbers_buy',
    method: 'POST',
    path: '/v1/phone-numbers/buy',
    liveApiPath: '/api/v1/phone-numbers/buy',
    requiredScope: 'telephony:write',
    titleEn: 'Purchase & Provision Virtual Number',
    titleAr: 'شراء وتفعيل رقم افتراضي فوري',
    descEn: 'Instantly purchases and provisions a virtual number with charges deducted from your Telecom Credit Wallet balance.',
    descAr: 'شراء وتفعيل رقم افتراضي فوراً مع خصم التكلفة من محفظة الاتصالات.',
    subService: 'telephony',
    action: 'buy_number',
    params: [
      { name: 'phoneNumber', type: 'string', required: true, in: 'body', descEn: 'Target phone number in E.164 format', descAr: 'الرقم المراد شراؤه بصيغة E.164' },
    ],
    samplePayload: { phoneNumber: '+12025550192' },
    response: {
      success: true,
      message: 'Phone number provisioned successfully.',
      data: { id: 'pn_10023', phoneNumber: '+12025550192', status: 'active', monthlyFeeUsd: 2.0 },
    },
  },
  ep_numbers_list: {
    id: 'ep_numbers_list',
    method: 'GET',
    path: '/v1/phone-numbers',
    liveApiPath: '/api/v1/phone-numbers',
    requiredScope: 'telephony:read',
    titleEn: 'List Owned Virtual Phone Numbers',
    titleAr: 'استعراض الأرقام الافتراضية المملوكة',
    descEn: 'Lists all provisioned phone numbers in the active workspace with routing rules and status.',
    descAr: 'يعيد كافة الأرقام المفعلة في مساحة العمل مع قواعد التوجيه وحالة الخدمة.',
    subService: 'telephony',
    action: 'list_numbers',
    params: [],
    samplePayload: {},
    response: {
      success: true,
      data: [
        { id: 'pn_10023', phoneNumber: '+12025550192', country: 'US', status: 'active' },
      ],
    },
  },
  ep_numbers_porting: {
    id: 'ep_numbers_porting',
    method: 'POST',
    path: '/v1/phone-numbers/porting',
    liveApiPath: '/api/v1/phone-numbers/porting',
    requiredScope: 'telephony:write',
    titleEn: 'Number Porting LOA Request Submission',
    titleAr: 'طلب نقل الأرقام الحالية (Number Porting LOA)',
    descEn: 'Submits a Letter of Authorization (LOA) to port existing business phone numbers into Asra3.',
    descAr: 'تقديم طلب نقل أرقامك التجارية الحالية من أي مزود خارجي إلى المنصة.',
    subService: 'telephony',
    action: 'submit_porting',
    params: [
      { name: 'phoneNumber', type: 'string', required: true, in: 'body', descEn: 'Number to port', descAr: 'الرقم المراد نقله' },
      { name: 'currentCarrier', type: 'string', required: true, in: 'body', descEn: 'Current provider name', descAr: 'اسم المزود الحالي' },
    ],
    samplePayload: { phoneNumber: '+18005550199', currentCarrier: 'Verizon Business', authorizedSigner: 'CTO' },
    response: {
      success: true,
      data: { portingRequestId: 'port_99182', status: 'submitted' },
    },
  },
  ep_sms_send: {
    id: 'ep_sms_send',
    method: 'POST',
    path: '/v1/sms/messages',
    liveApiPath: '/api/v1/sms/messages',
    requiredScope: 'telephony:write',
    titleEn: 'Send Programmable 2-Way SMS / MMS',
    titleAr: 'إرسال رسائل SMS برمجية',
    descEn: 'Dispatches programmable SMS or MMS text messages with delivery status tracking.',
    descAr: 'إرسال رسائل نصية قصيرة SMS برمجياً مع تتبع حالة التسليم.',
    subService: 'telephony',
    action: 'send_sms',
    params: [
      { name: 'to', type: 'string', required: true, in: 'body', descEn: 'Recipient phone number', descAr: 'رقم المستلم' },
      { name: 'text', type: 'string', required: true, in: 'body', descEn: 'Message content', descAr: 'نص الرسالة' },
    ],
    samplePayload: { to: '+966501234567', text: 'Your verification security code is 882190.' },
    response: {
      success: true,
      data: { messageId: 'sms_99182', status: 'sent', costUsd: 0.015 },
    },
  },
  ep_sms_otp: {
    id: 'ep_sms_otp',
    method: 'GET',
    path: '/v1/sms/otp/latest',
    liveApiPath: '/api/v1/sms/otp/latest',
    requiredScope: 'telephony:read',
    titleEn: 'Fetch Inbound SMS OTP Code',
    titleAr: 'قراءة أحدث كود OTP وارد برمجياً',
    descEn: 'Sniffs incoming SMS messages on your virtual numbers to automatically extract verification OTP codes.',
    descAr: 'استخراج كود الـ OTP تلقائياً من أحدث رسالة واردة على أرقامك الافتراضية.',
    subService: 'telephony',
    action: 'get_latest_otp',
    params: [],
    samplePayload: {},
    response: {
      success: true,
      data: { code: '491028', sender: 'WhatsApp', receivedAt: '2026-10-18T18:02:00Z' },
    },
  },
  ep_sms_registration: {
    id: 'ep_sms_registration',
    method: 'POST',
    path: '/v1/sms/registration',
    liveApiPath: '/api/v1/sms/registration',
    requiredScope: 'telephony:write',
    titleEn: '10DLC Brand & Campaign Registration',
    titleAr: 'تسجيل الهوية وحملات 10DLC للرسائل الأمريكية',
    descEn: 'Registers US carrier A2P 10DLC brand identity and campaign compliance metadata.',
    descAr: 'تسجيل العلامة التجارية للحملات المعتمدة عبر شبكات الاتصالات الأمريكية (10DLC).',
    subService: 'telephony',
    action: 'register_10dlc',
    params: [
      { name: 'brandName', type: 'string', required: true, in: 'body', descEn: 'Official legal business name', descAr: 'اسم الشركة الرسمي' },
      { name: 'ein', type: 'string', required: true, in: 'body', descEn: 'Tax ID or EIN', descAr: 'الرقم الضريبي' },
    ],
    samplePayload: { brandName: 'Asra3 Global Inc.', ein: '12-3456789' },
    response: {
      success: true,
      data: { brandId: 'brand_10dlc_991', status: 'verified' },
    },
  },
  ep_voice_call: {
    id: 'ep_voice_call',
    method: 'POST',
    path: '/v1/voice/calls',
    liveApiPath: '/api/v1/voice/calls',
    requiredScope: 'telephony:write',
    titleEn: 'Initiate Outbound Voice / AI Call',
    titleAr: 'إجراء مكالمة صوتية أو تشغيل موظف ذكاء اصطناعي',
    descEn: 'Triggers outbound SIP voice calls or binds a real-time conversational AI voice agent to the caller.',
    descAr: 'إجراء مكالمة هاتفية صادرة أو ربط المتصل بوكيل ذكاء اصطناعي صوتي فوري.',
    subService: 'telephony',
    action: 'initiate_call',
    params: [
      { name: 'to', type: 'string', required: true, in: 'body', descEn: 'Destination phone number', descAr: 'رقم الهاتف المطلوب' },
    ],
    samplePayload: { to: '+966501234567' },
    response: {
      success: true,
      data: { callId: 'call_99182', status: 'initiated', timestamp: '2026-10-18T18:03:00Z' },
    },
  },
  ep_voice_token: {
    id: 'ep_voice_token',
    method: 'POST',
    path: '/v1/voice/browser-token',
    liveApiPath: '/api/v1/voice/browser-token',
    requiredScope: 'telephony:write',
    titleEn: 'Mint WebRTC Browser Softphone Token',
    titleAr: 'توليد توكن هاتف المتصفح (WebRTC Softphone)',
    descEn: 'Mints secure WebRTC credentials allowing agents to make and receive calls directly inside web browsers.',
    descAr: 'توليد بيانات اعتماد مشفرة لتشغيل هاتف الاتصال الهاتفي مباشرة من داخل المتصفح.',
    subService: 'telephony',
    action: 'mint_webrtc_token',
    params: [],
    samplePayload: {},
    response: {
      success: true,
      data: { token: 'rtc_jwt_token_99182', identity: 'agent_nour', expiresIn: 3600 },
    },
  },
  ep_telephony: {
    id: 'ep_telephony',
    method: 'POST',
    path: '/v1/voice/ai-agent',
    liveApiPath: '/api/v1/voice/ai-agent',
    requiredScope: 'telephony:write',
    titleEn: 'Configure AI Voice Receptionist',
    titleAr: 'ضبط إعدادات موظف الاستقبال الذكي 24/7',
    descEn: 'Configures prompt directives, bilingual voice tone, knowledge documents, and transfer rules for AI voice receptionists.',
    descAr: 'تحديد تعليمات ونبرة صوت موظف الاستقبال الذكي باللغتين العربية والإنجليزية.',
    subService: 'telephony',
    action: 'configure_voice_agent',
    params: [
      { name: 'agentName', type: 'string', required: true, in: 'body', descEn: 'Agent name', descAr: 'اسم الوكيل' },
      { name: 'prompt', type: 'string', required: true, in: 'body', descEn: 'System prompt instructions', descAr: 'تعليمات النظام' },
    ],
    samplePayload: { agentName: 'Nour AI Receptionist', language: 'ar-SA', prompt: 'You are a luxury hospitality agent.' },
    response: {
      success: true,
      data: { agentId: 'agent_ai_nour', status: 'configured' },
    },
  },
  ep_verify_otp: {
    id: 'ep_verify_otp',
    method: 'POST',
    path: '/v1/verify',
    liveApiPath: '/api/v1/verify',
    requiredScope: 'telephony:write',
    titleEn: 'Turnkey Phone Verification OTP Dispatch',
    titleAr: 'إرسال كود تحقق للمستخدم برمجياً (Verify OTP)',
    descEn: 'Dispatches a 6-digit authentication OTP via SMS or Voice call with fraud detection and rate limiting.',
    descAr: 'إرسال كود تحقق مكون من 6 أرقام عبر SMS أو مكالمة صوتية للمستخدم.',
    subService: 'telephony',
    action: 'send_verify_otp',
    params: [
      { name: 'phoneNumber', type: 'string', required: true, in: 'body', descEn: 'E.164 phone number', descAr: 'رقم هاتف المستخدم' },
      { name: 'channel', type: 'string', required: false, in: 'body', descEn: 'sms | voice', descAr: 'القناة' },
    ],
    samplePayload: { phoneNumber: '+966501234567', channel: 'sms' },
    response: {
      success: true,
      data: { verificationId: 'ver_99182', status: 'pending', expiresAt: '2026-10-18T18:15:00Z' },
    },
  },
  ep_verify_check: {
    id: 'ep_verify_check',
    method: 'POST',
    path: '/v1/verify/check',
    liveApiPath: '/api/v1/verify/check',
    requiredScope: 'telephony:write',
    titleEn: 'Validate 6-Digit OTP Verification Code',
    titleAr: 'التحقق من صحة كود الـ OTP المدخل',
    descEn: 'Validates customer entered 6-digit verification code against dispatched session.',
    descAr: 'فحص كود التحقق المدخل من قبل العميل وتأكيد صحته.',
    subService: 'telephony',
    action: 'check_verify_otp',
    params: [
      { name: 'phoneNumber', type: 'string', required: true, in: 'body', descEn: 'Phone number', descAr: 'رقم الهاتف' },
      { name: 'code', type: 'string', required: true, in: 'body', descEn: '6-digit OTP code', descAr: 'كود الـ OTP' },
    ],
    samplePayload: { phoneNumber: '+966501234567', code: '123456' },
    response: {
      success: true,
      data: { verified: true, verifiedAt: '2026-10-18T18:04:00Z' },
    },
  },
  ep_branded_calling: {
    id: 'ep_branded_calling',
    method: 'POST',
    path: '/v1/branded-calling/identities',
    liveApiPath: '/api/v1/branded-calling/identities',
    requiredScope: 'telephony:write',
    titleEn: 'Display Identity Record (STIR/SHAKEN Branded Caller ID)',
    titleAr: 'تسجيل الهوية التجارية للمكالمات (Branded Caller ID)',
    descEn: 'Registers verified company name, logo, and call reason to display on customer mobile screens during incoming calls.',
    descAr: 'عرض اسم وشعار شركتك وسبب الاتصال على شاشة جوال العميل أثناء الرنين لزيادة معدل الرد.',
    subService: 'telephony',
    action: 'register_branded_id',
    params: [
      { name: 'brandName', type: 'string', required: true, in: 'body', descEn: 'Display brand name', descAr: 'الاسم المعروض' },
      { name: 'logoUrl', type: 'string', required: false, in: 'body', descEn: 'Square logo image URL', descAr: 'رابط الشعار' },
    ],
    samplePayload: { brandName: 'Asra3 Concierge', logoUrl: 'https://asra3.com/logo.png', callReason: 'VIP Reservation' },
    response: {
      success: true,
      data: { identityId: 'dir_99182', status: 'active' },
    },
  },
  ep_rcs_agents: {
    id: 'ep_rcs_agents',
    method: 'POST',
    path: '/v1/rcs/agents',
    liveApiPath: '/api/v1/rcs/agents',
    requiredScope: 'telephony:write',
    titleEn: 'Register Verified Google RCS Business Agent',
    titleAr: 'تسجيل وكيل رسائل RCS المعتمد من جوجل',
    descEn: 'Registers verified RCS business profile for verified SMS with logos, rich action buttons, and verified badges.',
    descAr: 'تفعيل الرسائل التفاعلية المعتمدة (RCS) بشعار وعلامة التوثيق الزرقاء على هواتف أندرويد.',
    subService: 'telephony',
    action: 'register_rcs_agent',
    params: [
      { name: 'agentName', type: 'string', required: true, in: 'body', descEn: 'Agent name', descAr: 'اسم الوكيل' },
    ],
    samplePayload: { agentName: 'Acme Official Store' },
    response: {
      success: true,
      data: { rcsAgentId: 'rcs_ag_991', status: 'verified' },
    },
  },
  ep_rcs_messages: {
    id: 'ep_rcs_messages',
    method: 'POST',
    path: '/v1/rcs/messages',
    liveApiPath: '/api/v1/rcs/messages',
    requiredScope: 'telephony:write',
    titleEn: 'Dispatch Rich RCS Cards & Carousels',
    titleAr: 'إرسال بطاقات وقوائم RCS التفاعلية',
    descEn: 'Sends rich RCS messaging cards with high-res media, suggested reply chips, and calendar booking actions.',
    descAr: 'إرسال بطاقات غنية بالصور وأزرار الإجراءات السريعة عبر رسائل RCS.',
    subService: 'telephony',
    action: 'send_rcs_message',
    params: [
      { name: 'to', type: 'string', required: true, in: 'body', descEn: 'Recipient phone number', descAr: 'رقم المستلم' },
      { name: 'card', type: 'object', required: true, in: 'body', descEn: 'Rich card configuration', descAr: 'محتوى البطاقة الغنية' },
    ],
    samplePayload: {
      to: '+12025550192',
      card: { title: 'Order Confirmed', text: 'Track delivery live in our app.', mediaUrl: 'https://asra3.com/banner.png' },
    },
    response: {
      success: true,
      data: { messageId: 'rcs_msg_99182', status: 'delivered' },
    },
  },
  ep_wa_link: {
    id: 'ep_wa_link',
    method: 'POST',
    path: '/v1/whatsapp/link',
    liveApiPath: '/api/v1/whatsapp/link',
    requiredScope: 'telephony:write',
    titleEn: 'Link WhatsApp Cloud API (Send 6-Digit OTP)',
    titleAr: 'طلب ربط الرقم بـ WhatsApp Cloud API الرسمي',
    descEn: 'Requests a 6-digit verification code from Meta to register your virtual number with the official WhatsApp Cloud API.',
    descAr: 'طلب كود التحقق من ميتا لربط رقمك الافتراضي بواتساب للأعمال السحابي.',
    subService: 'telephony',
    action: 'request_wa_link',
    params: [
      { name: 'phoneNumber', type: 'string', required: true, in: 'body', descEn: 'Purchased virtual number', descAr: 'الرقم الافتراضي' },
    ],
    samplePayload: { phoneNumber: '+12025550192' },
    response: {
      success: true,
      data: { status: 'code_sent', nextAction: 'verify_otp' },
    },
  },
  ep_wa_verify: {
    id: 'ep_wa_verify',
    method: 'POST',
    path: '/v1/whatsapp/verify-otp',
    liveApiPath: '/api/v1/whatsapp/verify-otp',
    requiredScope: 'telephony:write',
    titleEn: 'Confirm WhatsApp OTP Code & Activate',
    titleAr: 'تأكيد كود واتساب وتفعيل القناة',
    descEn: 'Submits the 6-digit Meta verification code to complete WhatsApp Cloud API registration.',
    descAr: 'إدخال كود التحقق لتفعيل اتصال واتساب الرسمي بنجاح.',
    subService: 'telephony',
    action: 'verify_wa_otp',
    params: [
      { name: 'phoneNumber', type: 'string', required: true, in: 'body', descEn: 'Phone number', descAr: 'رقم الهاتف' },
      { name: 'code', type: 'string', required: true, in: 'body', descEn: '6-digit Meta code', descAr: 'كود التحقق' },
    ],
    samplePayload: { phoneNumber: '+12025550192', code: '882190' },
    response: {
      success: true,
      data: { status: 'active', wabaId: 'waba_99182' },
    },
  },
  ep_wa_send: {
    id: 'ep_wa_send',
    method: 'POST',
    path: '/v1/whatsapp/messages',
    liveApiPath: '/api/v1/whatsapp/messages',
    requiredScope: 'messages:write',
    titleEn: 'Send WhatsApp Cloud API Message or Template',
    titleAr: 'إرسال رسالة أو قالب واتساب رسمي',
    descEn: 'Sends session text, media, or pre-approved HSM templates via the official Meta WhatsApp Cloud API.',
    descAr: 'إرسال رسائل أو قوالب معتمدة عبر واتساب للأعمال الرسمي.',
    subService: 'telephony',
    action: 'send_wa_message',
    params: [
      { name: 'to', type: 'string', required: true, in: 'body', descEn: 'Recipient phone number', descAr: 'رقم المستلم' },
      { name: 'type', type: 'string', required: true, in: 'body', descEn: 'text | template', descAr: 'نوع الرسالة' },
    ],
    samplePayload: { to: '+966501234567', type: 'text', text: 'Hello from Asra3 API v1!' },
    response: {
      success: true,
      data: { messageId: 'wamid.HBgL...', status: 'sent' },
    },
  },
  ep_wa_templates: {
    id: 'ep_wa_templates',
    method: 'GET',
    path: '/v1/whatsapp/templates',
    liveApiPath: '/api/v1/whatsapp/templates',
    requiredScope: 'messages:read',
    titleEn: 'Manage Meta WhatsApp Business Templates',
    titleAr: 'إدارة قوالب واتساب الرسمية (HSM Templates)',
    descEn: 'Inspects and submits official WhatsApp HSM templates for utility, marketing, and authentication.',
    descAr: 'استعراض وتقديم قوالب واتساب التسويقية والخدمية للاعتماد من ميتا.',
    subService: 'telephony',
    action: 'list_templates',
    params: [],
    samplePayload: {},
    response: {
      success: true,
      data: [
        { name: 'order_receipt_v1', category: 'UTILITY', status: 'APPROVED', language: 'en_US' },
      ],
    },
  },
  ep_wa_flows: {
    id: 'ep_wa_flows',
    method: 'POST',
    path: '/v1/whatsapp/flows',
    liveApiPath: '/api/v1/whatsapp/flows',
    requiredScope: 'messages:write',
    titleEn: 'Register WhatsApp Flows Interactive Forms',
    titleAr: 'إنشاء استمارات واتساب التفاعلية (WhatsApp Flows)',
    descEn: 'Builds and deploys native interactive multi-step JSON forms inside WhatsApp chat windows.',
    descAr: 'إنشاء استمارات تفاعلية متعددة الخطوات داخل محادثة واتساب بدون الخروج من التطبيق.',
    subService: 'telephony',
    action: 'create_flow',
    params: [
      { name: 'name', type: 'string', required: true, in: 'body', descEn: 'Flow name', descAr: 'اسم الاستمارة' },
    ],
    samplePayload: { name: 'VIP Appointment Booking', categories: ['APPOINTMENT_BOOKING'] },
    response: {
      success: true,
      data: { flowId: 'flow_99182', status: 'DRAFT' },
    },
  },
  ep_business_agent: {
    id: 'ep_business_agent',
    method: 'POST',
    path: '/v1/business-agent',
    liveApiPath: '/api/v1/business-agent',
    requiredScope: 'telephony:write',
    titleEn: 'Meta Business AI Agent Configuration',
    titleAr: 'تفعيل وضبط وكيل الذكاء الاصطناعي للأعمال (Meta Business Agent)',
    descEn: 'Configures automated Meta Business AI Agent handling WhatsApp and Messenger inquiries.',
    descAr: 'ضبط الرد الآلي الذكي لخدمة العملاء على واتساب وماسنجر.',
    subService: 'telephony',
    action: 'setup_business_agent',
    params: [],
    samplePayload: { enabled: true, persona: 'Asra3 Concierge' },
    response: {
      success: true,
      data: { agentStatus: 'active' },
    },
  },

  // ==========================================
  // FAMILY 5: ADVERTISING (8 NETWORKS)
  // ==========================================
  ep_ads_ctwa: {
    id: 'ep_ads_ctwa',
    method: 'POST',
    path: '/v1/ads/ctwa',
    liveApiPath: '/api/v1/ads/ctwa',
    requiredScope: 'ads:write',
    titleEn: 'Launch Click-to-WhatsApp (CTWA) Ad Campaign',
    titleAr: 'إطلاق حملة إعلانات النقرة للواتساب (CTWA)',
    descEn: 'Launches targeted Click-to-WhatsApp ad campaigns driving high-intent chat inquiries across Meta and TikTok.',
    descAr: 'إنشاء حملات إعلانية لتحويل العملاء مباشرة إلى محادثات واتساب.',
    subService: 'ads',
    action: 'launch_ctwa',
    params: [
      { name: 'campaignName', type: 'string', required: true, in: 'body', descEn: 'Ad campaign name', descAr: 'اسم الحملة' },
      { name: 'budgetDailyUsd', type: 'number', required: true, in: 'body', descEn: 'Daily budget in USD', descAr: 'الميزانية اليومية بالدولار' },
    ],
    samplePayload: { campaignName: 'CTWA Promo Q4', budgetDailyUsd: 50.0, platform: 'meta' },
    response: {
      success: true,
      data: { campaignId: 'cmp_ctwa_991', status: 'active', platform: 'meta' },
    },
  },
  ep_ads_call: {
    id: 'ep_ads_call',
    method: 'POST',
    path: '/v1/ads/call',
    liveApiPath: '/api/v1/ads/call',
    requiredScope: 'ads:write',
    titleEn: 'Launch Click-to-Call Ad Campaign',
    titleAr: 'إطلاق حملات الاتصال الهاتفي المباشر (Click-to-Call)',
    descEn: 'Launches targeted Click-to-Call phone ads connecting prospect mobile dials to your virtual numbers.',
    descAr: 'إطلاق إعلانات تحث العميل على الاتصال الهاتفي الفوري برقمك الافتراضي.',
    subService: 'ads',
    action: 'launch_call_ad',
    params: [
      { name: 'campaignName', type: 'string', required: true, in: 'body', descEn: 'Campaign title', descAr: 'اسم الحملة' },
    ],
    samplePayload: { campaignName: 'Emergency Roadside Calls', budgetDailyUsd: 30.0 },
    response: {
      success: true,
      data: { campaignId: 'cmp_call_992', status: 'active' },
    },
  },
  ep_ads_audiences: {
    id: 'ep_ads_audiences',
    method: 'POST',
    path: '/v1/ads/audiences',
    liveApiPath: '/api/v1/ads/audiences',
    requiredScope: 'ads:write',
    titleEn: 'Create Custom Retargeting Audiences',
    titleAr: 'إنشاء الجماهير المخصصة لإعادة الاستهداف (Audiences)',
    descEn: 'Uploads hashed CRM contact lists to build custom audiences across Meta, Google, and TikTok.',
    descAr: 'رفع قوائم العملاء المشفرة لبناء جماهير إعادة الاستهداف على منصات الإعلانات.',
    subService: 'ads',
    action: 'create_audience',
    params: [
      { name: 'name', type: 'string', required: true, in: 'body', descEn: 'Audience name', descAr: 'اسم الجمهور' },
    ],
    samplePayload: { name: 'VIP High Spenders', network: 'meta' },
    response: {
      success: true,
      data: { audienceId: 'aud_99182', size: 1200 },
    },
  },
  ep_ads_targeting: {
    id: 'ep_ads_targeting',
    method: 'GET',
    path: '/v1/ads/targeting',
    liveApiPath: '/api/v1/ads/targeting',
    requiredScope: 'ads:read',
    titleEn: 'Audience Targeting & Demographics Discovery',
    titleAr: 'استكشاف خيارات الاستهداف والاهتمامات الإعلانية',
    descEn: 'Discovers high-converting targeting interests, job titles, and demographics across ad networks.',
    descAr: 'اكتشاف الاهتمامات والشرائح السكانية الأكثر ملاءمة لحملاتك الإعلانية.',
    subService: 'ads',
    action: 'search_targeting',
    params: [
      { name: 'q', type: 'string', required: true, in: 'query', descEn: 'Search term', descAr: 'كلمة البحث' },
    ],
    samplePayload: {},
    response: {
      success: true,
      data: [
        { id: 'int_luxury', name: 'Luxury goods', audienceSize: 45000000 },
      ],
    },
  },
  ep_ads_library: {
    id: 'ep_ads_library',
    method: 'GET',
    path: '/v1/ads/library',
    liveApiPath: '/api/v1/ads/library',
    requiredScope: 'ads:read',
    titleEn: 'Competitor Ad Library Intelligence Spy',
    titleAr: 'مكتبة الإعلانات والبحث في إعلانات المنافسين (Ad Spy)',
    descEn: 'Searches active competitor ad creatives, headlines, copy, and run durations across Meta and TikTok.',
    descAr: 'البحث في إعلانات المنافسين النشطة للاطلاع على الأفكار والنصوص والتصاميم.',
    subService: 'ads',
    action: 'search_ad_library',
    params: [
      { name: 'q', type: 'string', required: true, in: 'query', descEn: 'Brand name or competitor handle', descAr: 'اسم المنافس أو الكلمة' },
    ],
    samplePayload: {},
    response: {
      success: true,
      data: { totalFound: 5, ads: [{ id: 'ad_lib_01', headline: 'Fastest Cloud Solution', activeDays: 28 }] },
    },
  },
  ep_lead_gen: {
    id: 'ep_lead_gen',
    method: 'POST',
    path: '/v1/lead-gen/forms',
    liveApiPath: '/api/v1/lead-gen/forms',
    requiredScope: 'ads:write',
    titleEn: 'Instant Lead Generation Forms & Captured Leads',
    titleAr: 'استمارات جمع بيانات العملاء (Lead Gen Forms)',
    descEn: 'Creates instant on-platform lead capture forms and retrieves captured leads in real time.',
    descAr: 'إنشاء نماذج جمع البيانات السريعة وجلب بيانات العملاء المحتملين.',
    subService: 'ads',
    action: 'create_lead_form',
    params: [
      { name: 'name', type: 'string', required: true, in: 'body', descEn: 'Form title', descAr: 'اسم النموذج' },
    ],
    samplePayload: { name: 'Q4 Early Access Request', questions: ['full_name', 'phone_number', 'company'] },
    response: {
      success: true,
      data: { formId: 'form_lead_991', status: 'active' },
    },
  },
  ep_tracking_tags: {
    id: 'ep_tracking_tags',
    method: 'POST',
    path: '/v1/tracking-tags',
    liveApiPath: '/api/v1/tracking-tags',
    requiredScope: 'ads:write',
    titleEn: 'Conversion Tracking Pixels Generator',
    titleAr: 'توليد أكواد وبكسلات التتبع (Tracking Pixels)',
    descEn: 'Generates client-side tracking tags and pixels for Meta, TikTok, and Google Ads.',
    descAr: 'توليد بكسلات التتبع لمواقع الويب والمتاجر الإلكترونية.',
    subService: 'ads',
    action: 'create_tracking_tag',
    params: [
      { name: 'network', type: 'string', required: true, in: 'body', descEn: 'meta | tiktok | google', descAr: 'شبكة الإعلانات' },
    ],
    samplePayload: { network: 'meta', pixelId: 'px_9918231' },
    response: {
      success: true,
      data: { tagId: 'tag_991', snippet: '<script>!function(f,b,e,v)...</script>' },
    },
  },
  ep_ads: {
    id: 'ep_ads',
    method: 'POST',
    path: '/v1/conversions',
    liveApiPath: '/api/v1/conversions',
    requiredScope: 'ads:write',
    titleEn: 'Server-Side Conversions API (CAPI)',
    titleAr: 'إرسال أحداث التحويل السحابية (Conversions API - CAPI)',
    descEn: 'Dispatches SHA-256 hashed server-to-server conversion events (Purchase, Lead, AddToCart) bypassing ad blockers.',
    descAr: 'إرسال أحداث الشراء والتحويل السحابية المباشرة متجاوزاً مانعات الإعلانات وحظر الكوكيز.',
    subService: 'ads',
    action: 'dispatch_capi',
    params: [
      { name: 'eventName', type: 'string', required: true, in: 'body', descEn: 'Purchase | Lead | CompleteRegistration', descAr: 'اسم الحدث' },
      { name: 'value', type: 'number', required: false, in: 'body', descEn: 'Monetary value', descAr: 'قيمة التحويل' },
    ],
    samplePayload: { eventName: 'Purchase', value: 149.0, currency: 'USD', emailHash: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e' },
    response: {
      success: true,
      data: { eventId: 'evt_99182', eventsReceived: 1 },
    },
  },

  // ==========================================
  // FAMILY 6: PLATFORM APIS (BLOGS & COMMERCE)
  // ==========================================
  ep_blogs: {
    id: 'ep_blogs',
    method: 'POST',
    path: '/v1/blogs',
    liveApiPath: '/api/v1/blogs',
    requiredScope: 'posts:write',
    titleEn: 'Multi-Platform Blog Articles (WordPress & Shopify)',
    titleAr: 'نشر مقالات المدونة (ووردبريس وشوبيفاي)',
    descEn: 'Creates and publishes SEO-optimized rich blog articles across WordPress and Shopify stores.',
    descAr: 'نشر المقالات والتدوينات المتوافقة مع محركات البحث على ووردبريس ومتاجر شوبيفاي معاً.',
    subService: 'commerce_local',
    action: 'create_blog_post',
    params: [
      { name: 'title', type: 'string', required: true, in: 'body', descEn: 'Article title', descAr: 'عنوان المقال' },
      { name: 'content', type: 'string', required: true, in: 'body', descEn: 'HTML or Markdown body', descAr: 'محتوى المقال' },
      { name: 'platform', type: 'string', required: true, in: 'body', descEn: 'wordpress | shopify', descAr: 'المنصة' },
    ],
    samplePayload: { title: '10 Ways to Scale SaaS Marketing in 2026', platform: 'wordpress', content: '<p>Comprehensive guide...</p>' },
    response: {
      success: true,
      data: { articleId: 'art_99182', url: 'https://blog.asra3.com/10-ways-to-scale-saas', status: 'published' },
    },
  },
  ep_google_services: {
    id: 'ep_google_services',
    method: 'POST',
    path: '/v1/google-business/services',
    liveApiPath: '/api/v1/google-business/services',
    requiredScope: 'accounts:write',
    titleEn: 'Google Business Profile Local SEO Services',
    titleAr: 'خدمات الملف التجاري من جوجل (Google Business Services)',
    descEn: 'Adds and synchronizes local service offerings, descriptions, and pricing on Google Maps and Local Search.',
    descAr: 'إضافة ومزامنة قائمة الخدمات والأسعار على خرائط جوجل ومحرك البحث المحلي.',
    subService: 'commerce_local',
    action: 'add_gbp_service',
    params: [
      { name: 'name', type: 'string', required: true, in: 'body', descEn: 'Service name', descAr: 'اسم الخدمة' },
      { name: 'price', type: 'number', required: false, in: 'body', descEn: 'Service price', descAr: 'سعر الخدمة' },
    ],
    samplePayload: { name: 'VIP Airport Transfer', price: 95.0, currency: 'USD' },
    response: {
      success: true,
      data: { serviceId: 'gbp_srv_991', status: 'synced' },
    },
  },
  ep_commerce_products: {
    id: 'ep_commerce_products',
    method: 'GET',
    path: '/v1/commerce/products',
    liveApiPath: '/api/v1/commerce/products',
    requiredScope: 'commerce:read',
    titleEn: 'Unified Store Catalog (Products CRUD)',
    titleAr: 'كتالوج المنتجات الموحد للمتاجر الإلكترونية',
    descEn: 'Inspects and synchronizes product inventory across Shopify, TikTok Shop, and Instagram Storefronts.',
    descAr: 'استعراض وإدارة المنتجات والمخزون عبر منصات المتاجر الإلكترونية.',
    subService: 'commerce_local',
    action: 'list_products',
    params: [],
    samplePayload: {},
    response: {
      success: true,
      data: [
        { id: 'prod_01', title: 'Luxury Leather Wallet', price: 85.0, stock: 45 },
      ],
    },
  },
  ep_commerce_orders: {
    id: 'ep_commerce_orders',
    method: 'POST',
    path: '/v1/commerce/orders',
    liveApiPath: '/api/v1/commerce/orders',
    requiredScope: 'commerce:write',
    titleEn: 'Multi-Channel Commerce Orders Recording',
    titleAr: 'تسجيل طلبات الشراء عبر القنوات (Commerce Orders)',
    descEn: 'Records incoming customer purchase orders from social storefronts and updates inventory.',
    descAr: 'تسجيل طلبات الشراء الواردة من المتاجر وتحديث بيانات المخزون.',
    subService: 'commerce_local',
    action: 'create_order',
    params: [
      { name: 'items', type: 'array', required: true, in: 'body', descEn: 'Purchased items list', descAr: 'قائمة المنتجات المشتراة' },
      { name: 'totalAmount', type: 'number', required: true, in: 'body', descEn: 'Order total amount', descAr: 'إجمالي قيمة الطلب' },
    ],
    samplePayload: { items: [{ productId: 'prod_01', quantity: 1, unitPrice: 85.0 }], totalAmount: 85.0, customerEmail: 'buyer@example.com' },
    response: {
      success: true,
      data: { orderId: 'ord_99182', status: 'confirmed' },
    },
  },
  ep_commerce_discounts: {
    id: 'ep_commerce_discounts',
    method: 'POST',
    path: '/v1/commerce/discounts',
    liveApiPath: '/api/v1/commerce/discounts',
    requiredScope: 'commerce:write',
    titleEn: 'Universal Coupon & Discount Codes',
    titleAr: 'أكواد وكوبونات الخصم الموحدة (Discount Codes)',
    descEn: 'Generates universal promotional discount codes applicable across all connected storefronts.',
    descAr: 'إنشاء كوبونات وأكواد الخصم الترويجية لمتجرك.',
    subService: 'commerce_local',
    action: 'create_discount',
    params: [
      { name: 'code', type: 'string', required: true, in: 'body', descEn: 'Coupon code', descAr: 'كود الخصم' },
      { name: 'percentOff', type: 'number', required: true, in: 'body', descEn: 'Percentage discount', descAr: 'نسبة الخصم' },
    ],
    samplePayload: { code: 'WELCOME20', percentOff: 20 },
    response: {
      success: true,
      data: { discountId: 'disc_991', code: 'WELCOME20', active: true },
    },
  },
  ep_commerce: {
    id: 'ep_commerce',
    method: 'GET',
    path: '/v1/commerce/products',
    liveApiPath: '/api/v1/commerce/products',
    requiredScope: 'commerce:read',
    titleEn: 'Store Catalog Overview (Legacy Alias)',
    titleAr: 'نظرة عامة على كتالوج المتجر',
    descEn: 'Lists connected e-commerce products and catalog sync status.',
    descAr: 'استعراض حالة مزامنة المنتجات في المتجر.',
    subService: 'commerce_local',
    action: 'list_products_alias',
    params: [],
    samplePayload: {},
    response: {
      success: true,
      data: [{ id: 'prod_01', title: 'Sample Product', price: 99.0 }],
    },
  },

  // ==========================================
  // FAMILY 7: ANALYTICS & INSIGHTS
  // ==========================================
  ep_analytics: {
    id: 'ep_analytics',
    method: 'GET',
    path: '/v1/analytics',
    liveApiPath: '/api/v1/analytics',
    requiredScope: 'analytics:read',
    titleEn: 'Cross-Network Performance Analytics',
    titleAr: 'التحليلات الشاملة لجميع القنوات (Analytics)',
    descEn: 'Returns aggregated post impressions, engagement rates, and follower growth across all social channels.',
    descAr: 'يعيد إحصائيات المشاهدات والتفاعل ونمو المتابعين المجمعة لكافة القنوات.',
    subService: 'analytics',
    action: 'get_analytics',
    params: [],
    samplePayload: {},
    response: {
      success: true,
      data: {
        totalImpressions: 125000,
        engagementRate: '4.8%',
        followerGrowth: '+12.4%',
      },
    },
  },
  ep_analytics_best_times: {
    id: 'ep_analytics_best_times',
    method: 'GET',
    path: '/v1/analytics/best-times',
    liveApiPath: '/api/v1/analytics/best-times',
    requiredScope: 'analytics:read',
    titleEn: 'Best Time to Post Heatmap Recommendations',
    titleAr: 'خريطة أفضل أوقات النشر (Best Times Heatmap)',
    descEn: 'Empirical hourly and day-of-week engagement recommendations tailored to your audience across networks.',
    descAr: 'توصيات دقيقة بالساعات والأيام الأكثر تفاعلاً لجمهورك على كل منصة.',
    subService: 'analytics',
    action: 'get_best_times',
    params: [
      { name: 'platform', type: 'string', required: false, in: 'query', descEn: 'Filter platform', descAr: 'المنصة' },
    ],
    samplePayload: {},
    response: {
      success: true,
      data: {
        recommendations: [
          { day: 'Tuesday', bestHoursUtc: [13, 17, 20] },
          { day: 'Thursday', bestHoursUtc: [14, 18, 21] },
        ],
      },
    },
  },
  ep_analytics_decay: {
    id: 'ep_analytics_decay',
    method: 'GET',
    path: '/v1/analytics/content-decay',
    liveApiPath: '/api/v1/analytics/content-decay',
    requiredScope: 'analytics:read',
    titleEn: 'Content Decay Engagement Half-Life Curves',
    titleAr: 'منحنيات اضمحلال التفاعل وعمر المنشور (Content Decay)',
    descEn: 'Calculates the engagement velocity and half-life curve of posts across TikTok, Reels, and static posts.',
    descAr: 'حساب سرعة تفاعل الجمهور وتناقص المشاهدات عبر الزمن لمختلف أنواع المحتوى.',
    subService: 'analytics',
    action: 'get_decay_curves',
    params: [],
    samplePayload: {},
    response: {
      success: true,
      data: {
        reelsHalfLifeHours: 72,
        xPostHalfLifeHours: 4,
        tiktokHalfLifeHours: 96,
      },
    },
  },
  ep_inbox_analytics: {
    id: 'ep_inbox_analytics',
    method: 'GET',
    path: '/v1/inbox-analytics',
    liveApiPath: '/api/v1/inbox-analytics',
    requiredScope: 'analytics:read',
    titleEn: 'Unified Inbox SLAs & Response Time Heatmap',
    titleAr: 'مؤشرات استجابة الرسائل ومعدلات الخدمة (Inbox SLAs)',
    descEn: 'Measures hourly message incoming volume, first-response times, and agent resolution SLAs.',
    descAr: 'قياس سرعة الرد على العملاء ومعدلات التزام فريق الدعم بالـ SLAs.',
    subService: 'analytics',
    action: 'get_inbox_analytics',
    params: [],
    samplePayload: {},
    response: {
      success: true,
      data: {
        avgFirstResponseTimeSeconds: 45,
        resolutionRate: '98.2%',
        hourlyPeak: '15:00 UTC',
      },
    },
  },

  // ==========================================
  // FAMILY 8: WEBHOOKS & ADMIN
  // ==========================================
  ep_webhooks: {
    id: 'ep_webhooks',
    method: 'POST',
    path: '/v1/webhooks',
    liveApiPath: '/api/v1/webhooks',
    requiredScope: 'webhooks:write',
    titleEn: 'Register Outbound Webhook with HMAC-SHA256 Signature',
    titleAr: 'تسجيل رابط Webhook بتوقيع أمني HMAC-SHA256',
    descEn:
      'Subscribes your HTTPS server to real-time events. Every outbound webhook POST includes an X-Asra3-Signature header computed using your secret.',
    descAr:
      'تسجيل رابط في سيرفرك لاستقبال إشعارات المنصة اللحظية مع توقيع رقمي HMAC-SHA256 للتحقق من أمان الرسالة.',
    subService: 'core_connect',
    action: 'register_webhook',
    params: [
      { name: 'url', type: 'string', required: true, in: 'body', descEn: 'Your HTTPS webhook endpoint', descAr: 'رابط الاستقبال HTTPS' },
      { name: 'events', type: 'string[]', required: true, in: 'body', descEn: 'Array of event subscriptions', descAr: 'الأحداث المطلوبة' },
    ],
    samplePayload: {
      url: 'https://api.yourcompany.com/webhooks/asra3',
      events: ['post.published', 'number.purchased', 'whatsapp.linked', 'message.sent'],
    },
    response: {
      success: true,
      message: 'Webhook endpoint registered with HMAC-SHA256 signing secret.',
      data: {
        id: 'wh_m2k9x99',
        url: 'https://api.yourcompany.com/webhooks/asra3',
        secret: 'whsec_8f9e7d6c5b4a3f2e1d0c9b8a7f6e5d4c',
        events: ['post.published', 'number.purchased', 'whatsapp.linked', 'message.sent'],
        status: 'active',
      },
    },
  },
  ep_openapi_spec: {
    id: 'ep_openapi_spec',
    method: 'GET',
    path: '/v1/openapi.json',
    liveApiPath: '/api/v1/openapi.json',
    requiredScope: 'public',
    titleEn: 'OpenAPI 3.1.0 Full Machine-Readable Specification',
    titleAr: 'مواصفات OpenAPI 3.1 الكاملة القابلة للقراءة آلياً',
    descEn: 'Official OpenAPI 3.1 document covering 110 paths across all 8 Asra3 resource families without requiring authentication.',
    descAr: 'المواصفات القياسية الكاملة لجميع نقاط الـ API بدون الحاجة لمصادقة.',
    subService: 'core_connect',
    action: 'get_openapi',
    params: [],
    samplePayload: {},
    response: {
      openapi: '3.1.0',
      info: { title: 'Asra3 Unified Social, Telephony, Ads & Commerce REST API', version: '1.5.0' },
      pathsCount: 110,
    },
  },
  ep_postman_spec: {
    id: 'ep_postman_spec',
    method: 'GET',
    path: '/v1/postman.json',
    liveApiPath: '/api/v1/postman.json',
    requiredScope: 'public',
    titleEn: 'Postman 2.1.0 Official Collection',
    titleAr: 'مجموعة Postman 2.1 الرسمية المجهزة للتجربة',
    descEn: 'Ready-to-import Postman 2.1 collection with 8 resource family folders and sample variable substitutions.',
    descAr: 'مجموعة بوستمان المنظمة في 8 مجلدات رئيسية للاختبار الفوري.',
    subService: 'core_connect',
    action: 'get_postman',
    params: [],
    samplePayload: {},
    response: {
      info: { name: 'Asra3 REST API v1 — Official Postman Collection', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
      itemCount: 8,
    },
  },
  ep_admin_reset: {
    id: 'ep_admin_reset',
    method: 'POST',
    path: '/v1/workspaces/reset',
    liveApiPath: '/api/v1/workspaces/reset',
    requiredScope: 'admin / public reset',
    titleEn: 'Clean State Teardown & Workspace Store Reset',
    titleAr: 'إعادة ضبط مساحة العمل للحالة النظيفة الأصلية',
    descEn: 'Resets in-memory caches and disk store back strictly to 22-byte {"workspaces":{}} state.',
    descAr: 'إعادة ضبط الذاكرة ومخزن البيانات على القرص إلى الحالة الأصلية بدقة 22 بايت.',
    subService: 'core_connect',
    action: 'reset_workspaces',
    params: [],
    samplePayload: {},
    response: {
      success: true,
      message: 'Workspace store and disk cache successfully reset to clean state.',
    },
  },
};

export default function ApiDocumentationPage() {
  const { t, locale } = useThemeAndLocale();
  const isAr = locale === 'ar';

  const [activeSection, setActiveSection] = useState<DocSectionId>('quickstart');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      setCopiedId(null);
    }
  };

  const sidebarItems = useMemo(
    () => [
      {
        group: isAr ? 'البداية السريعة والمعمارية' : 'Getting Started',
        items: [
          {
            id: 'quickstart' as DocSectionId,
            label: isAr ? 'البدء السريع (Quickstart)' : 'Quickstart',
            icon: Rocket,
          },
          {
            id: 'overview' as DocSectionId,
            label: isAr ? 'دليل العائلات الـ 8 (Overview)' : 'Overview & 8 Families',
            icon: Layers,
          },
          {
            id: 'platforms' as DocSectionId,
            label: isAr ? 'المنصات المدعومة (26 قناة)' : 'Supported Platforms (26)',
            icon: Globe,
          },
          {
            id: 'auth_webhooks' as DocSectionId,
            label: isAr ? 'المصادقة، الـ Scopes، والـ Webhooks' : 'Auth, Scopes & Webhooks',
            icon: ShieldCheck,
          },
        ],
      },
      {
        group: isAr ? '1. الحساب وربط القنوات (Core & Connect)' : '1. Core & Social Connect',
        items: [
          { id: 'ep_me' as DocSectionId, label: isAr ? 'فحص الحساب والحصص (/me)' : 'Workspace & Quotas (/me)', badge: 'GET' },
          { id: 'ep_accounts_health' as DocSectionId, label: isAr ? 'فحص صحة اتصال القنوات' : 'Channel Health Probes', badge: 'GET' },
          { id: 'ep_profiles' as DocSectionId, label: isAr ? 'إنشاء ملف علامة تجارية' : 'Create Brand Profile', badge: 'POST' },
          { id: 'ep_connect' as DocSectionId, label: isAr ? 'ربط القنوات / OAuth' : 'Connect Channel (OAuth)', badge: 'POST' },
          { id: 'ep_accounts' as DocSectionId, label: isAr ? 'القنوات المربوطة' : 'List Connected Accounts', badge: 'GET' },
          { id: 'ep_account_groups' as DocSectionId, label: isAr ? 'مجموعات النشر المتزامن' : 'Account Groups CRUD', badge: 'GET' },
        ],
      },
      {
        group: isAr ? '2. النشر والجدولة الذكية (Publishing & Queue)' : '2. Publishing & Queue',
        items: [
          { id: 'ep_posts' as DocSectionId, label: isAr ? 'نشر وجدولة (Posts)' : 'Publish / Schedule Post', badge: 'POST' },
          { id: 'ep_posts_list' as DocSectionId, label: isAr ? 'استعراض المنشورات' : 'List Posts', badge: 'GET' },
          { id: 'ep_queue_slots' as DocSectionId, label: isAr ? 'خانات النشر الأسبوعية' : 'Queue Slots Schedule', badge: 'GET' },
          { id: 'ep_queue_preview' as DocSectionId, label: isAr ? 'معاينة تقويم النشر' : 'Calendar Queue Preview', badge: 'GET' },
          { id: 'ep_media_presign' as DocSectionId, label: isAr ? 'رفع الوسائط السحابي' : 'Presign Media Upload', badge: 'POST' },
          { id: 'ep_validate_post' as DocSectionId, label: isAr ? 'فحص القيود والحدود' : 'Pre-Flight Validator', badge: 'POST' },
        ],
      },
      {
        group: isAr ? '3. المحادثات الموحدة وإدارة العملاء (Inbox & CRM)' : '3. Unified Inbox & CRM',
        items: [
          { id: 'ep_messages_conversations' as DocSectionId, label: isAr ? 'المحادثات الموحدة' : 'List Conversations', badge: 'GET' },
          { id: 'ep_messages_send' as DocSectionId, label: isAr ? 'إرسال رسالة في محادثة' : 'Send Thread Message', badge: 'POST' },
          { id: 'ep_messages_actions' as DocSectionId, label: isAr ? 'تحويل للموظف البشري' : 'Bot Handover', badge: 'POST' },
          { id: 'ep_inbox_comments' as DocSectionId, label: isAr ? 'إدارة التعليقات العامة' : 'Comments Moderation', badge: 'POST' },
          { id: 'ep_inbox_reviews' as DocSectionId, label: isAr ? 'تقييمات النجوم والردود' : 'Customer Star Reviews', badge: 'GET' },
          { id: 'ep_contacts' as DocSectionId, label: isAr ? 'دليل جهات الاتصال' : 'CRM Contacts Directory', badge: 'POST' },
          { id: 'ep_broadcasts' as DocSectionId, label: isAr ? 'حملات البث الجماعي' : 'Bulk Broadcasts', badge: 'POST' },
          { id: 'ep_workflows' as DocSectionId, label: isAr ? 'سير العمل التفرعي' : 'Visual Workflows', badge: 'POST' },
        ],
      },
      {
        group: isAr ? '4. الاتصالات السحابية والأرقام (Telephony & Voice)' : '4. Cloud Telephony & Voice',
        items: [
          { id: 'ep_numbers_search' as DocSectionId, label: isAr ? 'البحث عن أرقام (55+ دولة)' : 'Search Virtual Numbers', badge: 'GET' },
          { id: 'ep_numbers_buy' as DocSectionId, label: isAr ? 'شراء وتفعيل رقم' : 'Buy Virtual Number', badge: 'POST' },
          { id: 'ep_sms_send' as DocSectionId, label: isAr ? 'إرسال رسائل SMS' : 'Send Programmable SMS', badge: 'POST' },
          { id: 'ep_sms_otp' as DocSectionId, label: isAr ? 'قراءة أحدث كود OTP' : 'Fetch Inbound OTP', badge: 'GET' },
          { id: 'ep_voice_call' as DocSectionId, label: isAr ? 'إجراء مكالمة / AI' : 'Outbound Voice Call', badge: 'POST' },
          { id: 'ep_voice_token' as DocSectionId, label: isAr ? 'هاتف المتصفح (WebRTC)' : 'WebRTC Softphone Token', badge: 'POST' },
          { id: 'ep_verify_otp' as DocSectionId, label: isAr ? 'إرسال كود التحقق (OTP)' : 'Turnkey Verify OTP', badge: 'POST' },
          { id: 'ep_verify_check' as DocSectionId, label: isAr ? 'تأكيد كود التحقق' : 'Validate OTP Code', badge: 'POST' },
          { id: 'ep_branded_calling' as DocSectionId, label: isAr ? 'الهوية الموثقة للمكالمات' : 'Branded Caller ID', badge: 'POST' },
          { id: 'ep_rcs_messages' as DocSectionId, label: isAr ? 'رسائل RCS التفاعلية' : 'Dispatch RCS Messages', badge: 'POST' },
          { id: 'ep_wa_link' as DocSectionId, label: isAr ? 'ربط WhatsApp Cloud' : 'Link WhatsApp Cloud API', badge: 'POST' },
          { id: 'ep_wa_templates' as DocSectionId, label: isAr ? 'قوالب واتساب الرسمية' : 'WhatsApp HSM Templates', badge: 'GET' },
        ],
      },
      {
        group: isAr ? '5. الإعلانات والعملاء المحتملين (Advertising)' : '5. Advertising (8 Networks)',
        items: [
          { id: 'ep_ads_ctwa' as DocSectionId, label: isAr ? 'إعلانات النقرة للواتساب' : 'Click-to-WhatsApp (CTWA)', badge: 'POST' },
          { id: 'ep_ads_call' as DocSectionId, label: isAr ? 'إعلانات الاتصال الهاتفي' : 'Click-to-Call Ads', badge: 'POST' },
          { id: 'ep_ads_audiences' as DocSectionId, label: isAr ? 'جماهير إعادة الاستهداف' : 'Retargeting Audiences', badge: 'POST' },
          { id: 'ep_ads_targeting' as DocSectionId, label: isAr ? 'استكشاف الاهتمامات' : 'Targeting Discovery', badge: 'GET' },
          { id: 'ep_ads_library' as DocSectionId, label: isAr ? 'مكتبة إعلانات المنافسين' : 'Competitor Ad Library', badge: 'GET' },
          { id: 'ep_lead_gen' as DocSectionId, label: isAr ? 'استمارات جمع البيانات' : 'Lead Gen Forms & Leads', badge: 'POST' },
          { id: 'ep_ads' as DocSectionId, label: isAr ? 'تحويلات CAPI السحابية' : 'Conversions API (CAPI)', badge: 'POST' },
        ],
      },
      {
        group: isAr ? '6. التدوين والتجارة (Blogs & Commerce)' : '6. Blogs & Commerce',
        items: [
          { id: 'ep_blogs' as DocSectionId, label: isAr ? 'مقالات ووردبريس وشوبيفاي' : 'Multi-Platform Blogs', badge: 'POST' },
          { id: 'ep_google_services' as DocSectionId, label: isAr ? 'خدمات خرائط جوجل' : 'Google Business Services', badge: 'POST' },
          { id: 'ep_commerce_products' as DocSectionId, label: isAr ? 'كتالوج المنتجات الموحد' : 'Store Products Catalog', badge: 'GET' },
          { id: 'ep_commerce_orders' as DocSectionId, label: isAr ? 'تسجيل طلبات الشراء' : 'Commerce Orders Ingestion', badge: 'POST' },
          { id: 'ep_commerce_discounts' as DocSectionId, label: isAr ? 'كوبونات الخصم الترويجية' : 'Universal Discount Codes', badge: 'POST' },
        ],
      },
      {
        group: isAr ? '7. التحليلات وخرائط التفاعل (Analytics)' : '7. Analytics & Insights',
        items: [
          { id: 'ep_analytics' as DocSectionId, label: isAr ? 'التحليلات الشاملة' : 'Cross-Channel Analytics', badge: 'GET' },
          { id: 'ep_analytics_best_times' as DocSectionId, label: isAr ? 'خريطة أفضل أوقات النشر' : 'Best Time to Post Heatmap', badge: 'GET' },
          { id: 'ep_analytics_decay' as DocSectionId, label: isAr ? 'منحنيات اضمحلال المحتوى' : 'Content Decay Curves', badge: 'GET' },
          { id: 'ep_inbox_analytics' as DocSectionId, label: isAr ? 'مؤشرات استجابة الرسائل' : 'Unified Inbox SLAs', badge: 'GET' },
        ],
      },
      {
        group: isAr ? '8. الـ Webhooks وإعادة الضبط (Admin)' : '8. Webhooks & Admin',
        items: [
          { id: 'ep_webhooks' as DocSectionId, label: isAr ? 'تسجيل Webhook موثق (HMAC)' : 'Register HMAC Webhook', badge: 'POST' },
          { id: 'ep_openapi_spec' as DocSectionId, label: isAr ? 'مواصفات OpenAPI 3.1' : 'OpenAPI 3.1.0 Spec JSON', badge: 'GET' },
          { id: 'ep_postman_spec' as DocSectionId, label: isAr ? 'مجموعة Postman 2.1' : 'Postman 2.1.0 Collection', badge: 'GET' },
          { id: 'ep_admin_reset' as DocSectionId, label: isAr ? 'إعادة ضبط مساحة العمل (Reset)' : 'Workspace Store Reset', badge: 'POST' },
        ],
      },
    ],
    [isAr]
  );

  const filteredSidebar = useMemo(() => {
    if (!searchQuery.trim()) return sidebarItems;
    const q = searchQuery.toLowerCase();
    return sidebarItems
      .map((grp) => ({
        ...grp,
        items: grp.items.filter((item) => item.label.toLowerCase().includes(q)),
      }))
      .filter((grp) => grp.items.length > 0);
  }, [sidebarItems, searchQuery]);

  const activeEndpoint = ENDPOINT_SPECS[activeSection] || null;

  return (
    <div className="py-2 sm:py-4">
      {/* TOP DEVELOPER HERO & SPECS ACTIONS */}
      <header className="mb-8 border-b border-[var(--border-subtle)] pb-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-500">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{isAr ? 'واجهة برمجة التطبيقات v1 — التكافؤ الكامل للعائلات الـ 8' : 'API v1 Gateway — Full 8-Family Parity'}</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-[var(--text-primary)]">
              {isAr ? 'دليل ومواصفات المطورين ومنصة التجربة الحية' : 'Developer API Documentation & Interactive Console'}
            </h1>
            <p className="max-w-3xl text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              {isAr
                ? 'واجهة REST متكاملة تغطي كافة عائلات الموارد: الحسابات، النشر الموحد، المحادثات وCRM، الاتصالات السحابية والأرقام، الإعلانات، التجارة، التحليلات، وإشعارات Webhook الموقعة بتشفير HMAC-SHA256.'
                : 'Enterprise REST API spanning all 8 core resource families: Core Accounts, Publishing & Queue, Unified Inbox & CRM, Cloud Telephony & Voice, Advertising (8 Networks), Platform APIs, Advanced Analytics, and Outbound HMAC Webhooks.'}
            </p>
          </div>

          {/* Quick Specification Export Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/api/v1/openapi.json"
              target="_blank"
              download="asra3-openapi-3.1.json"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2.5 text-xs font-bold text-[var(--text-primary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all shadow-sm cursor-pointer"
            >
              <Download className="h-4 w-4 text-[var(--accent-primary)]" />
              <span>OpenAPI 3.1 JSON</span>
            </Link>
            <Link
              href="/api/v1/postman.json"
              target="_blank"
              download="asra3-postman-collection.json"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2.5 text-xs font-bold text-[var(--text-primary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all shadow-sm cursor-pointer"
            >
              <Download className="h-4 w-4 text-[var(--accent-primary)]" />
              <span>Postman 2.1 Collection</span>
            </Link>
          </div>
        </div>
      </header>

      {/* THREE-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* LEFT STICKY NAVIGATION SIDEBAR */}
        <nav aria-label="Documentation Sidebar" className="lg:col-span-3">
          <div className="sticky top-24 space-y-4">
            {/* Search Box */}
            <div className="relative">
              <Search className="absolute start-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder={isAr ? 'بحث في الـ 8 عائلات...' : 'Search 8 families...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] ps-9 pe-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
              />
            </div>

            {/* Navigation Groups */}
            <div className="max-h-[calc(100vh-180px)] overflow-y-auto space-y-6 pe-2">
              {filteredSidebar.map((grp, gIdx) => (
                <div key={gIdx} className="space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-2">
                    {grp.group}
                  </div>
                  <div className="space-y-0.5">
                    {grp.items.map((item) => {
                      const Icon = 'icon' in item ? item.icon : null;
                      const isActive = activeSection === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveSection(item.id)}
                          className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-colors cursor-pointer text-start ${
                            isActive
                              ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                            <span className="truncate">{item.label}</span>
                          </div>
                          {'badge' in item && (
                            <span
                              className={`ms-2 shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-extrabold ${
                                isActive
                                  ? 'bg-white/20 text-white'
                                  : item.badge === 'GET'
                                  ? 'bg-emerald-500/15 text-emerald-500'
                                  : item.badge === 'POST'
                                  ? 'bg-indigo-500/15 text-indigo-500'
                                  : item.badge === 'PUT'
                                  ? 'bg-amber-500/15 text-amber-500'
                                  : 'bg-rose-500/15 text-rose-500'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </nav>

        {/* MAIN CONTENT AREA */}
        <main className="lg:col-span-6 space-y-8">
          {/* SECTION 1: QUICKSTART */}
          {activeSection === 'quickstart' && (
            <div className="luxury-card p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] pb-4">
                <Rocket className="h-6 w-6 text-[var(--accent-primary)]" />
                <h2 className="text-2xl font-extrabold">
                  {isAr ? 'البدء السريع في 3 دقائق (Quickstart)' : '3-Minute Quickstart Guide'}
                </h2>
              </div>

              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {isAr
                  ? 'تم تصميم منصة Asra3 السحابية لتمكينك من دمج 26 منصة نشر وتواصل، وأرقام هواتف افتراضية في 55+ دولة، ورسائل واتساب الرسمية، وإعلانات CAPI، والمتاجر في طلب برمجي واحد.'
                  : 'Asra3 unified API v1 gives your application instant programmatic access to 26 social networks, virtual numbers in 55+ countries, official WhatsApp Cloud API, AI voice receptionist, and omnichannel CRM.'}
              </p>

              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {isAr ? 'الخطوة 1: فحص مساحة العمل والرصيد الحقيقي' : 'Step 1: Inspect Workspace & Telecom Wallet'}
                </h3>
                <pre
                  dir="ltr"
                  className="overflow-x-auto rounded-2xl bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100"
                >
{`curl -X GET "https://asra3.com/api/v1/me" \\
  -H "Authorization: Bearer tk_live_org_workspace_9f8e7d6c5b4a3"`}
                </pre>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {isAr ? 'الخطوة 2: نشر أول منشور موحد عبر المنصات' : 'Step 2: Dispatch First Cross-Platform Post'}
                </h3>
                <pre
                  dir="ltr"
                  className="overflow-x-auto rounded-2xl bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100"
                >
{`curl -X POST "https://asra3.com/api/v1/posts" \\
  -H "Authorization: Bearer tk_live_org_workspace_9f8e7d6c5b4a3" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "Hello World from Asra3 Unified API v1! 🚀",
    "platforms": ["facebook", "instagram", "linkedin"],
    "publishNow": true
  }'`}
                </pre>
              </div>
            </div>
          )}

          {/* SECTION 2: OVERVIEW OF 8 FAMILIES */}
          {activeSection === 'overview' && (
            <div className="luxury-card p-6 sm:p-8 space-y-8">
              <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] pb-4">
                <Layers className="h-6 w-6 text-[var(--accent-primary)]" />
                <div>
                  <h2 className="text-2xl font-extrabold">
                    {isAr ? 'دليل عائلات الموارد الـ 8 الكاملة' : 'Complete 8 Resource Families Directory'}
                  </h2>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {isAr ? 'تغطية برمجية شاملة لـ 110 مسار و 100 عملية معتمدة' : '110 paths and 100 operations documented across 8 families'}
                  </p>
                </div>
              </div>

              {RESOURCE_GROUPS.map((grp, gIdx) => (
                <div key={gIdx} className="space-y-4">
                  <h3 className="text-base font-bold text-[var(--text-primary)] border-s-4 border-[var(--accent-primary)] ps-3">
                    {isAr ? grp.groupTitleAr : grp.groupTitle}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {grp.cards.map((card, cIdx) => (
                      <button
                        key={cIdx}
                        type="button"
                        onClick={() => setActiveSection(card.targetSection)}
                        className="group flex flex-col justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-start hover:border-[var(--accent-primary)] hover:shadow-md transition-all cursor-pointer"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-bold text-xs text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                              {isAr ? card.titleAr : card.title}
                            </h4>
                            <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-transform group-hover:translate-x-0.5" />
                          </div>
                          <p className="mt-1.5 text-[11px] text-[var(--text-secondary)] leading-relaxed">
                            {isAr ? card.descAr : card.desc}
                          </p>
                        </div>
                        <div className="mt-3 font-mono text-[10px] font-bold text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 rounded-md px-2 py-0.5 w-fit">
                          {card.count}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SECTION 3: PLATFORMS DIRECTORY */}
          {activeSection === 'platforms' && (
            <div className="luxury-card p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] pb-4">
                <Globe className="h-6 w-6 text-[var(--accent-primary)]" />
                <h2 className="text-2xl font-extrabold">
                  {isAr ? 'المنصات المدعومة (26 قناة وخدمة)' : 'Supported Platforms Directory (26)'}
                </h2>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {isAr
                  ? 'يتيح لك المحرك نشر المحتوى وإدارة الرسائل والتعليقات والتحليلات عبر 26 منصة عالمية.'
                  : 'Manage cross-posting, omnichannel conversations, and performance metrics across 26 platforms.'}
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { name: 'Instagram', cat: 'Social & Reels' },
                  { name: 'Facebook', cat: 'Pages & Groups' },
                  { name: 'TikTok', cat: 'Video & Shop' },
                  { name: 'LinkedIn', cat: 'Profiles & Companies' },
                  { name: 'X (Twitter)', cat: 'Posts & Threads' },
                  { name: 'YouTube', cat: 'Videos & Shorts' },
                  { name: 'Pinterest', cat: 'Pins & Boards' },
                  { name: 'Snapchat', cat: 'Spotlight & Stories' },
                  { name: 'WhatsApp Cloud API', cat: 'Messaging & OTP' },
                  { name: 'Telegram', cat: 'Channels & Bots' },
                  { name: 'Google Business Profile', cat: 'Local SEO' },
                  { name: 'WordPress', cat: 'Blogs' },
                  { name: 'Shopify', cat: 'E-Commerce' },
                  { name: 'Meta Ads & CAPI', cat: 'Paid Advertising' },
                  { name: 'TikTok Ads', cat: 'Paid Advertising' },
                  { name: 'Google Ads', cat: 'Paid Advertising' },
                  { name: 'VoIP Virtual Numbers', cat: '55+ Countries' },
                  { name: 'WebRTC Softphone', cat: 'In-Browser Calling' },
                ].map((item, idx) => (
                  <div key={idx} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 p-3">
                    <div className="font-bold text-xs text-[var(--text-primary)]">{item.name}</div>
                    <div className="text-[10px] text-[var(--text-muted)] font-mono">{item.cat}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 4: AUTH & WEBHOOKS ARCHITECTURE */}
          {activeSection === 'auth_webhooks' && (
            <div className="luxury-card p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] pb-4">
                <ShieldCheck className="h-6 w-6 text-[var(--accent-primary)]" />
                <h2 className="text-2xl font-extrabold">
                  {isAr ? 'المصادقة، الـ Scopes، وتوقيع الـ Webhooks' : 'Dual Authentication, Scopes & HMAC Signatures'}
                </h2>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-bold">
                  {isAr ? '1. نمطا المصادقة المدعومان (Dual Auth)' : '1. Dual Authentication Modes'}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 space-y-2">
                    <div className="font-bold text-[var(--accent-primary)] flex items-center gap-1.5">
                      <Key className="h-4 w-4" />
                      <span>Bearer API Key</span>
                    </div>
                    <p className="text-[var(--text-secondary)] leading-relaxed">
                      {isAr
                        ? 'تُرسل الترويسة Authorization: Bearer tk_live_... مع كل طلب. مناسب لتطبيقات الـ Backend والـ CLI والأتمتة.'
                        : 'Pass Authorization: Bearer tk_live_... header. Recommended for backend services, scripts, and server-side automation.'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 space-y-2">
                    <div className="font-bold text-[var(--accent-primary)] flex items-center gap-1.5">
                      <Shield className="h-4 w-4" />
                      <span>Active Session Cookie</span>
                    </div>
                    <p className="text-[var(--text-secondary)] leading-relaxed">
                      {isAr
                        ? 'تُرسل الطلبات بدون ترويسة Authorization مع تفعيل credentials: "include"، ليتعرف الـ API على جلسة asra3_session تلقائياً.'
                        : 'Dispatch requests with credentials: "include" without Authorization header to authenticate via browser session cookie.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <h3 className="text-base font-bold">
                  {isAr ? '2. التحقق من توقيع الـ Webhooks (HMAC-SHA256)' : '2. Verifying Outbound Webhooks (HMAC-SHA256)'}
                </h3>
                <pre
                  dir="ltr"
                  className="overflow-x-auto rounded-2xl bg-slate-950 p-4 font-mono text-xs text-slate-100"
                >
{`import crypto from 'crypto';

export function verifyAsra3Webhook(rawBody: string, signatureHeader: string, secret: string) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
}`}
                </pre>
              </div>
            </div>
          )}

          {/* SECTION 5: INTERACTIVE ENDPOINT PAGES WITH TRY IT LIVE CONSOLE */}
          {activeEndpoint && (
            <div className="luxury-card p-6 sm:p-8 space-y-6">
              {/* Endpoint Header */}
              <div className="border-b border-[var(--border-subtle)] pb-5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className={`rounded-lg px-2.5 py-1 font-mono text-xs font-extrabold uppercase ${
                      activeEndpoint.method === 'GET'
                        ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                        : activeEndpoint.method === 'POST'
                        ? 'bg-indigo-500/15 text-indigo-500 border border-indigo-500/30'
                        : activeEndpoint.method === 'PUT'
                        ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                        : 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                    }`}
                  >
                    {activeEndpoint.method}
                  </span>
                  <code dir="ltr" className="font-mono text-sm font-bold text-[var(--text-primary)]">
                    /api{activeEndpoint.path}
                  </code>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 font-mono text-[10px] font-bold text-amber-500">
                    <Lock className="h-3 w-3" />
                    Scope: {activeEndpoint.requiredScope}
                  </span>
                </div>
                <h1 className="mt-3 text-2xl font-extrabold text-[var(--text-primary)]">
                  {isAr ? activeEndpoint.titleAr : activeEndpoint.titleEn}
                </h1>
                <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
                  {isAr ? activeEndpoint.descAr : activeEndpoint.descEn}
                </p>
              </div>

              {/* INTERACTIVE TRY IT LIVE CONSOLE */}
              <TryItLiveConsole spec={activeEndpoint} isAr={isAr} />

              {/* Parameters & Request Schema Table */}
              {activeEndpoint.params && activeEndpoint.params.length > 0 && (
                <div className="space-y-3 pt-4">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {isAr ? 'جدول المعاملات والحقول (Parameters & Body Schema)' : 'Request Parameters & Body Schema'}
                  </h2>
                  <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)]">
                    <table className="w-full text-xs text-start">
                      <thead className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">
                        <tr>
                          <th className="p-3 font-bold">{isAr ? 'الحقل' : 'Parameter'}</th>
                          <th className="p-3 font-bold">{isAr ? 'النوع' : 'Type'}</th>
                          <th className="p-3 font-bold">{isAr ? 'الموقع' : 'In'}</th>
                          <th className="p-3 font-bold">{isAr ? 'الوصف' : 'Description'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {activeEndpoint.params.map((prm) => (
                          <tr key={prm.name}>
                            <td className="p-3 font-mono font-bold text-[var(--text-primary)]">
                              {prm.name}
                              {prm.required && (
                                <span className="ms-1.5 rounded bg-red-500/15 px-1.5 py-0.5 text-[9px] font-extrabold text-red-500 uppercase">
                                  required
                                </span>
                              )}
                            </td>
                            <td className="p-3 font-mono text-[11px] text-[var(--accent-primary)]">{prm.type}</td>
                            <td className="p-3 font-mono text-[10px] uppercase text-[var(--text-muted)]">{prm.in}</td>
                            <td className="p-3 text-[var(--text-secondary)]">{isAr ? prm.descAr : prm.descEn}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* RIGHT STICKY SHORTCUTS & TOC */}
        <aside aria-label="Developer Shortcuts" className="lg:col-span-3">
          <div className="sticky top-24 space-y-4">
            {/* Quick Navigation Card */}
            <div className="luxury-card p-5 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {isAr ? 'روابط سريعة عبر الـ 8 عائلات' : '8-Family Shortcuts'}
              </div>
              <ul className="space-y-2 text-xs font-medium text-[var(--text-secondary)]">
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveSection('ep_me')}
                    className="hover:text-[var(--accent-primary)] text-start cursor-pointer transition-colors"
                  >
                    • {isAr ? '1. فحص الحساب والرصيد (/v1/me)' : '1. Workspace & Wallet (/v1/me)'}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveSection('ep_posts')}
                    className="hover:text-[var(--accent-primary)] text-start cursor-pointer transition-colors"
                  >
                    • {isAr ? '2. النشر ومنع التكرار (/v1/posts)' : '2. Posts & Duplicate Guard'}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveSection('ep_messages_conversations')}
                    className="hover:text-[var(--accent-primary)] text-start cursor-pointer transition-colors"
                  >
                    • {isAr ? '3. المحادثات الموحدة (/v1/inbox)' : '3. Omnichannel Inbox (/v1/inbox)'}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveSection('ep_numbers_search')}
                    className="hover:text-[var(--accent-primary)] text-start cursor-pointer transition-colors"
                  >
                    • {isAr ? '4. أرقام 55+ دولة (/v1/phone-numbers)' : '4. Virtual Numbers (55+ Countries)'}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveSection('ep_ads_ctwa')}
                    className="hover:text-[var(--accent-primary)] text-start cursor-pointer transition-colors"
                  >
                    • {isAr ? '5. إعلانات واتساب (/v1/ads/ctwa)' : '5. Click-to-WhatsApp Ads (CTWA)'}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveSection('ep_blogs')}
                    className="hover:text-[var(--accent-primary)] text-start cursor-pointer transition-colors"
                  >
                    • {isAr ? '6. مقالات المدونات (/v1/blogs)' : '6. WordPress & Shopify Blogs'}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveSection('ep_analytics_best_times')}
                    className="hover:text-[var(--accent-primary)] text-start cursor-pointer transition-colors"
                  >
                    • {isAr ? '7. خريطة أوقات النشر (Best Times)' : '7. Best Time to Post Heatmap'}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveSection('ep_webhooks')}
                    className="hover:text-[var(--accent-primary)] text-start cursor-pointer transition-colors"
                  >
                    • {isAr ? '8. الـ Webhook الموقع (HMAC)' : '8. Outbound HMAC Webhooks'}
                  </button>
                </li>
              </ul>
            </div>

            {/* Spec Downloads Card */}
            <div className="luxury-card p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                <Terminal className="h-4 w-4 text-[var(--accent-primary)]" />
                <span>{isAr ? 'مواصفات OpenAPI و Postman' : 'OpenAPI & Postman Specs'}</span>
              </div>
              <pre dir="ltr" className="rounded-xl bg-slate-950 p-3 font-mono text-[11px] text-slate-200 overflow-x-auto">
{`GET /api/v1/openapi.json
GET /api/v1/postman.json`}
              </pre>
              <div className="flex flex-col gap-2 pt-1">
                <Link
                  href="/api/v1/openapi.json"
                  target="_blank"
                  download="asra3-openapi-3.1.json"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] py-2 text-xs font-bold text-[var(--text-primary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download OpenAPI 3.1</span>
                </Link>
                <Link
                  href="/api/v1/postman.json"
                  target="_blank"
                  download="asra3-postman-collection.json"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] py-2 text-xs font-bold text-[var(--text-primary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Postman 2.1</span>
                </Link>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
