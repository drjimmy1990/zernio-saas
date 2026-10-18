'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import { getLocalizedText } from '@/i18n/dictionaries';
import {
  ALL_SOCIAL_PLATFORMS,
  type SocialPlatform,
  type SecondarySelectionStep,
} from '@/types/platform';
import {
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  KeyRound,
  Layers,
  Send,
  MessageSquare,
  Globe,
  Radio,
  Search,
  Eye,
  EyeOff,
  Trash2,
  Building2,
  Store,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Share2,
  Lock,
} from 'lucide-react';

// Platform metadata definition
export interface PlatformMeta {
  key: SocialPlatform;
  name: string;
  category: 'social_video' | 'messaging' | 'blogs_local';
  connectionType: 'oauth' | 'bot_token' | 'store_key' | 'app_password' | 'cloud_api';
  badgeLabel: string;
  badgeLabelAr: string;
  description: string;
  descriptionAr: string;
  brandColor: string;
  brandBg: string;
  needsEntitySelection: boolean;
  entityTypeLabel: string;
  entityTypeLabelAr: string;
}

export const PLATFORM_CATALOG: Record<SocialPlatform, PlatformMeta> = {
  // 1. Social & Video (11)
  instagram: {
    key: 'instagram',
    name: 'Instagram',
    category: 'social_video',
    connectionType: 'oauth',
    badgeLabel: 'OAuth 2.0 1-Click',
    badgeLabelAr: 'ربط مباشر OAuth 2.0',
    description: 'Reels, Carousels, Stories, Feed Posts & Direct Messages',
    descriptionAr: 'ريلز، صور متعددة، قصص، منشورات ورسائل مباشرة',
    brandColor: '#E1306C',
    brandBg: 'rgba(225, 48, 108, 0.12)',
    needsEntitySelection: true,
    entityTypeLabel: 'Instagram Business Account',
    entityTypeLabelAr: 'حساب إنستغرام للأعمال',
  },
  facebook: {
    key: 'facebook',
    name: 'Facebook',
    category: 'social_video',
    connectionType: 'oauth',
    badgeLabel: 'OAuth 2.0 1-Click',
    badgeLabelAr: 'ربط مباشر OAuth 2.0',
    description: 'Pages, Groups, Comment-to-DM & Messenger Automations',
    descriptionAr: 'صفحات، مجموعات، ردود تلقائية ورسائل ماسنجر',
    brandColor: '#1877F2',
    brandBg: 'rgba(24, 119, 242, 0.12)',
    needsEntitySelection: true,
    entityTypeLabel: 'Facebook Page',
    entityTypeLabelAr: 'صفحة فيسبوك',
  },
  tiktok: {
    key: 'tiktok',
    name: 'TikTok',
    category: 'social_video',
    connectionType: 'oauth',
    badgeLabel: 'OAuth 2.0 1-Click',
    badgeLabelAr: 'ربط مباشر OAuth 2.0',
    description: 'Vertical Short Videos, Creator Commercial Licensing & Analytics',
    descriptionAr: 'فيديوهات عمودية، تراخيص تجارية وتحليلات الأداء',
    brandColor: '#00F2FE',
    brandBg: 'rgba(0, 242, 254, 0.12)',
    needsEntitySelection: false,
    entityTypeLabel: 'TikTok Creator Account',
    entityTypeLabelAr: 'حساب تيك توك للمنشئين',
  },
  youtube: {
    key: 'youtube',
    name: 'YouTube',
    category: 'social_video',
    connectionType: 'oauth',
    badgeLabel: 'OAuth 2.0 1-Click',
    badgeLabelAr: 'ربط مباشر OAuth 2.0',
    description: 'Shorts, Long-form Video Uploads, Playlists & Studio Stats',
    descriptionAr: 'فيديوهات قصيرة، فيديوهات طويلة، قوائم تشغيل واستوديو يوتيوب',
    brandColor: '#FF0000',
    brandBg: 'rgba(255, 0, 0, 0.12)',
    needsEntitySelection: true,
    entityTypeLabel: 'YouTube Channel',
    entityTypeLabelAr: 'قناة يوتيوب',
  },
  twitter: {
    key: 'twitter',
    name: 'X (Twitter)',
    category: 'social_video',
    connectionType: 'oauth',
    badgeLabel: 'OAuth 2.0 1-Click',
    badgeLabelAr: 'ربط مباشر OAuth 2.0',
    description: 'Connected Threads, Polls, Quote Posts & Real-time Trends',
    descriptionAr: 'سلاسل تغريدات مترابطة، استطلاعات ورصد الترندات',
    brandColor: '#1DA1F2',
    brandBg: 'rgba(29, 161, 242, 0.12)',
    needsEntitySelection: false,
    entityTypeLabel: 'X Profile',
    entityTypeLabelAr: 'ملف منصة X',
  },
  linkedin: {
    key: 'linkedin',
    name: 'LinkedIn',
    category: 'social_video',
    connectionType: 'oauth',
    badgeLabel: 'OAuth 2.0 1-Click',
    badgeLabelAr: 'ربط مباشر OAuth 2.0',
    description: 'Company Pages, PDF Document Carousels & Executive Articles',
    descriptionAr: 'صفحات الشركات، منشورات PDF التفاعلية والمقالات المهنية',
    brandColor: '#0A66C2',
    brandBg: 'rgba(10, 102, 194, 0.12)',
    needsEntitySelection: true,
    entityTypeLabel: 'LinkedIn Organization',
    entityTypeLabelAr: 'صفحة المنظمة أو الشركة',
  },
  threads: {
    key: 'threads',
    name: 'Threads',
    category: 'social_video',
    connectionType: 'oauth',
    badgeLabel: 'OAuth 2.0 1-Click',
    badgeLabelAr: 'ربط مباشر OAuth 2.0',
    description: 'Text Updates, Carousel Media & Connected Conversations',
    descriptionAr: 'تحديثات نصية، وسائط تفاعلية ونقاشات متزامنة',
    brandColor: '#FFFFFF',
    brandBg: 'rgba(255, 255, 255, 0.12)',
    needsEntitySelection: false,
    entityTypeLabel: 'Threads Profile',
    entityTypeLabelAr: 'ملف ثريدز',
  },
  snapchat: {
    key: 'snapchat',
    name: 'Snapchat',
    category: 'social_video',
    connectionType: 'oauth',
    badgeLabel: 'OAuth 2.0 1-Click',
    badgeLabelAr: 'ربط مباشر OAuth 2.0',
    description: 'Spotlights, Public Profiles & Ephemeral Stories',
    descriptionAr: 'أضواء سبوتلايت، الملفات العامة والقصص التفاعلية',
    brandColor: '#FFFC00',
    brandBg: 'rgba(255, 252, 0, 0.14)',
    needsEntitySelection: true,
    entityTypeLabel: 'Snapchat Public Profile',
    entityTypeLabelAr: 'الملف التعريفي العام لسناب شات',
  },
  pinterest: {
    key: 'pinterest',
    name: 'Pinterest',
    category: 'social_video',
    connectionType: 'oauth',
    badgeLabel: 'OAuth 2.0 1-Click',
    badgeLabelAr: 'ربط مباشر OAuth 2.0',
    description: 'Product Pins, Visual Idea Boards & Outbound Referral Links',
    descriptionAr: 'منشورات المنتجات، لوحات الأفكار والروابط المباشرة',
    brandColor: '#E60023',
    brandBg: 'rgba(230, 0, 35, 0.12)',
    needsEntitySelection: true,
    entityTypeLabel: 'Pinterest Board',
    entityTypeLabelAr: 'لوحة بنترست',
  },
  reddit: {
    key: 'reddit',
    name: 'Reddit',
    category: 'social_video',
    connectionType: 'oauth',
    badgeLabel: 'OAuth 2.0 1-Click',
    badgeLabelAr: 'ربط مباشر OAuth 2.0',
    description: 'Targeted Subreddit Posts, Custom Flairs & AMA Discussions',
    descriptionAr: 'نشر في مجتمعات فرعية محددة مع خيارات الفلير المخصصة',
    brandColor: '#FF4500',
    brandBg: 'rgba(255, 69, 0, 0.12)',
    needsEntitySelection: false,
    entityTypeLabel: 'Reddit Account',
    entityTypeLabelAr: 'حساب ريديت',
  },
  bluesky: {
    key: 'bluesky',
    name: 'Bluesky',
    category: 'social_video',
    connectionType: 'app_password',
    badgeLabel: 'App Password',
    badgeLabelAr: 'كلمة مرور التطبيق',
    description: 'Decentralized AT Protocol Posts, Custom Feeds & Threading',
    descriptionAr: 'نشر عبر بروتوكول AT اللامركزي وتغذيات مخصصة',
    brandColor: '#1185FE',
    brandBg: 'rgba(17, 133, 254, 0.12)',
    needsEntitySelection: false,
    entityTypeLabel: 'Bluesky Handle',
    entityTypeLabelAr: 'معرف بلوسكاي',
  },

  // 2. Messaging (4)
  whatsapp: {
    key: 'whatsapp',
    name: 'WhatsApp Business',
    category: 'messaging',
    connectionType: 'cloud_api',
    badgeLabel: 'Cloud API / Signup',
    badgeLabelAr: 'واجهة السحابة الرسمية',
    description: 'Official WABA Templates, Broadcasts & 2-Way CRM Conversations',
    descriptionAr: 'قوالب واتساب المعتمدة، الحملات الجماعية والمحادثات المباشرة',
    brandColor: '#25D366',
    brandBg: 'rgba(37, 211, 102, 0.12)',
    needsEntitySelection: true,
    entityTypeLabel: 'WhatsApp Phone Number',
    entityTypeLabelAr: 'رقم هاتف واتساب التجاري',
  },
  telegram: {
    key: 'telegram',
    name: 'Telegram',
    category: 'messaging',
    connectionType: 'bot_token',
    badgeLabel: 'Bot Token',
    badgeLabelAr: 'رمز بوت تيليجرام',
    description: 'Channels, Discussion Groups, Rich Markdown Broadcasts & Webhooks',
    descriptionAr: 'قنوات تيليجرام، المجموعات، الرسائل المنسقة وتنبيهات الويب هوك',
    brandColor: '#24A1DE',
    brandBg: 'rgba(36, 161, 222, 0.12)',
    needsEntitySelection: false,
    entityTypeLabel: 'Telegram Bot',
    entityTypeLabelAr: 'بوت تيليجرام',
  },
  discord: {
    key: 'discord',
    name: 'Discord',
    category: 'messaging',
    connectionType: 'oauth',
    badgeLabel: 'OAuth / Webhook',
    badgeLabelAr: 'ربط السيرفر / ويب هوك',
    description: 'Server Channels, Forum Posts, Rich Embeds & Persona Avatars',
    descriptionAr: 'قنوات السيرفر، منشورات المنتديات والتضمينات التفاعلية',
    brandColor: '#5865F2',
    brandBg: 'rgba(88, 101, 242, 0.12)',
    needsEntitySelection: true,
    entityTypeLabel: 'Discord Server Channel',
    entityTypeLabelAr: 'قناة ديسكورد',
  },
  slack: {
    key: 'slack',
    name: 'Slack',
    category: 'messaging',
    connectionType: 'oauth',
    badgeLabel: 'OAuth 2.0 1-Click',
    badgeLabelAr: 'ربط مباشر OAuth 2.0',
    description: 'Workspace Channels, Team Broadcasts & Interactive Blocks',
    descriptionAr: 'قنوات مساحة العمل، تنبيهات الفريق والبطاقات التفاعلية',
    brandColor: '#ECB22E',
    brandBg: 'rgba(236, 178, 46, 0.12)',
    needsEntitySelection: true,
    entityTypeLabel: 'Slack Workspace Channel',
    entityTypeLabelAr: 'قناة سلاك',
  },

  // 3. Blogs & Local (3)
  googlebusiness: {
    key: 'googlebusiness',
    name: 'Google Business Profile',
    category: 'blogs_local',
    connectionType: 'oauth',
    badgeLabel: 'OAuth 2.0 1-Click',
    badgeLabelAr: 'ربط مباشر OAuth 2.0',
    description: 'Location Posts, Promotional Offers, Event Drops & 5-Star Review Sync',
    descriptionAr: 'منشورات الفروع، العروض الترويجية ومزامنة تقييمات العملاء',
    brandColor: '#4285F4',
    brandBg: 'rgba(66, 133, 244, 0.12)',
    needsEntitySelection: true,
    entityTypeLabel: 'Google Business Location',
    entityTypeLabelAr: 'موقع أو فرع جوجل',
  },
  shopify: {
    key: 'shopify',
    name: 'Shopify',
    category: 'blogs_local',
    connectionType: 'store_key',
    badgeLabel: 'Store Admin Token',
    badgeLabelAr: 'رمز إدارة متجر شوبيفاي',
    description: 'Catalog Sync, Product Drops, Multi-Location Inventory & Store Blogs',
    descriptionAr: 'مزامنة المنتجات، المخزون متعدد الفروع ومدونة المتجر',
    brandColor: '#96BF48',
    brandBg: 'rgba(150, 191, 72, 0.12)',
    needsEntitySelection: false,
    entityTypeLabel: 'Shopify Storefront',
    entityTypeLabelAr: 'متجر شوبيفاي',
  },
  wordpress: {
    key: 'wordpress',
    name: 'WordPress',
    category: 'blogs_local',
    connectionType: 'app_password',
    badgeLabel: 'App Password',
    badgeLabelAr: 'كلمة مرور التطبيق',
    description: 'Self-Hosted & VIP WordPress Blogs, Categories, Tags & Featured Media',
    descriptionAr: 'مقالات ووردبريس، التصنيفات، الوسوم والصور البارزة للمدونة',
    brandColor: '#21759B',
    brandBg: 'rgba(33, 117, 155, 0.12)',
    needsEntitySelection: false,
    entityTypeLabel: 'WordPress Site',
    entityTypeLabelAr: 'موقع ووردبريس',
  },
};

export interface SelectableEntity {
  id: string;
  name: string;
  username?: string;
  category?: string;
  followers?: string;
  details?: string;
}

export interface ConnectedAccountData {
  id: string;
  accountId: string;
  platform: SocialPlatform;
  username: string;
  displayName: string;
  status: string;
  tokenHealth?: {
    status: string;
    expiresAt: string;
    expiresInDays: number;
  };
  syncTime?: string;
  grantedScopes?: string[];
  selectedEntity?: {
    id: string;
    name: string;
  };
}

export interface ConnectionWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlatform?: SocialPlatform;
  initialStep?: 1 | 2 | 3 | 4;
  initialTempToken?: string;
  initialSelectionStep?: string;
  initialAccount?: ConnectedAccountData | null;
  organizationId?: string;
  onAccountConnected: (account: ConnectedAccountData) => void;
  onAccountDisconnected?: (accountId: string) => void;
  onOpenBuyNumberWizard?: () => void;
}

export function ConnectionWizardModal({
  isOpen,
  onClose,
  initialPlatform = 'instagram',
  initialStep,
  initialTempToken,
  initialSelectionStep,
  initialAccount,
  organizationId = 'org_admin_platform',
  onAccountConnected,
  onAccountDisconnected,
  onOpenBuyNumberWizard,
}: ConnectionWizardModalProps) {
  const { t, locale } = useThemeAndLocale();
  const isAr = locale === 'ar';
  const loc = (ar: string, en: string) => getLocalizedText(locale, { ar, en });

  // Step state (1 to 4)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>((initialStep as 1 | 2 | 3 | 4) || 1);
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>(
    initialAccount?.platform || initialPlatform
  );
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | 'social_video' | 'messaging' | 'blogs_local'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // WhatsApp 3-Mode Onboarding State (matching Zernio spec)
  const [whatsappMethod, setWhatsappMethod] = useState<'embedded_oauth' | 'virtual_number' | 'system_token'>('embedded_oauth');
  const [whatsappOnboardingType, setWhatsappOnboardingType] = useState<'api' | 'business_app'>('api');
  const [whatsappSignupMode, setWhatsappSignupMode] = useState<'hosted' | 'headless'>('hosted');

  // Step 2 Credential Inputs (clean, never pre-filled with fake IDs)
  const [credUsername, setCredUsername] = useState('');
  const [credIdentifier, setCredIdentifier] = useState('');
  const [credSecret, setCredSecret] = useState('');
  const [credWabaId, setCredWabaId] = useState('');
  const [credPhoneNumberId, setCredPhoneNumberId] = useState('');
  const [credPin, setCredPin] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  // OAuth & Sandbox prompt state
  const [activeTempToken, setActiveTempToken] = useState<string>(initialTempToken || '');
  const [sandboxPromptVisible, setSandboxPromptVisible] = useState<boolean>(false);

  // Loading, Errors & Handshake state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [handshakeStage, setHandshakeStage] = useState<'idle' | 'contacting' | 'exchanging' | 'granted'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 3 Entity selection state
  const [entities, setEntities] = useState<SelectableEntity[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [entitySearch, setEntitySearch] = useState('');

  // Step 4 Connected Account & Test Post State
  const [connectedAccount, setConnectedAccount] = useState<ConnectedAccountData | null>(initialAccount || null);
  const [testPayloadText, setTestPayloadText] = useState(
    loc('تم التحقق من ربط القناة بنجاح عبر منصة Asra3. جاهز للنشر الموحد! 🚀', 'Connection Verified: Asra3 omnichannel broadcast pipeline operational. 🚀')
  );
  const [testPostLoading, setTestPostLoading] = useState(false);
  const [deliveryReceipt, setDeliveryReceipt] = useState<{
    status: string;
    receiptId: string;
    deliveredAt: string;
    latencyMs: number;
    platformPostUrl: string;
    message: string;
  } | null>(null);

  // Reconnect & Disconnect State
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const platformMeta = useMemo(() => {
    return PLATFORM_CATALOG[selectedPlatform] || PLATFORM_CATALOG.instagram;
  }, [selectedPlatform]);

  // STEP 3: Fetch Selectable Entities from API
  const fetchEntities = async (platform: SocialPlatform, tokenOverride?: string, stepOverride?: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    const tokenToUse = tokenOverride ?? activeTempToken;
    try {
      const res = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'list_entities',
          organizationId,
          platform,
          ...(stepOverride ? { step: stepOverride } : {}),
          tempToken: tokenToUse || 'sim_sandbox_preview',
        }),
      });

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      if (data.items && Array.isArray(data.items)) {
        setEntities(data.items);
        if (data.items.length > 0) {
          setSelectedEntityId(data.items[0].id);
        }
      } else {
        setEntities([]);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : loc('تعذر جلب الحسابات المتاحة.', 'Failed to retrieve available entities.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Set initial platform & step when modal opens or initial props change
  useEffect(() => {
    if (isOpen) {
      if (initialAccount) {
        setConnectedAccount(initialAccount);
        setSelectedPlatform(initialAccount.platform);
        setCurrentStep((initialStep as 1 | 2 | 3 | 4) || 4);
      } else if (initialTempToken && initialPlatform) {
        setSelectedPlatform(initialPlatform);
        setActiveTempToken(initialTempToken);
        setCurrentStep(3);
        void fetchEntities(initialPlatform, initialTempToken, initialSelectionStep);
      } else {
        if (initialPlatform) {
          setSelectedPlatform(initialPlatform);
        }
        setCurrentStep((initialStep as 1 | 2 | 3 | 4) || 1);
        setConnectedAccount(null);
      }
      setErrorMessage(null);
      setDeliveryReceipt(null);
      setHandshakeStage('idle');
      setShowDisconnectConfirm(false);
      setFeedbackToast(null);
      setSandboxPromptVisible(false);
    }
  }, [isOpen, initialPlatform, initialStep, initialAccount, initialTempToken, initialSelectionStep]);

  // Filtered platforms for Step 1
  const filteredPlatforms = useMemo(() => {
    return ALL_SOCIAL_PLATFORMS.filter((plat) => {
      const meta = PLATFORM_CATALOG[plat];
      if (!meta) return false;
      const matchesCategory =
        activeCategoryFilter === 'all' || meta.category === activeCategoryFilter;
      const matchesSearch =
        meta.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plat.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meta.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategoryFilter, searchQuery]);

  // Reset inputs when switching platform (clean empty inputs — no fake sample IDs)
  const handleSelectPlatform = (platform: SocialPlatform) => {
    setSelectedPlatform(platform);
    setErrorMessage(null);
    setDeliveryReceipt(null);
    setHandshakeStage('idle');
    setSandboxPromptVisible(false);
    setCredIdentifier('');
    setCredSecret('');
    setCredUsername('');
    setCredWabaId('');
    setCredPhoneNumberId('');
  };

  // Explicit Sandbox Preview Trigger (only when user clicks "Preview in Sandbox Mode")
  const handleProceedInSandboxMode = async () => {
    setSandboxPromptVisible(false);
    setActiveTempToken('sim_sandbox_preview');
    if (platformMeta.needsEntitySelection || selectedPlatform === 'whatsapp') {
      await fetchEntities(selectedPlatform, 'sim_sandbox_preview');
      setCurrentStep(3);
    } else {
      const autoAccount: ConnectedAccountData = {
        id: `acc_${selectedPlatform}_${Date.now().toString(36)}`,
        accountId: `acc_${selectedPlatform}_${Date.now().toString(36)}`,
        platform: selectedPlatform,
        username: `@sandbox_${selectedPlatform}`,
        displayName: `${platformMeta.name} (Sandbox Preview)`,
        status: 'healthy',
        tokenHealth: {
          status: 'healthy',
          expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          expiresInDays: 60,
        },
        syncTime: loc('الآن', 'Just now'),
        grantedScopes: ['posting', 'analytics', 'comments'],
      };
      setConnectedAccount(autoAccount);
      setCurrentStep(4);
    }
  };

  // STEP 2: Initiate OAuth or Submit Credentials
  const handleAuthorizeOrSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSandboxPromptVisible(false);

    try {
      const isWhatsAppOAuth =
        selectedPlatform === 'whatsapp' && whatsappMethod === 'embedded_oauth';
      const isWhatsAppVirtualNumber =
        selectedPlatform === 'whatsapp' && whatsappMethod === 'virtual_number';

      if (isWhatsAppVirtualNumber) {
        setIsSubmitting(false);
        onClose();
        onOpenBuyNumberWizard?.();
        return;
      }

      if (platformMeta.connectionType === 'oauth' || isWhatsAppOAuth) {
        setHandshakeStage('contacting');

        const callbackUrl =
          typeof window !== 'undefined'
            ? `${window.location.origin}/dashboard?oauth_callback=1&platform=${selectedPlatform}`
            : undefined;

        const res = await fetch('/api/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'start_oauth',
            organizationId,
            platform: selectedPlatform,
            redirectUrl: callbackUrl,
            requestedScopes: ['posting', 'analytics', 'comments', 'messaging'],
            headless: selectedPlatform === 'whatsapp' ? whatsappSignupMode === 'headless' : true,
            ...(selectedPlatform === 'whatsapp'
              ? {
                  whatsappOnboarding: whatsappOnboardingType,
                  whatsappSignupMode,
                }
              : {}),
          }),
        });

        const data = await res.json();
        if (data.error) {
          throw new Error(data.error);
        }

        // Real Zernio API Key is configured -> Redirect browser to real Meta / Facebook / Google / WhatsApp OAuth URL!
        if (!data.simulated && data.authUrl) {
          setHandshakeStage('exchanging');
          window.location.href = data.authUrl;
          return;
        }

        // If Zernio API Key is NOT configured yet, do NOT silently generate dummy data!
        // Show the explicit API Key Required / Sandbox prompt so the user knows why and can set their key in /admin.
        setHandshakeStage('idle');
        setSandboxPromptVisible(true);
        return;
      } else {
        // Direct credential onboarding (WhatsApp System User Token, Telegram Bot Token, Shopify, WordPress, Bluesky)
        if (selectedPlatform === 'whatsapp') {
          if (!credWabaId.trim() || !credPhoneNumberId.trim() || !credSecret.trim()) {
            throw new Error(
              loc(
                'يرجى إدخال معرف WABA ومعرف رقم الهاتف ورمز وصول مستخدم النظام (System User Token).',
                'Please enter your WABA ID, Phone Number ID, and System User Access Token.'
              )
            );
          }
        } else if (selectedPlatform === 'telegram') {
          if (!credSecret.trim()) {
            throw new Error(
              loc('يرجى إدخال رمز بوت تيليجرام (Bot Token).', 'Please enter your Telegram Bot Token.')
            );
          }
        } else if (!credIdentifier.trim() || !credSecret.trim()) {
          throw new Error(
            loc('يرجى ملء جميع حقول بيانات الاعتماد المطلوبة.', 'Please fill in all required credential fields.')
          );
        }

        const credsPayload: Record<string, string> = {
          identifier: credIdentifier.trim(),
          secretOrToken: credSecret.trim(),
          username: credUsername.trim(),
          wabaId: credWabaId.trim(),
          phoneNumberId: credPhoneNumberId.trim(),
        };

        if (selectedPlatform === 'whatsapp') {
          credsPayload.wabaId = credWabaId.trim();
          credsPayload.phoneNumberId = credPhoneNumberId.trim();
          credsPayload.systemUserToken = credSecret.trim();
          credsPayload.accessToken = credSecret.trim();
          credsPayload.phoneNumber = credIdentifier.trim();
          credsPayload.displayName = credUsername.trim() || `WhatsApp (${credPhoneNumberId.trim()})`;
          if (credPin.trim()) {
            credsPayload.pin = credPin.trim();
          }
        } else if (selectedPlatform === 'telegram') {
          credsPayload.botToken = credSecret.trim();
          credsPayload.username = credIdentifier.trim();
        } else if (selectedPlatform === 'shopify') {
          credsPayload.shopDomain = credIdentifier.trim();
          credsPayload.adminToken = credSecret.trim();
          credsPayload.accessToken = credSecret.trim();
        } else if (selectedPlatform === 'wordpress') {
          credsPayload.siteUrl = credIdentifier.trim();
          credsPayload.username = credUsername.trim();
          credsPayload.applicationPassword = credSecret.trim();
        } else if (selectedPlatform === 'bluesky') {
          credsPayload.handle = credIdentifier.trim();
          credsPayload.identifier = credIdentifier.trim();
          credsPayload.appPassword = credSecret.trim();
          credsPayload.password = credSecret.trim();
        }

        const res = await fetch('/api/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'connect_credentials',
            organizationId,
            platform: selectedPlatform,
            credentials: credsPayload,
          }),
        });

        const data = await res.json();
        if (data.error) {
          throw new Error(data.error);
        }

        const accountData: ConnectedAccountData = {
          id: data.account?.accountId || `acc_${selectedPlatform}_${Date.now().toString(36)}`,
          accountId: data.account?.accountId || `acc_${selectedPlatform}_${Date.now().toString(36)}`,
          platform: selectedPlatform,
          username: data.account?.username || credIdentifier.trim() || `@${selectedPlatform}`,
          displayName: data.account?.displayName || `${platformMeta.name} Account`,
          status: 'healthy',
          tokenHealth: {
            status: 'healthy',
            expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
            expiresInDays: 60,
          },
          syncTime: loc('الآن', 'Just now'),
          grantedScopes:
            selectedPlatform === 'whatsapp'
              ? ['whatsapp_business_messaging', 'whatsapp_business_management', 'webhooks']
              : ['posting', 'analytics'],
        };

        setConnectedAccount(accountData);
        setCurrentStep(4);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Connection failed. Please verify credentials.');
      setHandshakeStage('idle');
    } finally {
      setIsSubmitting(false);
    }
  };

  // STEP 3: Complete Entity Selection
  const handleConfirmEntity = async () => {
    if (!selectedEntityId) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const chosen = entities.find((e) => e.id === selectedEntityId);

    try {
      const res = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'select_entity',
          organizationId,
          platform: selectedPlatform,
          entityId: selectedEntityId,
          entityName: chosen?.name,
          entityUsername: chosen?.username,
          tempToken: activeTempToken || 'sim_sandbox_preview',
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const accountData: ConnectedAccountData = {
        id: data.account?.accountId || `acc_${selectedPlatform}_${Date.now().toString(36)}`,
        accountId: data.account?.accountId || `acc_${selectedPlatform}_${Date.now().toString(36)}`,
        platform: selectedPlatform,
        username: data.account?.username || chosen?.username || `@${selectedPlatform}`,
        displayName: data.account?.displayName || chosen?.name || `${platformMeta.name}`,
        status: 'healthy',
        tokenHealth: {
          status: 'healthy',
          expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          expiresInDays: 60,
        },
        syncTime: loc('الآن', 'Just now'),
        grantedScopes: ['posting', 'analytics', 'comments', 'messaging'],
        selectedEntity: {
          id: selectedEntityId,
          name: chosen?.name || 'Selected Entity',
        },
      };

      setConnectedAccount(accountData);
      setCurrentStep(4);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Entity selection failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // STEP 4: Send Test Post / Test Message
  const handleSendTestPost = async () => {
    if (!connectedAccount || !testPayloadText.trim()) return;
    setTestPostLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_post',
          organizationId,
          platform: selectedPlatform,
          accountId: connectedAccount.accountId,
          handle: connectedAccount.username,
          content: testPayloadText,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setDeliveryReceipt(data.deliveryReceipt);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Test post failed');
    } finally {
      setTestPostLoading(false);
    }
  };

  // STEP 4: Reconnect Channel (resets wizard to Step 2 for this platform)
  const handleReconnect = () => {
    setDeliveryReceipt(null);
    setErrorMessage(null);
    setHandshakeStage('idle');
    setShowDisconnectConfirm(false);
    setCurrentStep(2);
  };

  // STEP 4: Disconnect Channel (calls /api/connect, triggers onAccountDisconnected, and closes modal)
  const handleDisconnect = async () => {
    if (!connectedAccount) return;
    setIsDisconnecting(true);
    setErrorMessage(null);

    try {
      const targetId = connectedAccount.accountId || connectedAccount.id;
      const res = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'disconnect',
          organizationId,
          platform: connectedAccount.platform,
          accountId: targetId,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (onAccountDisconnected) {
        onAccountDisconnected(targetId);
      }

      setFeedbackToast(
        loc(`تم فصل حساب ${connectedAccount.displayName} بنجاح.`, `Account ${connectedAccount.displayName} disconnected successfully.`)
      );

      setTimeout(() => {
        onClose();
        setShowDisconnectConfirm(false);
        setFeedbackToast(null);
      }, 700);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Disconnection failed');
    } finally {
      setIsDisconnecting(false);
    }
  };

  // STEP 4: Finish & Notify Parent Dashboard
  const handleFinishAndSave = () => {
    if (connectedAccount) {
      onAccountConnected(connectedAccount);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-3xl max-h-[92vh] overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-2xl">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4 bg-[var(--bg-subtle)]">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl border"
              style={{
                backgroundColor: platformMeta.brandBg,
                borderColor: platformMeta.brandColor,
              }}
            >
              <Share2 className="h-5 w-5" style={{ color: platformMeta.brandColor }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                  {loc('معالج ربط القنوات والمنصات', 'Social & Messaging Connection Wizard')}
                </h3>
                <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--accent-primary)]">
                  {loc('الوضع الذكي الهجين', 'Smart Hybrid')}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {loc('اربط حساباتك عبر 18 منصة رقمية مع تدقيق فوري لصلاحية الرموز وتجربة النشر الحي', 'Connect all 18 channels with instant OAuth handshake & live delivery verification')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 4-Step Visual Stepper Bar */}
        <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-page)] px-6 py-3">
          <div className="grid grid-cols-4 gap-2">
            {[
              {
                num: 1,
                label: loc('١. اختيار المنصة', '1. Select Platform'),
                desc: loc('١٨ منصة مدعومة', '18 Channels'),
              },
              {
                num: 2,
                label: loc('٢. المصادقة والربط', '2. Authenticate'),
                desc: loc('OAuth أو المفاتيح', 'OAuth / Key'),
              },
              {
                num: 3,
                label: loc('٣. تحديد الحساب / الفرع', '3. Select Entity'),
                desc: loc('صفحات وقنوات', 'Page / Channel'),
              },
              {
                num: 4,
                label: loc('٤. التحقق والتجربة', '4. Verified & Ready'),
                desc: loc('صحة الرمز ونشر تجريبي', 'Health & Test'),
              },
            ].map((step) => {
              const isActive = currentStep === step.num;
              const isPast = currentStep > step.num;
              return (
                <div
                  key={step.num}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 transition ${
                    isActive
                      ? 'bg-[var(--bg-card)] border border-[var(--accent-primary)] shadow-sm'
                      : isPast
                      ? 'bg-emerald-500/10 border border-emerald-500/20'
                      : 'opacity-50'
                  }`}
                >
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isActive
                        ? 'bg-[var(--accent-primary)] text-white'
                        : isPast
                        ? 'bg-emerald-500 text-white'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                    }`}
                  >
                    {isPast ? <Check className="h-3.5 w-3.5" /> : step.num}
                  </div>
                  <div className="hidden sm:block overflow-hidden">
                    <div className="truncate text-xs font-bold text-[var(--text-primary)]">
                      {step.label}
                    </div>
                    <div className="truncate text-[10px] text-[var(--text-muted)]">
                      {step.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error Banner */}
          {errorMessage && (
            <div className="flex items-center justify-between rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-semibold text-rose-600">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-xs font-bold opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          )}

          {/* =========================================================================
              STEP 1: SELECT PLATFORM & METHOD
              ========================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-5">
              {/* Category Filters & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
                  {[
                    { key: 'all', label: loc('الكل (١٨)', 'All (18)') },
                    { key: 'social_video', label: loc('التواصل والفيديو (١١)', 'Social & Video (11)') },
                    { key: 'messaging', label: loc('المراسلة المباشرة (٤)', 'Messaging (4)') },
                    { key: 'blogs_local', label: loc('المتاجر والمدونات (٣)', 'Blogs & Local (3)') },
                  ].map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setActiveCategoryFilter(cat.key as any)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                        activeCategoryFilter === cat.key
                          ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="relative min-w-[200px]">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={loc('بحث عن منصة...', 'Filter platform...')}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] py-1.5 ps-9 pe-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
              </div>

              {/* 18-Platform Visual Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredPlatforms.map((plat) => {
                  const meta = PLATFORM_CATALOG[plat];
                  const isSelected = selectedPlatform === plat;
                  return (
                    <button
                      key={plat}
                      type="button"
                      onClick={() => handleSelectPlatform(plat)}
                      className={`flex flex-col text-start rounded-2xl border p-4 transition relative overflow-hidden ${
                        isSelected
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] shadow-md ring-2 ring-[var(--accent-primary)]/20'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--bg-card)]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-xl font-bold text-white shadow-sm"
                          style={{ backgroundColor: meta.brandColor }}
                        >
                          {meta.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            meta.connectionType === 'oauth'
                              ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                              : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          }`}
                        >
                          {isAr ? meta.badgeLabelAr : meta.badgeLabel}
                        </span>
                      </div>

                      <div className="mt-3">
                        <div className="text-sm font-extrabold text-[var(--text-primary)] flex items-center justify-between">
                          <span>{meta.name}</span>
                          {isSelected && (
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white">
                              <Check className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)] line-clamp-2">
                          {isAr ? meta.descriptionAr : meta.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* =========================================================================
              STEP 2: AUTHENTICATE & AUTHORIZE
              ========================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Selected Platform Summary Bar */}
              <div className="flex items-center justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl font-bold text-white"
                    style={{ backgroundColor: platformMeta.brandColor }}
                  >
                    {platformMeta.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-[var(--text-primary)]">
                      {platformMeta.name}
                    </h4>
                    <p className="text-xs text-[var(--text-muted)]">
                      {isAr ? platformMeta.badgeLabelAr : platformMeta.badgeLabel}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setCurrentStep(1)}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
                >
                  {loc('تغيير المنصة', 'Change Platform')}
                </button>
              </div>

              {/* Explicit Live Zernio API Key Required / Sandbox Prompt */}
              {sandboxPromptVisible && (
                <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 p-5 space-y-3 animate-in fade-in">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-extrabold text-[var(--text-primary)]">
                        {loc(
                          'مفتاح محرك Zernio الحي (ZERNIO_API_KEY) غير مضبوط بعد',
                          'Live Zernio Master API Key (ZERNIO_API_KEY) Not Configured Yet'
                        )}
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {loc(
                          'لإجراء ربط حقيقي مباشر مع فيسبوك وواتساب وإنستغرام عبر بوابة OAuth الرسمية، يرجى لصق مفتاح Zernio API الخاص بك (يبدأ بـ sk_...) في لوحة تحكم المشرف العام (/admin). أو يمكنك المتابعة في وضع المعاينة التجريبية أدناه.',
                          'To redirect to the real Meta / Facebook / WhatsApp OAuth login via Zernio, paste your live Zernio API Key (sk_...) in the Super Admin Console (/admin). Alternatively, you can preview the flow in Sandbox Mode below.'
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <a
                      href="/admin"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition shadow-sm"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>
                        {loc('فتح لوحة الأدمن (/admin) لإدخال مفتاح Zernio', 'Configure Live Zernio Key in /admin')}
                      </span>
                    </a>
                    <button
                      type="button"
                      onClick={() => void handleProceedInSandboxMode()}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-2 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
                    >
                      <span>
                        {loc('معاينة ببيانات تجريبية (Sandbox Mode)', 'Preview with Sandbox Sample Data')}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* A. OAuth 2.0 Consent Handshake Screen */}
              {platformMeta.connectionType === 'oauth' && (
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-5 shadow-sm">
                  <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-xl w-fit">
                    <ShieldCheck className="h-4 w-4" />
                    <span>{loc('مصادقة رسمية مشفرة ببروتوكول OAuth 2.0', 'Official Encrypted OAuth 2.0 Handshake')}</span>
                  </div>

                  <div className="text-center max-w-md mx-auto py-2">
                    <div
                      className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg text-lg font-black"
                      style={{ backgroundColor: platformMeta.brandColor }}
                    >
                      {platformMeta.name.substring(0, 2).toUpperCase()}
                    </div>
                    <h3 className="mt-3 text-base font-extrabold text-[var(--text-primary)]">
                      {loc(`طلب منح الإذن لتطبيق Asra3 للوصول إلى ${platformMeta.name}`, `Authorize Asra3 Platform to access ${platformMeta.name}`)}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {loc('سيتم الربط المباشر مع حسابك الإداري دون الحاجة لمشاركة كلمات المرور الخاصة بك.', 'Secure token exchange. Asra3 never sees or stores your personal account password.')}
                    </p>
                  </div>

                  {/* Scopes List */}
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      {loc('الصلاحيات المطلوبة للنظام:', 'Requested Scopes & Permissions:')}
                    </div>
                    <div className="space-y-2 text-xs">
                      {[
                        {
                          title: loc('النشر والجدولة التلقائية', 'Publish and schedule content'),
                          desc: loc('نشر المنشورات، الريلز، التحديثات وقصص الفيديو', 'Create posts, reels, stories and updates on your behalf'),
                        },
                        {
                          title: loc('استخراج التحليلات والوصول', 'Read audience insights & analytics'),
                          desc: loc('تحليل معدل التفاعل، المشاهدات ونمو المتابعين', 'Track engagement metrics, reach, CTR, and follower growth'),
                        },
                        {
                          title: loc('إدارة التعليقات والرسائل', 'Manage comments & direct messages'),
                          desc: loc('قراءة والرد الفوري على تعليقات واستفسارات العملاء', 'Read and reply to community comments and customer DMs'),
                        },
                        {
                          title: loc('إشعارات الويب هوك اللحظية', 'Real-time webhook telemetry'),
                          desc: loc('استلام تأكيدات التسليم الفوري وحالة النشر', 'Receive instant delivery receipts and sync updates'),
                        },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2.5">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                          <div>
                            <span className="font-bold text-[var(--text-primary)]">{item.title}: </span>
                            <span className="text-[var(--text-secondary)]">{item.desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Live Handshake Feedback */}
                  {handshakeStage !== 'idle' && (
                    <div className="flex items-center justify-center gap-3 p-3 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent-primary)]/20 text-xs font-bold text-[var(--accent-primary)]">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>
                        {handshakeStage === 'contacting' && (loc('جاري الاتصال بمزود OAuth...', 'Contacting OAuth Provider...'))}
                        {handshakeStage === 'exchanging' && (loc('جاري التوجيه لبوابة المصادقة الرسمية...', 'Redirecting to official OAuth authorization...'))}
                        {handshakeStage === 'granted' && (loc('تم استلام وتأكيد التفويض بنجاح ✓', 'Access Token Granted Successfully ✓'))}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* B. Direct Token / Key Credential Form & WhatsApp 3-Mode Zernio Flow */}
              {platformMeta.connectionType !== 'oauth' && (
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-5 shadow-sm">
                  {/* WhatsApp 3-Mode Official Zernio Onboarding */}
                  {(selectedPlatform === 'whatsapp' || platformMeta.connectionType === 'cloud_api') && (
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <div className="text-xs font-extrabold text-[var(--text-primary)]">
                          {loc('اختر طريقة ربط واتساب للأعمال (مطابق لتدفق Zernio الرسمي):', 'Choose WhatsApp Business Onboarding Method (Official Zernio Flow):')}
                        </div>
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                          {[
                            {
                              id: 'embedded_oauth',
                              title: loc('١. التسجيل المدمج من Meta (OAuth)', '1. Meta Embedded Signup (OAuth)'),
                              desc: loc('ربط فوري عبر نافذة فيسبوك الرسمية (يدعم Cloud API أو التعايش مع تطبيق الهاتف)', 'Official Meta popup/redirect (Cloud API or Business App Coexistence)'),
                              badge: loc('موصى به', 'Recommended'),
                            },
                            {
                              id: 'virtual_number',
                              title: loc('٢. شراء رقم افتراضي فوري', '2. Provision Virtual Number'),
                              desc: loc('احصل على رقم دولي مخصص مع تفعيل واتساب تلقائياً بدون إعداد Meta', 'Buy a dedicated number & auto-register WhatsApp in 60s'),
                              badge: loc('بدون رقم مسبق', 'Turnkey'),
                            },
                            {
                              id: 'system_token',
                              title: loc('٣. مفاتيح System User المباشرة', '3. Direct System User Token'),
                              desc: loc('إدخال WABA ID و Phone Number ID ورمز الوصول الدائم يدوياً', 'Enter WABA ID, Phone Number ID & permanent System User Token'),
                              badge: loc('للمطورين', 'Advanced'),
                            },
                          ].map((m) => {
                            const active = whatsappMethod === m.id;
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  setWhatsappMethod(m.id as any);
                                  setSandboxPromptVisible(false);
                                  setErrorMessage(null);
                                }}
                                className={`flex flex-col justify-between rounded-2xl border p-3.5 text-start transition cursor-pointer ${
                                  active
                                    ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20'
                                    : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:border-emerald-500/40'
                                }`}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-xs font-extrabold text-[var(--text-primary)]">{m.title}</span>
                                  </div>
                                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{m.desc}</p>
                                </div>
                                <span className="mt-2 inline-block w-fit rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                                  {m.badge}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Mode 1: Meta Embedded Signup (OAuth) */}
                      {whatsappMethod === 'embedded_oauth' && (
                        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5 space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                              <ShieldCheck className="h-4 w-4" />
                              <span>
                                {loc('بوابة Meta Embedded Signup الرسمية عبر Zernio (/v1/connect/whatsapp)', 'Official Zernio Meta Embedded Signup (/v1/connect/whatsapp)')}
                              </span>
                            </div>

                            {/* Hosted Guided Signup vs Headless Picker Toggle */}
                            <div className="inline-flex items-center rounded-xl border border-emerald-500/30 bg-[var(--bg-card)] p-1 text-[11px] font-bold">
                              <button
                                type="button"
                                onClick={() => setWhatsappSignupMode('hosted')}
                                className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
                                  whatsappSignupMode === 'hosted'
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                {loc('صفحة Zernio الإرشادية (signup=hosted)', 'Zernio Guided Page (signup=hosted)')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setWhatsappSignupMode('headless')}
                                className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
                                  whatsappSignupMode === 'headless'
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                {loc('ربط مباشر (headless=true)', 'Direct Headless (headless=true)')}
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <button
                              type="button"
                              onClick={() => setWhatsappOnboardingType('api')}
                              className={`rounded-xl border p-3.5 text-start transition cursor-pointer ${
                                whatsappOnboardingType === 'api'
                                  ? 'border-emerald-600 bg-[var(--bg-card)] shadow-xs'
                                  : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)]/60 opacity-75'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-[var(--text-primary)]">
                                  {loc('WhatsApp Cloud API القياسي', 'Standard WhatsApp Cloud API')}
                                </span>
                                <span className="font-mono text-[10px] text-emerald-600 font-bold">onboarding=api</span>
                              </div>
                              <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                                {loc('ربط حساب أعمال واتساب جديد أو حالي مخصص للأتمتة والرسائل السحابية والمجموعات والمكالمات.', 'Connect a new or existing WABA dedicated to Cloud API messaging, broadcasts, groups & calling.')}
                              </p>
                            </button>

                            <button
                              type="button"
                              onClick={() => setWhatsappOnboardingType('business_app')}
                              className={`rounded-xl border p-3.5 text-start transition cursor-pointer ${
                                whatsappOnboardingType === 'business_app'
                                  ? 'border-emerald-600 bg-[var(--bg-card)] shadow-xs'
                                  : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)]/60 opacity-75'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-[var(--text-primary)]">
                                  {loc('التعايش مع تطبيق WhatsApp Business (QR)', 'Business App Coexistence (QR)')}
                                </span>
                                <span className="font-mono text-[10px] text-emerald-600 font-bold">onboarding=business_app</span>
                              </div>
                              <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                                {loc('احتفظ بالرقم داخل تطبيق WhatsApp Business على هاتفك عبر مسح رمز QR مع مزامنة المحادثات لمدة 6 أشهر.', 'Keep your number on the WhatsApp Business phone app via QR scan while syncing 6 months of chats to the API.')}
                              </p>
                            </button>
                          </div>

                          {/* Zernio Step-by-Step Follow-Along Checklist */}
                          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3.5 space-y-2">
                            <div className="text-[11px] font-extrabold text-[var(--text-primary)] flex items-center justify-between">
                              <span>
                                {loc('قائمة خطوات الربط المتتابعة (Zernio Follow-Along Checklist):', 'Zernio Step-by-Step Follow-Along Checklist:')}
                              </span>
                              <span className="font-mono text-[10px] text-emerald-600">
                                {whatsappSignupMode === 'hosted' ? 'brandName=Asra3 · #0D9488' : 'headless=true'}
                              </span>
                            </div>
                            <ol className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 text-[11px] text-[var(--text-secondary)]">
                              <li className="flex items-start gap-2">
                                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-600">1</span>
                                <span>{loc('تسجيل الدخول إلى حساب Meta Business الخاص بك', 'Log in to your Meta Business portfolio in the popup')}</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-600">2</span>
                                <span>{loc('إنشاء أو اختيار حساب WhatsApp Business (WABA)', 'Select or create your WhatsApp Business Account (WABA)')}</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-600">3</span>
                                <span>
                                  {whatsappOnboardingType === 'business_app'
                                    ? loc('اختر "ربط تطبيق WhatsApp Business الحالي" وامسح رمز الـ QR من هاتفك', 'Pick "Connect existing WhatsApp Business app" & scan the QR code from your phone')
                                    : loc('اختر رقم Zernio الموثق مسبقاً أو أدخل رقمك واستلم رمز التحقق', 'Select your pre-verified Zernio number or verify your own carrier number')}
                                </span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-600">4</span>
                                <span>{loc('يتم ربط الـ Webhook وتفعيل الـ accountId تلقائياً والعودة للوحة التحكم', 'Zernio binds webhooks & exchanges permanent tokens automatically')}</span>
                              </li>
                            </ol>
                          </div>
                        </div>
                      )}

                      {/* Mode 2: Provision Virtual Number */}
                      {whatsappMethod === 'virtual_number' && (
                        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5 space-y-3">
                          <h4 className="text-xs font-extrabold text-[var(--text-primary)]">
                            {loc('شراء رقم افتراضي وتفعيل واتساب السحابي تلقائياً', 'Provision Virtual Number & Auto-Verify WhatsApp')}
                          </h4>
                          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                            {loc(
                              'سيتم فتح معالج شراء الأرقام لاختيار رقم (أمريكي، بريطاني، أو دولي) وتوليد ملف تعريف واتساب معتمد خلال 60 ثانية دون الحاجة لبطاقة SIM (يظهر جاهزاً وموثقاً تلقائياً داخل قائمة Meta).',
                              'Opens the 60-Second Number Marketplace Wizard (POST /v1/phone-numbers/purchase with connectWhatsapp=true) so the number appears pre-verified in Meta with zero OTP codes needed.'
                            )}
                          </p>
                        </div>
                      )}

                      {/* Mode 3: Direct System User Credentials */}
                      {whatsappMethod === 'system_token' && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                              <label className="block text-xs font-bold text-[var(--text-primary)]">
                                {loc('معرف حساب واتساب للأعمال (WABA ID) *', 'WhatsApp Business Account (WABA) ID *')}
                              </label>
                              <input
                                type="text"
                                value={credWabaId}
                                onChange={(e) => setCredWabaId(e.target.value)}
                                placeholder="e.g. 317766992490131"
                                className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-[var(--text-primary)]">
                                {loc('معرف رقم الهاتف (Phone Number ID) *', 'Phone Number ID *')}
                              </label>
                              <input
                                type="text"
                                value={credPhoneNumberId}
                                onChange={(e) => setCredPhoneNumberId(e.target.value)}
                                placeholder="e.g. 1875844705851813"
                                className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div>
                              <label className="block text-xs font-bold text-[var(--text-primary)]">
                                {loc('رقم الهاتف المعروض (اختياري)', 'Display Phone Number (Optional)')}
                              </label>
                              <input
                                type="tel"
                                value={credIdentifier}
                                onChange={(e) => setCredIdentifier(e.target.value)}
                                placeholder="e.g. +966501234567"
                                className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-[var(--text-primary)]">
                                {loc('اسم النشاط التجاري (اختياري)', 'Business Display Name (Optional)')}
                              </label>
                              <input
                                type="text"
                                value={credUsername}
                                onChange={(e) => setCredUsername(e.target.value)}
                                placeholder="e.g. My Official Store"
                                className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-[var(--text-primary)]">
                                {loc('رمز التحقق بخطوتين (2FA PIN - اختياري)', '2-Step Verification PIN (Optional)')}
                              </label>
                              <input
                                type="text"
                                maxLength={6}
                                value={credPin}
                                onChange={(e) => setCredPin(e.target.value)}
                                placeholder="e.g. 481902"
                                className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-[var(--text-primary)]">
                              {loc('رمز وصول مستخدم النظام الدائم (System User Access Token) *', 'System User Access Token *')}
                            </label>
                            <div className="relative mt-1.5">
                              <input
                                type={showSecret ? 'text' : 'password'}
                                value={credSecret}
                                onChange={(e) => setCredSecret(e.target.value)}
                                placeholder="EAABsbCS...your-system-user-token"
                                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2.5 pe-10 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                              />
                              <button
                                type="button"
                                onClick={() => setShowSecret(!showSecret)}
                                className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                              >
                                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Telegram Specific Form */}
                  {selectedPlatform === 'telegram' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-[var(--text-primary)]">
                          {loc('رمز بوت تيليجرام (Telegram Bot Token)', 'Telegram Bot API Token')}
                        </label>
                        <div className="relative mt-1.5">
                          <input
                            type={showSecret ? 'text' : 'password'}
                            value={credSecret}
                            onChange={(e) => setCredSecret(e.target.value)}
                            placeholder="719283741:AAH8f_9aBcDeFgHiJkLmNoPqRsTuVwXyZ12"
                            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2.5 pe-10 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSecret(!showSecret)}
                            className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          >
                            {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 text-xs space-y-1.5 text-[var(--text-secondary)]">
                        <div className="font-bold text-[var(--text-primary)]">
                          {loc('كيف تستخرج رمز البوت من تيليجرام؟', 'How to obtain your Bot Token?')}
                        </div>
                        <p>
                          {loc('١. افتح تطبيق تيليجرام وابحث عن @BotFather الرسمي.', '1. Open Telegram and search for the official @BotFather.')}
                        </p>
                        <p>
                          {loc('٢. أرسل الأمر /newbot وحدد اسماً للبوت ومعرفاً ينتهي بـ bot.', '2. Send /newbot, give your bot a name and a username ending in bot.')}
                        </p>
                        <p>
                          {loc('٣. انسخ رمز HTTP API والصقه في الحقل أعلاه.', '3. Copy the HTTP API token provided by BotFather and paste it above.')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Shopify Specific Form */}
                  {selectedPlatform === 'shopify' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-[var(--text-primary)]">
                          {loc('نطاق متجر شوبيفاي (Shopify Domain)', 'Shopify Store Domain')}
                        </label>
                        <input
                          type="text"
                          value={credIdentifier}
                          onChange={(e) => setCredIdentifier(e.target.value)}
                          placeholder="your-brand.myshopify.com"
                          className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[var(--text-primary)]">
                          {loc('رمز وصول إدارة المتجر (Admin API Access Token)', 'Shopify Admin API Access Token')}
                        </label>
                        <div className="relative mt-1.5">
                          <input
                            type={showSecret ? 'text' : 'password'}
                            value={credSecret}
                            onChange={(e) => setCredSecret(e.target.value)}
                            placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxx"
                            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2.5 pe-10 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSecret(!showSecret)}
                            className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          >
                            {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* WordPress Specific Form */}
                  {selectedPlatform === 'wordpress' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-[var(--text-primary)]">
                          {loc('رابط موقع ووردبريس (Site URL)', 'WordPress Site URL')}
                        </label>
                        <input
                          type="url"
                          value={credIdentifier}
                          onChange={(e) => setCredIdentifier(e.target.value)}
                          placeholder="https://myblog.com"
                          className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[var(--text-primary)]">
                          {loc('اسم المستخدم أو البريد الإلكتروني', 'Username or Admin Email')}
                        </label>
                        <input
                          type="text"
                          value={credUsername}
                          onChange={(e) => setCredUsername(e.target.value)}
                          placeholder="editor_admin"
                          className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[var(--text-primary)]">
                          {loc('كلمة مرور التطبيق (Application Password)', 'WordPress Application Password')}
                        </label>
                        <div className="relative mt-1.5">
                          <input
                            type={showSecret ? 'text' : 'password'}
                            value={credSecret}
                            onChange={(e) => setCredSecret(e.target.value)}
                            placeholder="xxxx xxxx xxxx xxxx"
                            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2.5 pe-10 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSecret(!showSecret)}
                            className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          >
                            {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bluesky Specific Form */}
                  {selectedPlatform === 'bluesky' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-[var(--text-primary)]">
                          {loc('معرف بلوسكاي (Handle)', 'Bluesky Handle')}
                        </label>
                        <input
                          type="text"
                          value={credIdentifier}
                          onChange={(e) => setCredIdentifier(e.target.value)}
                          placeholder="brand.bsky.social"
                          className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[var(--text-primary)]">
                          {loc('كلمة مرور التطبيق (App Password)', 'App Password')}
                        </label>
                        <div className="relative mt-1.5">
                          <input
                            type={showSecret ? 'text' : 'password'}
                            value={credSecret}
                            onChange={(e) => setCredSecret(e.target.value)}
                            placeholder="xxxx-xxxx-xxxx-xxxx"
                            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2.5 pe-10 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSecret(!showSecret)}
                            className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          >
                            {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              STEP 3: SELECT TARGET PAGE / ORG / CHANNEL
              ========================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                    {loc(`اختر ${platformMeta.entityTypeLabelAr} المستهدف للربط`, `Select ${platformMeta.entityTypeLabel} to bind`)}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {loc('تم التحقق من الرمز بنجاح. حدد الحساب الذي ترغب في ربطه بملفك للنشر والمزامنة.', 'OAuth token verified. Select the exact entity you want to bind to your profile.')}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 border border-emerald-500/20">
                  {loc('تم التفويض بنجاح ✓', 'Authorized ✓')}
                </span>
              </div>

              {/* Search Entities */}
              {entities.length > 2 && (
                <div className="relative">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={entitySearch}
                    onChange={(e) => setEntitySearch(e.target.value)}
                    placeholder={loc('بحث في الحسابات والصفحات...', 'Search available entities...')}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] py-2 ps-9 pe-3 text-xs text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
              )}

              {/* Entity Radio Card List */}
              <div className="space-y-2.5">
                {entities
                  .filter((item) =>
                    item.name.toLowerCase().includes(entitySearch.toLowerCase()) ||
                    (item.username && item.username.toLowerCase().includes(entitySearch.toLowerCase()))
                  )
                  .map((entity) => {
                    const isSelected = selectedEntityId === entity.id;
                    return (
                      <div
                        key={entity.id}
                        onClick={() => setSelectedEntityId(entity.id)}
                        className={`flex items-center justify-between rounded-2xl border p-4 cursor-pointer transition ${
                          isSelected
                            ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] shadow-md ring-2 ring-[var(--accent-primary)]/20'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--bg-card)]'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded-full border transition ${
                              isSelected
                                ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white'
                                : 'border-[var(--border-subtle)] bg-[var(--bg-card)]'
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>

                          <div>
                            <div className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                              <span>{entity.name}</span>
                              {entity.followers && (
                                <span className="rounded-md bg-[var(--bg-card)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                                  {entity.followers}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-[var(--text-muted)] mt-0.5">
                              {entity.username && <span className="font-mono">{entity.username} · </span>}
                              <span>{entity.category || entity.details}</span>
                            </div>
                          </div>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                            isSelected
                              ? 'bg-[var(--accent-primary)] text-white'
                              : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'
                          }`}
                        >
                          {isSelected ? (loc('محدد', 'Selected')) : (loc('اختيار', 'Select'))}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* =========================================================================
              STEP 4: CONNECTION VERIFIED & READY
              ========================================================================= */}
          {currentStep === 4 && connectedAccount && (
            <div className="space-y-6">
              {/* Success Hero Badge */}
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/25">
                  <Check className="h-6 w-6 stroke-[3]" />
                </div>
                <h3 className="mt-3 text-base font-extrabold text-[var(--text-primary)]">
                  {loc('تم ربط القناة وتأكيد الاتصال بنجاح!', 'Channel Connected & Ready!')}
                </h3>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {loc('الحساب الآن متصل بخدمات النشر، الجدولة، التحليلات، والمراسلة الموحدة.', 'Account is now active and ready for scheduled omnichannel publishing and unified messaging.')}
                </p>
              </div>

              {/* Connected Account Verified Card */}
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl font-bold text-white shadow-md text-base"
                      style={{ backgroundColor: platformMeta.brandColor }}
                    >
                      {platformMeta.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-[var(--text-primary)]">
                          {connectedAccount.displayName}
                        </span>
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-500/20">
                          {loc('سليم ✓', 'healthy ✓')}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                        {connectedAccount.username}
                      </div>
                    </div>
                  </div>

                  {/* Token Health Badge */}
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-700">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold">
                      {loc(`الرمز سليم · صالح لـ ${connectedAccount.tokenHealth?.expiresInDays || 60} يوماً`, `Token healthy · Valid for ${connectedAccount.tokenHealth?.expiresInDays || 60} days`)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--border-subtle)] text-xs">
                  <div>
                    <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase">
                      {loc('آخر مزامنة', 'Last Sync')}
                    </div>
                    <div className="font-semibold text-[var(--text-primary)] mt-0.5">
                      {connectedAccount.syncTime || (loc('الآن', 'Just now'))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase">
                      {loc('معرف الحساب', 'Account ID')}
                    </div>
                    <div className="font-mono text-[var(--text-primary)] mt-0.5 truncate">
                      {connectedAccount.accountId}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase">
                      {loc('الصلاحيات النشطة', 'Active Privileges')}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {['Publishing', 'Analytics', 'Comments', 'Webhooks'].map((p) => (
                        <span
                          key={p}
                          className="rounded-md bg-[var(--bg-card)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Reconnect & Disconnect Channel Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={handleReconnect}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3.5 py-2 text-xs font-bold text-[var(--text-primary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>{loc('إعادة ربط وتحديث الرمز', 'Reconnect Channel')}</span>
                  </button>

                  {!showDisconnectConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowDisconnectConfirm(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-500/20 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>{loc('فصل القناة', 'Disconnect Channel')}</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 animate-in fade-in">
                      <span className="text-[11px] font-semibold text-rose-600">
                        {loc('تأكيد فصل القناة؟', 'Confirm disconnect?')}
                      </span>
                      <button
                        type="button"
                        disabled={isDisconnecting}
                        onClick={handleDisconnect}
                        className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition disabled:opacity-50"
                      >
                        {isDisconnecting && <RefreshCw className="h-3 w-3 animate-spin" />}
                        <span>{loc('تأكيد الفصل', 'Yes, Disconnect')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDisconnectConfirm(false)}
                        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-2.5 py-1.5 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      >
                        {loc('إلغاء', 'Cancel')}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Feedback Toast */}
              {feedbackToast && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3.5 text-xs font-bold text-emerald-700 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{feedbackToast}</span>
                </div>
              )}

              {/* Interactive Test Post / Test Message Section */}
              <div className="rounded-2xl border border-[var(--accent-primary)]/30 bg-[var(--bg-card)] p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[var(--accent-primary)]" />
                    <h4 className="text-xs font-extrabold text-[var(--text-primary)] uppercase tracking-wider">
                      {['telegram', 'whatsapp', 'discord', 'slack'].includes(selectedPlatform)
                        ? (loc('إجراء اختبار إرسال رسالة تجريبية', 'Send Test Verification Message'))
                        : (loc('إجراء اختبار نشر فوري', 'Send Test Verification Post'))}
                    </h4>
                  </div>
                  <span className="text-[11px] font-bold text-[var(--accent-primary)]">
                    {loc('تحقق حي', 'Live E2E Verification')}
                  </span>
                </div>

                <div className="space-y-2">
                  <textarea
                    rows={2}
                    value={testPayloadText}
                    onChange={(e) => setTestPayloadText(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                    placeholder={loc('اكتب نص المنشور التجريبي...', 'Enter test caption...')}
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {loc(`سيتم إرسال هذا المنشور إلى ${connectedAccount.username} لتأكيد استجابة الـ API`, `Payload will be dispatched to @${connectedAccount.username} to verify upstream receipt`)}
                    </span>

                    <button
                      type="button"
                      disabled={testPostLoading || !testPayloadText.trim()}
                      onClick={handleSendTestPost}
                      className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition disabled:opacity-50"
                    >
                      {testPostLoading ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {testPostLoading
                          ? (loc('جاري الإرسال والتحقق...', 'Verifying...'))
                          : (loc('إرسال المنشور التجريبي', 'Send Test Post'))}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Delivery Receipt Card */}
                {deliveryReceipt && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs font-extrabold text-emerald-700">
                          {loc('تم تأكيد استلام المنشور بنجاح (HTTP 200)', 'Delivery Receipt Verified (HTTP 200)')}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-emerald-700">
                        {deliveryReceipt.latencyMs}ms latency
                      </span>
                    </div>

                    <p className="text-xs text-emerald-800">
                      {deliveryReceipt.message}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-500/20 text-[11px] font-mono text-emerald-900">
                      <span>Receipt ID: {deliveryReceipt.receiptId}</span>
                      <a
                        href={deliveryReceipt.platformPostUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-[var(--accent-primary)] hover:underline"
                      >
                        <span>{loc('عرض المنشور التجريبي ↗', 'View on Platform ↗')}</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer Navigation */}
        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-6 py-4">
          <div>
            {currentStep > 1 && currentStep < 4 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-2 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
              >
                {isAr ? <ArrowRight className="h-3.5 w-3.5" /> : <ArrowLeft className="h-3.5 w-3.5" />}
                <span>{loc('السابق', 'Back')}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {currentStep === 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-6 py-2.5 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition shadow-sm"
              >
                <span>{loc(`المتابعة مع ${platformMeta.name}`, `Continue with ${platformMeta.name}`)}</span>
                {isAr ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
              </button>
            )}

            {currentStep === 2 && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleAuthorizeOrSubmit}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-6 py-2.5 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                <span>
                  {selectedPlatform === 'whatsapp' && whatsappMethod === 'embedded_oauth'
                    ? loc('إطلاق التسجيل المدمج من Meta (OAuth)', 'Launch Meta Embedded Signup (OAuth)')
                    : selectedPlatform === 'whatsapp' && whatsappMethod === 'virtual_number'
                    ? loc('فتح سوق شراء الأرقام الافتراضية', 'Open Virtual Number Marketplace')
                    : platformMeta.connectionType === 'oauth'
                    ? loc('منح الإذن والمتابعة', 'Authorize & Continue')
                    : loc('التحقق وربط المفاتيح', 'Verify & Connect Credentials')}
                </span>
                {!isSubmitting && (isAr ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />)}
              </button>
            )}

            {currentStep === 3 && (
              <button
                type="button"
                disabled={isSubmitting || !selectedEntityId}
                onClick={handleConfirmEntity}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-6 py-2.5 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition shadow-sm disabled:opacity-50"
              >
                {isSubmitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                <span>{loc('ربط الحساب المحدد', 'Bind Selected Entity')}</span>
                {!isSubmitting && (isAr ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />)}
              </button>
            )}

            {currentStep === 4 && (
              <button
                type="button"
                onClick={handleFinishAndSave}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-sm"
              >
                <Check className="h-3.5 w-3.5 stroke-[3]" />
                <span>{loc('إتمام وحفظ في لوحة التحكم', 'Done & View in Dashboard')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
