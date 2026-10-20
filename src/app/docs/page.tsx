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

const UNAVAILABLE_DOC_SECTIONS = new Set([
  'ep_profiles', 'ep_connect', 'ep_connect_select', 'ep_account_groups', 'ep_queue_preview',
  'ep_messages_search', 'ep_inbox_reviews', 'ep_inbox_mentions', 'ep_sequences', 'ep_workflows', 'ep_inbox',
  'ep_numbers_porting', 'ep_sms_otp', 'ep_sms_registration', 'ep_voice_token', 'ep_telephony',
  'ep_verify_otp', 'ep_verify_check', 'ep_branded_calling', 'ep_rcs_agents', 'ep_rcs_messages',
  'ep_wa_link', 'ep_wa_verify', 'ep_business_agent', 'ep_analytics_best_times', 'ep_analytics_decay',
  'ep_webhooks', 'ep_admin_reset',
]);

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
  | 'ep_instagram_limit'
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
        title: 'Workspace and configured limits (/me)',
        titleAr: 'مساحة العمل وحدودها المحددة (/me)',
        count: 'GET /api/v1/me',
        desc: 'Read the verified workspace and configured limits. This is not a wallet balance; monthly publishing/account billing enforcement is coming soon.',
        descAr: 'عرض مساحة العمل الموثّقة وحدودها المحددة دون رصيد محفظة. تطبيق حدود فوترة النشر والحسابات الشهرية قريباً.',
        targetSection: 'ep_me',
      },
      {
        title: 'Platform Connection Health Probes',
        titleAr: 'فحص صحة اتصال القنوات والتوكنات',
        count: 'GET /api/v1/accounts/health',
        desc: 'Fresh provider account inventory and health; missing observations are unknown.',
        descAr: 'فحص فوري لصلاحية التوكنات وحالة التنبيهات لجميع القنوات المربوطة.',
        targetSection: 'ep_accounts_health',
      },
      {
        title: 'Profiles & Brand Groups',
        titleAr: 'الملفات والمجموعات (Profiles)',
        count: 'POST /api/v1/profiles',
        desc: 'Use the authenticated workspace to manage the verified account mapping. Public profile creation is unavailable.',
        descAr: 'تُدار الحسابات الموثّقة من مساحة العمل. إنشاء ملفات المزود عبر هذه الواجهة غير متاح.',
        targetSection: 'ep_profiles',
      },
      {
        title: 'Headless OAuth & Entity Selector',
        titleAr: 'الربط الفوري واختيار الصفحات (Headless OAuth)',
        count: 'POST /api/v1/connect/{platform}',
        desc: 'Start reviewed OAuth and account selection in the authenticated dashboard. This headless catalog alias is unavailable.',
        descAr: 'ابدأ التفويض واختيار الحساب من لوحة التحكم الموثّقة. مسار الربط الكتالوجي دون واجهة غير متاح.',
        targetSection: 'ep_connect',
      },
    ],
  },
  {
    groupTitle: '2. Publishing, Queue & Pre-Flight Validation',
    groupTitleAr: '2. النشر الموحد، الجدولة الذكية، والفحص المسبق',
    cards: [
      {
        title: 'Facebook drafts, posts and scheduling',
        titleAr: 'نشر وجدولة المنشورات مع منع التكرار',
        count: 'POST /api/v1/posts',
        desc: 'Create Facebook drafts or posts with stable provider idempotency. Inspect target results and partial success.',
        descAr: 'مسودات ومنشورات فيسبوك مع مفاتيح طلبات ثابتة ومراجعة النتائج الجزئية.',
        targetSection: 'ep_posts',
      },
      {
        title: 'Weekly Queue Slots Schedule',
        titleAr: 'خانات النشر الأسبوعية الذكية (Queue Slots)',
        count: 'POST /api/v1/queue/slots',
        desc: 'Create a provider queue with weekly slots. Queue reads and preview return 501.',
        descAr: 'إنشاء قائمة بمواعيد أسبوعية. القراءة والمعاينة تعيدان 501.',
        targetSection: 'ep_queue_slots',
      },
      {
        title: 'Calendar Queue Preview Forecast',
        titleAr: 'معاينة تقويم النشر الحقيقي (Queue Preview)',
        count: 'GET /api/v1/queue/preview',
        desc: 'Not implemented in this phase; returns 501.',
        descAr: 'غير منفذ في هذه المرحلة؛ يعيد 501.',
        targetSection: 'ep_queue_preview',
      },
      {
        title: 'Pre-Flight Character & Media Validators',
        titleAr: 'الفحص المسبق للحدود والوسائط (Pre-Flight)',
        count: 'POST /api/v1/validate/post',
        desc: 'Validate owned Facebook/Instagram content and inspect public media accessibility, MIME and size. Final platform publication still depends on provider results.',
        descAr: 'فحص محتوى Facebook وInstagram وروابط الوسائط العامة ونوعها وحجمها. الفحص لا يضمن النشر النهائي.',
        targetSection: 'ep_validate_post',
      },
    ],
  },
  {
    groupTitle: '3. Manual Inbox, CRM and Campaigns',
    groupTitleAr: '3. المحادثات والعملاء والحملات اليدوية',
    cards: [
      {
        title: 'Omnichannel Conversations & Live Messages',
        titleAr: 'المحادثات الموحدة والرسائل الفورية',
        count: 'GET /api/v1/inbox/conversations',
        desc: 'Manual WhatsApp, Instagram and Facebook Messenger conversations for eligible owned accounts. Other channels are unavailable.',
        descAr: 'محادثات يدوية على WhatsApp وInstagram وMessenger للحسابات المملوكة المؤهلة. القنوات الأخرى غير متاحة.',
        targetSection: 'ep_messages_conversations',
      },
      {
        title: 'Public Comments Moderation & Replies',
        titleAr: 'إدارة التعليقات والردود العامة (Comments)',
        count: 'GET /api/v1/inbox/comments',
        desc: 'Read owned Facebook/Instagram posts and native comments; send reviewed public/private replies, hide/unhide or delete. Likes and top-level creation are unavailable.',
        descAr: 'قراءة التعليقات والرد عليها وإخفائها أو حذفها برمجياً عبر الـ API.',
        targetSection: 'ep_inbox_comments',
      },
      {
        title: 'Customer Star Reviews & Mentions',
        titleAr: 'تقييمات النجوم وإشارات العلامة التجارية',
        count: 'GET /api/v1/inbox/reviews',
        desc: 'Reviews and brand-mention monitoring are unavailable in this launch. This entry is a future catalog resource.',
        descAr: 'متابعة التقييمات والإشارات غير متاحة في هذا الإطلاق؛ هذا مورد كتالوج مستقبلي.',
        targetSection: 'ep_inbox_reviews',
      },
      {
        title: 'Manual Contacts and Reviewed Campaigns',
        titleAr: 'العملاء والحملات المراجعة يدوياً',
        count: 'POST /api/v1/workflows',
        desc: 'Manual CRM and reviewed WhatsApp campaigns are available in the workspace. Branching workflows and automatic follow-up are coming soon.',
        descAr: 'العملاء وحملات واتساب المراجعة متاحة في مساحة العمل. سير العمل التفرعي والمتابعة التلقائية قريباً.',
        targetSection: 'ep_workflows',
      },
    ],
  },
  {
    groupTitle: '4. Provider Numbers and Manual Communication',
    groupTitleAr: '4. أرقام المزود والاتصالات اليدوية',
    cards: [
      {
        title: 'Provider Number Inventory',
        titleAr: 'أرقام المزود المتاحة',
        count: 'GET /api/v1/phone-numbers/available',
        desc: 'Review actual inventory, capabilities and prices. Purchase, verification and WhatsApp connection are separate steps requiring provider approval and spending allocation.',
        descAr: 'راجع مخزون المزود وقدرات الرقم والسعر الفعلي. الشراء والتحقق والربط خطوات منفصلة تحتاج موافقة ومخصص إنفاق.',
        targetSection: 'ep_numbers_search',
      },
      {
        title: 'Turnkey SMS / Voice OTP Verification',
        titleAr: 'نظام التحقق الفوري عبر OTP (SMS & Voice)',
        count: 'POST /api/v1/verify',
        desc: 'Verification unavailable (HTTP 501); no provider verification flow.',
        descAr: 'التحقق غير متاح حالياً (501)؛ لم يُنفذ مسار التحقق لدى المزوّد.',
        targetSection: 'ep_verify_otp',
      },
      {
        title: 'Browser Softphone — Unavailable',
        titleAr: 'هاتف المتصفح — غير متاح',
        count: 'POST /api/v1/voice/browser-token',
        desc: 'Browser softphones, SIP setup and AI receptionists are unavailable. Supported provider calls use the reviewed Phone workspace.',
        descAr: 'هاتف المتصفح وإعداد SIP ووكلاء الاستقبال غير متاحة. المكالمات المدعومة تُراجع في مساحة الأرقام.',
        targetSection: 'ep_voice_token',
      },
      {
        title: 'WhatsApp Cloud API, Templates & Flows',
        titleAr: 'واتساب الرسمي، القوالب، واستمارات Flows',
        count: 'POST /api/v1/whatsapp/templates',
        desc: 'Review actual Meta template status and supported manual navigation Flows. Approval is provider-controlled; endpoint-driven Flows and AI agents are unavailable.',
        descAr: 'راجع حالة قوالب Meta واستمارات التنقل اليدوية المدعومة. الموافقة من المزود؛ استمارات تبادل البيانات ووكلاء AI غير متاحة.',
        targetSection: 'ep_wa_templates',
      },
    ],
  },
  {
    groupTitle: '5. Advertising — Coming Soon Catalog',
    groupTitleAr: '5. الإعلانات — كتالوج قريباً',
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
    groupTitle: '6. Blogs and Commerce — Coming Soon Catalog',
    groupTitleAr: '6. التدوين والتجارة — كتالوج قريباً',
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
        desc: 'Read available provider metrics for eligible connected accounts and the selected period. Missing values stay unavailable.',
        descAr: 'عرض بيانات المزود المتاحة للحسابات المؤهلة والفترة المحددة. البيانات المفقودة تبقى غير متاحة.',
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
        desc: 'Read available messaging evidence and timing data. Missing delivery, response and resolution measurements are not inferred.',
        descAr: 'عرض بيانات المراسلة وتوقيتها المتاحة دون استنتاج قياسات تسليم أو استجابة أو حل مفقودة.',
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
        desc: 'Import the resource catalog and selected runnable examples; availability and validation vary by phase.',
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
    id:'ep_me',method:'GET',path:'/v1/me',liveApiPath:'/api/v1/me',requiredScope:'read',
    titleEn:'Workspace and configured plan',titleAr:'مساحة العمل وإعدادات الباقة',
    descEn:'Returns the verified workspace and configured limits. Payment collection and monthly post/account billing enforcement are coming soon. This response has no wallet balance or invented usage counters. New API keys use explicit read/write scopes and the issuer’s current workspace role.',
    descAr:'يعرض مساحة العمل وحدود الباقة المحددة. تحصيل المدفوعات وتطبيق حدود فوترة المنشورات والحسابات الشهرية قريباً. لا يعرض رصيداً أو أرقام استخدام غير متاحة. تتبع المفاتيح الجديدة صلاحيات القراءة والتعديل والدور الحالي للمستخدم.',
    subService:'core_connect',action:'inspect_me',params:[],samplePayload:{},
    response:{success:true,data:{workspace:{organizationId:'owned_workspace',organizationName:'My business',planKey:'starter'},customerPayments:'coming_soon',limits:{configured:{},monthlyPostEnforcement:'coming_soon',connectedAccountEnforcement:'coming_soon'}}},
  },
  ep_accounts_health: {
    id:'ep_accounts_health',method:'GET',path:'/v1/accounts/health',liveApiPath:'/api/v1/accounts/health',requiredScope:'read',titleEn:'Fresh provider account health',titleAr:'حالة الحسابات من المزود',descEn:'Fresh tenant-scoped provider inventory and health. Missing health is unknown; outages return errors. Rows expose id/accountId/_id, status, isActive, needsReconnection, needsReconnect and checkedAt; optional diagnostics come from the provider. DELETE /accounts/{accountId} requires accounts:write and confirms remote absence before local removal. Unconfirmed disconnect returns 503; refresh inventory before retrying. Selected Meta greeting/menu/ice-breakers use canonical /accounts/{accountId}/{setting} paths; other nested settings return 501.',descAr:'حالة جديدة من المزود للحسابات المملوكة. الحالة الناقصة غير معروفة، والانقطاع يعيد خطأ. الفصل يتطلب صلاحية الإدارة وتأكيد غياب الحساب من المزود. إعدادات Meta المحددة متاحة عبر المسارات الرسمية، والبقية تعيد 501.',subService:'core_connect',action:'health',params:[],samplePayload:{},response:{success:true,simulated:false,summary:{total:1,unknown:1},accounts:[{id:'owned_account',accountId:'owned_account',platform:'facebook',status:'unknown',isActive:true,needsReconnection:false}]},
  },
  ep_account_health_id: {
    id:'ep_account_health_id',method:'GET',path:'/v1/accounts/{accountId}/health',liveApiPath:'/api/v1/accounts/owned_account/health',requiredScope:'read',titleEn:'Read owned account health',titleAr:'حالة حساب مملوك',descEn:'Find an owned account in fresh scoped provider inventory and health. Unknown is not a healthy verdict. Unknown account IDs return 404.',descAr:'حالة حساب مملوك من قائمة المزود؛ الحالة غير المعروفة لا تعني سلامة الحساب.',subService:'core_connect',action:'health',params:[],samplePayload:{},response:{success:true,data:{accountId:'owned_account',platform:'facebook',status:'unknown'}},
  },
  ep_profiles: {
    id: 'ep_profiles',
    method: 'POST',
    path: '/v1/profiles',
    liveApiPath: '/api/v1/profiles',
    requiredScope: 'write + owner/admin',
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
    requiredScope: 'write + owner/admin',
    titleEn: 'Connect Accounts in the Dashboard',
    titleAr: 'ربط الحسابات في لوحة التحكم',
    descEn:
      'This placeholder API returns 501. Use the authenticated dashboard to start verified OAuth or supported credential onboarding.',
    descAr:
      'يعيد هذا المسار 501. استخدم لوحة التحكم بعد تسجيل الدخول لبدء التفويض الموثّق أو الربط ببيانات الاعتماد المدعومة.',
    subService: 'core_connect',
    action: 'start_oauth',
    params: [
      { name: 'platform', type: 'string', required: true, in: 'path', descEn: 'Platform identifier (facebook, instagram, linkedin, tiktok, etc.)', descAr: 'اسم المنصة المراد ربطها' },
      { name: 'mode', type: '"oauth_url" | "direct"', required: false, in: 'body', descEn: 'Pass "oauth_url" to get an authorization redirect URL', descAr: 'اختر oauth_url للحصول على رابط تفويض' },
      { name: 'redirectUri', type: 'string', required: false, in: 'body', descEn: 'Callback URL after authorization', descAr: 'رابط العودة بعد إتمام المصادقة' },
    ],
    samplePayload: { mode: 'direct', accountName: 'Asra3 Official', platformAccountId: 'act_100234' },
    response: {
      success: false,
      error: { code: 'interactive_onboarding_required', message: 'Connect accounts from the authenticated dashboard.' },
    },
  },
  ep_connect_select: {
    id: 'ep_connect_select',
    method: 'POST',
    path: '/v1/connect/{platform}/select',
    liveApiPath: '/api/v1/connect/facebook/select',
    requiredScope: 'write + owner/admin',
    titleEn: 'Select Accounts in the Dashboard',
    titleAr: 'اختيار الحسابات في لوحة التحكم',
    descEn: 'This placeholder API returns 501. The authenticated dashboard picker uses the saved authorization session and verifies the selected provider account.',
    descAr: 'يعيد هذا المسار 501. يستخدم اختيار الحساب في لوحة التحكم جلسة التفويض المحفوظة ويتحقق من حساب المزوّد المختار.',
    subService: 'core_connect',
    action: 'select_oauth_entity',
    params: [
      { name: 'platform', type: 'string', required: true, in: 'path', descEn: 'Platform key', descAr: 'معرف المنصة' },
      { name: 'selectedEntityId', type: 'string', required: true, in: 'body', descEn: 'Target Page or Account ID', descAr: 'معرف الصفحة أو الحساب المطلوب ربطه' },
    ],
    samplePayload: { selectedEntityId: 'page_991823712', entityType: 'page' },
    response: {
      success: false,
      error: { code: 'interactive_onboarding_required', message: 'Use the dashboard account picker.' },
    },
  },
  ep_accounts: {
    id:'ep_accounts',method:'GET',path:'/v1/accounts',liveApiPath:'/api/v1/accounts',requiredScope:'read',titleEn:'List owned provider accounts',titleAr:'الحسابات المملوكة لدى المزود',descEn:'Fresh provider accounts and health for the authenticated workspace. No local simulated fallback. Provider failures return an error; the dashboard may label previous results stale. Use authenticated dashboard OAuth for Facebook connect/reconnect; reconnect binds the original account and Page identity.',descAr:'حسابات مساحة العمل وحالتها من المزود دون نتائج تجريبية. استخدم ربط لوحة التحكم لإعادة ربط نفس صفحة فيسبوك.',subService:'core_connect',action:'accounts',params:[],samplePayload:{},response:{success:true,simulated:false,data:[{accountId:'owned_account',platform:'facebook',status:'unknown',isActive:true}]},
  },
  ep_account_groups: {
    id: 'ep_account_groups',
    method: 'GET',
    path: '/v1/account-groups',
    liveApiPath: '/api/v1/account-groups',
    requiredScope: 'read',
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
    path: '/v1/accounts/{accountId}/messenger-menu',
    liveApiPath: '/api/v1/accounts/owned_facebook_account/messenger-menu',
    requiredScope: 'write + owner/admin',
    titleEn: 'Read, replace or reset selected Meta messaging settings',
    titleAr: 'ضبط القائمة الدائمة وأسئلة الترحيب (Messenger Menu & Ice Breakers)',
    descEn: 'GET/PUT/DELETE /accounts/{accountId}/{messenger-menu|messenger-greeting|messenger-ice-breakers|instagram-ice-breakers} read, replace or reset canonical provider settings. GET requires accounts:read; changes require accounts:write. Messenger settings require a Facebook Page account; Instagram ice breakers require an Instagram professional account. Messenger bodies are localized arrays with one default locale: greeting[{locale,text}] (160 characters), persistent_menu[{locale,composer_input_disabled,call_to_actions}] (3 top-level items, one nesting level with 5 items), or ice_breakers[{locale,call_to_actions:[{question,payload}]}]. Instagram PUT uses flat ice_breakers[{question,payload}]. Up to 4 questions, 80 characters each. Refresh after an uncertain provider result. Legacy /account-settings aliases and Telegram commands are outside this implementation.',
    descAr: 'قراءة أو استبدال أو مسح إعدادات المزود للحساب المملوك. القراءة تتطلب accounts:read والتغيير accounts:write. إعدادات Messenger لصفحة فيسبوك، وأسئلة Instagram للحساب الاحترافي. استخدم لغة default دون تكرار؛ التحية 160 حرفاً، والأسئلة حتى 4 وكل سؤال 80 حرفاً. القائمة حتى 3 عناصر رئيسية ومستوى فرعي واحد حتى 5 عناصر. راجع الإعدادات بعد نتيجة غير مؤكدة.',
    subService: 'inbox_crm',
    action: 'save',
    params: [
      { name: 'accountId', type: 'string', required: true, in: 'path', descEn: 'Owned connected Facebook Page account ID', descAr: 'معرف حساب صفحة فيسبوك المملوك' },
      { name: 'persistent_menu', type: 'object[]', required: true, in: 'body', descEn: 'Localized menu with default locale and composer_input_disabled boolean', descAr: 'قائمة بلغات محددة تتضمن default' },
    ],
    samplePayload: {
      persistent_menu: [{ locale: 'default', composer_input_disabled: false, call_to_actions: [
        { type: 'web_url', title: 'Visit Website', url: 'https://asra3.com' },
        { type: 'postback', title: 'Contact Support', payload: 'MENU_SUPPORT' },
      ] }],
    },
    response: {
      success: true,
      httpStatus: 200,
    },
  },

  // ==========================================
  // FAMILY 2: PUBLISHING & QUEUE SCHEDULING
  // ==========================================
  ep_posts: {
    id: 'ep_posts', method: 'POST', path: '/v1/posts', liveApiPath: '/api/v1/posts', requiredScope: 'write + editor/admin/owner',
    titleEn: 'Create an owned Facebook or Instagram draft/post', titleAr: 'إنشاء مسودة أو منشور فيسبوك أو Instagram',
    descEn: 'Use owned platforms[{platform:facebook|instagram,accountId}] and public HTTPS mediaItems. Instagram requires media: one image is feed, 2–20 images/videos form a carousel, one video is a Reel; platformSpecificData.contentType=story selects exactly one image/video Story. Omit contentType for feed/carousel/Reel. Captions are at most 2,200 characters; Stories do not display captions. Reel shareToFeed is optional. Provider preflight checks content and media URL/MIME/size; dimensions, aspect ratio and video duration remain unchecked, and unknown size is not certified. Direct Instagram Login supports baseline publishing; API catalog audio/paid-partnership fields require verified Facebook Login. Preserve a stable Idempotency-Key (or JSON idempotencyKey), 1–255 characters. Choose isDraft, publishNow, future scheduledFor with offset and IANA timezone, or useProfileQueue; omitting all publishing mode flags saves a draft. Current returned Instagram quota blocks immediate/retry rather than drafts or future schedules. HTTP 207 with a persisted post may contain a top-level error: inspect post/platformResults, retain its ID and reconcile before retry. GET/PUT/PATCH/DELETE /posts/{postId} and POST /posts/{postId}/retry use owned canonical records. DELETE removes the provider record and does not guarantee platform unpublishing.',
    descAr: 'حدد حساب فيسبوك أو Instagram المملوك ومفتاح طلب ثابت. Instagram يتطلب وسائط: صورة للمنشور، 2–20 عنصراً للألبوم، فيديو واحد لـ Reel، أو contentType=story لصورة أو فيديو واحد. النص حتى 2200 حرف ولا يظهر في القصة. فحص المزود يشمل الرابط ونوع الملف والحجم؛ الأبعاد والمدة غير مفحوصة. اختر مسودة أو نشراً فورياً أو جدولة مستقبلية أو قائمة نشر. الحصة الحالية تمنع النشر الفوري وإعادة المحاولة ولا تمنع المسودات. عند 207 احتفظ بمعرف المنشور وراجع نتائج الحسابات. الحذف لا يضمن حذف المحتوى من المنصة.',
    subService: 'publishing', action: 'create', params: [
      { name: 'platforms', type: 'object[]', required: true, in: 'body', descEn: 'Owned Facebook/Instagram targets; optional customContent/customMedia/platformSpecificData', descAr: 'حسابات فيسبوك وInstagram المملوكة' },
      { name: 'content', type: 'string', required: false, in: 'body', descEn: 'Caption; content or media required', descAr: 'نص المنشور' },
      { name: 'mediaItems', type: 'object[]', required: false, in: 'body', descEn: 'Public HTTPS media {url,type}', descAr: 'وسائط عامة عبر HTTPS' },
      { name: 'isDraft', type: 'boolean', required: false, in: 'body', descEn: 'Explicit draft intent', descAr: 'حفظ مسودة' },
      { name: 'idempotencyKey', type: 'string', required: true, in: 'body', descEn: 'Stable intent key, or use Idempotency-Key header', descAr: 'مفتاح طلب ثابت أو ترويسة Idempotency-Key' },
    ], samplePayload: { content: 'Our latest update', mediaItems:[{type:'image',url:'https://your-public-media.example/photo.jpg'}], platforms: [{platform:'instagram',accountId:'owned_instagram_account'}], isDraft:true, idempotencyKey:'new-draft-intent' }, response: { simulated:false, post:{_id:'provider_post_id',status:'draft',platforms:[{platform:'instagram',accountId:'owned_instagram_account',status:'pending'}]}, httpStatus:201 },
  },
  ep_posts_list: {
    id:'ep_posts_list',method:'GET',path:'/v1/posts',liveApiPath:'/api/v1/posts',requiredScope:'read',titleEn:'List provider posts',titleAr:'استعراض منشورات المزود',descEn:'Workspace-owned posts[] and canonical provider pagination. Optional page, limit, status and accountId. Read one post at GET /posts/{postId}.',descAr:'منشورات مملوكة لمساحة العمل مع ترقيم صفحات المزود.',subService:'publishing',action:'posts',params:[],samplePayload:{},response:{posts:[],pagination:{page:1,limit:20,total:0}},
  },
  ep_queue_slots: {
    id:'ep_queue_slots',method:'POST',path:'/v1/queue/slots',liveApiPath:'/api/v1/queue/slots',requiredScope:'write + editor/admin/owner',titleEn:'Create a provider queue',titleAr:'إنشاء قائمة نشر',descEn:'POST /queue or /queue/slots accepts name, IANA timezone and nonempty slots[{dayOfWeek:0..6,time:HH:mm}]. Workspace profile is server-resolved. GET and DELETE queue slots are not implemented (501).',descAr:'إنشاء قائمة باسم ومنطقة زمنية ومواعيد أسبوعية. القراءة والحذف غير منفذين ويعيدان 501.',subService:'publishing',action:'create_queue',params:[],samplePayload:{name:'Morning posts',timezone:'Africa/Cairo',slots:[{dayOfWeek:1,time:'09:00'}]},response:{queue:{_id:'provider_queue_id'}},
  },
  ep_queue_preview: {
    id:'ep_queue_preview',method:'GET',path:'/v1/queue/preview',liveApiPath:'/api/v1/queue/preview',requiredScope:'read',titleEn:'Queue preview — not implemented',titleAr:'معاينة القائمة غير منفذة',descEn:'Returns HTTP 501 in this phase.',descAr:'تعيد 501 في هذه المرحلة.',subService:'publishing',action:'preview_queue',params:[],samplePayload:{},response:{success:false,error:{message:'Not implemented'}},
  },
  ep_media_presign: {
    id:'ep_media_presign',method:'POST',path:'/v1/media/presign',liveApiPath:'/api/v1/media/presign',requiredScope:'write + editor/admin/owner',titleEn:'Upload media through HTTPS PUT',titleAr:'رفع الوسائط عبر HTTPS',descEn:'Supply filename, contentType and positive size in bytes. PUT file bytes to returned HTTPS uploadUrl; attach publicUrl in mediaItems. Upload alone does not publish content.',descAr:'أرسل اسم الملف ونوعه وحجمه. ارفع البيانات إلى uploadUrl وأرفق publicUrl في المنشور.',subService:'publishing',action:'presign',params:[],samplePayload:{filename:'photo.png',contentType:'image/png',size:1024},response:{uploadUrl:'https://provider.example/upload',publicUrl:'https://provider.example/photo.png',expiresIn:3600},
  },
  ep_validate_post: {
    id:'ep_validate_post',method:'POST',path:'/v1/validate/post',liveApiPath:'/api/v1/validate/post',requiredScope:'write + editor/admin/owner',titleEn:'Validate owned post content before publishing',titleAr:'فحص محتوى المنشور قبل النشر',descEn:'Provide owned platforms[{platform:facebook|instagram,accountId}], optional content/mediaItems and target overrides. Local checks verify account/platform/plan; provider content validation returns valid/errors/warnings. It does not process media, reserve quota or guarantee publication. Check /validate/media separately. HTTP 200 with valid=false is a validation result; missing or malformed provider data remains an error.',descAr:'أرسل الحسابات المملوكة والنص والوسائط. فحص المزود يعيد valid/errors/warnings ولا ينشر المحتوى أو يحجز الحصة. افحص روابط الوسائط بشكل منفصل؛ valid=false نتيجة فحص وليست نجاح نشر.',subService:'publishing',action:'validate_post',params:[{name:'platforms',type:'object[]',required:true,in:'body',descEn:'Owned Facebook/Instagram targets',descAr:'حسابات النشر المملوكة'}],samplePayload:{content:'Our latest update',mediaItems:[{type:'image',url:'https://your-public-media.example/photo.jpg'}],platforms:[{platform:'instagram',accountId:'owned_instagram_account'}]},response:{valid:true,warnings:[],httpStatus:200},
  },
  ep_validate_media: {
    id:'ep_validate_media',method:'POST',path:'/v1/validate/media',liveApiPath:'/api/v1/validate/media',requiredScope:'write + editor/admin/owner',titleEn:'Inspect public media accessibility, MIME and size',titleAr:'فحص الوصول ونوع الملف وحجم الوسائط',descEn:'Provide an owned publishing accountId and public HTTPS url without credentials/private hosts. Provider HEAD/GET returns valid, contentType, size, type and per-platform platformLimits when known. Unknown/null size and missing comparisons cannot certify limits. Dimensions, aspect ratio, codec and duration are not checked; no file is published.',descAr:'أرسل حساباً مملوكاً ورابط HTTPS عاماً. يعيد المزود نوع الملف وحجمه وحدود المنصة عند معرفتها. الحجم المجهول لا يؤكد مطابقة الحدود؛ الأبعاد والمدة غير مفحوصة ولا يُنشر الملف.',subService:'publishing',action:'validate_media',params:[{name:'accountId',type:'string',required:true,in:'body',descEn:'Owned publishing account',descAr:'حساب النشر المملوك'},{name:'url',type:'string',required:true,in:'body',descEn:'Public HTTPS media URL',descAr:'رابط وسائط HTTPS عام'}],samplePayload:{accountId:'owned_instagram_account',url:'https://your-public-media.example/photo.jpg'},response:{valid:true,url:'https://your-public-media.example/photo.jpg',contentType:'image/jpeg',size:1024,type:'image',platformLimits:{instagram:{withinLimit:true}},httpStatus:200},
  },
  ep_instagram_limit: {
    id:'ep_instagram_limit',method:'GET',path:'/v1/accounts/{accountId}/instagram/publishing-limit',liveApiPath:'/api/v1/accounts/owned_instagram_account/instagram/publishing-limit',requiredScope:'read',titleEn:'Read the current Instagram publishing quota',titleAr:'قراءة حصة نشر Instagram الحالية',descEn:'Owned Instagram account only. Compare quotaUsage with returned quotaTotal and quotaDurationSeconds; the live API value is authoritative rather than a hardcoded cap. Current exhaustion blocks immediate publishing/retry; drafts and future schedules remain available. This observation does not reserve future capacity.',descAr:'للحساب المملوك فقط. قارن quotaUsage بالحصة quotaTotal ومدة النافذة المعادة من المزود دون رقم ثابت. نفاد الحصة يمنع النشر الفوري وإعادة المحاولة؛ تظل المسودات والجدولة المستقبلية متاحة.',subService:'publishing',action:'instagram_limit',params:[{name:'accountId',type:'string',required:true,in:'path',descEn:'Owned Instagram professional account',descAr:'حساب Instagram الاحترافي المملوك'}],samplePayload:{},response:{quotaUsage:0,quotaTotal:100,quotaDurationSeconds:86400,httpStatus:200},
  },

  // ==========================================
  // FAMILY 3: UNIFIED INBOX & SOCIAL CRM
  // ==========================================
  ep_messages_conversations: {
    id: 'ep_messages_conversations', method: 'GET', path: '/v1/inbox/conversations', liveApiPath: '/api/v1/inbox/conversations',
    requiredScope: 'read', titleEn: 'List WhatsApp, Messenger and Instagram conversations', titleAr: 'عرض محادثات واتساب وMessenger وInstagram',
    descEn: 'List conversations for an owned accountId. Messenger uses the connected Facebook Page account. Optional cursor/limit; Meta folder=requests returns pending requests where supported. Provider response uses data[], pagination and meta.failedAccounts. Instagram Login may not expose requests; use the regular inbox when the provider reports PLATFORM_LIMITATION.', descAr: 'واتساب للحساب المملوك؛ الحالات والإيصالات من المزود. العمليات غير المنفذة تعيد 501.',
    subService: 'telephony', action: 'ep_messages_conversations', params: [{ name: 'accountId', type: 'string', required: true, in: 'query', descEn: 'Connected WhatsApp account owned by workspace', descAr: 'حساب واتساب المملوك' }], samplePayload: {}, response: {data:[{id:'provider_conversation_id',accountId:'owned_whatsapp_account',platform:'whatsapp',participantName:'Customer',participantId:'966501234567'}],pagination:{nextCursor:null}},
  },
  ep_messages_create: {
    id: 'ep_messages_create', method: 'POST', path: '/v1/inbox/conversations', liveApiPath: '/api/v1/inbox/conversations',
    requiredScope: 'write + editor/admin/owner', titleEn: 'Send provider WhatsApp message', titleAr: 'واجهة واتساب',
    descEn: 'Send provider WhatsApp message. Requires owned accountId and stable Idempotency-Key header (or idempotencyKey in the JSON body). Use a new key for a new intent and preserve it for retries. Provide conversationId XOR recipient; URL thread routes supply conversationId. Text/media require the 24-hour window. Send text and/or one attachments[{url:public HTTPS,type:image|video|audio|file,name?}], or template{name,language,parameters:string[],components?} separately. New recipients may use headerMedia. HTTP 200/201 acknowledges acceptance; delivery/read depend on receipts. Validation/ownership/provider errors return 400/403/404/409/429/502/503/504. Non-WhatsApp returns 501.', descAr: 'واتساب للحساب المملوك؛ الحالات والإيصالات من المزود. العمليات غير المنفذة تعيد 501.',
    subService: 'telephony', action: 'ep_messages_create', params: [{ name: 'accountId', type: 'string', required: true, in: 'body', descEn: 'Connected WhatsApp account owned by workspace', descAr: 'حساب واتساب المملوك' }], samplePayload: {idempotencyKey:'replace_with_unique_intent_key',accountId:'owned_whatsapp_account',recipient:'+966501234567',template:{name:'order_receipt_v1',language:'en_US',parameters:['Order 42']}}, response: {data:{messageId:'provider_message_id',conversationId:'provider_conversation_id'},httpStatus:201},
  },
  ep_messages_send: {
    id: 'ep_messages_send', method: 'POST', path: '/v1/inbox/conversations/provider_conversation_id/messages', liveApiPath: '/api/v1/inbox/conversations/provider_conversation_id/messages',
    requiredScope: 'write + editor/admin/owner', titleEn: 'Reply to a WhatsApp, Messenger or Instagram conversation', titleAr: 'الرد على محادثة العميل',
    descEn: 'Supply an owned accountId, text and/or one HTTPS attachment and a stable Idempotency-Key. Meta replies require an existing customer conversation and eligibility in the 24-hour window; the provider checks permissions. Templates are WhatsApp-only. HTTP 200 can contain data.partialFailure when an attachment succeeded but its text failed. Do not resend the successful attachment. A timeout or 5xx can follow platform acceptance; review history before another send, even with the same key. Empty history is inconclusive. POST /inbox/conversations/{id}/accept sends a reviewed first text reply to accept a Meta request. Returned internal conversationId can differ from the platform thread ID; retain the original thread ID.',
    descAr: 'اختر حساباً مملوكاً ومحادثة بدأها العميل. راجع الرد قبل الإرسال. قد ينجح الملف ويفشل النص؛ لا تعِد إرسال الملف. عند انقطاع الاتصال راجع المحادثة قبل محاولة جديدة، فقد تكون الرسالة وصلت.',
    subService: 'inbox_crm', action: 'ep_messages_send', params: [{ name: 'accountId', type: 'string', required: true, in: 'body', descEn: 'Connected account owned by workspace', descAr: 'الحساب المتصل المملوك' }], samplePayload: {idempotencyKey:'replace_with_unique_intent_key',accountId:'owned_facebook_account',text:'Hello'}, response: {success:true,data:{messageId:'provider_message_id'},httpStatus:200},
  },
  ep_messages_search: {
    id: 'ep_messages_search', method: 'GET', path: '/v1/inbox/conversations/search', liveApiPath: '/api/v1/inbox/conversations/search',
    requiredScope: 'read', titleEn: 'Unavailable in this phase', titleAr: 'واجهة واتساب',
    descEn: 'Unavailable in this phase. HTTP 501: no implemented provider flow.', descAr: 'واتساب للحساب المملوك؛ الحالات والإيصالات من المزود. العمليات غير المنفذة تعيد 501.',
    subService: 'telephony', action: 'ep_messages_search', params: [], samplePayload: {}, response: {success:false,error:{code:'unavailable',message:'This operation has no implemented provider flow.'}},
  },
  ep_messages_actions: {
    id: 'ep_messages_actions', method: 'POST', path: '/v1/inbox/conversations/provider_conversation_id/thread-control', liveApiPath: '/api/v1/inbox/conversations/provider_conversation_id/thread-control',
    requiredScope: 'write + editor/admin/owner', titleEn: 'Request provider Meta thread control', titleAr: 'طلب التحكم بمحادثة Meta',
    descEn: 'Use pass, take, request or release for an owned Meta conversation. pass requires the receiving targetAppId. Instagram take/request require Facebook Login and a linked Page; primary-receiver permissions remain provider-controlled. request remains pending. confirmed=true requires the provider control result to agree with the refreshed canonical conversation. Acknowledgment alone cannot switch the UI owner. Reconcile uncertain results before repeating. /handover is an alias with the same action body.', descAr: 'طلب نقل أو استلام أو تحرير التحكم بالمحادثة المملوكة. النقل يتطلب targetAppId. الاستلام والطلب في Instagram يتطلبان الربط عبر فيسبوك. الطلب يبقى معلقاً حتى تأكيد المزود؛ راجع المحادثة عند نتيجة غير مؤكدة.',
    subService: 'inbox_crm', action: 'thread_control', params: [{ name: 'accountId', type: 'string', required: true, in: 'body', descEn: 'Owned Facebook or Instagram account', descAr: 'الحساب المملوك' }, { name: 'action', type: 'string', required: true, in: 'body', descEn: 'pass, take, request or release', descAr: 'pass أو take أو request أو release' }], samplePayload: { accountId: 'owned_facebook_account', action: 'request' }, response: {success:true,confirmed:false,pending:true,conversation:{threadControl:'other'},httpStatus:200},
  },
  ep_inbox_comments: {
    id: 'ep_inbox_comments', method: 'GET', path: '/v1/inbox/comments', liveApiPath: '/api/v1/inbox/comments',
    requiredScope: 'accounts:read OR inbox:write', titleEn: 'Owned Facebook/Instagram comments and moderation', titleAr: 'تعليقات فيسبوك وInstagram للحساب المملوك',
    descEn: 'GET with accountId lists owned organic posts and native post IDs; cursor/limit (1–100), since and minComments are optional. GET /inbox/comments/{postId}?accountId=... reads comments; commentId selects parent replies. Retain pagination and failedAccounts/accountsSkipped metadata. Mutations require inbox:write and verified account/post/comment ownership; the 25-page verification bound fails closed when incomplete. POST /{postId} with accountId, commentId and message replies publicly; DELETE /{postId}?accountId=...&commentId=... deletes. POST/DELETE /{postId}/{commentId}/hide hides/unhides. POST /{postId}/{commentId}/private-reply sends a separately reviewed plain-text private reply. Public/private replies require a stable Idempotency-Key (or JSON idempotencyKey), up to 200 characters. Private replies are one per comment within 7 days; consumed or unknown outcomes block automatic retry. Reconcile provider history first. Likes, legacy comment-only aliases, top-level creation and paid/dark ad posts are outside this phase.', descAr: 'عرض المنشورات العضوية وتعليقاتها بمعرفات المنصة والحساب المملوك. الرد العام والحذف والإخفاء وإلغاء الإخفاء تتطلب inbox:write والتحقق من الملكية. الرد الخاص إجراء منفصل يُراجع قبل الإرسال، مرة واحدة خلال 7 أيام؛ لا تعِد المحاولة تلقائياً عند استهلاك الرد أو عدم تأكيد النتيجة. الإعجاب وإنشاء تعليق رئيسي غير متاحين.',
    subService: 'inbox_crm', action: 'posts', params: [{ name: 'accountId', type: 'string', required: true, in: 'query', descEn: 'Owned connected Facebook/Instagram account', descAr: 'معرف حساب فيسبوك أو Instagram المملوك' }, { name: 'cursor', type: 'string', required: false, in: 'query', descEn: 'Provider pagination cursor', descAr: 'مؤشر صفحات المزود' }, { name: 'limit', type: 'integer', required: false, in: 'query', descEn: '1–100 posts', descAr: 'من 1 إلى 100 منشور' }], samplePayload: {}, response: {data:[],pagination:{hasMore:false},meta:{failedAccounts:[]},httpStatus:200},
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
    id: 'ep_broadcasts', method: 'POST', path: '/v1/broadcasts', liveApiPath: '/api/v1/broadcasts',
    requiredScope: 'write + editor/admin/owner', titleEn: 'Create WhatsApp draft only', titleAr: 'واجهة واتساب',
    descEn: 'Create WhatsApp draft only. HTTP 200/201; requires owned accountId,name,approved template{name,language,variableMapping?} and stable Idempotency-Key header (or idempotencyKey in the JSON body). Use a new key for a new intent and preserve it for retries. Then POST /broadcasts/{id}/recipients with {accountId,phones:[international numbers]}; then POST /broadcasts/{id}/send with {accountId}. GET list/detail exposes provider status/counts. Add and send accept optional retry keys and derive stable keys otherwise. Keep the draft ID after failures. Delete, schedule and non-WhatsApp return 501.', descAr: 'واتساب للحساب المملوك؛ الحالات والإيصالات من المزود. العمليات غير المنفذة تعيد 501.',
    subService: 'telephony', action: 'ep_broadcasts', params: [{ name: 'accountId', type: 'string', required: true, in: 'body', descEn: 'Connected WhatsApp account owned by workspace', descAr: 'حساب واتساب المملوك' }], samplePayload: {idempotencyKey:'replace_with_unique_intent_key',accountId:'owned_whatsapp_account',name:'Order updates',template:{name:'order_receipt_v1',language:'en_US'}}, response: {broadcast:{id:'provider_broadcast_id',accountId:'owned_whatsapp_account',platform:'whatsapp',status:'draft'},httpStatus:201},
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
    titleEn: 'Search Provider Number Inventory',
    titleAr: 'البحث في أرقام المزوّد المتاحة',
    descEn: 'Searches inventory of virtual mobile, local, and toll-free numbers supporting WhatsApp, SMS, Voice, and OTP.',
    descAr: 'البحث في كتالوج الأرقام الافتراضية الدولية مع تصفية حسب الدولة والمزايا.',
    subService: 'telephony',
    action: 'search_numbers',
    params: [
      { name: 'country', type: 'string', required: false, in: 'query', descEn: 'ISO 2-letter country code (US, GB, SA, AE, EG)', descAr: 'رمز الدولة' },
      { name: 'type', type: 'string', required: false, in: 'query', descEn: 'mobile | local | toll_free | national', descAr: 'نوع الرقم' },
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
    titleAr: 'شراء رقم هاتف',
    descEn: 'Zernio bills and allocates the number. Keep the same purchaseIntentId and selection when retrying after a timeout, payment setup (402), or identity verification (202). A pending response may have no number ID. WhatsApp connects separately through Meta in the dashboard.',
    descAr: 'يتولى Zernio الفوترة وتخصيص الرقم. احتفظ بنفس معرّف الطلب والاختيار عند إعادة المحاولة بعد انقطاع الاتصال أو تحديث الدفع (402) أو التحقق من الهوية (202). قد لا يحتوي الطلب المعلّق على معرّف رقم. يتم ربط واتساب لاحقًا عبر Meta في لوحة التحكم.',
    subService: 'telephony',
    action: 'buy_number',
    params: [
      { name: 'country', type: 'string', required: true, in: 'body', descEn: 'Country from the provider catalog', descAr: 'الدولة من كتالوج المزوّد' },
      { name: 'numberType', type: 'string', required: true, in: 'body', descEn: 'local | mobile | toll_free | national', descAr: 'نوع الرقم' },
      { name: 'purchaseIntentId', type: 'string', required: true, in: 'body', descEn: 'Unique purchase intent, reused for every retry of this selection', descAr: 'معرّف طلب فريد يُستخدم دون تغيير في كل إعادة محاولة' },
      { name: 'phoneNumber', type: 'string', required: false, in: 'body', descEn: 'Exact E.164 number for instant inventory only; omit for regulated countries', descAr: 'رقم متاح فوري بصيغة E.164؛ يُترك فارغًا للدول التي تتطلب التحقق' },
    ],
    samplePayload: { country: 'US', numberType: 'local', phoneNumber: '+12025550192', purchaseIntentId: 'replace-with-a-new-uuid-for-your-purchase' },
    response: {
      success: true,
      status: 'kyc_required',
      message: 'Identity verification is required before allocation.',
      data: null,
      kycUrl: 'https://provider.example/identity-verification',
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
    path: '/v1/sms/send',
    liveApiPath: '/api/v1/sms/send',
    requiredScope: 'telephony:write',
    titleEn: 'Send a Reviewed Plain-Text SMS',
    titleAr: 'إرسال رسائل SMS برمجية',
    descEn: 'Use the reviewed Phone workspace for SMS, or provide an owned numberId, destination, text, consentReviewed=true and a stable intent key. Provider registration/capability, CRM suppression and spending allocation apply. MMS, scheduled SMS and OTP verification are unavailable. Acceptance is not a delivery receipt.',
    descAr: 'راجع SMS في مساحة الأرقام أو أرسل numberId المملوك والوجهة والنص وconsentReviewed=true ومفتاح طلب ثابت. يلزم تسجيل المزود وقدرات الرقم والموافقة ومخصص الإنفاق. MMS والجدولة والتحقق عبر OTP غير متاحة؛ القبول ليس إيصال تسليم.',
    subService: 'telephony',
    action: 'send_sms',
    params: [
      { name: 'to', type: 'string', required: true, in: 'body', descEn: 'Recipient phone number', descAr: 'رقم المستلم' },
      { name: 'text', type: 'string', required: true, in: 'body', descEn: 'Message content', descAr: 'نص الرسالة' },
    ],
    samplePayload: { numberId: 'owned_number_id', to: '+12025550123', text: 'Reviewed customer message', consentReviewed: true, intent: 'replace_with_unique_intent_key' },
    response: {
      success: true,
      data: { id: 'provider_message_id', status: 'sent' },
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
    titleEn: 'Start a Reviewed Provider Call',
    titleAr: 'بدء مكالمة يدوية مراجعة عبر المزود',
    descEn: 'Use the Phone workspace to review owned number/account eligibility, destination consent, actual provider permission and the maximum call estimate before starting. A stable intent and approved spending allocation are required. Browser softphones, SIP setup and AI calling agents are unavailable; dialing is not a completed call.',
    descAr: 'راجع أهلية الرقم والحساب والموافقة وصلاحية المزود وتقدير أقصى تكلفة في مساحة الأرقام قبل بدء المكالمة. يلزم مفتاح طلب ثابت ومخصص إنفاق. هاتف المتصفح وSIP ووكلاء AI غير متاحة؛ الاتصال الجاري لا يثبت اكتمال المكالمة.',
    subService: 'telephony',
    action: 'initiate_call',
    params: [
      { name: 'to', type: 'string', required: true, in: 'body', descEn: 'Destination phone number', descAr: 'رقم الهاتف المطلوب' },
    ],
    samplePayload: { channel: 'pstn', numberId: 'owned_number_id', to: '+12025550123', consentReviewed: true, expectedAmountMinor: 'review_actual_estimate_first', intent: 'replace_with_unique_intent_key' },
    response: {
      success: true,
      data: { callId: 'provider_call_id', status: 'dialing' },
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
    id: 'ep_verify_otp', method: 'POST', path: '/v1/verify', liveApiPath: '/api/v1/verify',
    requiredScope: 'telephony:write', titleEn: 'Unavailable in this phase', titleAr: 'واجهة واتساب',
    descEn: 'Unavailable in this phase. HTTP 501: no implemented provider flow.', descAr: 'واتساب للحساب المملوك؛ الحالات والإيصالات من المزود. العمليات غير المنفذة تعيد 501.',
    subService: 'telephony', action: 'ep_verify_otp', params: [], samplePayload: {}, response: {success:false,error:{code:'verification_unavailable',message:'Provider verification is not implemented. For WhatsApp number connection, use authenticated Meta onboarding.'}},
  },
  ep_verify_check: {
    id: 'ep_verify_check', method: 'POST', path: '/v1/verify/check', liveApiPath: '/api/v1/verify/check',
    requiredScope: 'telephony:write', titleEn: 'Unavailable in this phase', titleAr: 'واجهة واتساب',
    descEn: 'Unavailable in this phase. HTTP 501: no implemented provider flow.', descAr: 'واتساب للحساب المملوك؛ الحالات والإيصالات من المزود. العمليات غير المنفذة تعيد 501.',
    subService: 'telephony', action: 'ep_verify_check', params: [], samplePayload: {}, response: {success:false,error:{code:'verification_unavailable',message:'Provider verification is not implemented. For WhatsApp number connection, use authenticated Meta onboarding.'}},
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
    titleEn: 'Legacy WhatsApp Link (Retired)',
    titleAr: 'ربط واتساب القديم (متوقف)',
    descEn: 'Returns 410. Open WhatsApp setup in the dashboard and continue with Meta to connect an existing or purchased number.',
    descAr: 'يعيد 410. افتح إعداد واتساب في لوحة التحكم وتابع مع Meta لربط رقم موجود أو مُشترى.',
    subService: 'telephony',
    action: 'request_wa_link',
    params: [
      { name: 'phoneNumber', type: 'string', required: true, in: 'body', descEn: 'Purchased virtual number', descAr: 'الرقم الافتراضي' },
    ],
    samplePayload: { phoneNumber: '+12025550192' },
    response: {
      success: false,
      error: { code: 'hosted_onboarding_required', message: 'Continue with Meta in the dashboard.' },
    },
  },
  ep_wa_verify: {
    id: 'ep_wa_verify',
    method: 'POST',
    path: '/v1/whatsapp/verify-otp',
    liveApiPath: '/api/v1/whatsapp/verify-otp',
    requiredScope: 'telephony:write',
    titleEn: 'Legacy WhatsApp OTP (Retired)',
    titleAr: 'تأكيد واتساب القديم (متوقف)',
    descEn: 'Returns 410. Verification takes place in the authenticated Meta onboarding flow.',
    descAr: 'يعيد 410. يتم التحقق داخل مسار الربط الموثّق في Meta.',
    subService: 'telephony',
    action: 'verify_wa_otp',
    params: [
      { name: 'phoneNumber', type: 'string', required: true, in: 'body', descEn: 'Phone number', descAr: 'رقم الهاتف' },
      { name: 'code', type: 'string', required: true, in: 'body', descEn: '6-digit Meta code', descAr: 'كود التحقق' },
    ],
    samplePayload: { phoneNumber: '+12025550192', code: '882190' },
    response: {
      success: false,
      error: { code: 'hosted_onboarding_required', message: 'Local OTP verification is no longer supported.' },
    },
  },
  ep_wa_send: {
    id: 'ep_wa_send', method: 'POST', path: '/v1/whatsapp/messages', liveApiPath: '/api/v1/whatsapp/messages',
    requiredScope: 'write + editor/admin/owner', titleEn: 'Send provider WhatsApp message', titleAr: 'واجهة واتساب',
    descEn: 'Send provider WhatsApp message. Requires owned accountId and stable Idempotency-Key header (or idempotencyKey in the JSON body). Use a new key for a new intent and preserve it for retries. Provide conversationId XOR recipient; URL thread routes supply conversationId. Text/media require the 24-hour window. Send text and/or one attachments[{url:public HTTPS,type:image|video|audio|file,name?}], or template{name,language,parameters:string[],components?} separately. New recipients may use headerMedia. HTTP 200/201 acknowledges acceptance; delivery/read depend on receipts. Validation/ownership/provider errors return 400/403/404/409/429/502/503/504. Non-WhatsApp returns 501.', descAr: 'واتساب للحساب المملوك؛ الحالات والإيصالات من المزود. العمليات غير المنفذة تعيد 501.',
    subService: 'telephony', action: 'ep_wa_send', params: [{ name: 'accountId', type: 'string', required: true, in: 'body', descEn: 'Connected WhatsApp account owned by workspace', descAr: 'حساب واتساب المملوك' }], samplePayload: {idempotencyKey:'replace_with_unique_intent_key',accountId:'owned_whatsapp_account',recipient:'+966501234567',template:{name:'order_receipt_v1',language:'en_US',parameters:['Order 42']}}, response: {data:{messageId:'provider_message_id',conversationId:'provider_conversation_id'},httpStatus:201},
  },
  ep_wa_templates: {
    id: 'ep_wa_templates', method: 'GET', path: '/v1/whatsapp/templates', liveApiPath: '/api/v1/whatsapp/templates',
    requiredScope: 'read', titleEn: 'List Meta template state', titleAr: 'واجهة واتساب',
    descEn: 'List Meta template state. Requires owned accountId query. Returns templates[] with actual PENDING/APPROVED/REJECTED status. POST requires accountId,name,language,category,components and returns provider 200/201 acknowledgment; submission does not approve a template. DELETE returns 501.', descAr: 'واتساب للحساب المملوك؛ الحالات والإيصالات من المزود. العمليات غير المنفذة تعيد 501.',
    subService: 'telephony', action: 'ep_wa_templates', params: [{ name: 'accountId', type: 'string', required: true, in: 'query', descEn: 'Connected WhatsApp account owned by workspace', descAr: 'حساب واتساب المملوك' }], samplePayload: {}, response: {templates:[{name:'order_receipt_v1',category:'UTILITY',status:'PENDING',language:'en_US'}]},
  },
  ep_wa_flows: {
    id: 'ep_wa_flows', method: 'GET', path: '/v1/whatsapp/flows', liveApiPath: '/api/v1/whatsapp/flows',
    requiredScope: 'read + current workspace membership', titleEn: 'List WhatsApp Flows for an owned account', titleAr: 'عرض نماذج واتساب لحساب مملوك',
    descEn: 'Read provider Flows for an owned WhatsApp account using accountId. This example does not create, publish or send a form. The manual workspace supports reviewed navigation forms; endpoint-backed forms and cloning remain unavailable. Provider approval and account permissions apply.',
    descAr: 'اعرض نماذج المزود لحساب واتساب مملوك باستخدام accountId. هذا المثال لا ينشئ نموذجاً ولا ينشره ولا يرسله. تدعم مساحة العمل نماذج التنقل اليدوية بعد المراجعة؛ النماذج المرتبطة بخادم خارجي والاستنساخ غير متاحة. تسري موافقة المزود وصلاحيات الحساب.',
    subService: 'telephony', action: 'ep_wa_flows', params: [{ name: 'accountId', type: 'string', required: true, in: 'query', descEn: 'Owned WhatsApp account ID', descAr: 'معرّف حساب واتساب المملوك' }], samplePayload: {}, response: {success:true,flows:[]},
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
    requiredScope: 'write + editor/admin/owner',
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
    requiredScope: 'write + owner/admin',
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
    descEn: 'Returns available provider metrics for eligible connected accounts and a selected date range. Missing values and timestamps stay unavailable. Revenue and attribution are not inferred.',
    descAr: 'يعرض بيانات المزود المتاحة للحسابات المؤهلة والفترة المحددة. القيم والتوقيتات المفقودة غير متاحة؛ لا تُستنتج الإيرادات أو الإسناد.',
    subService: 'analytics',
    action: 'get_analytics',
    params: [],
    samplePayload: {},
    response: {
      success: true,
      data: {
        totals: { impressions: null, reach: null, engagement: null },
        dataAsOf: null,
        unavailable: true,
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
    descEn: 'Returns available provider messaging evidence for owned accounts. Missing delivery and timing observations remain unavailable; this does not certify a support SLA.',
    descAr: 'يعرض بيانات المراسلة المتاحة للحسابات المملوكة. ملاحظات التسليم والتوقيت المفقودة غير متاحة؛ لا يثبت ذلك اتفاقية مستوى خدمة.',
    subService: 'analytics',
    action: 'get_inbox_analytics',
    params: [],
    samplePayload: {},
    response: {
      success: true,
      data: {
        avgFirstResponseTimeSeconds: null,
        resolutionRate: null,
        dataAsOf: null,
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
            label: isAr ? 'دليل المنصات حسب المرحلة' : 'Platform catalog — availability varies',
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
          { id: 'ep_queue_slots' as DocSectionId, label: isAr ? 'خانات النشر الأسبوعية' : 'Create Queue', badge: 'POST' },
          { id: 'ep_queue_preview' as DocSectionId, label: isAr ? 'معاينة تقويم النشر' : 'Calendar Queue Preview', badge: 'GET' },
          { id: 'ep_media_presign' as DocSectionId, label: isAr ? 'رفع الوسائط السحابي' : 'Presign Media Upload', badge: 'POST' },
          { id: 'ep_validate_post' as DocSectionId, label: isAr ? 'فحص القيود والحدود' : 'Pre-Flight Validator', badge: 'POST' },
          { id: 'ep_validate_media' as DocSectionId, label: isAr ? 'فحص رابط الوسائط' : 'Media URL Check', badge: 'POST' },
          { id: 'ep_instagram_limit' as DocSectionId, label: isAr ? 'حصة نشر Instagram' : 'Instagram Publishing Quota', badge: 'GET' },
        ],
      },
      {
        group: isAr ? '3. المحادثات الموحدة وإدارة العملاء (Inbox & CRM)' : '3. Unified Inbox & CRM',
        items: [
          { id: 'ep_messages_conversations' as DocSectionId, label: isAr ? 'المحادثات الموحدة' : 'List Conversations', badge: 'GET' },
          { id: 'ep_messages_send' as DocSectionId, label: isAr ? 'إرسال رسالة في محادثة' : 'Send Thread Message', badge: 'POST' },
          { id: 'ep_messages_actions' as DocSectionId, label: isAr ? 'التحكم بمحادثة Meta' : 'Meta Thread Control', badge: 'POST' },
          { id: 'ep_inbox_comments' as DocSectionId, label: isAr ? 'إدارة التعليقات العامة' : 'Comments Moderation', badge: 'GET' },
          { id: 'ep_inbox_reviews' as DocSectionId, label: isAr ? 'تقييمات النجوم والردود' : 'Customer Star Reviews', badge: 'GET' },
          { id: 'ep_contacts' as DocSectionId, label: isAr ? 'دليل جهات الاتصال' : 'CRM Contacts Directory', badge: 'POST' },
          { id: 'ep_broadcasts' as DocSectionId, label: isAr ? 'حملات البث الجماعي' : 'Bulk Broadcasts', badge: 'POST' },
          { id: 'ep_workflows' as DocSectionId, label: isAr ? 'سير العمل التفرعي' : 'Visual Workflows', badge: 'POST' },
        ],
      },
      {
        group: isAr ? '4. الاتصالات السحابية والأرقام (Telephony & Voice)' : '4. Cloud Telephony & Voice',
        items: [
          { id: 'ep_numbers_search' as DocSectionId, label: isAr ? 'البحث في أرقام المزود' : 'Search Provider Numbers', badge: 'GET' },
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
        group: isAr ? '5. الإعلانات — قريباً' : '5. Advertising — Coming soon',
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

  const selectedEndpoint = ENDPOINT_SPECS[activeSection] || null;
  const catalogOnly = selectedEndpoint && (UNAVAILABLE_DOC_SECTIONS.has(activeSection) || ['ads', 'commerce_local', 'support_ai'].includes(selectedEndpoint.subService));
  const activeEndpoint = selectedEndpoint && catalogOnly ? {
    ...selectedEndpoint,
    titleEn: `${selectedEndpoint.titleEn} — Unavailable`,
    titleAr: `${selectedEndpoint.titleAr} — غير متاح`,
    descEn: 'This is a future or retired catalog resource, not an implemented launch operation. Its examples do not establish availability. Use the supported manual workspace tools; no message, purchase, webhook subscription or automation is performed here.',
    descAr: 'هذا مورد مستقبلي أو متوقف في الكتالوج، وليس عملية مفعّلة في الإطلاق. أمثلته لا تثبت الإتاحة. استخدم الأدوات اليدوية المدعومة؛ لا ينفذ هذا المورد إرسالاً أو شراءً أو اشتراك Webhook أو أتمتة.',
    samplePayload: {},
    response: { success: false, error: { code: 'unavailable', message: 'This catalog operation is unavailable.' } },
  } : selectedEndpoint;

  return (
    <div className="py-2 sm:py-4">
      <p role="note" className="mb-6 rounded-xl border border-[var(--border-subtle)] p-4 text-sm">{isAr ? 'بيانات العملاء الدائمة تستخدم /api/crm بجلسة مساحة العمل. معرفات العملاء المحلية لا تُستخدم كمعرفات المزود. قوائم الجمهور تتحول لأرقام مؤهلة بعد مراجعة الموافقات؛ لا تتم مزامنة جهات الاتصال تلقائياً.' : 'Durable manual contacts use /api/crm with a verified workspace session. Local contact UUIDs are never provider contact IDs. Audiences resolve to reviewed eligible phone snapshots; provider contacts are not automatically synchronized.'}</p>
      {/* TOP DEVELOPER HERO & SPECS ACTIONS */}
      <header className="mb-8 border-b border-[var(--border-subtle)] pb-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-500">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{isAr ? 'دليل الموارد — الإتاحة حسب مرحلة الإطلاق' : 'Resource catalog — launch availability varies'}</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-[var(--text-primary)]">
              {isAr ? 'دليل ومواصفات المطورين ومنصة التجربة الحية' : 'Developer API Documentation & Interactive Console'}
            </h1>
            <p className="max-w-3xl text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              {isAr
                ? 'الإطلاق اليدوي الحالي يشمل Facebook وInstagram وWhatsApp والعملاء والتقارير والاتصالات المراجعة. الإعلانات والتجارة والأتمتة وجمع المدفوعات قريباً. الكتالوج التالي لا يعني تفعيل كل مساراته.'
                : 'Current manual launch: Facebook, Instagram, WhatsApp, durable CRM, activity reports and reviewed phone operations. Advertising, commerce, customer automation and payment collection are Coming soon. Advanced entries below are a resource catalog, not a promise that every endpoint is enabled.'}
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
                  ? 'ابدأ بفحص مساحة العمل وحساباتها الموثّقة دون إرسال أو نشر. العمليات اليدوية تحتاج حساباً مؤهلاً وصلاحيات المنصة؛ الرسائل والأرقام المدفوعة تحتاج موافقة ومخصص إنفاق.'
                  : 'Start by reading your verified workspace and accounts without sending or publishing. Manual operations require eligible accounts and platform permissions; paid messaging and number operations also require spending approval.'}
              </p>

              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {isAr ? 'الخطوة 1: فحص مساحة العمل وحدودها المحددة' : 'Step 1: Read Workspace and Configured Limits'}
                </h3>
                <pre
                  dir="ltr"
                  className="overflow-x-auto rounded-2xl bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100"
                >
{`curl -X GET "https://asra3.com/api/v1/me" \\
  -H "Authorization: Bearer asra3_YOUR_CURRENT_WORKSPACE_KEY"`}
                </pre>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {isAr ? 'الخطوة 2: عرض الحسابات المملوكة وحالتها' : 'Step 2: Read Owned Accounts and Their Status'}
                </h3>
                <pre
                  dir="ltr"
                  className="overflow-x-auto rounded-2xl bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100"
                >
{`curl -X GET "https://asra3.com/api/v1/accounts/health" \\
  -H "Authorization: Bearer asra3_YOUR_CURRENT_WORKSPACE_KEY"`}
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
                    {isAr ? 'دليل موارد من 8 عائلات؛ الإتاحة والتحقق حسب المرحلة' : 'Resource catalog across 8 families; availability and validation vary by phase'}
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
                            {UNAVAILABLE_DOC_SECTIONS.has(card.targetSection) || ['ep_ads_ctwa', 'ep_lead_gen', 'ep_ads_library', 'ep_ads', 'ep_blogs', 'ep_google_services', 'ep_commerce_products', 'ep_commerce_orders'].includes(card.targetSection)
                              ? (isAr ? 'غير متاح في الإطلاق؛ هذا مورد كتالوج مستقبلي أو متوقف.' : 'Unavailable in this launch; this is a future or retired catalog resource.')
                              : (isAr ? card.descAr : card.desc)}
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
                  {isAr ? 'دليل المنصات حسب المرحلة' : 'Platform catalog — availability varies'}
                </h2>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {isAr
                  ? 'دليل موارد المنصات؛ لا يعني ظهور المورد أن جميع عملياته متاحة. راجع وصف الواجهة حسب المرحلة.'
                  : 'Manual Facebook, Instagram and WhatsApp tools are supported for eligible connected accounts. Other entries below are catalog resources; their presence does not establish availability.'}
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
                  { name: 'Provider Numbers', cat: 'Availability and approval required' },
                  { name: 'WebRTC Softphone', cat: 'Unavailable' },
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
                        ? 'تُرسل الترويسة Authorization: Bearer asra3_... مع كل طلب. مناسب لتطبيقات الـ Backend والـ CLI والأتمتة.'
                        : 'Pass Authorization: Bearer asra3_... header. Recommended for backend services, scripts, and server-side automation.'}
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
                  {isAr ? '2. Webhooks الواردة من المزود' : '2. Incoming Provider Webhooks'}
                </h3>
                <pre
                  dir="ltr"
                  className="overflow-x-auto rounded-2xl bg-slate-950 p-4 font-mono text-xs text-slate-100"
                >
{`Incoming provider endpoint: https://asra3.com/api/webhooks/zernio
The server verifies the provider signature before accepting events.
Customer-defined outgoing webhook subscriptions are coming soon.
Use the provider's documented signature contract for your integration.`}
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
              {catalogOnly ? <p className="rounded-xl border border-[var(--border-subtle)] p-4">{isAr ? 'غير متاح — هذا وصف كتالوج فقط. التنفيذ الحي غير متاح في هذا الإطلاق.' : 'Unavailable — this is a catalog description. Live execution is not available in this launch.'}</p> : <TryItLiveConsole spec={activeEndpoint} isAr={isAr} />}

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
                    • {isAr ? '1. مساحة العمل وحدودها (/v1/me)' : '1. Workspace and Limits (/v1/me)'}
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
                    • {isAr ? '4. مخزون أرقام المزود' : '4. Provider Number Inventory'}
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
