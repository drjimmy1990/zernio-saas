import type { SubServiceKey } from '@/types/platform';
import { DASHBOARD_TRANSLATIONS } from './dashboardTranslations';

export type SupportedLocale =
  | 'ar'
  | 'en'
  | 'es'
  | 'fr'
  | 'de'
  | 'pt-BR'
  | 'tr'
  | 'ru'
  | 'zh'
  | 'ja';

export const LOCALE_META: Array<{
  code: SupportedLocale;
  nativeName: string;
  dir: 'rtl' | 'ltr';
  flag: string;
}> = [
  { code: 'ar', nativeName: 'العربية', dir: 'rtl', flag: '🇸🇦' },
  { code: 'en', nativeName: 'English', dir: 'ltr', flag: '🇺🇸' },
  { code: 'es', nativeName: 'Español', dir: 'ltr', flag: '🇪🇸' },
  { code: 'fr', nativeName: 'Français', dir: 'ltr', flag: '🇫🇷' },
  { code: 'de', nativeName: 'Deutsch', dir: 'ltr', flag: '🇩🇪' },
  { code: 'pt-BR', nativeName: 'Português', dir: 'ltr', flag: '🇧🇷' },
  { code: 'tr', nativeName: 'Türkçe', dir: 'ltr', flag: '🇹🇷' },
  { code: 'ru', nativeName: 'Русский', dir: 'ltr', flag: '🇷🇺' },
  { code: 'zh', nativeName: '中文', dir: 'ltr', flag: '🇨🇳' },
  { code: 'ja', nativeName: '日本語', dir: 'ltr', flag: '🇯🇵' },
];

export interface TranslationDictionary {
  brand: {
    name: string;
    domain: string;
    tagline: string;
  };
  nav: {
    home: string;
    workspace: string;
    docs: string;
    admin: string;
    login: string;
    signup: string;
    lightMode: string;
    darkMode: string;
    logout: string;
    signOut: string;
  };
  hero: {
    badge: string;
    titlePart1: string;
    titleHighlight: string;
    titlePart2: string;
    subtitle: string;
    ctaStart: string;
    ctaWorkspace: string;
    ctaDocs: string;
    stat1Label: string;
    stat2Label: string;
    stat3Label: string;
    stat4Label: string;
  };
  subServicesSection: {
    eyebrow: string;
    title: string;
    subtitle: string;
    openInWorkspace: string;
    viewApiDocs: string;
    services: Record<
      SubServiceKey,
      {
        title: string;
        shortTitle: string;
        tagline: string;
        bullets: string[];
      }
    >;
  };
  pricingSection: {
    eyebrow: string;
    title: string;
    subtitle: string;
    perMonth: string;
    choosePlan: string;
    popularBadge: string;
    plans: {
      starter: { name: string; desc: string; features: string[] };
      growth: { name: string; desc: string; features: string[] };
      agency: { name: string; desc: string; features: string[] };
      enterprise: { name: string; desc: string; features: string[] };
    };
  };
  faqSection: {
    eyebrow: string;
    title: string;
    subtitle: string;
    items: Array<{ q: string; a: string }>;
  };
  dashboard: {
    activeTenant: string;
    newTenant: string;
    syncBtn: string;
    groupChannels: string;
    groupGrowth: string;
    groupEnterprise: string;
    quotasTitle: string;
    maxChannels: string;
    monthlyPosts: string;
    phoneNumbers: string;
    aiBudget: string;
    lockedTitle: string;
    lockedDesc: string;
    openAdminBtn: string;
    connectStep1Title: string;
    connectStep1Desc: string;
    connectStep2Title: string;
    connectStep2Desc: string;
    entityPickerTitle: string;
    entityPickerDesc: string;
    directTokenTitle: string;
    directTokenDesc: string;
    connectTokenBtn: string;
    connectedAccountsTitle: string;
    composerTitle: string;
    composerPlaceholder: string;
    useSmartQueue: string;
    uploadMediaBtn: string;
    publishNowBtn: string;
    inboxTitle: string;
    replyBtn: string;
    automationTitle: string;
    automationDesc: string;
    activateAutomationBtn: string;
    analyticsImpressions: string;
    analyticsReach: string;
    analyticsEngagement: string;
    analyticsFollowers: string;
    adsTitle: string;
    connectAdBtn: string;
    capiTitle: string;
    capiDesc: string;
    sendCapiBtn: string;
    kycTitle: string;
    kycDesc: string;
    generateKycBtn: string;
    voiceAgentTitle: string;
    voiceAgentDesc: string;
    bindVoiceBtn: string;
    webrtcTitle: string;
    webrtcDesc: string;
    startWebrtcBtn: string;
    commerceTitle: string;
    localSeoTitle: string;
    aiSupportTitle: string;
    aiSupportDesc: string;
    runDiagnosisBtn: string;
  };
  admin: {
    title: string;
    subtitle: string;
    headlessEnforced: string;
    headlessOptional: string;
    tabGlobal: string;
    tabPlans: string;
    tabTenants: string;
    tabBilling: string;
    globalServicesTitle: string;
    globalScopesTitle: string;
    globalPlatformsTitle: string;
    globalAdsTitle: string;
    provisionTenantBtn: string;
    openWorkspaceBtn: string;
    mintKeyBtn: string;
    suspendBtn: string;
    restoreBtn: string;
    billingTitle: string;
    colTenant: string;
    colProfile: string;
    colPlan: string;
    colWholesale: string;
    colRetail: string;
    colMargin: string;
  };
  docs: {
    badge: string;
    title: string;
    subtitle: string;
    baseUrlLabel: string;
    authTitle: string;
    authDesc: string;
    webhooksTitle: string;
    webhooksDesc: string;
    endpointsTitle: string;
    tryEndpointBtn: string;
  };
  telephony: {
    eyebrow: string;
    title: string;
    subtitle: string;
    marketTitle: string;
    marketSubtitle: string;
    buyBtn: string;
    typeFilterAll: string;
    typeFilterMobile: string;
    typeFilterLocal: string;
    typeFilterTollFree: string;
    dialerTitle: string;
    dialerSubtitle: string;
    callModeDirect: string;
    callModeAi: string;
    callBtn: string;
    endCallBtn: string;
    smsTitle: string;
    simulateOtpBtn: string;
    simulateSmsBtn: string;
    whatsappTitle: string;
    linkWhatsappBtn: string;
  };
  connectionWizard: {
    modalTitle: string;
    modalSubtitle: string;
    step1Title: string;
    step2Title: string;
    step3Title: string;
    step4Title: string;
    methodOAuth: string;
    methodToken: string;
    testPostBtn: string;
    connectedBadge: string;
  };
  auth: {
    loginTitle: string;
    loginSubtitle: string;
    signupTitle: string;
    signupSubtitle: string;
    emailLabel: string;
    passwordLabel: string;
    nameLabel: string;
    companyLabel: string;
    selectPlanLabel: string;
    submitLogin: string;
    submitSignup: string;
    alreadyHaveAccount: string;
    needAccount: string;
    demoPersonasTitle: string;
    whatYouGetTitle: string;
    workEmailRequired: string;
    signInFailed: string;
    unableToSignIn: string;
    signingIn: string;
    orContinueWith: string;
    continueWithGoogle: string;
    enterpriseIsolation: string;
    unifiedTitle: string;
    unifiedDesc: string;
    socialChannelsFeature: string;
    telephonyFeature: string;
    telephonyFeatureDesc: string;
    storageFeature: string;
    storageFeatureDesc: string;
    signUpBadge: string;
    fullNamePlaceholder: string;
    companyNamePlaceholder: string;
    whatYouGet1: string;
    whatYouGet2: string;
    whatYouGet3: string;
    exploreApiDocs: string;
  };
  showcase: {
    platformEyebrow: string;
    platformTitle: string;
    platformSubtitle: string;
    adsEyebrow: string;
    adsTitle: string;
    adsSubtitle: string;
    devHubEyebrow: string;
    devHubTitle: string;
    devHubSubtitle: string;
    copied: string;
    copyPrompt: string;
    promptCopiedToast: string;
  };
}

/**
 * Multi-locale translation helper function.
 * Allows components to specify translations across 10 locales with fallback to ar/en.
 * Automatically resolves against DASHBOARD_TRANSLATIONS for 10-locale coverage.
 */
export function getLocalizedText(
  locale: SupportedLocale,
  textMap: ({ [k in SupportedLocale]?: string } & { ar: string; en: string }) | { ar: string; en: string }
): string {
  if ((textMap as any)[locale]) return (textMap as any)[locale];
  if (textMap.en && DASHBOARD_TRANSLATIONS[textMap.en]?.[locale]) {
    return DASHBOARD_TRANSLATIONS[textMap.en][locale];
  }
  if (textMap.ar && DASHBOARD_TRANSLATIONS[textMap.ar]?.[locale]) {
    return DASHBOARD_TRANSLATIONS[textMap.ar][locale];
  }
  if (locale === 'ar') return textMap.ar;
  return textMap.en;
}

const dict_ar: TranslationDictionary = {
  "brand": {
    "name": "Asra3",
    "domain": "asra3.com",
    "tagline": "منصة التسويق والاتصالات السحابية الموحدة — الحسابات الاجتماعية، الإعلانات، الرسائل، الهاتف الذكي والمتاجر"
  },
  "nav": {
    "home": "الرئيسية",
    "workspace": "لوحة التحكم",
    "docs": "توثيق الـ API",
    "admin": "إدارة النظام",
    "login": "تسجيل الدخول",
    "signup": "ابدأ مجاناً",
    "lightMode": "الوضع النهاري",
    "darkMode": "الوضع الليلي",
    "logout": "تسجيل الخروج",
    "signOut": "خروج"
  },
  "hero": {
    "badge": "منصة موحدة للتسويق والاتصالات + API للمطورين · asra3.com",
    "titlePart1": "اوصل لعملائك في كل مكان عبر",
    "titleHighlight": "منصة واحدة ومفتاح API واحد",
    "titlePart2": "بدون تعقيد أو انتظار موافقات المنصات.",
    "subtitle": "تربط Asra3 بين 18 منصة تواصل ومدونات، و8 شبكات إعلانية، وصندوق رسائل موحد (واتساب وإنستغرام)، وأرقام هاتفية ووكيل صوتي ذكي، ومتاجر إلكترونية — جاهزة للاستخدام المباشر أو الربط البرمجي في دقائق.",
    "ctaStart": "ابدأ مجاناً الآن",
    "ctaWorkspace": "افتح لوحة التحكم",
    "ctaDocs": "توثيق الـ API للمطورين",
    "stat1Label": "عملية برمجية جاهزة",
    "stat2Label": "منصة تواصل وشبكة إعلانية",
    "stat3Label": "خطوات فقط للبدء السريع",
    "stat4Label": "جاهزية فورية للربط والنشر"
  },
  "subServicesSection": {
    "eyebrow": "كل ما تحتاجه في مكان واحد",
    "title": "8 منتجات متكاملة لتنمية أعمالك أو بناء تطبيقك",
    "subtitle": "استخدمها مباشرة من لوحة التحكم السهلة، أو اربطها بتطبيقك وموقعك عبر واجهة Asra3 API.",
    "openInWorkspace": "جرّبها في لوحة التحكم",
    "viewApiDocs": "مرجع الـ API",
    "services": {
      "core_connect": {
        "title": "ربط الحسابات الاجتماعية بضغطة واحدة",
        "shortTitle": "الحسابات المربوطة",
        "tagline": "اربط حساباتك في 18 منصة تواصل ومدونة ومتجر في ثوانٍ",
        "bullets": [
          "ربط فوري بضغطة زر مع إنستغرام، تيك توك، فيسبوك، إكس، لينكدإن، يوتيوب، وثريدز",
          "دعم تيليجرام، ديسكورد، سلاك، واتساب، سناب شات، بنترست، ريديت، وبلوسكاي",
          "ربط مباشر لمتاجر Shopify ومواقع WordPress وفروع Google Business",
          "متابعة تلقائية لحالة اتصال الحسابات وتجديد الصلاحيات بسلاسة"
        ]
      },
      "publishing": {
        "title": "نشر وجدولة المحتوى والـ Reels",
        "shortTitle": "النشر والجدولة",
        "tagline": "اكتب منشورك مرة واحدة وانشره أو جدوله عبر كل قنواتك",
        "bullets": [
          "محرر موحد لنشر الصور، الفيديوهات، الـ Reels، الكاروسيل، والثريدات",
          "جدولة ذكية حسب التوقيت المحلي أو عبر طابور النشر التلقائي (Smart Queue)",
          "رفع سريع للوسائط والملفات الكبيرة مع فحص توافق الصيغ تلقائياً",
          "إضافة أول تعليق تلقائي وتخصيص النص لكل منصة عند الحاجة"
        ]
      },
      "inbox_crm": {
        "title": "صندوق الرسائل الموحد والرد الآلي",
        "shortTitle": "الرسائل والرد الآلي",
        "tagline": "اجمع رسائل واتساب وإنستغرام وفيسبوك والتعليقات في شاشة واحدة",
        "bullets": [
          "الرد على رسائل الـ DM والتعليقات وتقييمات جوجل وفيسبوك من مكان واحد",
          "تحويل التعليقات إلى رسائل خاصة تلقائياً (Comment-to-DM) عند كتابة كلمة مفتاحية",
          "إرسال حملات رسائل جماعية (Broadcasts) وتسلسلات متابعة آلية",
          "سجل متكامل لجهات الاتصال والعملاء المحتملين (CRM)"
        ]
      },
      "analytics": {
        "title": "التحليلات وتقارير الأداء",
        "shortTitle": "الإحصائيات والتقارير",
        "tagline": "تابع المشاهدات، التفاعل، ونمو المتابعين عبر كافة قنواتك لحظياً",
        "bullets": [
          "ملخص شامل للمشاهدات، الوصول، التفاعل، والزيارات في لوحة واحدة",
          "معرفة أفضل الأوقات للنشر لجمهورك بناءً على بيانات التفاعل الفعلية",
          "مقارنة أداء المنشورات والحسابات عبر الفترات الزمنية المختلفة",
          "تصدير التقارير أو سحبها برمجياً عبر الـ API"
        ]
      },
      "ads": {
        "title": "إدارة الإعلانات الممولة عبر 8 شبكات",
        "shortTitle": "الإعلانات الممولة",
        "tagline": "أطلق وتابع إعلانات ميتا، جوجل، تيك توك، لينكدإن، إكس و OpenAI",
        "bullets": [
          "إنشاء وإدارة الحملات الإعلانية والميزانيات من واجهة موحدة",
          "ترويج المنشورات الناجحة بضغطة زر وإعلانات النقر إلى واتساب (Click-to-WhatsApp)",
          "إرسال أحداث الشراء والتحويلات مباشرة (Conversions API) لرفع دقة الاستهداف",
          "مزامنة قوائم العملاء والجماهير المشابهة (Lookalike Audiences)"
        ]
      },
      "telephony": {
        "title": "الأرقام السحابية، الـ SMS والوكيل الصوتي الذكي",
        "shortTitle": "الهاتف والوكيل الصوتي",
        "tagline": "احصل على أرقام دولية، أرسل SMS/WhatsApp، وفعّل موظف استقبال صوتي بالذكاء الاصطناعي",
        "bullets": [
          "شراء أو نقل أرقام هاتفية دولية وتفعيل المكالمات والرسائل النصية SMS و RCS",
          "ربط الرقم بوكيل صوتي ذكي يرد على المكالمات على مدار الساعة",
          "إجراء واستقبال المكالمات مباشرة من المتصفح (WebRTC Dialer)",
          "إرسال رموز التحقق (OTP) وتفعيل وكيل واتساب للأعمال"
        ]
      },
      "commerce_local": {
        "title": "إدارة المتاجر الإلكترونية وفروع جوجل",
        "shortTitle": "المتاجر والفروع",
        "tagline": "تحكم في منتجات Shopify و WooCommerce والمدونات وفروع Google Business",
        "bullets": [
          "عرض وتحديث المنتجات، الأسعار، المخزون، وكوبونات الخصم",
          "نشر المقالات في مدونات Shopify و WordPress لتحسين الظهور في محركات البحث",
          "إدارة فروع Google Business Profile، ساعات العمل، العروض، والرد على التقييمات",
          "مزامنة كتالوج المنتجات مع الإعلانات الممولة تلقائياً"
        ]
      },
      "support_ai": {
        "title": "المساعد الذكي ومفاتيح الـ API",
        "shortTitle": "المساعد الذكي والـ API",
        "tagline": "مساعد ذكي لفحص حساباتك ومنشوراتك + مفاتيح API لربط تطبيقاتك",
        "bullets": [
          "اسأل المساعد الذكي عن سبب تعذر أي منشور أو حالة أي حساب وسيعطيك الحل فوراً",
          "إنشاء مفاتيح Asra3 API لربط موقعك أو تطبيقك أو وكيل الذكاء الاصطناعي الخاص بك",
          "إعداد روابط Webhooks لاستقبال إشعارات فورية عند وصول رسالة أو نشر محتوى"
        ]
      }
    }
  },
  "pricingSection": {
    "eyebrow": "أسعار واضحة ومرنة",
    "title": "ابدأ مجاناً واختر الباقة المناسبة لنمو أعمالك",
    "subtitle": "جميع الباقات تشمل لوحة التحكم السهلة بالإضافة إلى إمكانية الاستخدام عبر الـ API.",
    "perMonth": "/ شهرياً",
    "choosePlan": "اشترك الآن",
    "popularBadge": "الأكثر شيوعاً",
    "plans": {
      "starter": {
        "name": "باقة البداية (Starter)",
        "desc": "مثالية للأفراد وصناع المحتوى والمشاريع الناشئة.",
        "features": [
          "ربط حتى 5 حسابات اجتماعية",
          "300 منشور مجدول شهرياً",
          "محرر النشر وطابور الجدولة الذكي",
          "لوحة التحليلات الأساسية + مفتاح API"
        ]
      },
      "growth": {
        "name": "باقة النمو (Growth)",
        "desc": "للشركات والمتاجر التي تحتاج صندوق رسائل موحد وأتمتة الردود.",
        "features": [
          "حتى 15 حساباً + رقم هاتفي سحابي",
          "2,000 منشور و 10,000 رسالة شهرياً",
          "صندوق الرسائل الموحد والرد التلقائي على التعليقات",
          "ربط متاجر Shopify و WooCommerce وفروع جوجل"
        ]
      },
      "agency": {
        "name": "باقة الأعمال (Pro / Agency)",
        "desc": "تشمل جميع الخدمات الـ 8 مع الإعلانات الممولة والوكيل الصوتي الذكي.",
        "features": [
          "حتى 50 حساباً + 5 أرقام هاتفية دولية",
          "إدارة الإعلانات عبر الـ 8 شبكات + تتبع التحويلات",
          "وكيل صوتي بالذكاء الاصطناعي + هاتف المتصفح",
          "أولوية في الدعم الفني والـ Webhooks الفورية"
        ]
      },
      "enterprise": {
        "name": "باقة المؤسسات (Enterprise)",
        "desc": "للشركات الكبرى والتطبيقات التي تحتاج سعة عالية ومفاتيح API متعددة.",
        "features": [
          "حتى 500 حساب + 50 رقماً هاتفياً",
          "مفاتيح API متعددة بصلاحيات مخصصة للمطورين",
          "حدود مخصصة وسرعة معالجة قصوى (High Rate Limits)",
          "مدير حساب مخصص وضمان وقت تشغيل 99.9%"
        ]
      }
    }
  },
  "faqSection": {
    "eyebrow": "الأسئلة الشائعة",
    "title": "كل ما تريد معرفته عن منصة Asra3 (asra3.com)",
    "subtitle": "إجابات واضحة حول كيفية استخدام المنصة أو ربطها برمجياً عبر الـ API.",
    "items": [
      {
        "q": "ما هي منصة Asra3 (asra3.com) وماذا تقدم؟",
        "a": "منصة Asra3 (asra3.com) هي منصة تسويق واتصالات موحدة تتيح لك ربط وإدارة 18 قناة تواصل ومدونة، و8 شبكات إعلانية، وصندوق رسائل موحد (واتساب وإنستغرام)، وأرقام هاتفية مع وكيل صوتي ذكي، ومتاجر إلكترونية — سواء من خلال لوحة تحكم سهلة الاستخدام أو عبر واجهة برمجية (REST API) للمطورين."
      },
      {
        "q": "هل يمكنني استخدام Asra3 بدون خبرة برمجية؟",
        "a": "بكل تأكيد! صممنا لوحة التحكم (/dashboard) لتكون في غاية البساطة؛ تضغط على المنصة (مثل إنستغرام أو تيك توك أو شوبيفاي) فترتبط بحسابك فوراً، وتبدأ بنشر المحتوى أو الرد على الرسائل أو إطلاق الإعلانات بدون أي كود."
      },
      {
        "q": "هل يمكنني استخدام Asra3 كمزود خدمة (Third-Party API) داخل تطبيقي أو موقعي؟",
        "a": "نعم، إذا كنت مطوراً أو تبني نظاماً أو وكيل ذكاء اصطناعي (AI Agent)، يمكنك استخراج مفتاح API من حسابك واستخدام نقطة الاتصال https://asra3.com/api/v1 لربط حسابات المستخدمين وجدولة المنشورات وإرسال الرسائل برمجياً."
      },
      {
        "q": "ما هي القنوات والشبكات التي تدعمها المنصة حالياً؟",
        "a": "ندعم 18 منصة (إنستغرام، فيسبوك، تيك توك، لينكدإن، إكس/تويتر، يوتيوب، ثريدز، بنترست، ريديت، بلوسكاي، سناب شات، جوجل بيزنس، تيليجرام، ديسكورد، سلاك، واتساب، شوبيفاي، ووردبريس) و8 شبكات إعلانية (ميتا، جوجل، تيك توك، لينكدإن، بنترست، إكس، ريديت، و OpenAI Ads)."
      }
    ]
  },
  "dashboard": {
    "activeTenant": "الحساب الحالي",
    "newTenant": "+ حساب جديد",
    "syncBtn": "تحديث",
    "groupChannels": "الحسابات والنشر",
    "groupGrowth": "الرسائل والإحصائيات",
    "groupEnterprise": "الإعلانات، الهاتف والمتجر",
    "quotasTitle": "استهلاك الباقة",
    "maxChannels": "الحسابات المسموحة",
    "monthlyPosts": "المنشورات الشهرية",
    "phoneNumbers": "الأرقام الهاتفية",
    "aiBudget": "رصيد المساعد الذكي",
    "lockedTitle": "هذه الميزة غير متوفرة في باقتك الحالية",
    "lockedDesc": "يرجى ترقية باقتك للاستفادة من هذه الخدمة أو تفعيلها من إعدادات الإدارة.",
    "openAdminBtn": "فتح إعدادات الباقات",
    "connectStep1Title": "صلاحيات الحساب",
    "connectStep1Desc": "الصلاحيات المفعلة تلقائياً عند ربط حسابك.",
    "connectStep2Title": "إضافة حساب جديد بضغطة واحدة",
    "connectStep2Desc": "اضغط على أي منصة بالأسفل لربط حسابك مباشرة في ثوانٍ:",
    "entityPickerTitle": "اختيار الصفحة أو القناة",
    "entityPickerDesc": "اختر الصفحة أو الحساب الفرعي الذي ترغب في إدارته:",
    "directTokenTitle": "ربط سريع لمتجر Shopify أو WordPress",
    "directTokenDesc": "أدخل رابط متجرك أو موقعك لربطه مباشرة:",
    "connectTokenBtn": "ربط المتجر الآن",
    "connectedAccountsTitle": "حساباتك المربوطة حالياً",
    "composerTitle": "إنشاء وجدولة منشور جديد",
    "composerPlaceholder": "اكتب منشورك هنا... يمكنك إضافة وسوم وروابط وإيموجي ✨",
    "useSmartQueue": "جدولة تلقائية في أفضل وقت تفاعل (Smart Queue)",
    "uploadMediaBtn": "إرفاق صورة / فيديو",
    "publishNowBtn": "نشر أو جدولة الآن",
    "inboxTitle": "صندوق الرسائل والتعليقات الموحد",
    "replyBtn": "إرسال",
    "automationTitle": "الرد التلقائي على التعليقات برسالة خاصة (Auto-DM)",
    "automationDesc": "عندما يكتب أي متابع كلمة مفتاحية في التعليقات، يرسل له النظام رسالة خاصة تلقائياً:",
    "activateAutomationBtn": "تفعيل الرد التلقائي",
    "analyticsImpressions": "إجمالي المشاهدات",
    "analyticsReach": "الجمهور المستهدف (Reach)",
    "analyticsEngagement": "معدل التفاعل",
    "analyticsFollowers": "المتابعون الجدد",
    "adsTitle": "حملاتك الإعلانية النشطة",
    "connectAdBtn": "ربط حساب إعلاني",
    "capiTitle": "تتبع المبيعات والتحويلات (Conversions API)",
    "capiDesc": "أرسل عمليات الشراء من موقعك لتحسين نتائج إعلانات ميتا وجوجل.",
    "sendCapiBtn": "إرسال حدث تحويل",
    "kycTitle": "توثيق الأرقام الهاتفية السريع",
    "kycDesc": "أصدر رابط تفعيل وتوثيق الرقم الهاتفي الدولي بخطوة واحدة.",
    "generateKycBtn": "تفعيل وتوثيق رقم جديد",
    "voiceAgentTitle": "موظف الاستقبال الصوتي بالذكاء الاصطناعي",
    "voiceAgentDesc": "فعّل الرد الصوتي الذكي على المكالمات الواردة لرقمك على مدار الساعة.",
    "bindVoiceBtn": "تفعيل الوكيل الصوتي",
    "webrtcTitle": "إجراء مكالمة من المتصفح",
    "webrtcDesc": "اتصل بعملائك واستقبل المكالمات مباشرة من المتصفح بدون برامج إضافية.",
    "startWebrtcBtn": "فتح لوحة الاتصال",
    "commerceTitle": "منتجات متجرك (Shopify / WooCommerce)",
    "localSeoTitle": "فروعك على خرائط جوجل (Google Business)",
    "aiSupportTitle": "المساعد الذكي ومفاتيح المطورين (API Keys)",
    "aiSupportDesc": "اسأل المساعد الذكي عن أي مشكلة في حساباتك أو منشوراتك ليقوم بفحصها فوراً:",
    "runDiagnosisBtn": "افحص بالذكاء الاصطناعي"
  },
  "admin": {
    "title": "لوحة إدارة المنصة والباقات (Admin)",
    "subtitle": "تحكم في الخدمات المفعلة، القنوات المدعومة، الباقات، وحسابات المشتركين.",
    "headlessEnforced": "الربط المباشر مفعل",
    "headlessOptional": "الربط القياسي",
    "tabGlobal": "1. الخدمات والقنوات المتاحة",
    "tabPlans": "2. الباقات والأسعار",
    "tabTenants": "3. المشتركون ومفاتيح الـ API",
    "tabBilling": "4. الإيرادات والتكاليف",
    "globalServicesTitle": "تفعيل أو إيقاف خدمات المنصة الـ 8",
    "globalScopesTitle": "الصلاحيات المفعلة",
    "globalPlatformsTitle": "قنوات التواصل والمدونات المفعلة (18 قناة)",
    "globalAdsTitle": "الشبكات الإعلانية المفعلة (8 شبكات)",
    "provisionTenantBtn": "إضافة مشترك جديد",
    "openWorkspaceBtn": "عرض لوحة المشترك",
    "mintKeyBtn": "توليد مفتاح API",
    "suspendBtn": "إيقاف مؤقت",
    "restoreBtn": "تفعيل",
    "billingTitle": "تقرير تكلفة التشغيل مقابل إيرادات الاشتراكات",
    "colTenant": "المشترك / الشركة",
    "colProfile": "معرف الحساب",
    "colPlan": "الباقة",
    "colWholesale": "تكلفة المورد",
    "colRetail": "قيمة الاشتراك",
    "colMargin": "صافي الربح"
  },
  "docs": {
    "badge": "توثيق المطورين الرسمي · asra3.com/docs",
    "title": "توثيق واجهة البرمجة (Asra3 API Documentation)",
    "subtitle": "أنشئ مفتاح API، واربط حساباً، وجدول أول منشور لك في 5 طلبات فقط عبر واجهة Asra3 الموحدة.",
    "baseUrlLabel": "رابط الـ API الأساسي (Base URL)",
    "authTitle": "المصادقة ومفاتيح الـ API",
    "authDesc": "مرر مفتاحك السري في ترويسة Authorization: Bearer tk_live_... في جميع الطلبات.",
    "webhooksTitle": "الإشعارات الفورية (Webhooks)",
    "webhooksDesc": "استقبل تحديثات الرسائل والمنشورات لحظياً مع التحقق الأمني عبر HMAC-SHA256.",
    "endpointsTitle": "مرجع نقاط الاتصال (API Reference)",
    "tryEndpointBtn": "تجربة الطلب مباشرة"
  },
  "telephony": {
    "eyebrow": "أرقام هاتفية افتراضية وواتساب وذكاء اصطناعي صوتي",
    "title": "اشترِ أرقاماً في 55+ دولة، استقبل وأرسل الرسائل والمكالمات فوراً",
    "subtitle": "احصل على رقم هاتف افتراضي فوري، اربطه بحساب واتساب للأعمال، وأطلق عملاء ذكاء اصطناعي صوتيين يجيبون على عملائك أو يتصلون بهم هاتفياً.",
    "marketTitle": "مستكشف الأرقام الافتراضية",
    "marketSubtitle": "أرقام فورية في أكثر من 55 دولة مع الامتثال التنظيمي المؤتمت",
    "buyBtn": "شراء وتفعيل الرقم",
    "typeFilterAll": "الكل (محلي، جوال، مجاني)",
    "typeFilterMobile": "أرقام جوال (Mobile)",
    "typeFilterLocal": "أرقام محلية (Local)",
    "typeFilterTollFree": "أرقام مجانية (Toll-Free)",
    "dialerTitle": "لوحة الاتصال وسجل المكالمات (Web Phone)",
    "dialerSubtitle": "إجراء واستقبال المكالمات من المتصفح مباشرة عبر خطوطك الافتراضية",
    "callModeDirect": "مكالمة صوتية مباشرة",
    "callModeAi": "وكيل صوتي ذكي (AI Voice Agent)",
    "callBtn": "بدء المكالمة الآن",
    "endCallBtn": "إنهاء المكالمة",
    "smsTitle": "صندوق رسائل واتساب وSMS الحية",
    "simulateOtpBtn": "محاكاة وصول رمز تحقق (OTP)",
    "simulateSmsBtn": "محاكاة رسالة SMS واردة",
    "whatsappTitle": "ربط الرقم بحساب واتساب للأعمال (WhatsApp Business)",
    "linkWhatsappBtn": "بدء معالج ربط واتساب"
  },
  "connectionWizard": {
    "modalTitle": "معالج ربط القنوات والمنصات الرقمية",
    "modalSubtitle": "اربط قنوات التواصل الاجتماعي، تطبيقات المراسلة، المتاجر والمدونات في خطوات تفاعلية موجهة.",
    "step1Title": "١. اختيار المنصة وطريقة الربط",
    "step2Title": "٢. المصادقة ومنح الصلاحيات",
    "step3Title": "٣. تحديد الحساب أو الصفحة المستهدفة",
    "step4Title": "٤. التحقق واختبار النشر الفوري",
    "methodOAuth": "تفويض آمن 1-Click OAuth",
    "methodToken": "رمز برمجي مباشر / Bot Token",
    "testPostBtn": "إرسال منشور / رسالة تجريبية",
    "connectedBadge": "متصل وجاهز للعمل ✓"
  },
  "auth": {
        "loginTitle": "تسجيل الدخول إلى حسابك",
        "loginSubtitle": "أدخل بيانات اعتمادك للوصول إلى مساحة عملك المعزولة وإدارة قنواتك وأرقامك الهاتفية.",
        "signupTitle": "إنشاء حساب جديد في Asra3",
        "signupSubtitle": "اربط حساباتك الاجتماعية، جدول منشوراتك، أدر رسائلك وإعلاناتك، أو احصل على مفتاح API فور التسجيل.",
        "emailLabel": "البريد الإلكتروني للعمل",
        "passwordLabel": "كلمة المرور",
        "nameLabel": "الاسم الكامل",
        "companyLabel": "اسم المشروع أو الشركة (اختياري)",
        "selectPlanLabel": "اختر الباقة المناسبة لك:",
        "submitLogin": "تسجيل الدخول",
        "submitSignup": "ابدأ تجربتك مجاناً",
        "alreadyHaveAccount": "لديك حساب بالفعل؟ ",
        "needAccount": "ليس لديك حساب؟ ",
        "demoPersonasTitle": "الدخول السريع لحسابات التجربة",
        "whatYouGetTitle": "ماذا ستحصل عليه فور التسجيل؟",
        "workEmailRequired": "يرجى إدخال البريد الإلكتروني.",
        "signInFailed": "فشل تسجيل الدخول. تحقق من البيانات.",
        "unableToSignIn": "تعذر الاتصال بخادم المصادقة.",
        "signingIn": "جاري التحقق...",
        "orContinueWith": "أو المتابعة عبر",
        "continueWithGoogle": "الدخول بحساب Google",
        "enterpriseIsolation": "حماية وعزل البيانات المؤسسي",
        "unifiedTitle": "منصة اتصالات وتسويق موحدة",
        "unifiedDesc": "بمجرد تسجيل الدخول، ستحصل على مساحة عمل نظيفة ومعزولة تماماً مع إمكانية ربط 18 منصة اجتماعية وشراء أرقام هواتف افتراضية من 55+ دولة.",
        "socialChannelsFeature": "18 منصة اجتماعية ورسائل فورية",
        "telephonyFeature": "أرقام هواتف حقيقية ووكلاء صوت ذكاء اصطناعي",
        "telephonyFeatureDesc": "استقبال وإرسال رسائل SMS وإجراء مكالمات WebRTC من المتصفح",
        "storageFeature": "حفظ دائم ومستمر للبيانات",
        "storageFeatureDesc": "جميع أرقامك وقنواتك ورسائلك محفوظة بشكل دائم في مساحة عملك",
        "signUpBadge": "ابدأ مجاناً في أقل من دقيقة",
        "fullNamePlaceholder": "أحمد محمد",
        "companyNamePlaceholder": "متجر أو شركة...",
        "whatYouGet1": "ربط حساباتك في 18 منصة (إنستغرام، تيك توك، فيسبوك، إكس، لينكدإن، يوتيوب، واتساب، شوبيفاي...) بضغطة زر.",
        "whatYouGet2": "نشر وجدولة المحتوى والـ Reels والرد التلقائي على التعليقات والرسائل.",
        "whatYouGet3": "مفتاح Asra3 API جاهز إذا كنت مطوراً وتريد ربط خدماتنا بموقعك أو تطبيقك.",
        "exploreApiDocs": "استعرض توثيق الـ API للمطورين"
    },
  "showcase": {
        "platformEyebrow": "منصة شاملة لـ 18 شبكة",
        "platformTitle": "تكاملات أصلية متقدمة مع محاكاة حية لكل منصة",
        "platformSubtitle": "انشر المحتوى، أدر التعليقات، وأطلق أتمتة الرسائل الفورية على جميع الشبكات من واجهة برمجة تطبيقات واحدة موحدة.",
        "adsEyebrow": "محرك الإعلانات عبر 8 شبكات",
        "adsTitle": "أطلق، راقب، وقس أداء حملاتك الإعلانية عبر 8 شبكات",
        "adsSubtitle": "تزامن كامل مع Meta و Google و TikTok و LinkedIn و X و Pinterest و Reddit و OpenAI Ads مع أتمتة الميزانية وتتبع CAPI دقيق.",
        "devHubEyebrow": "مركز المطورين والوكلاء الذكاء الاصطناعي",
        "devHubTitle": "8 مكتبات برمجية، خادم MCP جاهز للعملاء، وأداة سطر أوامر CLI",
        "devHubSubtitle": "برمج تطبيقاتك باللغة التي تفضلها أو دع Claude Code و Cursor يديران النشر وشراء الأرقام الهاتفية تلقائياً.",
        "copied": "تم النسخ!",
        "copyPrompt": "نسخ برومبت إعداد العميل الذكي",
        "promptCopiedToast": "تم نسخ برومبت التثبيت بنجاح!"
    }
};

const dict_en: TranslationDictionary = {
  "brand": {
    "name": "Asra3",
    "domain": "asra3.com",
    "tagline": "Unified Marketing, Social, Ads, Messaging & AI Telephony Platform + Developer API"
  },
  "nav": {
    "home": "Home",
    "workspace": "Dashboard",
    "docs": "API Docs",
    "admin": "Admin",
    "login": "Sign In",
    "signup": "Start Free",
    "lightMode": "Light Mode",
    "darkMode": "Dark Mode",
    "logout": "Sign Out",
    "signOut": "Logout"
  },
  "hero": {
    "badge": "Unified Marketing & Messaging Cloud + Developer API · asra3.com",
    "titlePart1": "Reach Your Customers Everywhere With",
    "titleHighlight": "One Platform & One API Key",
    "titlePart2": "Skip Months of Platform Approvals.",
    "subtitle": "Asra3 (asra3.com) connects 18 social & blog channels, 8 paid ad networks, a unified WhatsApp/Instagram inbox, global phone numbers with AI voice agents, and e-commerce stores — ready to use in our clean dashboard or integrate via REST API in minutes.",
    "ctaStart": "Start for Free",
    "ctaWorkspace": "Open Dashboard",
    "ctaDocs": "Read API Docs",
    "stat1Label": "Ready API Endpoints",
    "stat2Label": "Social & Ad Channels",
    "stat3Label": "Calls to First Post",
    "stat4Label": "Instant One-Click Connect"
  },
  "subServicesSection": {
    "eyebrow": "Complete Product Suite",
    "title": "8 Integrated Products — Use in Dashboard or via API",
    "subtitle": "Manage your channels directly from our effortless workspace, or build on top of Asra3 as your third-party marketing API.",
    "openInWorkspace": "Open in Dashboard",
    "viewApiDocs": "API Reference",
    "services": {
      "core_connect": {
        "title": "1-Click Account Connection",
        "shortTitle": "Connected Accounts",
        "tagline": "Connect 18 social networks, messaging apps, blogs, and stores in seconds",
        "bullets": [
          "Instant 1-click OAuth for Instagram, TikTok, Facebook, X, LinkedIn, YouTube & Threads",
          "Support for Telegram, Discord, Slack, WhatsApp, Snapchat, Pinterest, Reddit & Bluesky",
          "Direct connection for Shopify stores, WordPress blogs & Google Business locations",
          "Automatic token refresh and real-time connection health checks"
        ]
      },
      "publishing": {
        "title": "Cross-Platform Publishing & Smart Queues",
        "shortTitle": "Publish & Schedule",
        "tagline": "Write once and schedule posts, Reels, and carousels across 16 platforms",
        "bullets": [
          "Unified composer for images, videos, Reels, carousels, threads, and polls",
          "Timezone-aware scheduling and recurring Smart Queues",
          "High-speed presigned media uploads with automatic format validation",
          "Automatic first comments and per-platform caption customization"
        ]
      },
      "inbox_crm": {
        "title": "Unified Inbox, Auto-DM & Social CRM",
        "shortTitle": "Inbox & Auto-DM",
        "tagline": "Manage WhatsApp, Instagram, Facebook DMs, comments, and reviews in one place",
        "bullets": [
          "Single inbox for DMs, post comments, and Google/Facebook reviews",
          "Keyword-triggered Comment-to-DM automations to capture leads automatically",
          "Multi-channel broadcast campaigns and automated follow-up sequences",
          "Built-in contact management and custom CRM fields"
        ]
      },
      "analytics": {
        "title": "Cross-Channel Analytics & Insights",
        "shortTitle": "Analytics",
        "tagline": "Track impressions, reach, engagement rate, and follower growth in real time",
        "bullets": [
          "Unified dashboard for reach, impressions, clicks, and engagement rate",
          "Best-time-to-post heatmaps based on your audience activity",
          "Post-by-post performance breakdown and period comparisons",
          "Exportable reports and full REST API access"
        ]
      },
      "ads": {
        "title": "Paid Ads Manager & Conversions API",
        "shortTitle": "Paid Ads",
        "tagline": "Launch and track campaigns across Meta, Google, TikTok, LinkedIn, X & OpenAI",
        "bullets": [
          "Create and manage campaigns, ad sets, and budgets from one dashboard",
          "1-click post boosting and Click-to-WhatsApp (CTWA) ad creation",
          "Server-Side Conversions API (CAPI) for accurate purchase attribution",
          "Sync custom customer lists and Lookalike audiences effortlessly"
        ]
      },
      "telephony": {
        "title": "Cloud Phone Numbers, SMS & AI Voice",
        "shortTitle": "Phone & Voice AI",
        "tagline": "Global phone numbers, SMS/WhatsApp messaging, WebRTC dialer & 24/7 AI voice agents",
        "bullets": [
          "Buy or port international phone numbers with Voice, SMS, RCS & WhatsApp",
          "Connect inbound calls to an AI Voice receptionist in 1 click",
          "Make and receive calls directly in your browser (WebRTC Softphone)",
          "Send OTP verification codes and operate WhatsApp Business flows"
        ]
      },
      "commerce_local": {
        "title": "E-Commerce Stores & Google Business SEO",
        "shortTitle": "Stores & Local SEO",
        "tagline": "Manage Shopify & WooCommerce products, blogs, and Google Business locations",
        "bullets": [
          "Unified view for products, inventory, orders, and discount codes",
          "Publish articles to Shopify Blogs and WordPress from one editor",
          "Manage Google Business Profile locations, offers, and customer reviews",
          "Sync product catalogs directly with Meta and TikTok dynamic ads"
        ]
      },
      "support_ai": {
        "title": "AI Assistant & Developer API Keys",
        "shortTitle": "AI Assistant & API",
        "tagline": "Instant AI troubleshooting for your accounts + API keys for developers",
        "bullets": [
          "Ask the AI Assistant why a post failed or check account health in one click",
          "Generate Asra3 API keys (tk_live_...) to integrate our services into your app",
          "Configure real-time webhooks for incoming messages and published posts"
        ]
      }
    }
  },
  "pricingSection": {
    "eyebrow": "Simple, Transparent Pricing",
    "title": "Start Free and Scale as You Grow",
    "subtitle": "Every plan includes full access to both our web dashboard and the Asra3 REST API.",
    "perMonth": "/ month",
    "choosePlan": "Get Started",
    "popularBadge": "Most Popular",
    "plans": {
      "starter": {
        "name": "Starter",
        "desc": "Perfect for creators, solo founders, and small brands.",
        "features": [
          "Up to 5 connected social accounts",
          "300 scheduled posts / month",
          "Cross-platform composer & Smart Queue",
          "Core analytics dashboard + API access"
        ]
      },
      "growth": {
        "name": "Growth",
        "desc": "For growing businesses needing a unified inbox and store sync.",
        "features": [
          "Up to 15 accounts + 1 cloud phone number",
          "2,000 posts & 10,000 messages / month",
          "Unified Inbox + Comment-to-DM automations",
          "Shopify, WooCommerce & Google Business sync"
        ]
      },
      "agency": {
        "name": "Pro / Agency",
        "desc": "All 8 products unlocked including Paid Ads and AI Voice receptionists.",
        "features": [
          "Up to 50 accounts + 5 phone numbers",
          "All 8 Paid Ad Networks + Conversions API",
          "AI Voice Agent + Browser WebRTC Dialer",
          "Real-time webhooks & priority support"
        ]
      },
      "enterprise": {
        "name": "Enterprise",
        "desc": "High-volume limits, multiple API keys, and dedicated infrastructure.",
        "features": [
          "500 connected accounts + 50 phone numbers",
          "Multiple scoped API keys for your engineering team",
          "Custom rate limits & dedicated account manager",
          "99.9% uptime SLA & custom integrations"
        ]
      }
    }
  },
  "faqSection": {
    "eyebrow": "Frequently Asked Questions",
    "title": "Everything You Need to Know About Asra3 (asra3.com)",
    "subtitle": "Clear answers on how to use the dashboard or integrate our API into your product.",
    "items": [
      {
        "q": "What is Asra3 (asra3.com)?",
        "a": "Asra3 (asra3.com) is an all-in-one marketing and communications platform + developer API. It lets you connect 18 social and blog platforms, manage a unified WhatsApp/Instagram inbox, run ads across 8 networks, and operate cloud phone numbers with AI voice agents from one dashboard or a single REST API key."
      },
      {
        "q": "Can I use Asra3 without writing any code?",
        "a": "Yes! Our web dashboard (/dashboard) is built for everyday businesses, marketers, and creators. You can connect your accounts in one click, schedule posts, reply to messages, and launch ads with zero technical setup."
      },
      {
        "q": "Can I integrate Asra3 as a third-party API in my own app or AI agent?",
        "a": "Absolutely. Developers can generate an API key (tk_live_...) and call https://asra3.com/api/v1 to connect user accounts, schedule content, read analytics, and send WhatsApp/SMS messages programmatically."
      },
      {
        "q": "Which platforms and ad networks are supported?",
        "a": "We support 18 channels (Instagram, Facebook, TikTok, LinkedIn, X/Twitter, YouTube, Threads, Pinterest, Reddit, Bluesky, Snapchat, Google Business Profile, Telegram, Discord, Slack, WhatsApp, Shopify, and WordPress) and 8 ad networks (Meta, Google, TikTok, LinkedIn, Pinterest, X, Reddit, and OpenAI Ads)."
      }
    ]
  },
  "dashboard": {
    "activeTenant": "Active Account",
    "newTenant": "+ New Account",
    "syncBtn": "Refresh",
    "groupChannels": "Accounts & Publishing",
    "groupGrowth": "Inbox & Analytics",
    "groupEnterprise": "Ads, Phone & Store",
    "quotasTitle": "Plan Usage",
    "maxChannels": "Connected Accounts",
    "monthlyPosts": "Monthly Posts",
    "phoneNumbers": "Phone Numbers",
    "aiBudget": "AI Assistant Credits",
    "lockedTitle": "Feature Not Included in Current Plan",
    "lockedDesc": "Upgrade your plan or enable this module in Admin settings to unlock it immediately.",
    "openAdminBtn": "Manage Plan Settings",
    "connectStep1Title": "Account Permissions",
    "connectStep1Desc": "Default permissions enabled automatically.",
    "connectStep2Title": "Add a New Account (1-Click Connect)",
    "connectStep2Desc": "Click any platform below to connect your account in seconds:",
    "entityPickerTitle": "Select Page or Profile",
    "entityPickerDesc": "Choose which page or profile to link:",
    "directTokenTitle": "Quick Connect for Shopify or WordPress",
    "directTokenDesc": "Enter your store domain or site URL to link it directly:",
    "connectTokenBtn": "Connect Store",
    "connectedAccountsTitle": "Your Connected Accounts",
    "composerTitle": "Create & Schedule Post",
    "composerPlaceholder": "Write your post caption here... Add hashtags, links, or emojis ✨",
    "useSmartQueue": "Auto-schedule in best engagement slot (Smart Queue)",
    "uploadMediaBtn": "Attach Image / Video",
    "publishNowBtn": "Publish / Schedule Now",
    "inboxTitle": "Unified Messages & Comments",
    "replyBtn": "Send",
    "automationTitle": "Auto-DM on Comment",
    "automationDesc": "Automatically send a private DM when someone comments a keyword on your post:",
    "activateAutomationBtn": "Enable Auto-DM",
    "analyticsImpressions": "Impressions",
    "analyticsReach": "Total Reach",
    "analyticsEngagement": "Engagement Rate",
    "analyticsFollowers": "New Followers",
    "adsTitle": "Active Ad Campaigns",
    "connectAdBtn": "Connect Ad Account",
    "capiTitle": "Conversions API (CAPI) Tracker",
    "capiDesc": "Send purchase events to optimize Meta and Google ad delivery.",
    "sendCapiBtn": "Send Test Conversion",
    "kycTitle": "Phone Number Verification",
    "kycDesc": "Activate and verify a new international phone number in one step.",
    "generateKycBtn": "Verify New Number",
    "voiceAgentTitle": "24/7 AI Voice Receptionist",
    "voiceAgentDesc": "Route incoming phone calls to an intelligent AI Voice agent.",
    "bindVoiceBtn": "Enable Voice AI",
    "webrtcTitle": "Browser Phone Dialer",
    "webrtcDesc": "Make and receive phone calls directly from your browser.",
    "startWebrtcBtn": "Open Web Dialer",
    "commerceTitle": "Store Products (Shopify & WooCommerce)",
    "localSeoTitle": "Google Business Locations",
    "aiSupportTitle": "AI Assistant & Developer API Keys",
    "aiSupportDesc": "Ask the AI Assistant to check any post or connected account:",
    "runDiagnosisBtn": "Ask AI Assistant"
  },
  "admin": {
    "title": "Platform Admin & Plan Settings",
    "subtitle": "Manage enabled products, supported platforms, pricing plans, and customer accounts.",
    "headlessEnforced": "Direct Connect Active",
    "headlessOptional": "Standard Mode",
    "tabGlobal": "1. Enabled Products & Channels",
    "tabPlans": "2. Plans & Pricing",
    "tabTenants": "3. Accounts & API Keys",
    "tabBilling": "4. Revenue & Costs",
    "globalServicesTitle": "Enable or Disable the 8 Platform Products",
    "globalScopesTitle": "Default OAuth Scopes",
    "globalPlatformsTitle": "Supported Social & Blog Channels (18 Platforms)",
    "globalAdsTitle": "Supported Paid Ad Networks (8 Networks)",
    "provisionTenantBtn": "Create New Account",
    "openWorkspaceBtn": "View Dashboard",
    "mintKeyBtn": "Generate API Key",
    "suspendBtn": "Suspend",
    "restoreBtn": "Restore",
    "billingTitle": "Provider Cost vs. Subscription Revenue",
    "colTenant": "Customer Account",
    "colProfile": "Profile ID",
    "colPlan": "Plan",
    "colWholesale": "Provider Cost",
    "colRetail": "Subscription Price",
    "colMargin": "Net Profit"
  },
  "docs": {
    "badge": "Official Developer Documentation · asra3.com/docs",
    "title": "Asra3 API Documentation",
    "subtitle": "Create an API key, connect an account, and schedule your first post with 5 calls to the Asra3 API.",
    "baseUrlLabel": "Base URL",
    "authTitle": "Authentication & API Keys",
    "authDesc": "Send your API key in the Authorization: Bearer tk_live_... header on every request.",
    "webhooksTitle": "Webhooks & Real-Time Events",
    "webhooksDesc": "Receive instant notifications for messages and posts verified with HMAC-SHA256.",
    "endpointsTitle": "API Reference",
    "tryEndpointBtn": "Try it live"
  },
  "telephony": {
    "eyebrow": "Virtual Numbers, WhatsApp & Voice AI",
    "title": "Buy Numbers in 55+ Countries, Send/Receive SMS & Make Phone Calls",
    "subtitle": "Acquire dedicated numbers, bind them to WhatsApp Business with pre-approved templates, and deploy low-latency conversational AI voice agents with live PSTN calling.",
    "marketTitle": "Virtual Number Marketplace",
    "marketSubtitle": "Instant phone numbers across 55+ countries with automated regulatory KYC",
    "buyBtn": "Buy & Activate Number",
    "typeFilterAll": "All (Local, Mobile, Toll-Free)",
    "typeFilterMobile": "Mobile Numbers",
    "typeFilterLocal": "Local Numbers",
    "typeFilterTollFree": "Toll-Free Numbers",
    "dialerTitle": "Web Phone Dialer & Call Console",
    "dialerSubtitle": "Make and receive phone calls directly in your browser over your virtual lines",
    "callModeDirect": "Direct Voice Call",
    "callModeAi": "AI Voice Agent Call",
    "callBtn": "Start Call Now",
    "endCallBtn": "End Call",
    "smsTitle": "Live 2-Way SMS & WhatsApp Inbox",
    "simulateOtpBtn": "Simulate Incoming OTP",
    "simulateSmsBtn": "Simulate Incoming SMS",
    "whatsappTitle": "Link Number to WhatsApp Business",
    "linkWhatsappBtn": "Start WhatsApp Linking Wizard"
  },
  "connectionWizard": {
    "modalTitle": "Social & Messaging Connection Wizard",
    "modalSubtitle": "Connect social channels, messaging apps, stores, and blogs through guided interactive steps.",
    "step1Title": "1. Select Platform & Method",
    "step2Title": "2. Authenticate & Authorize",
    "step3Title": "3. Select Target Page or Entity",
    "step4Title": "4. Connection Verified & Ready",
    "methodOAuth": "1-Click Secure OAuth",
    "methodToken": "Direct Credential / Bot Token",
    "testPostBtn": "Send Test Post / Message",
    "connectedBadge": "Connected & Ready ✓"
  },
  "auth": {
        "loginTitle": "Sign In to Your Workspace",
        "loginSubtitle": "Enter your credentials to access your isolated customer workspace and manage channels & telephony.",
        "signupTitle": "Create Your Asra3 Account",
        "signupSubtitle": "Connect your social channels, schedule posts, manage messages & ads, or grab your API key right away.",
        "emailLabel": "Work Email",
        "passwordLabel": "Password",
        "nameLabel": "Full Name",
        "companyLabel": "Project / Company Name (Optional)",
        "selectPlanLabel": "Select Your Plan:",
        "submitLogin": "Sign In",
        "submitSignup": "Get Started Free",
        "alreadyHaveAccount": "Already have an account? ",
        "needAccount": "Don't have an account? ",
        "demoPersonasTitle": "Quick Demo Personas",
        "whatYouGetTitle": "What You Get Immediately",
        "workEmailRequired": "Please enter your work email.",
        "signInFailed": "Sign in failed.",
        "unableToSignIn": "Unable to sign in.",
        "signingIn": "Signing In...",
        "orContinueWith": "Or continue with",
        "continueWithGoogle": "Continue with Google",
        "enterpriseIsolation": "Enterprise Tenant Isolation",
        "unifiedTitle": "Unified Communications & Marketing",
        "unifiedDesc": "Access your dedicated tenant workspace with zero clutter. Connect 18 social channels, provision virtual phone numbers from 55+ countries, and automate WhatsApp & AI Voice.",
        "socialChannelsFeature": "18 Social & Messaging Channels",
        "telephonyFeature": "Global Telephony & Voice AI",
        "telephonyFeatureDesc": "Receive SMS, trigger WhatsApp broadcasts, and dial WebRTC calls",
        "storageFeature": "Persistent File-Based Storage",
        "storageFeatureDesc": "Every action, number, and channel is saved permanently to your workspace",
        "signUpBadge": "Start free in under 60 seconds",
        "fullNamePlaceholder": "Alex Rivera",
        "companyNamePlaceholder": "My Brand",
        "whatYouGet1": "1-click connection for 18 platforms (Instagram, TikTok, LinkedIn, YouTube, WhatsApp, Shopify & more).",
        "whatYouGet2": "Schedule posts & Reels, reply to unified inbox messages, and enable Comment-to-DM.",
        "whatYouGet3": "Instant Asra3 API Key (tk_live_...) if you want to integrate our endpoints into your own app.",
        "exploreApiDocs": "Explore Developer API Docs"
    },
  "showcase": {
        "platformEyebrow": "Comprehensive 18-Network Platform",
        "platformTitle": "Advanced Native Integrations with Live Platform Mockups",
        "platformSubtitle": "Publish content, moderate comments, and automate messaging across all networks from one unified API.",
        "adsEyebrow": "Unified 8-Network Ad Engine",
        "adsTitle": "Launch, Moderate, and Report Campaigns Across 8 Ad Networks",
        "adsSubtitle": "Full synchronization with Meta, Google, TikTok, LinkedIn, X, Pinterest, Reddit, and OpenAI Ads with budget automation and CAPI tracking.",
        "devHubEyebrow": "Developer & AI Agent Hub",
        "devHubTitle": "8 SDKs, Ready-to-Use MCP Server, and Developer CLI",
        "devHubSubtitle": "Build in your favorite programming language or let Claude Code and Cursor automate social publishing and phone number provisioning.",
        "copied": "Copied!",
        "copyPrompt": "Copy AI Agent Setup Prompt",
        "promptCopiedToast": "Setup prompt copied to clipboard!"
    }
};

const dict_es: TranslationDictionary = {
  "brand": {
    "name": "Asra3",
    "domain": "asra3.com",
    "tagline": "Plataforma Unificada de Redes Sociales, Publicidad, Mensajería, Telefonía IA y API para Desarrolladores"
  },
  "nav": {
    "home": "Inicio",
    "workspace": "Panel",
    "docs": "Documentación API",
    "admin": "Admin",
    "login": "Iniciar Sesión",
    "signup": "Comenzar Gratis",
    "lightMode": "Modo Claro",
    "darkMode": "Modo Oscuro",
    "logout": "Cerrar sesión",
    "signOut": "Salir"
  },
  "hero": {
    "badge": "Nube Unificada de Marketing y Mensajería + API para Desarrolladores · asra3.com",
    "titlePart1": "Llega a Tus Clientes en Todas Partes con",
    "titleHighlight": "Una Plataforma y Una API",
    "titlePart2": "Sin Esperar Meses por Aprobaciones.",
    "subtitle": "Asra3 (asra3.com) conecta 18 redes sociales y blogs, 8 redes de publicidad, buzón unificado de WhatsApp/Instagram, números internacionales con agentes de voz IA y comercio electrónico: listo para usar en tu panel o integrar mediante API REST en minutos.",
    "ctaStart": "Comenzar Gratis",
    "ctaWorkspace": "Abrir Panel",
    "ctaDocs": "Documentación API",
    "stat1Label": "Endpoints API Listos",
    "stat2Label": "Canales Sociales y de Anuncios",
    "stat3Label": "Llamadas Hasta el Primer Post",
    "stat4Label": "Conexión Inmediata en 1 Clic"
  },
  "subServicesSection": {
    "eyebrow": "Suite Integral de Productos",
    "title": "8 Productos Integrados: Úsalos en el Panel o vía API",
    "subtitle": "Gestiona todos tus canales directamente desde nuestro panel intuitivo o construye sobre Asra3 como tu API externa de marketing.",
    "openInWorkspace": "Abrir en el Panel",
    "viewApiDocs": "Referencia de la API",
    "services": {
      "core_connect": {
        "title": "Conexión de Cuentas en 1 Clic",
        "shortTitle": "Cuentas Conectadas",
        "tagline": "Conecta 18 redes sociales, apps de mensajería, blogs y tiendas en segundos",
        "bullets": [
          "OAuth inmediato en 1 clic para Instagram, TikTok, Facebook, X, LinkedIn, YouTube y Threads",
          "Compatibilidad con Telegram, Discord, Slack, WhatsApp, Snapchat, Pinterest, Reddit y Bluesky",
          "Conexión directa para tiendas Shopify, blogs WordPress y ubicaciones de Google Business",
          "Renovación automática de credenciales y comprobación en tiempo real del estado de conexión"
        ]
      },
      "publishing": {
        "title": "Publicación Multiplataforma y Colas Inteligentes",
        "shortTitle": "Publicar y Programar",
        "tagline": "Escribe una vez y programa publicaciones, Reels y carruseles en 16 plataformas",
        "bullets": [
          "Editor unificado para imágenes, vídeos, Reels, carruseles, hilos y encuestas",
          "Programación adaptada a zonas horarias y colas de publicación automatizadas (Smart Queue)",
          "Subida veloz de archivos multimedia firmados con validación de formatos",
          "Primer comentario automatizado y personalización de textos por plataforma"
        ]
      },
      "inbox_crm": {
        "title": "Buzón Unificado, Auto-DM y CRM Social",
        "shortTitle": "Buzón y Auto-DM",
        "tagline": "Centraliza mensajes directos de WhatsApp, Instagram, Facebook, comentarios y reseñas",
        "bullets": [
          "Bandeja unificada para DMs, comentarios de posts y opiniones de Google/Facebook",
          "Automatizaciones de comentario a mensaje privado (Comment-to-DM) por palabra clave",
          "Campañas masivas de difusión y secuencias automatizadas de seguimiento",
          "Gestión integral de contactos y atributos personalizados de CRM"
        ]
      },
      "analytics": {
        "title": "Analíticas Multiplataforma e Informes",
        "shortTitle": "Analíticas",
        "tagline": "Mide impresiones, alcance, tasa de interacción y nuevos seguidores en tiempo real",
        "bullets": [
          "Panel unificado para alcance, impresiones, clics y ratios de interacción",
          "Mapas de calor con las mejores horas para publicar según la audiencia",
          "Desglose de rendimiento por publicación y comparativas temporales",
          "Exportación de informes y acceso total mediante API REST"
        ]
      },
      "ads": {
        "title": "Gestor de Publicidad y API de Conversiones (CAPI)",
        "shortTitle": "Publicidad de Pago",
        "tagline": "Lanza y monitoriza campañas en Meta, Google, TikTok, LinkedIn, X y OpenAI",
        "bullets": [
          "Crea y optimiza campañas, conjuntos de anuncios y presupuestos desde un único panel",
          "Promoción de publicaciones en 1 clic y anuncios con clic hacia WhatsApp (CTWA)",
          "API de conversiones del lado del servidor (CAPI) para atribución precisa de compras",
          "Sincronización fluida de listas de clientes y audiencias similares (Lookalike)"
        ]
      },
      "telephony": {
        "title": "Telefonía en la Nube, SMS y Voz con IA",
        "shortTitle": "Telefonía y Voz IA",
        "tagline": "Números internacionales, mensajería SMS/WhatsApp, marcador WebRTC y agentes de voz IA 24/7",
        "bullets": [
          "Compra o porta números internacionales con voz, SMS, RCS y WhatsApp",
          "Enruta llamadas entrantes a un agente de voz con inteligencia artificial en 1 clic",
          "Realiza y recibe llamadas directamente desde el navegador (Softphone WebRTC)",
          "Envía códigos de verificación OTP y opera flujos oficiales de WhatsApp Business"
        ]
      },
      "commerce_local": {
        "title": "Tiendas Online y Posicionamiento Google Business",
        "shortTitle": "Tiendas y SEO Local",
        "tagline": "Gestiona productos de Shopify y WooCommerce, artículos de blog y fichas de Google Business",
        "bullets": [
          "Visualización unificada de catálogo, inventario, pedidos y códigos de descuento",
          "Publica entradas en blogs de Shopify y WordPress desde un solo editor",
          "Administra sedes de Google Business Profile, horarios, ofertas y responde a reseñas",
          "Sincroniza inventarios de productos con anuncios dinámicos de Meta y TikTok"
        ]
      },
      "support_ai": {
        "title": "Asistente IA y Claves de API para Desarrolladores",
        "shortTitle": "Asistente IA y API",
        "tagline": "Diagnóstico inmediato con IA para tus canales + claves de API para desarrolladores",
        "bullets": [
          "Pregunta al Asistente IA la causa de fallos en posts o verifica el estado de cuentas en 1 clic",
          "Genera claves de API Asra3 (tk_live_...) para conectar servicios a tu app",
          "Configura webhooks en tiempo real para mensajes entrantes y contenido publicado"
        ]
      }
    }
  },
  "pricingSection": {
    "eyebrow": "Precios Claros y Transparentes",
    "title": "Empieza Gratis y Escala a tu Ritmo",
    "subtitle": "Todos los planes incluyen acceso completo tanto al panel web como a la API REST de Asra3.",
    "perMonth": "/ mes",
    "choosePlan": "Comenzar Ahora",
    "popularBadge": "Más Popular",
    "plans": {
      "starter": {
        "name": "Starter",
        "desc": "Perfecto para creadores, profesionales independientes y startups.",
        "features": [
          "Hasta 5 cuentas sociales conectadas",
          "300 publicaciones programadas al mes",
          "Editor multiplataforma y cola inteligente",
          "Panel analítico básico + acceso a la API"
        ]
      },
      "growth": {
        "name": "Growth",
        "desc": "Para empresas en expansión que necesitan bandeja unificada y sincronización con tiendas.",
        "features": [
          "Hasta 15 cuentas + 1 número de teléfono en la nube",
          "2.000 publicaciones y 10.000 mensajes al mes",
          "Buzón unificado + automatización Comment-to-DM",
          "Sincronización con Shopify, WooCommerce y Google Business"
        ]
      },
      "agency": {
        "name": "Pro / Agency",
        "desc": "Los 8 productos desbloqueados, incluyendo gestión de publicidad y recepción por voz IA.",
        "features": [
          "Hasta 50 cuentas + 5 números internacionales",
          "Las 8 redes de anuncios + API de conversiones",
          "Agente de voz con IA + marcador WebRTC en el navegador",
          "Webhooks instantáneos y soporte prioritario"
        ]
      },
      "enterprise": {
        "name": "Enterprise",
        "desc": "Límites masivos, múltiples claves de API e infraestructura dedicada.",
        "features": [
          "500 cuentas conectadas + 50 números telefónicos",
          "Múltiples claves de API con permisos granulares para equipos",
          "Límites de peticiones personalizados y gestor de cuenta asignado",
          "SLA del 99,9% de disponibilidad e integraciones a medida"
        ]
      }
    }
  },
  "faqSection": {
    "eyebrow": "Preguntas Frecuentes",
    "title": "Todo lo que Necesitas Saber Sobre Asra3 (asra3.com)",
    "subtitle": "Respuestas directas sobre cómo utilizar la plataforma o integrarla mediante API.",
    "items": [
      {
        "q": "¿Qué es Asra3 (asra3.com) y qué ventajas ofrece?",
        "a": "Asra3 (asra3.com) es una plataforma integral de marketing, comunicaciones y API para desarrolladores. Te permite conectar 18 redes sociales y blogs, gestionar un buzón unificado de WhatsApp e Instagram, lanzar publicidad en 8 plataformas y operar telefonía virtual con agentes de voz IA desde un solo panel o mediante una clave API REST."
      },
      {
        "q": "¿Puedo usar Asra3 sin conocimientos técnicos ni de programación?",
        "a": "¡Totalmente! Nuestro panel web (/dashboard) está concebido para empresas, creadores y equipos de marketing. Puedes vincular tus cuentas en un clic, programar publicaciones, responder mensajes y activar campañas sin escribir código."
      },
      {
        "q": "¿Puedo integrar Asra3 como API de terceros en mi propia aplicación o agente de IA?",
        "a": "Sin duda. Los desarrolladores pueden emitir una clave de API (tk_live_...) e interactuar con https://asra3.com/api/v1 para vincular cuentas de clientes, programar contenido, consultar métricas y enviar mensajes de WhatsApp/SMS de manera programática."
      },
      {
        "q": "¿Qué plataformas sociales y redes publicitarias son compatibles?",
        "a": "Soportamos 18 canales (Instagram, Facebook, TikTok, LinkedIn, X/Twitter, YouTube, Threads, Pinterest, Reddit, Bluesky, Snapchat, Google Business, Telegram, Discord, Slack, WhatsApp, Shopify y WordPress) y 8 redes publicitarias (Meta, Google, TikTok, LinkedIn, Pinterest, X, Reddit y OpenAI Ads)."
      }
    ]
  },
  "dashboard": {
    "activeTenant": "Cuenta Activa",
    "newTenant": "+ Nueva Cuenta",
    "syncBtn": "Actualizar",
    "groupChannels": "Cuentas y Publicación",
    "groupGrowth": "Buzón y Analíticas",
    "groupEnterprise": "Publicidad, Teléfono y Tiendas",
    "quotasTitle": "Consumo del Plan",
    "maxChannels": "Cuentas Conectadas",
    "monthlyPosts": "Publicaciones Mensuales",
    "phoneNumbers": "Líneas Telefónicas",
    "aiBudget": "Créditos de Asistente IA",
    "lockedTitle": "Función no incluida en tu plan actual",
    "lockedDesc": "Mejora tu suscripción o activa este módulo en la sección de administración para desbloquearlo.",
    "openAdminBtn": "Gestionar Ajustes de Planes",
    "connectStep1Title": "Permisos de la Cuenta",
    "connectStep1Desc": "Permisos predeterminados concedidos automáticamente.",
    "connectStep2Title": "Vincular Nueva Cuenta (Conexión en 1 Clic)",
    "connectStep2Desc": "Haz clic en cualquier plataforma para conectarla en segundos:",
    "entityPickerTitle": "Seleccionar Página o Perfil",
    "entityPickerDesc": "Elige qué página o perfil deseas administrar:",
    "directTokenTitle": "Conexión Rápida para Shopify o WordPress",
    "directTokenDesc": "Introduce la URL o dominio de tu tienda para conectarla directamente:",
    "connectTokenBtn": "Conectar Tienda",
    "connectedAccountsTitle": "Tus Cuentas Conectadas",
    "composerTitle": "Crear y Programar Publicación",
    "composerPlaceholder": "Escribe aquí el texto de tu publicación... Añade etiquetas, enlaces o emojis ✨",
    "useSmartQueue": "Programar en la franja con mayor interacción (Smart Queue)",
    "uploadMediaBtn": "Adjuntar Imagen / Vídeo",
    "publishNowBtn": "Publicar / Programar Ahora",
    "inboxTitle": "Buzón Unificado de Mensajes y Comentarios",
    "replyBtn": "Enviar",
    "automationTitle": "Auto-DM en Comentarios",
    "automationDesc": "Envía automáticamente un mensaje privado cuando alguien comente una palabra clave:",
    "activateAutomationBtn": "Activar Auto-DM",
    "analyticsImpressions": "Impresiones",
    "analyticsReach": "Alcance Total",
    "analyticsEngagement": "Tasa de Interacción",
    "analyticsFollowers": "Nuevos Seguidores",
    "adsTitle": "Campañas Publicitarias Activas",
    "connectAdBtn": "Conectar Cuenta Publicitaria",
    "capiTitle": "Rastreador de API de Conversiones (CAPI)",
    "capiDesc": "Envía eventos de compra para optimizar el rendimiento de anuncios en Meta y Google.",
    "sendCapiBtn": "Enviar Conversión de Prueba",
    "kycTitle": "Verificación de Número de Teléfono",
    "kycDesc": "Activa y verifica una nueva línea telefónica internacional en un solo paso.",
    "generateKycBtn": "Verificar Nueva Línea",
    "voiceAgentTitle": "Recepcionista de Voz IA 24/7",
    "voiceAgentDesc": "Enruta las llamadas entrantes hacia un agente inteligente con voz artificial.",
    "bindVoiceBtn": "Activar Voz IA",
    "webrtcTitle": "Marcador Telefónico en el Navegador",
    "webrtcDesc": "Emite y recibe llamadas telefónicas directamente desde tu navegador.",
    "startWebrtcBtn": "Abrir Marcador Web",
    "commerceTitle": "Productos de la Tienda (Shopify / WooCommerce)",
    "localSeoTitle": "Sedes en Google Business",
    "aiSupportTitle": "Asistente IA y Claves de API",
    "aiSupportDesc": "Consulta al Asistente IA para comprobar publicaciones o cuentas conectadas:",
    "runDiagnosisBtn": "Consultar al Asistente IA"
  },
  "admin": {
    "title": "Panel de Administración y Planes",
    "subtitle": "Gestiona productos habilitados, canales admitidos, planes de precios y cuentas de clientes.",
    "headlessEnforced": "Conexión Directa Activa",
    "headlessOptional": "Modo Estándar",
    "tabGlobal": "1. Productos y Canales Habilitados",
    "tabPlans": "2. Planes y Tarifas",
    "tabTenants": "3. Cuentas y Claves de API",
    "tabBilling": "4. Ingresos y Costes",
    "globalServicesTitle": "Activar o Desactivar los 8 Productos de la Plataforma",
    "globalScopesTitle": "Permisos OAuth por Defecto",
    "globalPlatformsTitle": "Canales Sociales y de Blog Admitidos (18 Plataformas)",
    "globalAdsTitle": "Redes de Publicidad Admitidas (8 Redes)",
    "provisionTenantBtn": "Crear Nueva Cuenta",
    "openWorkspaceBtn": "Ver Panel",
    "mintKeyBtn": "Generar Clave de API",
    "suspendBtn": "Suspender",
    "restoreBtn": "Restaurar",
    "billingTitle": "Coste de Proveedor frente a Ingresos por Suscripción",
    "colTenant": "Cuenta de Cliente",
    "colProfile": "ID de Perfil",
    "colPlan": "Plan",
    "colWholesale": "Coste Mayorista",
    "colRetail": "Precio de Suscripción",
    "colMargin": "Beneficio Neto"
  },
  "docs": {
    "badge": "Documentación Oficial para Desarrolladores · asra3.com/docs",
    "title": "Documentación de la API de Asra3",
    "subtitle": "Crea una clave de API, conecta una cuenta y programa tu primer post en 5 llamadas con la API unificada.",
    "baseUrlLabel": "URL Base de la API",
    "authTitle": "Autenticación y Claves de API",
    "authDesc": "Envía tu clave en la cabecera Authorization: Bearer tk_live_... en todas tus peticiones.",
    "webhooksTitle": "Webhooks y Eventos en Tiempo Real",
    "webhooksDesc": "Recibe notificaciones inmediatas de mensajes y publicaciones verificadas con HMAC-SHA256.",
    "endpointsTitle": "Referencia de Endpoints",
    "tryEndpointBtn": "Probar en directo"
  },
  "telephony": {
    "eyebrow": "Números Virtuales, WhatsApp y Voz con IA",
    "title": "Compra Números en 55+ Países, Envía/Recibe SMS y Haz Llamadas",
    "subtitle": "Adquiere líneas dedicadas, conéctalas a WhatsApp Business con plantillas aprobadas y despliega agentes de voz con IA conversacional de baja latencia con llamadas PSTN reales.",
    "marketTitle": "Catálogo de Números Virtuales",
    "marketSubtitle": "Líneas telefónicas inmediatas en más de 55 países con verificación KYC automatizada",
    "buyBtn": "Comprar y Activar Número",
    "typeFilterAll": "Todos (Local, Móvil, Gratuito)",
    "typeFilterMobile": "Números Móviles",
    "typeFilterLocal": "Números Locales",
    "typeFilterTollFree": "Números Gratuitos (Toll-Free)",
    "dialerTitle": "Marcador Web y Consola de Llamadas",
    "dialerSubtitle": "Realiza y atiende llamadas directamente en tu navegador a través de tus líneas virtuales",
    "callModeDirect": "Llamada de Voz Directa",
    "callModeAi": "Llamada con Agente de Voz IA",
    "callBtn": "Iniciar Llamada Ahora",
    "endCallBtn": "Finalizar Llamada",
    "smsTitle": "Buzón en Vivo de SMS y WhatsApp Bidireccional",
    "simulateOtpBtn": "Simular Código OTP Entrante",
    "simulateSmsBtn": "Simular SMS Entrante",
    "whatsappTitle": "Vincular Número a WhatsApp Business",
    "linkWhatsappBtn": "Iniciar Asistente de WhatsApp"
  },
  "connectionWizard": {
    "modalTitle": "Asistente de Conexión de Canales y Redes",
    "modalSubtitle": "Vincula redes sociales, plataformas de mensajería, tiendas y blogs mediante pasos interactivos guiados.",
    "step1Title": "1. Seleccionar Plataforma y Método",
    "step2Title": "2. Autenticar y Autorizar",
    "step3Title": "3. Seleccionar Página o Perfil Destino",
    "step4Title": "4. Verificado y Listo",
    "methodOAuth": "OAuth Seguro en 1 Clic",
    "methodToken": "Credencial Directa / Bot Token",
    "testPostBtn": "Enviar Publicación / Mensaje de Prueba",
    "connectedBadge": "Conectado y Listo para Operar ✓"
  },
  "auth": {
        "loginTitle": "Inicia sesión en tu espacio de trabajo",
        "loginSubtitle": "Ingresa tus credenciales para acceder a tu espacio aislado de cliente y administrar canales y telefonía.",
        "signupTitle": "Crea tu cuenta de Asra3",
        "signupSubtitle": "Conecta tus canales sociales, programa publicaciones, administra mensajes y anuncios o genera tu clave API al instante.",
        "emailLabel": "Correo electrónico laboral",
        "passwordLabel": "Contraseña",
        "nameLabel": "Nombre completo",
        "companyLabel": "Nombre del proyecto o empresa (Opcional)",
        "selectPlanLabel": "Selecciona tu plan:",
        "submitLogin": "Iniciar sesión",
        "submitSignup": "Comienza gratis",
        "alreadyHaveAccount": "¿Ya tienes una cuenta? ",
        "needAccount": "¿No tienes una cuenta? ",
        "demoPersonasTitle": "Personas de demostración rápida",
        "whatYouGetTitle": "Lo que obtienes de inmediato",
        "workEmailRequired": "Por favor ingresa tu correo laboral.",
        "signInFailed": "Error al iniciar sesión. Revisa tus datos.",
        "unableToSignIn": "No se pudo conectar con el servidor de autenticación.",
        "signingIn": "Verificando sesión...",
        "orContinueWith": "O continúa con",
        "continueWithGoogle": "Continuar con Google",
        "enterpriseIsolation": "Aislamiento de inquilino empresarial",
        "unifiedTitle": "Plataforma unificada de comunicaciones y marketing",
        "unifiedDesc": "Accede a tu espacio de trabajo exclusivo sin desorden. Conecta 18 canales sociales, adquiere números virtuales de más de 55 países y automatiza WhatsApp y Voz con IA.",
        "socialChannelsFeature": "18 canales sociales y de mensajería",
        "telephonyFeature": "Telefonía global y Voz con IA",
        "telephonyFeatureDesc": "Recibe SMS, lanza difusiones de WhatsApp y realiza llamadas WebRTC",
        "storageFeature": "Almacenamiento persistente en archivos",
        "storageFeatureDesc": "Cada acción, número y canal se guarda permanentemente en tu espacio",
        "signUpBadge": "Comienza gratis en menos de 60 segundos",
        "fullNamePlaceholder": "Carlos Gómez",
        "companyNamePlaceholder": "Mi Empresa",
        "whatYouGet1": "Conexión en 1 clic para 18 plataformas (Instagram, TikTok, LinkedIn, YouTube, WhatsApp, Shopify y más).",
        "whatYouGet2": "Programa publicaciones y Reels, responde mensajes en bandeja unificada y activa Comment-to-DM.",
        "whatYouGet3": "Clave API de Asra3 al instante (tk_live_...) para integrar con tus aplicaciones.",
        "exploreApiDocs": "Explorar documentación de API para desarrolladores"
    },
  "showcase": {
        "platformEyebrow": "Plataforma integral de 18 redes",
        "platformTitle": "Integraciones nativas avanzadas con simulaciones en vivo",
        "platformSubtitle": "Publica contenido, modera comentarios y automatiza mensajería en todas las redes desde una API unificada.",
        "adsEyebrow": "Motor unificado de publicidad en 8 redes",
        "adsTitle": "Lanza, modera y reporta campañas en 8 redes publicitarias",
        "adsSubtitle": "Sincronización completa con Meta, Google, TikTok, LinkedIn, X, Pinterest, Reddit y OpenAI Ads con automatización y CAPI.",
        "devHubEyebrow": "Centro para desarrolladores y agentes de IA",
        "devHubTitle": "8 SDKs, servidor MCP listo para usar y CLI de desarrollador",
        "devHubSubtitle": "Programa en tu lenguaje preferido o permite que Claude Code y Cursor automaticen tus publicaciones y telefonía.",
        "copied": "¡Copiado!",
        "copyPrompt": "Copiar prompt de configuración de IA",
        "promptCopiedToast": "¡Prompt de configuración copiado al portapapeles!"
    }
};

const dict_fr: TranslationDictionary = {
  "brand": {
    "name": "Asra3",
    "domain": "asra3.com",
    "tagline": "Plateforme Unifiée Réseaux Sociaux, Publicités, Messagerie, Téléphonie IA & API Développeur"
  },
  "nav": {
    "home": "Accueil",
    "workspace": "Tableau de Bord",
    "docs": "Documentation API",
    "admin": "Admin",
    "login": "Connexion",
    "signup": "Essai Gratuit",
    "lightMode": "Mode Clair",
    "darkMode": "Mode Sombre",
    "logout": "Déconnexion",
    "signOut": "Sortir"
  },
  "hero": {
    "badge": "Cloud Unifié Marketing & Messagerie + API Développeur · asra3.com",
    "titlePart1": "Touchez Vos Clients Partout avec",
    "titleHighlight": "Une Seule Plateforme & API",
    "titlePart2": "Sans Attendre des Mois d'Approbation.",
    "subtitle": "Asra3 (asra3.com) relie 18 réseaux sociaux et blogs, 8 régies publicitaires, une boîte de réception unifiée WhatsApp/Instagram, des numéros cloud avec agents vocaux IA et le e-commerce — utilisable depuis le tableau de bord ou intégrable via API REST en quelques minutes.",
    "ctaStart": "Commencer Gratuitement",
    "ctaWorkspace": "Ouvrir le Tableau de Bord",
    "ctaDocs": "Documentation API",
    "stat1Label": "Points de Terminaison API",
    "stat2Label": "Canaux Sociaux & Publicitaires",
    "stat3Label": "Requêtes Vers la 1ère Publication",
    "stat4Label": "Connexion Immédiate en 1 Clic"
  },
  "subServicesSection": {
    "eyebrow": "Suite Complète de Produits",
    "title": "8 Produits Intégrés — Utilisez le Dashboard ou l'API",
    "subtitle": "Gérez vos canaux directement depuis notre espace fluide ou appuyez-vous sur Asra3 comme API marketing tierce.",
    "openInWorkspace": "Ouvrir dans le Dashboard",
    "viewApiDocs": "Référence API",
    "services": {
      "core_connect": {
        "title": "Connexion de Comptes en 1 Clic",
        "shortTitle": "Comptes Connectés",
        "tagline": "Liez 18 réseaux sociaux, messageries, blogs et boutiques en quelques secondes",
        "bullets": [
          "OAuth immédiat en 1 clic pour Instagram, TikTok, Facebook, X, LinkedIn, YouTube & Threads",
          "Prise en charge de Telegram, Discord, Slack, WhatsApp, Snapchat, Pinterest, Reddit & Bluesky",
          "Connexion directe pour boutiques Shopify, blogs WordPress et fiches Google Business",
          "Renouvellement automatique des jetons et suivi de l'état de synchronisation en temps réel"
        ]
      },
      "publishing": {
        "title": "Publication Multiplateforme & Files Intelligentes",
        "shortTitle": "Publier & Planifier",
        "tagline": "Rédigez une fois et planifiez posts, Reels et carrousels sur 16 plateformes",
        "bullets": [
          "Éditeur unifié pour images, vidéos, Reels, carrousels, threads et sondages",
          "Planification selon les fuseaux horaires et files d'attente automatisées (Smart Queue)",
          "Téléversement ultra-rapide des médias signés avec validation des formats",
          "Premier commentaire automatique et personnalisation du texte par plateforme"
        ]
      },
      "inbox_crm": {
        "title": "Boîte de Réception Unifiée, Auto-DM & CRM Social",
        "shortTitle": "Boîte & Auto-DM",
        "tagline": "Rassemblez DMs WhatsApp, Instagram, Facebook, commentaires et avis clients",
        "bullets": [
          "Boîte unique pour messages privés, commentaires et avis Google/Facebook",
          "Automatisation Comment-to-DM par mot-clé pour capturer des prospects instantanément",
          "Campagnes de diffusion multicanales et séquences de relance programmées",
          "Gestion intégrée des contacts et champs CRM sur mesure"
        ]
      },
      "analytics": {
        "title": "Analyses & Rapports Multi-Réseaux",
        "shortTitle": "Analytique",
        "tagline": "Suivez impressions, portée, taux d'engagement et croissance des abonnés en direct",
        "bullets": [
          "Tableau de bord unifié pour la portée, les impressions, clics et interactions",
          "Cartes thermiques des meilleurs créneaux horaires d'engagement",
          "Analyse détaillée des performances publication par publication",
          "Exportation de rapports et accès complet via l'API REST"
        ]
      },
      "ads": {
        "title": "Gestionnaire Publicitaire & API Conversions (CAPI)",
        "shortTitle": "Publicités Payantes",
        "tagline": "Lancez et mesurez vos campagnes sur Meta, Google, TikTok, LinkedIn, X et OpenAI",
        "bullets": [
          "Créez et ajustez campagnes, ensembles d'annonces et budgets depuis une seule interface",
          "Boost de publication en 1 clic et annonces vers WhatsApp (Click-to-WhatsApp)",
          "API de Conversions côté serveur (CAPI) pour un suivi exact des ventes",
          "Synchronisation fluide des listes clients et audiences similaires (Lookalike)"
        ]
      },
      "telephony": {
        "title": "Téléphonie Cloud, SMS & Voix IA",
        "shortTitle": "Téléphonie & Voix IA",
        "tagline": "Numéros internationaux, SMS/WhatsApp, numéroteur WebRTC et agents vocaux IA 24/7",
        "bullets": [
          "Achetez ou portez des numéros internationaux avec voix, SMS, RCS et WhatsApp",
          "Transférez les appels entrants vers un réceptionniste vocal IA en 1 clic",
          "Passez et recevez des appels directement dans votre navigateur (Softphone WebRTC)",
          "Envoyez des codes OTP et pilotez les flux officiels WhatsApp Business"
        ]
      },
      "commerce_local": {
        "title": "Boutiques E-Commerce & Référencement Google Business",
        "shortTitle": "Boutiques & SEO Local",
        "tagline": "Gérez produits Shopify & WooCommerce, articles de blog et profils d'établissements",
        "bullets": [
          "Vue unifiée des produits, stocks, commandes et codes promotionnels",
          "Publiez des articles sur les blogs Shopify et WordPress depuis le même éditeur",
          "Administrez vos fiches Google Business Profile, horaires et avis clients",
          "Synchronisez les catalogues avec les publicités dynamiques Meta et TikTok"
        ]
      },
      "support_ai": {
        "title": "Assistant IA & Clés API Développeur",
        "shortTitle": "Assistant IA & API",
        "tagline": "Dépannage instantané par IA pour vos comptes + clés d'accès API pour vos apps",
        "bullets": [
          "Demandez à l'Assistant IA la raison d'un échec de publication ou vérifiez un compte",
          "Générez des clés API Asra3 (tk_live_...) pour intégrer nos services",
          "Configurez des webhooks en temps réel pour messages et publications"
        ]
      }
    }
  },
  "pricingSection": {
    "eyebrow": "Tarifs Simples et Transparents",
    "title": "Commencez Gratuitement et Évoluez à Votre Rythme",
    "subtitle": "Chaque forfait inclut un accès complet à l'interface web ainsi qu'à l'API REST Asra3.",
    "perMonth": "/ mois",
    "choosePlan": "Démarrer",
    "popularBadge": "Le Plus Populaire",
    "plans": {
      "starter": {
        "name": "Starter",
        "desc": "Idéal pour créateurs, indépendants et jeunes entreprises.",
        "features": [
          "Jusqu'à 5 comptes sociaux connectés",
          "300 publications planifiées / mois",
          "Éditeur multiplateforme & file intelligente",
          "Analytique de base + accès à l'API"
        ]
      },
      "growth": {
        "name": "Growth",
        "desc": "Pour les entreprises en croissance nécessitant une boîte unifiée et la synchronisation e-commerce.",
        "features": [
          "Jusqu'à 15 comptes + 1 numéro de téléphone cloud",
          "2 000 posts & 10 000 messages / mois",
          "Boîte de réception unifiée + automatisation Comment-to-DM",
          "Synchronisation Shopify, WooCommerce & Google Business"
        ]
      },
      "agency": {
        "name": "Pro / Agency",
        "desc": "Les 8 produits débloqués, incluant la gestion publicitaire et la voix IA.",
        "features": [
          "Jusqu'à 50 comptes + 5 numéros internationaux",
          "Les 8 réseaux publicitaires + API de Conversions",
          "Agent vocal IA + numéroteur WebRTC dans le navigateur",
          "Webhooks en direct & assistance prioritaire"
        ]
      },
      "enterprise": {
        "name": "Enterprise",
        "desc": "Volumes élevés, clés API multiples et infrastructure dédiée.",
        "features": [
          "500 comptes connectés + 50 numéros de téléphone",
          "Clés API multiples avec permissions granulaires pour équipes",
          "Limites de débit sur mesure & responsable de compte dédié",
          "Garantie SLA 99,9% & intégrations personnalisées"
        ]
      }
    }
  },
  "faqSection": {
    "eyebrow": "Foire Aux Questions",
    "title": "Tout ce que Vous Devez Savoir sur Asra3 (asra3.com)",
    "subtitle": "Des explications claires pour utiliser la plateforme ou brancher notre API.",
    "items": [
      {
        "q": "Qu'est-ce que Asra3 (asra3.com) et que permet-elle de faire ?",
        "a": "Asra3 (asra3.com) est une plateforme globale de marketing, de messagerie et une API pour développeurs. Elle vous permet de connecter 18 réseaux sociaux et blogs, de gérer une boîte de réception unifiée WhatsApp/Instagram, de diffuser des annonces sur 8 réseaux et d'opérer des numéros virtuels avec agents vocaux IA, depuis un seul tableau de bord ou via une clé d'API REST."
      },
      {
        "q": "Puis-je utiliser Asra3 sans compétences techniques ni codage ?",
        "a": "Absolument ! Notre tableau de bord web (/dashboard) a été conçu pour les entreprises, créateurs et responsables marketing. Connectez vos comptes en un clic, programmez vos publications, répondez aux messages et pilotez vos annonces sans toucher au code."
      },
      {
        "q": "Puis-je intégrer Asra3 comme API tierce dans mon application ou mon agent IA ?",
        "a": "Tout à fait. Les développeurs peuvent générer une clé API (tk_live_...) et interroger https://asra3.com/api/v1 pour associer des comptes utilisateurs, planifier du contenu, consulter les métriques et envoyer des messages WhatsApp/SMS par programmation."
      },
      {
        "q": "Quelles sont les plateformes et régies publicitaires prises en charge ?",
        "a": "Nous prenons en charge 18 réseaux (Instagram, Facebook, TikTok, LinkedIn, X/Twitter, YouTube, Threads, Pinterest, Reddit, Bluesky, Snapchat, Google Business, Telegram, Discord, Slack, WhatsApp, Shopify et WordPress) ainsi que 8 régies publicitaires (Meta, Google, TikTok, LinkedIn, Pinterest, X, Reddit et OpenAI Ads)."
      }
    ]
  },
  "dashboard": {
    "activeTenant": "Compte Actif",
    "newTenant": "+ Nouveau Compte",
    "syncBtn": "Actualiser",
    "groupChannels": "Comptes & Publication",
    "groupGrowth": "Boîte & Statistiques",
    "groupEnterprise": "Publicité, Téléphone & Boutique",
    "quotasTitle": "Consommation du Forfait",
    "maxChannels": "Comptes Connectés",
    "monthlyPosts": "Publications Mensuelles",
    "phoneNumbers": "Lignes Téléphoniques",
    "aiBudget": "Crédits Assistant IA",
    "lockedTitle": "Fonctionnalité non incluse dans votre formule",
    "lockedDesc": "Passez au forfait supérieur ou activez ce module dans l'espace administration pour le débloquer.",
    "openAdminBtn": "Gérer les Forfaits",
    "connectStep1Title": "Autorisations du Compte",
    "connectStep1Desc": "Permissions standard accordées automatiquement.",
    "connectStep2Title": "Connecter un Nouveau Compte (1 Clic)",
    "connectStep2Desc": "Cliquez sur une plateforme ci-dessous pour la lier en quelques secondes :",
    "entityPickerTitle": "Sélectionner la Page ou le Profil",
    "entityPickerDesc": "Choisissez la page ou le compte secondaire à administrer :",
    "directTokenTitle": "Connexion Directe Shopify ou WordPress",
    "directTokenDesc": "Saisissez l'adresse de votre boutique ou site pour le relier directement :",
    "connectTokenBtn": "Lier la Boutique",
    "connectedAccountsTitle": "Vos Comptes Connectés",
    "composerTitle": "Créer & Planifier une Publication",
    "composerPlaceholder": "Rédigez votre texte ici... Ajoutez hashtags, liens ou emojis ✨",
    "useSmartQueue": "Planifier au meilleur moment d'engagement (Smart Queue)",
    "uploadMediaBtn": "Joindre Image / Vidéo",
    "publishNowBtn": "Publier / Planifier Maintenant",
    "inboxTitle": "Boîte Unifiée Messages & Commentaires",
    "replyBtn": "Envoyer",
    "automationTitle": "Auto-DM sur Commentaire",
    "automationDesc": "Envoyez automatiquement un message privé dès qu'un utilisateur commente un mot-clé précis :",
    "activateAutomationBtn": "Activer l'Auto-DM",
    "analyticsImpressions": "Impressions",
    "analyticsReach": "Portée Totale",
    "analyticsEngagement": "Taux d'Engagement",
    "analyticsFollowers": "Nouveaux Abonnés",
    "adsTitle": "Campagnes Publicitaires Actives",
    "connectAdBtn": "Connecter un Compte Publicitaire",
    "capiTitle": "Suivi API Conversions (CAPI)",
    "capiDesc": "Transmettez les conversions d'achat pour optimiser la diffusion sur Meta et Google.",
    "sendCapiBtn": "Envoyer une Conversion Test",
    "kycTitle": "Vérification de Numéro de Téléphone",
    "kycDesc": "Activez et vérifiez un nouveau numéro international en une seule étape.",
    "generateKycBtn": "Vérifier le Numéro",
    "voiceAgentTitle": "Réceptionniste Vocal IA 24/7",
    "voiceAgentDesc": "Acheminez les appels entrants vers un agent vocal intelligent.",
    "bindVoiceBtn": "Activer la Voix IA",
    "webrtcTitle": "Numéroteur Téléphonique Web",
    "webrtcDesc": "Émettez et recevez des appels directement depuis votre navigateur.",
    "startWebrtcBtn": "Ouvrir le Numéroteur",
    "commerceTitle": "Catalogue Produits (Shopify / WooCommerce)",
    "localSeoTitle": "Établissements Google Business",
    "aiSupportTitle": "Assistant IA & Clés API",
    "aiSupportDesc": "Interrogez l'Assistant IA pour vérifier vos publications ou vos comptes connectés :",
    "runDiagnosisBtn": "Consulter l'Assistant IA"
  },
  "admin": {
    "title": "Administration de la Plateforme & Formules",
    "subtitle": "Gérez les services actifs, les réseaux pris en charge, les abonnements et les comptes clients.",
    "headlessEnforced": "Connexion Directe Active",
    "headlessOptional": "Mode Standard",
    "tabGlobal": "1. Produits & Réseaux Activés",
    "tabPlans": "2. Formules & Tarifs",
    "tabTenants": "3. Comptes & Clés API",
    "tabBilling": "4. Revenus & Coûts",
    "globalServicesTitle": "Activer ou Désactiver les 8 Produits de la Plateforme",
    "globalScopesTitle": "Permissions OAuth par Défaut",
    "globalPlatformsTitle": "Canaux Sociaux & Blogs Supportés (18 Plateformes)",
    "globalAdsTitle": "Réseaux Publicitaires Supportés (8 Régies)",
    "provisionTenantBtn": "Créer un Nouveau Compte",
    "openWorkspaceBtn": "Voir le Dashboard",
    "mintKeyBtn": "Générer une Clé API",
    "suspendBtn": "Suspendre",
    "restoreBtn": "Rétablir",
    "billingTitle": "Coût Fournisseur vs Revenus des Abonnements",
    "colTenant": "Compte Client",
    "colProfile": "Identifiant Profil",
    "colPlan": "Formule",
    "colWholesale": "Coût Grossiste",
    "colRetail": "Prix Abonnement",
    "colMargin": "Marge Nette"
  },
  "docs": {
    "badge": "Documentation Officielle Développeur · asra3.com/docs",
    "title": "Documentation de l'API Asra3",
    "subtitle": "Générez une clé API, connectez un compte et planifiez votre première publication en 5 requêtes.",
    "baseUrlLabel": "URL de Base de l'API",
    "authTitle": "Authentification & Clés API",
    "authDesc": "Transmettez votre clé dans l'en-tête Authorization: Bearer tk_live_... à chaque requête.",
    "webhooksTitle": "Webhooks & Événements en Direct",
    "webhooksDesc": "Recevez instantanément les notifications de messages et de publications validées avec HMAC-SHA256.",
    "endpointsTitle": "Référence des Points d'Accès",
    "tryEndpointBtn": "Tester en direct"
  },
  "telephony": {
    "eyebrow": "Numéros Virtuels, WhatsApp & Voix IA",
    "title": "Achetez des Numéros dans 55+ Pays, Échangez des SMS et Téléphonez",
    "subtitle": "Obtenez des numéros dédiés, associez-les à WhatsApp Business avec modèles pré-approuvés et déployez des agents vocaux IA à faible latence connectés au réseau téléphonique réel.",
    "marketTitle": "Catalogue de Numéros Virtuels",
    "marketSubtitle": "Lignes téléphoniques instantanées dans 55+ pays avec conformité KYC automatisée",
    "buyBtn": "Acheter & Activer le Numéro",
    "typeFilterAll": "Tous (Local, Mobile, Gratuit)",
    "typeFilterMobile": "Numéros Mobiles",
    "typeFilterLocal": "Numéros Locaux",
    "typeFilterTollFree": "Numéros Sans Frais (Toll-Free)",
    "dialerTitle": "Numéroteur Web & Console d'Appel",
    "dialerSubtitle": "Émettez et recevez des appels directement dans votre navigateur sur vos lignes virtuelles",
    "callModeDirect": "Appel Vocal Direct",
    "callModeAi": "Appel avec Agent Vocal IA",
    "callBtn": "Lancer l'Appel",
    "endCallBtn": "Raccrocher",
    "smsTitle": "Boîte SMS & WhatsApp Bidirectionnelle en Direct",
    "simulateOtpBtn": "Simuler l'Arrivée d'un OTP",
    "simulateSmsBtn": "Simuler un SMS Entrant",
    "whatsappTitle": "Lier le Numéro à WhatsApp Business",
    "linkWhatsappBtn": "Lancer l'Assistant WhatsApp"
  },
  "connectionWizard": {
    "modalTitle": "Assistant de Connexion des Canaux & Réseaux",
    "modalSubtitle": "Liez réseaux sociaux, applications de messagerie, boutiques et blogs via des étapes interactives guidées.",
    "step1Title": "1. Choisir la Plateforme et le Mode",
    "step2Title": "2. Authentifier & Autoriser",
    "step3Title": "3. Sélectionner la Page ou le Compte",
    "step4Title": "4. Connexion Vérifiée & Prête",
    "methodOAuth": "OAuth Sécurisé en 1 Clic",
    "methodToken": "Identifiant Direct / Bot Token",
    "testPostBtn": "Envoyer un Post / Message Test",
    "connectedBadge": "Connecté & Opérationnel ✓"
  },
  "auth": {
        "loginTitle": "Connexion à votre espace de travail",
        "loginSubtitle": "Entrez vos identifiants pour accéder à votre espace client isolé et gérer canaux et téléphonie.",
        "signupTitle": "Créez votre compte Asra3",
        "signupSubtitle": "Connectez vos réseaux, planifiez vos publications, gérez messages et publicités, ou obtenez votre clé API immédiatement.",
        "emailLabel": "E-mail professionnel",
        "passwordLabel": "Mot de passe",
        "nameLabel": "Nom complet",
        "companyLabel": "Nom de l'entreprise ou projet (Optionnel)",
        "selectPlanLabel": "Choisissez votre forfait :",
        "submitLogin": "Se connecter",
        "submitSignup": "Commencer gratuitement",
        "alreadyHaveAccount": "Vous avez déjà un compte ? ",
        "needAccount": "Vous n'avez pas de compte ? ",
        "demoPersonasTitle": "Profils de démonstration rapide",
        "whatYouGetTitle": "Ce que vous obtenez immédiatement",
        "workEmailRequired": "Veuillez saisir votre e-mail professionnel.",
        "signInFailed": "Échec de connexion. Vérifiez vos identifiants.",
        "unableToSignIn": "Impossible de joindre le serveur d'authentification.",
        "signingIn": "Vérification en cours...",
        "orContinueWith": "Ou continuer avec",
        "continueWithGoogle": "Continuer avec Google",
        "enterpriseIsolation": "Isolation d’entreprise multi-tenant",
        "unifiedTitle": "Plateforme unifiée de communications & marketing",
        "unifiedDesc": "Accédez à votre espace dédié sans encombrement. Connectez 18 réseaux sociaux, achetez des numéros virtuels dans plus de 55 pays et automatisez WhatsApp & IA Vocale.",
        "socialChannelsFeature": "18 canaux sociaux et messageries",
        "telephonyFeature": "Téléphonie mondiale & IA Vocale",
        "telephonyFeatureDesc": "Recevez des SMS, diffusez sur WhatsApp et passez des appels WebRTC",
        "storageFeature": "Stockage persistant sur fichiers",
        "storageFeatureDesc": "Chaque action, numéro et canal est sauvegardé de manière permanente",
        "signUpBadge": "Commencez gratuitement en moins de 60 secondes",
        "fullNamePlaceholder": "Alexandre Martin",
        "companyNamePlaceholder": "Mon Entreprise",
        "whatYouGet1": "Connexion en 1 clic pour 18 plateformes (Instagram, TikTok, LinkedIn, YouTube, WhatsApp, Shopify, etc.).",
        "whatYouGet2": "Planifiez des posts & Reels, répondez depuis la boîte unifiée et activez Comment-to-DM.",
        "whatYouGet3": "Clé API Asra3 instantanée (tk_live_...) pour intégrer nos services dans vos applications.",
        "exploreApiDocs": "Explorer la documentation API pour développeurs"
    },
  "showcase": {
        "platformEyebrow": "Plateforme complète de 18 réseaux",
        "platformTitle": "Intégrations natives avancées avec maquettes en direct",
        "platformSubtitle": "Publiez du contenu, modérez les commentaires et automatisez la messagerie sur tous les réseaux depuis une API unique.",
        "adsEyebrow": "Moteur publicitaire unifié sur 8 réseaux",
        "adsTitle": "Lancez, modérez et analysez vos campagnes sur 8 réseaux",
        "adsSubtitle": "Synchronisation complète avec Meta, Google, TikTok, LinkedIn, X, Pinterest, Reddit et OpenAI Ads avec suivi CAPI.",
        "devHubEyebrow": "Hub Développeurs & Agents IA",
        "devHubTitle": "8 SDKs, serveur MCP prêt à l'emploi et CLI développeur",
        "devHubSubtitle": "Développez dans votre langage favori ou laissez Claude Code et Cursor automatiser publication et numéros virtuels.",
        "copied": "Copié !",
        "copyPrompt": "Copier le prompt de configuration IA",
        "promptCopiedToast": "Prompt copié dans le presse-papiers !"
    }
};

const dict_de: TranslationDictionary = {
  "brand": {
    "name": "Asra3",
    "domain": "asra3.com",
    "tagline": "All-in-One Plattform & Entwickler-API für Social Media, Ads, Messaging, KI-Telefonie & E-Commerce"
  },
  "nav": {
    "home": "Startseite",
    "workspace": "Dashboard",
    "docs": "API-Dokumentation",
    "admin": "Admin",
    "login": "Anmelden",
    "signup": "Kostenlos Starten",
    "lightMode": "Heller Modus",
    "darkMode": "Dunkler Modus",
    "logout": "Abmelden",
    "signOut": "Abmelden"
  },
  "hero": {
    "badge": "Einheitliche Marketing- & Messaging-Cloud + Entwickler-API · asra3.com",
    "titlePart1": "Erreichen Sie Ihre Kunden Überall mit",
    "titleHighlight": "Einer Plattform & Einer API",
    "titlePart2": "Ohne Monatelange Wartezeiten auf Freigaben.",
    "subtitle": "Asra3 (asra3.com) verbindet 18 soziale Kanäle und Blogs, 8 Werbenetzwerke, einen einheitlichen WhatsApp/Instagram-Posteingang, globale Rufnummern mit KI-Sprachagenten und Online-Shops – direkt nutzbar im Dashboard oder per REST-API in wenigen Minuten.",
    "ctaStart": "Kostenlos Starten",
    "ctaWorkspace": "Dashboard Öffnen",
    "ctaDocs": "API-Dokumentation",
    "stat1Label": "Sofortige API-Endpunkte",
    "stat2Label": "Social- & Ad-Kanäle",
    "stat3Label": "Aufrufe bis zum 1. Beitrag",
    "stat4Label": "Sofortige 1-Klick-Anbindung"
  },
  "subServicesSection": {
    "eyebrow": "Umfassende Produktsuite",
    "title": "8 Integrierte Produkte — Im Dashboard oder via API",
    "subtitle": "Verwalten Sie Ihre Kanäle direkt in unserem übersichtlichen Arbeitsbereich oder integrieren Sie Asra3 als Ihre Marketing-API.",
    "openInWorkspace": "Im Dashboard Öffnen",
    "viewApiDocs": "API-Referenz",
    "services": {
      "core_connect": {
        "title": "1-Klick-Kontoanbindung",
        "shortTitle": "Verbundene Konten",
        "tagline": "Verbinden Sie 18 soziale Netzwerke, Messenger, Blogs und Shops in Sekunden",
        "bullets": [
          "Sofortiges 1-Klick-OAuth für Instagram, TikTok, Facebook, X, LinkedIn, YouTube & Threads",
          "Unterstützung für Telegram, Discord, Slack, WhatsApp, Snapchat, Pinterest, Reddit & Bluesky",
          "Direkte Anbindung für Shopify-Shops, WordPress-Blogs und Google Business-Standorte",
          "Automatisches Token-Refreshing und Echtzeit-Statusüberprüfung aller Verbindungen"
        ]
      },
      "publishing": {
        "title": "Kanalübergreifendes Publishing & Intelligente Warteschlangen",
        "shortTitle": "Veröffentlichen & Planen",
        "tagline": "Einmal verfassen und Beiträge, Reels sowie Karussells auf 16 Plattformen planen",
        "bullets": [
          "Einheitlicher Editor für Bilder, Videos, Reels, Karussells, Threads und Umfragen",
          "Zeitzonengenaue Planung und automatisierte Smart Queues für beste Reichweiten",
          "Hochgeschwindigkeits-Uploads mit automatischer Format- und Größenvalidierung",
          "Automatischer Erstkommentar und plattformspezifische Textanpassungen"
        ]
      },
      "inbox_crm": {
        "title": "Zentraler Posteingang, Auto-DM & Social CRM",
        "shortTitle": "Posteingang & Auto-DM",
        "tagline": "Bündeln Sie WhatsApp-, Instagram- und Facebook-Nachrichten sowie Kommentare an einem Ort",
        "bullets": [
          "Ein zentraler Posteingang für DMs, Post-Kommentare und Google/Facebook-Bewertungen",
          "Schlagwortbasierte Comment-to-DM-Automationen zur sofortigen Lead-Generierung",
          "Kanalübergreifende Broadcast-Kampagnen und automatisierte Follow-up-Sequenzen",
          "Integriertes Kontaktmanagement mit anpassbaren CRM-Attributen"
        ]
      },
      "analytics": {
        "title": "Kanalübergreifende Analysen & Berichte",
        "shortTitle": "Analytik",
        "tagline": "Verfolgen Sie Impressionen, Reichweite, Engagement-Rate und Follower-Wachstum in Echtzeit",
        "bullets": [
          "Einheitliches Dashboard für Reichweite, Impressionen, Klicks und Interaktionsraten",
          "Heatmaps mit den aktivsten Zeiten Ihrer Zielgruppe für ideale Posting-Zeitpunkte",
          "Detaillierte Beitragsanalysen und zeitraumbezogene Leistungsvergleiche",
          "Exportierbare Berichte und vollständiger Zugriff über die REST-API"
        ]
      },
      "ads": {
        "title": "Werbeanzeigenmanager & Conversions API (CAPI)",
        "shortTitle": "Paid Ads",
        "tagline": "Kampagnen auf Meta, Google, TikTok, LinkedIn, X und OpenAI starten und messen",
        "bullets": [
          "Kampagnen, Anzeigengruppen und Budgets in einer zentralen Oberfläche verwalten",
          "Beiträge mit 1 Klick bewerben und Click-to-WhatsApp (CTWA)-Anzeigen schalten",
          "Server-Side Conversions API (CAPI) für exakte Kauf- und Lead-Zuordnung",
          "Nahtloser Abgleich von Kundenlisten und Erstellung von Lookalike-Zielgruppen"
        ]
      },
      "telephony": {
        "title": "Cloud-Telefonie, SMS & KI-Sprachagenten",
        "shortTitle": "Telefonie & KI-Sprache",
        "tagline": "Internationale Rufnummern, SMS/WhatsApp-Nachrichten, WebRTC-Dialer & 24/7 KI-Sprachassistenten",
        "bullets": [
          "Internationale Rufnummern mit Voice, SMS, RCS und WhatsApp kaufen oder portieren",
          "Eingehende Anrufe mit 1 Klick an intelligente KI-Sprachagenten weiterleiten",
          "Anrufe direkt im Webbrowser tätigen und annehmen (WebRTC Softphone)",
          "OTP-Verifizierungscodes versenden und offizielle WhatsApp Business-Workflows steuern"
        ]
      },
      "commerce_local": {
        "title": "E-Commerce-Shops & Google Business Standorte",
        "shortTitle": "Shops & Lokales SEO",
        "tagline": "Shopify- & WooCommerce-Produkte, Blogbeiträge und Google-Standorte verwalten",
        "bullets": [
          "Zentrale Ansicht für Produkte, Lagerbestände, Bestellungen und Rabattcodes",
          "Artikel für Shopify-Blogs und WordPress aus einem einzigen Editor veröffentlichen",
          "Google Business Profile-Standorte, Öffnungszeiten, Angebote und Rezensionen verwalten",
          "Produktkataloge direkt mit dynamischen Werbeanzeigen auf Meta und TikTok synchronisieren"
        ]
      },
      "support_ai": {
        "title": "KI-Assistent & Entwickler-API-Schlüssel",
        "shortTitle": "KI-Assistent & API",
        "tagline": "Sofortige KI-Fehlerdiagnose für Ihre Konten + API-Schlüssel für Entwickler",
        "bullets": [
          "Fragen Sie den KI-Assistenten nach Gründen für Beitragsfehler oder prüfen Sie Konten per Klick",
          "Asra3 API-Schlüssel (tk_live_...) generieren, um Funktionen in eigene Apps einzubetten",
          "Echtzeit-Webhooks für eingehende Nachrichten und veröffentlichte Beiträge einrichten"
        ]
      }
    }
  },
  "pricingSection": {
    "eyebrow": "Transparente Preisgestaltung",
    "title": "Kostenlos Starten und Flexibel Wachsen",
    "subtitle": "Jeder Tarif beinhaltet uneingeschränkten Zugriff auf das Web-Dashboard sowie die Asra3 REST-API.",
    "perMonth": "/ Monat",
    "choosePlan": "Jetzt Starten",
    "popularBadge": "Am Beliebtesten",
    "plans": {
      "starter": {
        "name": "Starter",
        "desc": "Perfekt für Creator, Solopreneure und aufstrebende Marken.",
        "features": [
          "Bis zu 5 verknüpfte Social-Konten",
          "300 geplante Beiträge / Monat",
          "Kanalübergreifender Editor & Smart Queue",
          "Basis-Analytik-Dashboard + API-Zugang"
        ]
      },
      "growth": {
        "name": "Growth",
        "desc": "Für wachsende Unternehmen, die einen zentralen Posteingang und Shop-Synchronisation benötigen.",
        "features": [
          "Bis zu 15 Konten + 1 Cloud-Telefonnummer",
          "2.000 Beiträge & 10.000 Nachrichten / Monat",
          "Zentraler Posteingang + Comment-to-DM-Automation",
          "Synchronisation mit Shopify, WooCommerce & Google Business"
        ]
      },
      "agency": {
        "name": "Pro / Agency",
        "desc": "Alle 8 Produkte freigeschaltet, inklusive Werbeanzeigenmanagement und KI-Sprachassistenten.",
        "features": [
          "Bis zu 50 Konten + 5 internationale Rufnummern",
          "Alle 8 Werbenetzwerke + Conversions API",
          "KI-Sprachagent + WebRTC-Dialer im Browser",
          "Echtzeit-Webhooks & bevorzugter Support"
        ]
      },
      "enterprise": {
        "name": "Enterprise",
        "desc": "Hohe Volumenlimits, mehrere API-Schlüssel und dedizierte Infrastruktur.",
        "features": [
          "500 verknüpfte Konten + 50 Rufnummern",
          "Mehrere berechtigte API-Schlüssel für Entwicklerteams",
          "Individuelle Rate Limits & persönlicher Account Manager",
          "99,9% Uptime-SLA & maßgeschneiderte Integrationen"
        ]
      }
    }
  },
  "faqSection": {
    "eyebrow": "Häufig Gestellte Fragen",
    "title": "Alles Wissenswerte über Asra3 (asra3.com)",
    "subtitle": "Präzise Antworten zur Nutzung des Dashboards oder zur Einbindung unserer Entwickler-API.",
    "items": [
      {
        "q": "Was ist Asra3 (asra3.com) und welche Vorteile bietet die Plattform?",
        "a": "Asra3 (asra3.com) ist eine ganzheitliche Marketing-, Kommunikations- und Entwicklerplattform. Sie ermöglicht es Ihnen, 18 soziale Netzwerke und Blogs anzubinden, einen gemeinsamen WhatsApp/Instagram-Posteingang zu betreiben, Werbeanzeigen auf 8 Netzwerken zu steuern und virtuelle Rufnummern mit KI-Sprachagenten zu nutzen – wahlweise über eine intuitive Weboberfläche oder per REST-API."
      },
      {
        "q": "Kann ich Asra3 ohne Programmierkenntnisse nutzen?",
        "a": "Ja, absolut! Unser Dashboard (/dashboard) wurde speziell für Unternehmen, Creator und Marketing-Teams entwickelt. Sie können Konten mit einem einzigen Klick verknüpfen, Inhalte vorausplanen, Nachrichten beantworten und Anzeigen schalten – ganz ohne Programmieraufwand."
      },
      {
        "q": "Kann ich Asra3 als Third-Party-API in meine eigene Software oder KI-Agenten einbinden?",
        "a": "Selbstverständlich. Entwickler können einen API-Schlüssel (tk_live_...) erstellen und über https://asra3.com/api/v1 Konten verknüpfen, Beiträge veröffentlichen, Kennzahlen abfragen und WhatsApp/SMS-Nachrichten automatisiert versenden."
      },
      {
        "q": "Welche sozialen Plattformen und Werbenetzwerke werden unterstützt?",
        "a": "Wir unterstützen 18 Kanäle (Instagram, Facebook, TikTok, LinkedIn, X/Twitter, YouTube, Threads, Pinterest, Reddit, Bluesky, Snapchat, Google Business, Telegram, Discord, Slack, WhatsApp, Shopify und WordPress) sowie 8 Werbenetzwerke (Meta, Google, TikTok, LinkedIn, Pinterest, X, Reddit und OpenAI Ads)."
      }
    ]
  },
  "dashboard": {
    "activeTenant": "Aktives Konto",
    "newTenant": "+ Neues Konto",
    "syncBtn": "Aktualisieren",
    "groupChannels": "Konten & Veröffentlichung",
    "groupGrowth": "Posteingang & Analytik",
    "groupEnterprise": "Werbung, Telefonie & Shop",
    "quotasTitle": "Tarifverbrauch",
    "maxChannels": "Verbundene Konten",
    "monthlyPosts": "Monatliche Beiträge",
    "phoneNumbers": "Telefonnummern",
    "aiBudget": "KI-Assistent-Guthaben",
    "lockedTitle": "Funktion im aktuellen Tarif nicht enthalten",
    "lockedDesc": "Upgraden Sie Ihren Tarif oder aktivieren Sie dieses Modul in den Admin-Einstellungen, um sofortigen Zugriff zu erhalten.",
    "openAdminBtn": "Tarife Verwalten",
    "connectStep1Title": "Kontoberechtigungen",
    "connectStep1Desc": "Standardberechtigungen werden automatisch aktiviert.",
    "connectStep2Title": "Neues Konto Anbinden (1-Klick-Verbindung)",
    "connectStep2Desc": "Klicken Sie unten auf eine Plattform, um Ihr Konto in Sekunden zu verknüpfen:",
    "entityPickerTitle": "Seite oder Profil Auswählen",
    "entityPickerDesc": "Wählen Sie die zu verwaltende Seite oder das Profil aus:",
    "directTokenTitle": "Direktanbindung für Shopify oder WordPress",
    "directTokenDesc": "Geben Sie die Shop-Domain oder Website-URL ein, um sie direkt zu verbinden:",
    "connectTokenBtn": "Shop Verbinden",
    "connectedAccountsTitle": "Ihre Verbundenen Konten",
    "composerTitle": "Beitrag Erstellen & Planen",
    "composerPlaceholder": "Verfassen Sie Ihren Beitrag hier... Fügen Sie Hashtags, Links oder Emojis hinzu ✨",
    "useSmartQueue": "Im besten Interaktionszeitfenster einplanen (Smart Queue)",
    "uploadMediaBtn": "Bild / Video Anhängen",
    "publishNowBtn": "Jetzt Veröffentlichen / Einplanen",
    "inboxTitle": "Zentraler Nachrichten- & Kommentar-Posteingang",
    "replyBtn": "Senden",
    "automationTitle": "Auto-DM bei Kommentaren",
    "automationDesc": "Automatisch eine private Nachricht senden, sobald ein bestimmtes Schlagwort kommentiert wird:",
    "activateAutomationBtn": "Auto-DM Aktivieren",
    "analyticsImpressions": "Impressionen",
    "analyticsReach": "Gesamtreichweite",
    "analyticsEngagement": "Interaktionsrate",
    "analyticsFollowers": "Neue Follower",
    "adsTitle": "Aktive Werbekampagnen",
    "connectAdBtn": "Werbekonto Verbinden",
    "capiTitle": "Conversions API (CAPI) Tracker",
    "capiDesc": "Übertragen Sie Kauf-Events, um die Auslieferung auf Meta und Google zu optimieren.",
    "sendCapiBtn": "Test-Conversion Senden",
    "kycTitle": "Rufnummernverifizierung",
    "kycDesc": "Aktivieren und verifizieren Sie eine neue internationale Rufnummer in einem Schritt.",
    "generateKycBtn": "Neue Nummer Verifizieren",
    "voiceAgentTitle": "24/7 KI-Sprachassistent",
    "voiceAgentDesc": "Leiten Sie eingehende Anrufe an einen intelligenten KI-Sprachagenten weiter.",
    "bindVoiceBtn": "KI-Sprache Aktivieren",
    "webrtcTitle": "Browser-Telefon-Dialer",
    "webrtcDesc": "Telefonate direkt und ohne zusätzliche Software im Browser führen.",
    "startWebrtcBtn": "Web-Dialer Öffnen",
    "commerceTitle": "Shop-Produkte (Shopify / WooCommerce)",
    "localSeoTitle": "Google Business Standorte",
    "aiSupportTitle": "KI-Assistent & API-Schlüssel",
    "aiSupportDesc": "Befragen Sie den KI-Assistenten zur Überprüfung von Beiträgen oder Konten:",
    "runDiagnosisBtn": "KI-Assistent Befragen"
  },
  "admin": {
    "title": "Plattform-Administration & Tarife",
    "subtitle": "Verwalten Sie aktivierte Module, unterstützte Kanäle, Preispläne und Kundenkonten.",
    "headlessEnforced": "Direkte Anbindung Aktiv",
    "headlessOptional": "Standardmodus",
    "tabGlobal": "1. Aktivierte Produkte & Kanäle",
    "tabPlans": "2. Tarife & Preise",
    "tabTenants": "3. Kundenkonten & API-Schlüssel",
    "tabBilling": "4. Umsatz & Kosten",
    "globalServicesTitle": "Die 8 Plattform-Module Aktivieren oder Deaktivieren",
    "globalScopesTitle": "Standard-OAuth-Berechtigungen",
    "globalPlatformsTitle": "Unterstützte Social- & Blog-Kanäle (18 Plattformen)",
    "globalAdsTitle": "Unterstützte Werbenetzwerke (8 Netzwerke)",
    "provisionTenantBtn": "Neues Konto Anlegen",
    "openWorkspaceBtn": "Dashboard Aufrufen",
    "mintKeyBtn": "API-Schlüssel Erstellen",
    "suspendBtn": "Sperren",
    "restoreBtn": "Reaktivieren",
    "billingTitle": "Lieferantenkosten vs. Abonnementeinnahmen",
    "colTenant": "Kundenkonto",
    "colProfile": "Profil-ID",
    "colPlan": "Tarif",
    "colWholesale": "Einkaufskosten",
    "colRetail": "Verkaufspreis",
    "colMargin": "Nettogewinn"
  },
  "docs": {
    "badge": "Offizielle Entwicklerdokumentation · asra3.com/docs",
    "title": "Asra3 API-Dokumentation",
    "subtitle": "Generieren Sie einen API-Schlüssel, binden Sie ein Konto an und veröffentlichen Sie Ihren ersten Beitrag in 5 Aufrufen.",
    "baseUrlLabel": "Basis-URL der API",
    "authTitle": "Authentifizierung & API-Schlüssel",
    "authDesc": "Senden Sie Ihren Schlüssel im Header Authorization: Bearer tk_live_... bei jeder Anfrage mit.",
    "webhooksTitle": "Webhooks & Echtzeit-Ereignisse",
    "webhooksDesc": "Erhalten Sie sofortige Benachrichtigungen für Nachrichten und Beiträge, gesichert durch HMAC-SHA256.",
    "endpointsTitle": "Endpunkt-Übersicht",
    "tryEndpointBtn": "Live Testen"
  },
  "telephony": {
    "eyebrow": "Virtuelle Rufnummern, WhatsApp & KI-Sprache",
    "title": "Rufnummern in 55+ Ländern Kaufen, SMS Senden/Empfangen & Telefonieren",
    "subtitle": "Erwerben Sie dedizierte Rufnummern, binden Sie diese mit vorab genehmigten Vorlagen an WhatsApp Business an und nutzen Sie reaktionsschnelle KI-Sprachassistenten mit echten Telefonanrufen.",
    "marketTitle": "Marktplatz für Virtuelle Rufnummern",
    "marketSubtitle": "Sofort einsatzbereite Rufnummern in über 55 Ländern mit automatisierter KYC-Prüfung",
    "buyBtn": "Nummer Kaufen & Aktivieren",
    "typeFilterAll": "Alle (Lokal, Mobil, Gebührenfrei)",
    "typeFilterMobile": "Mobilfunknummern",
    "typeFilterLocal": "Ortsnetznummern",
    "typeFilterTollFree": "Gebührenfreie Nummern (Toll-Free)",
    "dialerTitle": "Web-Dialer & Anrufkonsole",
    "dialerSubtitle": "Telefonieren Sie direkt im Browser über Ihre virtuellen Unternehmensleitungen",
    "callModeDirect": "Direkter Sprachanruf",
    "callModeAi": "Anruf mit KI-Sprachagent",
    "callBtn": "Anruf Starten",
    "endCallBtn": "Anruf Beenden",
    "smsTitle": "Live-Posteingang für SMS & WhatsApp (2-Wege)",
    "simulateOtpBtn": "Eingehenden OTP-Code Simulieren",
    "simulateSmsBtn": "Eingehende SMS Simulieren",
    "whatsappTitle": "Nummer mit WhatsApp Business Verknüpfen",
    "linkWhatsappBtn": "WhatsApp-Verknüpfungsassistent Starten"
  },
  "connectionWizard": {
    "modalTitle": "Assistent zur Kanal- & Plattformanbindung",
    "modalSubtitle": "Verbinden Sie soziale Netzwerke, Messenger, Shops und Blogs in interaktiven, geführten Schritten.",
    "step1Title": "1. Plattform & Anbindungsmethode Wählen",
    "step2Title": "2. Authentifizieren & Autorisieren",
    "step3Title": "3. Zielseite oder Zielprofil Auswählen",
    "step4Title": "4. Verifiziert & Einsatzbereit",
    "methodOAuth": "Sicheres 1-Klick-OAuth",
    "methodToken": "Direktzugang / Bot-Token",
    "testPostBtn": "Testbeitrag / Testnachricht Senden",
    "connectedBadge": "Verbunden & Einsatzbereit ✓"
  },
  "auth": {
        "loginTitle": "In Ihren Arbeitsbereich einloggen",
        "loginSubtitle": "Geben Sie Ihre Zugangsdaten ein, um auf Ihren isolierten Mandantenbereich zuzugreifen und Kanäle sowie Telefonie zu verwalten.",
        "signupTitle": "Erstellen Sie Ihr Asra3-Konto",
        "signupSubtitle": "Verbinden Sie Ihre Kanäle, planen Sie Beiträge, verwalten Sie Nachrichten & Anzeigen oder fordern Sie sofort Ihren API-Schlüssel an.",
        "emailLabel": "Geschäftliche E-Mail",
        "passwordLabel": "Passwort",
        "nameLabel": "Vollständiger Name",
        "companyLabel": "Projekt- / Firmenname (Optional)",
        "selectPlanLabel": "Wählen Sie Ihren Tarif:",
        "submitLogin": "Anmelden",
        "submitSignup": "Kostenlos starten",
        "alreadyHaveAccount": "Bereits registriert? ",
        "needAccount": "Noch kein Konto? ",
        "demoPersonasTitle": "Schnelle Demo-Personas",
        "whatYouGetTitle": "Was Sie sofort erhalten",
        "workEmailRequired": "Bitte geben Sie Ihre geschäftliche E-Mail ein.",
        "signInFailed": "Anmeldung fehlgeschlagen. Bitte Zugangsdaten prüfen.",
        "unableToSignIn": "Verbindung zum Authentifizierungsserver fehlgeschlagen.",
        "signingIn": "Anmeldung wird überprüft...",
        "orContinueWith": "Oder fortfahren mit",
        "continueWithGoogle": "Mit Google fortfahren",
        "enterpriseIsolation": "Mandantenisolierung auf Unternehmensniveau",
        "unifiedTitle": "Einheitliche Kommunikations- & Marketingplattform",
        "unifiedDesc": "Greifen Sie auf Ihren dedizierten Mandantenbereich ohne Ablenkung zu. Verbinden Sie 18 soziale Kanäle, sichern Sie sich virtuelle Nummern aus über 55 Ländern und automatisieren Sie WhatsApp & Sprach-KI.",
        "socialChannelsFeature": "18 Social & Messaging-Kanäle",
        "telephonyFeature": "Globale Telefonie & Sprach-KI",
        "telephonyFeatureDesc": "Empfangen Sie SMS, senden Sie WhatsApp-Broadcasts und führen Sie WebRTC-Anrufe",
        "storageFeature": "Permanente dateibasierte Speicherung",
        "storageFeatureDesc": "Jede Aktion, Nummer und jeder Kanal wird dauerhaft in Ihrem Workspace gespeichert",
        "signUpBadge": "In unter 60 Sekunden kostenlos starten",
        "fullNamePlaceholder": "Max Mustermann",
        "companyNamePlaceholder": "Meine Marke",
        "whatYouGet1": "1-Klick-Verbindung für 18 Plattformen (Instagram, TikTok, LinkedIn, YouTube, WhatsApp, Shopify u.v.m.).",
        "whatYouGet2": "Beiträge & Reels planen, im Posteingang antworten und Comment-to-DM aktivieren.",
        "whatYouGet3": "Sofortiger Asra3 API-Schlüssel (tk_live_...) zur Integration in Ihre eigenen Anwendungen.",
        "exploreApiDocs": "Entwickler-API-Dokumentation erkunden"
    },
  "showcase": {
        "platformEyebrow": "Umfassende 18-Netzwerke-Plattform",
        "platformTitle": "Fortschrittliche native Integrationen mit Live-Plattform-Mockups",
        "platformSubtitle": "Inhalte veröffentlichen, Kommentare moderieren und Direktnachrichten über alle Netzwerke hinweg mit einer einheitlichen API automatisieren.",
        "adsEyebrow": "Einheitliche 8-Netzwerke-Werbe-Engine",
        "adsTitle": "Kampagnen über 8 Werbenetzwerke starten, moderieren und auswerten",
        "adsSubtitle": "Vollständige Synchronisation mit Meta, Google, TikTok, LinkedIn, X, Pinterest, Reddit und OpenAI Ads mit Budget-Automatisierung und CAPI.",
        "devHubEyebrow": "Entwickler- & KI-Agenten-Hub",
        "devHubTitle": "8 SDKs, einsatzbereiter MCP-Server und Entwickler-CLI",
        "devHubSubtitle": "Entwickeln Sie in Ihrer bevorzugten Sprache oder lassen Sie Claude Code und Cursor Veröffentlichungen und Rufnummern verwalten.",
        "copied": "Kopiert!",
        "copyPrompt": "KI-Agenten-Setup-Prompt kopieren",
        "promptCopiedToast": "Setup-Prompt in Zwischenablage kopiert!"
    }
};

const dict_pt_BR: TranslationDictionary = {
  "brand": {
    "name": "Asra3",
    "domain": "asra3.com",
    "tagline": "Plataforma Unificada de Redes Sociais, Anúncios, Mensagens, Telefonia IA e API para Desenvolvedores"
  },
  "nav": {
    "home": "Início",
    "workspace": "Painel",
    "docs": "Documentação da API",
    "admin": "Admin",
    "login": "Entrar",
    "signup": "Começar Grátis",
    "lightMode": "Modo Claro",
    "darkMode": "Modo Escuro",
    "logout": "Sair",
    "signOut": "Encerrar sessão"
  },
  "hero": {
    "badge": "Nuvem Unificada de Marketing e Mensagens + API para Desenvolvedores · asra3.com",
    "titlePart1": "Alcance Seus Clientes em Qualquer Lugar com",
    "titleHighlight": "Uma Plataforma e Uma API",
    "titlePart2": "Sem Esperar Meses por Aprovações.",
    "subtitle": "A Asra3 (asra3.com) conecta 18 redes sociais e blogs, 8 redes de anúncios, caixa de entrada unificada de WhatsApp/Instagram, números globais com agentes de voz IA e e-commerce — pronto para usar no painel ou integrar via API REST em poucos minutos.",
    "ctaStart": "Começar Grátis",
    "ctaWorkspace": "Abrir Painel",
    "ctaDocs": "Documentação da API",
    "stat1Label": "Endpoints da API Prontos",
    "stat2Label": "Canais Sociais e de Anúncios",
    "stat3Label": "Chamadas até a 1ª Postagem",
    "stat4Label": "Conexão Imediata em 1 Clique"
  },
  "subServicesSection": {
    "eyebrow": "Suite Completa de Produtos",
    "title": "8 Produtos Integrados — Use no Painel ou via API",
    "subtitle": "Gerencie seus canais diretamente pelo nosso painel intuitivo ou construa sua solução sobre a Asra3 como sua API de marketing.",
    "openInWorkspace": "Abrir no Painel",
    "viewApiDocs": "Referência da API",
    "services": {
      "core_connect": {
        "title": "Conexão de Contas em 1 Clique",
        "shortTitle": "Contas Conectadas",
        "tagline": "Conecte 18 redes sociais, apps de mensagens, blogs e lojas em segundos",
        "bullets": [
          "OAuth imediato em 1 clique para Instagram, TikTok, Facebook, X, LinkedIn, YouTube e Threads",
          "Suporte a Telegram, Discord, Slack, WhatsApp, Snapchat, Pinterest, Reddit e Bluesky",
          "Conexão direta para lojas Shopify, blogs WordPress e perfis do Google Business",
          "Renovação automática de tokens e verificação em tempo real da saúde da conexão"
        ]
      },
      "publishing": {
        "title": "Publicação Multicanal e Filas Inteligentes",
        "shortTitle": "Publicar e Agendar",
        "tagline": "Escreva uma vez e agende postagens, Reels e carrosséis em 16 plataformas",
        "bullets": [
          "Editor unificado para imagens, vídeos, Reels, carrosséis, threads e enquetes",
          "Agendamento com reconhecimento de fuso horário e filas inteligentes automatizadas (Smart Queue)",
          "Upload veloz de mídias pré-assinadas com validação automática de formatos",
          "Primeiro comentário automático e personalização de legendas por plataforma"
        ]
      },
      "inbox_crm": {
        "title": "Caixa de Entrada Unificada, Auto-DM e CRM Social",
        "shortTitle": "Caixa e Auto-DM",
        "tagline": "Centralize mensagens diretas de WhatsApp, Instagram, Facebook, comentários e avaliações",
        "bullets": [
          "Caixa única para DMs, comentários em posts e avaliações do Google/Facebook",
          "Automações de comentário para mensagem privada (Comment-to-DM) por palavra-chave",
          "Campanhas de transmissão multicanal e sequências automáticas de follow-up",
          "Gestão integrada de contatos e campos customizados de CRM"
        ]
      },
      "analytics": {
        "title": "Métricas Multicanal e Relatórios",
        "shortTitle": "Métricas",
        "tagline": "Acompanhe impressões, alcance, taxa de engajamento e novos seguidores em tempo real",
        "bullets": [
          "Painel unificado para alcance, impressões, cliques e taxa de interação",
          "Mapas de calor com os melhores horários para postar baseados no seu público",
          "Detalhamento de performance publicação por publicação e comparativos de períodos",
          "Exportação de relatórios e acesso completo via API REST"
        ]
      },
      "ads": {
        "title": "Gerenciador de Anúncios e API de Conversões (CAPI)",
        "shortTitle": "Anúncios Pagos",
        "tagline": "Crie e acompanhe campanhas no Meta, Google, TikTok, LinkedIn, X e OpenAI",
        "bullets": [
          "Crie e controle campanhas, conjuntos de anúncios e orçamentos em uma só interface",
          "Impulsionamento de posts em 1 clique e anúncios de Clique para o WhatsApp (CTWA)",
          "API de Conversões no servidor (CAPI) para rastreamento preciso de vendas",
          "Sincronização ágil de listas de clientes e públicos semelhantes (Lookalike)"
        ]
      },
      "telephony": {
        "title": "Telefonia em Nuvem, SMS e Voz com IA",
        "shortTitle": "Telefonia e Voz IA",
        "tagline": "Números internacionais, SMS/WhatsApp, discador WebRTC e agentes de voz IA 24/7",
        "bullets": [
          "Compre ou porte números internacionais com suporte a Voz, SMS, RCS e WhatsApp",
          "Encaminhe chamadas recebidas para uma recepcionista virtual com IA em 1 clique",
          "Faça e receba ligações diretamente pelo navegador (Softphone WebRTC)",
          "Envie códigos OTP e opere fluxos oficiais do WhatsApp Business"
        ]
      },
      "commerce_local": {
        "title": "Lojas Virtuais e SEO Local no Google Business",
        "shortTitle": "Lojas e SEO Local",
        "tagline": "Gerencie produtos Shopify e WooCommerce, posts de blog e perfis do Google Business",
        "bullets": [
          "Visão unificada para produtos, estoque, pedidos e cupons de desconto",
          "Publique artigos nos blogs do Shopify e WordPress pelo mesmo editor",
          "Administre unidades do Google Business Profile, horários e responda a avaliações",
          "Sincronize catálogos de produtos com anúncios dinâmicos no Meta e TikTok"
        ]
      },
      "support_ai": {
        "title": "Assistente IA e Chaves de API para Desenvolvedores",
        "shortTitle": "Assistente IA e API",
        "tagline": "Diagnóstico imediato com IA para suas contas + chaves de API para seu app",
        "bullets": [
          "Pergunte ao Assistente IA a razão de falhas em posts ou valide o status de contas",
          "Gere chaves de API Asra3 (tk_live_...) para integrar serviços à sua plataforma",
          "Configure webhooks em tempo real para novas mensagens e postagens publicadas"
        ]
      }
    }
  },
  "pricingSection": {
    "eyebrow": "Preços Transparentes e Sem Surpresas",
    "title": "Comece Gratuitamente e Escale Conforme Cresce",
    "subtitle": "Todos os planos contam com acesso integral ao painel web e à API REST da Asra3.",
    "perMonth": "/ mês",
    "choosePlan": "Começar Agora",
    "popularBadge": "Mais Popular",
    "plans": {
      "starter": {
        "name": "Starter",
        "desc": "Ideal para criadores, autônomos e projetos em estágio inicial.",
        "features": [
          "Até 5 contas sociais conectadas",
          "300 postagens agendadas / mês",
          "Editor multicanal e fila inteligente",
          "Painel de métricas essencial + acesso à API"
        ]
      },
      "growth": {
        "name": "Growth",
        "desc": "Para empresas em expansão que precisam de caixa unificada e sincronização de loja.",
        "features": [
          "Até 15 contas + 1 número de telefone em nuvem",
          "2.000 posts e 10.000 mensagens / mês",
          "Caixa de entrada unificada + automação Comment-to-DM",
          "Sincronização com Shopify, WooCommerce e Google Business"
        ]
      },
      "agency": {
        "name": "Pro / Agency",
        "desc": "Todos os 8 produtos liberados, incluindo gestão de anúncios e voz com IA.",
        "features": [
          "Até 50 contas + 5 números internacionais",
          "Todas as 8 redes de anúncios + API de Conversões",
          "Agente de voz IA + discador WebRTC no navegador",
          "Webhooks em tempo real e suporte prioritário"
        ]
      },
      "enterprise": {
        "name": "Enterprise",
        "desc": "Volumes elevados, múltiplas chaves de API e infraestrutura dedicada.",
        "features": [
          "500 contas conectadas + 50 números de telefone",
          "Múltiplas chaves de API com permissões refinadas para times",
          "Limites de requisição personalizados e gerente de conta exclusivo",
          "SLA de 99,9% de disponibilidade e integrações sob medida"
        ]
      }
    }
  },
  "faqSection": {
    "eyebrow": "Perguntas Frequentes",
    "title": "Tudo o que Você Precisa Saber Sobre a Asra3 (asra3.com)",
    "subtitle": "Respostas claras sobre como operar no painel ou integrar nossa API ao seu negócio.",
    "items": [
      {
        "q": "O que é a Asra3 (asra3.com) e quais soluções ela entrega?",
        "a": "A Asra3 (asra3.com) é uma plataforma completa de marketing, comunicação e API para desenvolvedores. Ela reúne 18 redes sociais e blogs, uma caixa de entrada unificada de WhatsApp/Instagram, gestão de anúncios em 8 redes e telefonia em nuvem com agentes de voz IA, tudo controlável via painel intuitivo ou por uma única chave de API REST."
      },
      {
        "q": "Posso utilizar a Asra3 sem possuir conhecimentos de programação?",
        "a": "Com certeza! Nosso painel web (/dashboard) foi desenhado para empresas, criadores e equipes de marketing. Você vincula contas em um clique, agenda conteúdos, responde mensagens e publica anúncios sem tocar em código."
      },
      {
        "q": "É possível integrar a Asra3 como API externa no meu software ou agente de IA?",
        "a": "Sim, perfeitamente. Desenvolvedores podem gerar uma chave de API (tk_live_...) e chamar https://asra3.com/api/v1 para vincular contas de clientes, programar postagens, consultar relatórios e disparar mensagens de WhatsApp/SMS de forma automatizada."
      },
      {
        "q": "Quais canais sociais e plataformas de anúncios são suportados?",
        "a": "Suportamos 18 canais (Instagram, Facebook, TikTok, LinkedIn, X/Twitter, YouTube, Threads, Pinterest, Reddit, Bluesky, Snapchat, Google Business, Telegram, Discord, Slack, WhatsApp, Shopify e WordPress) e 8 redes de anúncios (Meta, Google, TikTok, LinkedIn, Pinterest, X, Reddit e OpenAI Ads)."
      }
    ]
  },
  "dashboard": {
    "activeTenant": "Conta Ativa",
    "newTenant": "+ Nova Conta",
    "syncBtn": "Atualizar",
    "groupChannels": "Contas e Publicação",
    "groupGrowth": "Caixa de Entrada e Métricas",
    "groupEnterprise": "Anúncios, Telefone e Loja",
    "quotasTitle": "Consumo do Plano",
    "maxChannels": "Contas Conectadas",
    "monthlyPosts": "Publicações Mensais",
    "phoneNumbers": "Linhas Telefônicas",
    "aiBudget": "Créditos de Assistente IA",
    "lockedTitle": "Recurso não disponível no plano atual",
    "lockedDesc": "Faça upgrade do seu plano ou ative este módulo nas configurações de administração para desbloqueá-lo.",
    "openAdminBtn": "Gerenciar Planos",
    "connectStep1Title": "Permissões da Conta",
    "connectStep1Desc": "Permissões padrão concedidas automaticamente.",
    "connectStep2Title": "Conectar Nova Conta (1 Clique)",
    "connectStep2Desc": "Clique em qualquer plataforma abaixo para conectá-la em segundos:",
    "entityPickerTitle": "Selecionar Página ou Perfil",
    "entityPickerDesc": "Escolha a página ou conta secundária que deseja gerenciar:",
    "directTokenTitle": "Conexão Rápida para Shopify ou WordPress",
    "directTokenDesc": "Digite o domínio da sua loja ou URL do site para conectar diretamente:",
    "connectTokenBtn": "Conectar Loja",
    "connectedAccountsTitle": "Suas Contas Conectadas",
    "composerTitle": "Criar e Agendar Publicação",
    "composerPlaceholder": "Escreva o texto da sua postagem aqui... Adicione hashtags, links ou emojis ✨",
    "useSmartQueue": "Agendar no horário com maior engajamento (Smart Queue)",
    "uploadMediaBtn": "Anexar Imagem / Vídeo",
    "publishNowBtn": "Publicar / Agendar Agora",
    "inboxTitle": "Caixa Unificada de Mensagens e Comentários",
    "replyBtn": "Enviar",
    "automationTitle": "Auto-DM em Comentários",
    "automationDesc": "Envie uma mensagem privada automaticamente quando comentarem uma palavra-chave:",
    "activateAutomationBtn": "Ativar Auto-DM",
    "analyticsImpressions": "Impressões",
    "analyticsReach": "Alcance Total",
    "analyticsEngagement": "Taxa de Engajamento",
    "analyticsFollowers": "Novos Seguidores",
    "adsTitle": "Campanhas de Anúncios Ativas",
    "connectAdBtn": "Conectar Conta de Anúncios",
    "capiTitle": "Rastreador de API de Conversões (CAPI)",
    "capiDesc": "Envie eventos de compra para otimizar os resultados de anúncios no Meta e Google.",
    "sendCapiBtn": "Enviar Conversão de Teste",
    "kycTitle": "Verificação de Linha Telefônica",
    "kycDesc": "Ative e autentique um novo número internacional em uma única etapa.",
    "generateKycBtn": "Verificar Novo Número",
    "voiceAgentTitle": "Recepcionista de Voz IA 24/7",
    "voiceAgentDesc": "Direcione chamadas recebidas para um agente inteligente de voz artificial.",
    "bindVoiceBtn": "Ativar Voz com IA",
    "webrtcTitle": "Discador Telefônico no Navegador",
    "webrtcDesc": "Faça e receba ligações diretamente no navegador, sem programas adicionais.",
    "startWebrtcBtn": "Abrir Discador Web",
    "commerceTitle": "Produtos da Loja (Shopify / WooCommerce)",
    "localSeoTitle": "Unidades no Google Business",
    "aiSupportTitle": "Assistente IA e Chaves de API",
    "aiSupportDesc": "Consulte o Assistente IA para checar postagens ou contas conectadas:",
    "runDiagnosisBtn": "Consultar Assistente IA"
  },
  "admin": {
    "title": "Administração da Plataforma e Planos",
    "subtitle": "Gerencie produtos ativos, canais compatíveis, planos de assinatura e contas de clientes.",
    "headlessEnforced": "Conexão Direta Ativa",
    "headlessOptional": "Modo Padrão",
    "tabGlobal": "1. Produtos e Canais Ativados",
    "tabPlans": "2. Planos e Preços",
    "tabTenants": "3. Contas e Chaves de API",
    "tabBilling": "4. Faturamento e Custos",
    "globalServicesTitle": "Ativar ou Desativar os 8 Produtos da Plataforma",
    "globalScopesTitle": "Escopos OAuth Padrão",
    "globalPlatformsTitle": "Canais Sociais e de Blog Suportados (18 Plataformas)",
    "globalAdsTitle": "Redes de Anúncios Suportadas (8 Redes)",
    "provisionTenantBtn": "Criar Nova Conta",
    "openWorkspaceBtn": "Ver Painel",
    "mintKeyBtn": "Emitir Chave de API",
    "suspendBtn": "Suspender",
    "restoreBtn": "Reativar",
    "billingTitle": "Custo de Fornecedor vs. Receita de Assinaturas",
    "colTenant": "Conta do Cliente",
    "colProfile": "ID do Perfil",
    "colPlan": "Plano",
    "colWholesale": "Custo de Atacado",
    "colRetail": "Preço da Assinatura",
    "colMargin": "Lucro Líquido"
  },
  "docs": {
    "badge": "Documentação Oficial para Desenvolvedores · asra3.com/docs",
    "title": "Documentação da API Asra3",
    "subtitle": "Gere uma chave de API, conecte uma conta e agende sua primeira postagem com 5 chamadas simples.",
    "baseUrlLabel": "URL Base da API",
    "authTitle": "Autenticação e Chaves de API",
    "authDesc": "Envie sua chave no cabeçalho Authorization: Bearer tk_live_... em todas as requisições.",
    "webhooksTitle": "Webhooks e Eventos em Tempo Real",
    "webhooksDesc": "Receba notificações instantâneas de mensagens e postagens validadas com HMAC-SHA256.",
    "endpointsTitle": "Referência de Endpoints",
    "tryEndpointBtn": "Testar ao vivo"
  },
  "telephony": {
    "eyebrow": "Números Virtuais, WhatsApp e Voz com IA",
    "title": "Compre Números em 55+ Países, Envie/Receba SMS e Faça Ligações",
    "subtitle": "Obtenha linhas dedicadas, conecte-as ao WhatsApp Business com modelos pré-aprovados e implemente agentes de voz IA conversacionais de baixa latência em chamadas telefônicas reais.",
    "marketTitle": "Catálogo de Números Virtuais",
    "marketSubtitle": "Linhas telefônicas instantâneas em mais de 55 países com verificação KYC automatizada",
    "buyBtn": "Comprar e Ativar Número",
    "typeFilterAll": "Todos (Local, Móvel, Gratuito)",
    "typeFilterMobile": "Números Móveis",
    "typeFilterLocal": "Números Locais",
    "typeFilterTollFree": "Números Gratuitos (0800)",
    "dialerTitle": "Discador Web e Console de Chamadas",
    "dialerSubtitle": "Realize e receba telefonemas diretamente no seu navegador usando suas linhas virtuais",
    "callModeDirect": "Chamada de Voz Direta",
    "callModeAi": "Chamada com Agente de Voz IA",
    "callBtn": "Iniciar Chamada Agora",
    "endCallBtn": "Encerrar Chamada",
    "smsTitle": "Caixa em Tempo Real de SMS e WhatsApp Bidirecional",
    "simulateOtpBtn": "Simular Código OTP Recebido",
    "simulateSmsBtn": "Simular SMS Recebido",
    "whatsappTitle": "Vincular Linha ao WhatsApp Business",
    "linkWhatsappBtn": "Iniciar Assistente de Vínculo do WhatsApp"
  },
  "connectionWizard": {
    "modalTitle": "Assistente de Conexão de Canais e Redes",
    "modalSubtitle": "Vincule redes sociais, apps de mensagens, lojas e blogs por meio de etapas interativas guiadas.",
    "step1Title": "1. Escolher Plataforma e Método",
    "step2Title": "2. Autenticar e Autorizar",
    "step3Title": "3. Selecionar Página ou Conta Destino",
    "step4Title": "4. Verificado e Pronto",
    "methodOAuth": "OAuth Seguro em 1 Clique",
    "methodToken": "Credencial Direta / Bot Token",
    "testPostBtn": "Enviar Post / Mensagem de Teste",
    "connectedBadge": "Conectado e Pronto para Uso ✓"
  },
  "auth": {
        "loginTitle": "Entrar no seu espaço de trabalho",
        "loginSubtitle": "Insira suas credenciais para acessar seu espaço isolado de cliente e gerenciar canais e telefonia.",
        "signupTitle": "Crie sua conta Asra3",
        "signupSubtitle": "Conecte seus canais sociais, agende postagens, gerencie mensagens e anúncios ou obtenha sua chave de API instantaneamente.",
        "emailLabel": "E-mail profissional",
        "passwordLabel": "Senha",
        "nameLabel": "Nome completo",
        "companyLabel": "Nome da empresa ou projeto (Opcional)",
        "selectPlanLabel": "Selecione seu plano:",
        "submitLogin": "Entrar",
        "submitSignup": "Comece gratuitamente",
        "alreadyHaveAccount": "Já tem uma conta? ",
        "needAccount": "Não tem uma conta? ",
        "demoPersonasTitle": "Personas de demonstração rápida",
        "whatYouGetTitle": "O que você recebe imediatamente",
        "workEmailRequired": "Por favor, insira seu e-mail profissional.",
        "signInFailed": "Falha no login. Verifique suas credenciais.",
        "unableToSignIn": "Não foi possível conectar ao servidor de autenticação.",
        "signingIn": "Verificando sessão...",
        "orContinueWith": "Ou continuar com",
        "continueWithGoogle": "Continuar com o Google",
        "enterpriseIsolation": "Isolamento corporativo de locatários",
        "unifiedTitle": "Plataforma unificada de comunicações e marketing",
        "unifiedDesc": "Acesse seu espaço de trabalho dedicado sem distrações. Conecte 18 canais sociais, adquira números virtuais de mais de 55 países e automatize WhatsApp e IA de Voz.",
        "socialChannelsFeature": "18 canais sociais e mensagens",
        "telephonyFeature": "Telefonia global e IA de Voz",
        "telephonyFeatureDesc": "Receba SMS, envie transmissões de WhatsApp e faça chamadas WebRTC",
        "storageFeature": "Armazenamento persistente em arquivos",
        "storageFeatureDesc": "Todas as ações, números e canais são salvos permanentemente",
        "signUpBadge": "Comece grátis em menos de 60 segundos",
        "fullNamePlaceholder": "Lucas Silva",
        "companyNamePlaceholder": "Minha Marca",
        "whatYouGet1": "Conexão em 1 clique para 18 plataformas (Instagram, TikTok, LinkedIn, YouTube, WhatsApp, Shopify e mais).",
        "whatYouGet2": "Agende posts & Reels, responda mensagens na caixa unificada e ative Comment-to-DM.",
        "whatYouGet3": "Chave de API Asra3 instantânea (tk_live_...) para integrar com seus sistemas.",
        "exploreApiDocs": "Explorar documentação da API para desenvolvedores"
    },
  "showcase": {
        "platformEyebrow": "Plataforma abrangente de 18 redes",
        "platformTitle": "Integrações nativas avançadas com simulações ao vivo",
        "platformSubtitle": "Publique conteúdo, modere comentários e automatize mensagens em todas as redes a partir de uma API unificada.",
        "adsEyebrow": "Motor unificado de anúncios em 8 redes",
        "adsTitle": "Lance, modere e avalie campanhas em 8 redes de anúncios",
        "adsSubtitle": "Sincronização total com Meta, Google, TikTok, LinkedIn, X, Pinterest, Reddit e OpenAI Ads com rastreamento CAPI.",
        "devHubEyebrow": "Hub para desenvolvedores e agentes de IA",
        "devHubTitle": "8 SDKs, servidor MCP pronto para uso e CLI para desenvolvedores",
        "devHubSubtitle": "Desenvolva na sua linguagem favorita ou deixe Claude Code e Cursor automatizarem publicações e telefonia.",
        "copied": "Copiado!",
        "copyPrompt": "Copiar prompt de configuração de IA",
        "promptCopiedToast": "Prompt copiado para a área de transferência!"
    }
};

const dict_tr: TranslationDictionary = {
  "brand": {
    "name": "Asra3",
    "domain": "asra3.com",
    "tagline": "Sosyal Medya, Reklam, Mesajlaşma, Yapay Zeka Telefon ve Geliştirici API için Birleşik Platform"
  },
  "nav": {
    "home": "Ana Sayfa",
    "workspace": "Kontrol Paneli",
    "docs": "API Dokümanları",
    "admin": "Yönetici",
    "login": "Giriş Yap",
    "signup": "Ücretsiz Başla",
    "lightMode": "Açık Tema",
    "darkMode": "Koyu Tema",
    "logout": "Çıkış Yap",
    "signOut": "Çıkış"
  },
  "hero": {
    "badge": "Birleşik Pazarlama ve Mesajlaşma Bulutu + Geliştirici API · asra3.com",
    "titlePart1": "Müşterilerinize Her Yerden",
    "titleHighlight": "Tek Platform ve Tek API",
    "titlePart2": "İle Hemen Ulaşın.",
    "subtitle": "Asra3 (asra3.com); 18 sosyal kanal ve blogu, 8 reklam ağını, birleşik WhatsApp/Instagram gelen kutusunu, yapay zeka sesli asistanlı küresel telefon numaralarını ve e-ticareti birleştirir — ister kontrol panelinden hemen kullanın, ister dakikalar içinde REST API ile entegre edin.",
    "ctaStart": "Ücretsiz Başla",
    "ctaWorkspace": "Paneli Aç",
    "ctaDocs": "API Dokümanları",
    "stat1Label": "Hazır API Uç Noktası",
    "stat2Label": "Sosyal ve Reklam Kanalı",
    "stat3Label": "İlk Paylaşıma Kalan Çağrı",
    "stat4Label": "Tek Tıkla Anında Bağlantı"
  },
  "subServicesSection": {
    "eyebrow": "Kapsamlı Ürün Paketi",
    "title": "8 Entegre Ürün — İster Panelden İster API ile Kullanın",
    "subtitle": "Tüm kanallarınızı kullanıcı dostu çalışma alanımızdan doğrudan yönetin veya Asra3 platformunu pazarlama API altyapınız olarak kullanın.",
    "openInWorkspace": "Panelde Aç",
    "viewApiDocs": "API Referansı",
    "services": {
      "core_connect": {
        "title": "Tek Tıkla Hesap Bağlama",
        "shortTitle": "Bağlı Hesaplar",
        "tagline": "18 sosyal ağı, mesajlaşma uygulamasını, blogu ve mağazayı saniyeler içinde bağlayın",
        "bullets": [
          "Instagram, TikTok, Facebook, X, LinkedIn, YouTube ve Threads için tek tıkla OAuth",
          "Telegram, Discord, Slack, WhatsApp, Snapchat, Pinterest, Reddit ve Bluesky desteği",
          "Shopify mağazaları, WordPress blogları ve Google Business konumları için doğrudan bağlantı",
          "Otomatik token yenileme ve gerçek zamanlı bağlantı sağlığı denetimi"
        ]
      },
      "publishing": {
        "title": "Çok Kanallı Yayınlama ve Akıllı Kuyruklar",
        "shortTitle": "Yayınla ve Planla",
        "tagline": "Bir kez yazın; gönderileri, Reels videolarını ve karuselleri 16 platformda planlayın",
        "bullets": [
          "Resimler, videolar, Reels, karuseller, thread'ler ve anketler için birleşik editör",
          "Saat dilimine duyarlı planlama ve etkileşimi artıran akıllı kuyruklar (Smart Queue)",
          "Otomatik format doğrulama ile yüksek hızlı imzalı medya yüklemeleri",
          "Otomatik ilk yorum ve her platform için özelleştirilebilir metinler"
        ]
      },
      "inbox_crm": {
        "title": "Birleşik Gelen Kutusu, Otomatik DM ve Sosyal CRM",
        "shortTitle": "Gelen Kutusu ve DM",
        "tagline": "WhatsApp, Instagram, Facebook mesajlarını, yorumları ve değerlendirmeleri tek ekranda toplayın",
        "bullets": [
          "Direkt mesajlar, gönderi yorumları ve Google/Facebook değerlendirmeleri için tek gelen kutusu",
          "Yorumlarda geçen anahtar kelimelere göre otomatik DM (Comment-to-DM) tetikleme",
          "Çok kanallı toplu mesaj (broadcast) kampanyaları ve otomatik takip dizileri",
          "Dahili kişi yönetimi ve özelleştirilebilir CRM alanları"
        ]
      },
      "analytics": {
        "title": "Tüm Kanallarda Analitik ve Raporlama",
        "shortTitle": "Analitik",
        "tagline": "Görüntülenme, erişim, etkileşim oranı ve takipçi artışını gerçek zamanlı izleyin",
        "bullets": [
          "Erişim, gösterim, tıklama ve etkileşim oranları için birleşik kontrol paneli",
          "Takipçilerinizin en aktif olduğu saatlere göre en iyi paylaşım zamanı haritaları",
          "Gönderi bazında performans dökümü ve dönem karşılaştırmaları",
          "Dışa aktarılabilir raporlar ve eksiksiz REST API erişimi"
        ]
      },
      "ads": {
        "title": "Reklam Yöneticisi ve Dönüşüm API'si (CAPI)",
        "shortTitle": "Ücretli Reklamlar",
        "tagline": "Meta, Google, TikTok, LinkedIn, X ve OpenAI üzerinde kampanyalar başlatın ve izleyin",
        "bullets": [
          "Kampanyaları, reklam setlerini ve bütçeleri tek bir panelden yönetin",
          "Tek tıkla gönderi öne çıkarma ve WhatsApp'a Yönlendiren (CTWA) reklamlar oluşturma",
          "Hassas satış takibi için sunucu taraflı Dönüşüm API'si (Conversions API - CAPI)",
          "Müşteri listeleri ve benzer hedef kitleleri (Lookalike) zahmetsizce senkronize edin"
        ]
      },
      "telephony": {
        "title": "Bulut Telefon, SMS ve Yapay Zeka Ses",
        "shortTitle": "Telefon ve Sesli AI",
        "tagline": "Uluslararası telefon numaraları, SMS/WhatsApp, WebRTC arayıcı ve 7/24 AI sesli asistanlar",
        "bullets": [
          "Ses, SMS, RCS ve WhatsApp destekli uluslararası numaralar satın alın veya taşıyın",
          "Gelen çağrıları tek tıkla yapay zeka sesli karşılama asistanına bağlayın",
          "Doğrudan tarayıcınızdan telefon görüşmeleri yapın ve yanıtlayın (WebRTC Softphone)",
          "OTP doğrulama kodları gönderin ve resmi WhatsApp Business akışlarını yönetin"
        ]
      },
      "commerce_local": {
        "title": "E-Ticaret Mağazaları ve Google Harita SEO",
        "shortTitle": "Mağazalar ve Yerel SEO",
        "tagline": "Shopify ve WooCommerce ürünlerini, blog yazılarını ve Google Business şubelerini yönetin",
        "bullets": [
          "Ürünler, stoklar, siparişler ve indirim kuponları için birleşik görünüm",
          "Shopify Blog ve WordPress içeriklerini tek bir editörden yayınlayın",
          "Google Business Profil konumlarını, çalışma saatlerini yönetin ve yorumları yanıtlayın",
          "Ürün kataloglarını Meta ve TikTok dinamik reklamlarıyla anında eşitleyin"
        ]
      },
      "support_ai": {
        "title": "Yapay Zeka Asistanı ve Geliştirici API Anahtarları",
        "shortTitle": "AI Asistan ve API",
        "tagline": "Hesaplarınız için anında yapay zeka sorun giderme + uygulamanız için API anahtarları",
        "bullets": [
          "AI Asistan'a bir gönderinin neden başarısız olduğunu sorun veya hesap sağlığını denetleyin",
          "Hizmetlerimizi uygulamanıza bağlamak için Asra3 API anahtarları (tk_live_...) oluşturun",
          "Gelen mesajlar ve yayınlanan içerikler için gerçek zamanlı webhook'lar yapılandırın"
        ]
      }
    }
  },
  "pricingSection": {
    "eyebrow": "Şeffaf ve Esnek Fiyatlandırma",
    "title": "Ücretsiz Başlayın, İhtiyacınıza Göre Büyütün",
    "subtitle": "Her plan hem kullanıcı dostu web paneline hem de Asra3 REST API'sine tam erişim içerir.",
    "perMonth": "/ ay",
    "choosePlan": "Hemen Başla",
    "popularBadge": "En Popüler",
    "plans": {
      "starter": {
        "name": "Başlangıç (Starter)",
        "desc": "Bireysel üreticiler, danışmanlar ve yeni girişimler için mükemmel.",
        "features": [
          "5 adede kadar bağlı sosyal medya hesabı",
          "Ayda 300 planlanmış gönderi",
          "Çok platformlu editör ve akıllı kuyruk",
          "Temel analitik paneli + API erişimi"
        ]
      },
      "growth": {
        "name": "Büyüme (Growth)",
        "desc": "Birleşik gelen kutusu ve mağaza senkronizasyonu isteyen büyüyen işletmeler için.",
        "features": [
          "15 adede kadar hesap + 1 bulut telefon numarası",
          "Ayda 2.000 gönderi ve 10.000 mesaj",
          "Birleşik gelen kutusu + Comment-to-DM otomasyonu",
          "Shopify, WooCommerce ve Google Business senkronizasyonu"
        ]
      },
      "agency": {
        "name": "Profesyonel / Ajans (Pro / Agency)",
        "desc": "Ücretli reklam yönetimi ve AI sesli asistan dahil tüm 8 ürün açık.",
        "features": [
          "50 adede kadar hesap + 5 uluslararası telefon numarası",
          "8 reklam ağının tümü + Dönüşüm API'si (CAPI)",
          "Yapay zeka sesli asistan + tarayıcı WebRTC arayıcısı",
          "Gerçek zamanlı webhook'lar ve öncelikli destek"
        ]
      },
      "enterprise": {
        "name": "Kurumsal (Enterprise)",
        "desc": "Yüksek hacim limitleri, çoklu API anahtarları ve özel altyapı.",
        "features": [
          "500 bağlı hesap + 50 telefon numarası",
          "Yazılım ekipleri için yetkilendirilmiş çoklu API anahtarı",
          "Özel hız limitleri ve atanmış müşteri temsilcisi",
          "%99,9 kesintisiz çalışma SLA garantisi ve özel entegrasyonlar"
        ]
      }
    }
  },
  "faqSection": {
    "eyebrow": "Sıkça Sorulan Sorular",
    "title": "Asra3 (asra3.com) Hakkında Bilmeniz Gereken Her Şey",
    "subtitle": "Kontrol panelinin kullanımı ve API entegrasyonuna dair açık ve net yanıtlar.",
    "items": [
      {
        "q": "Asra3 (asra3.com) nedir ve işletmelere ne sağlar?",
        "a": "Asra3 (asra3.com); 18 sosyal medya ve blog kanalını bağlamanızı, birleşik WhatsApp/Instagram mesajlarını yönetmenizi, 8 ağda reklam yayınlamanızı ve yapay zekalı bulut telefon hatları işletmenizi sağlayan hepsi bir arada bir pazarlama ve geliştirici API platformudur."
      },
      {
        "q": "Asra3'yi kodlama bilmeden kullanabilir miyim?",
        "a": "Kesinlikle evet! Web kontrol panelimiz (/dashboard) işletmeler, pazarlamacılar ve içerik üreticileri için özel olarak tasarlandı. Tek tıkla hesap bağlayabilir, gönderileri planlayabilir, mesajlara yanıt verebilir ve kod yazmadan reklam başlatabilirsiniz."
      },
      {
        "q": "Asra3'yi kendi uygulamamda veya yapay zeka ajanımda üçüncü taraf API olarak kullanabilir miyim?",
        "a": "Elbette. Geliştiriciler bir API anahtarı (tk_live_...) oluşturarak https://asra3.com/api/v1 üzerinden kullanıcı hesaplarını bağlayabilir, içerik planlayabilir, analitikleri çekebilir ve WhatsApp/SMS mesajlarını programatik olarak gönderebilir."
      },
      {
        "q": "Hangi sosyal platformlar ve reklam ağları destekleniyor?",
        "a": "18 kanalı (Instagram, Facebook, TikTok, LinkedIn, X/Twitter, YouTube, Threads, Pinterest, Reddit, Bluesky, Snapchat, Google Business, Telegram, Discord, Slack, WhatsApp, Shopify ve WordPress) ve 8 reklam ağını (Meta, Google, TikTok, LinkedIn, Pinterest, X, Reddit ve OpenAI Ads) destekliyoruz."
      }
    ]
  },
  "dashboard": {
    "activeTenant": "Aktif Hesap",
    "newTenant": "+ Yeni Hesap",
    "syncBtn": "Yenile",
    "groupChannels": "Hesaplar ve Yayınlama",
    "groupGrowth": "Gelen Kutusu ve Analitik",
    "groupEnterprise": "Reklam, Telefon ve Mağaza",
    "quotasTitle": "Plan Kullanımı",
    "maxChannels": "Bağlı Hesaplar",
    "monthlyPosts": "Aylık Gönderiler",
    "phoneNumbers": "Telefon Numaraları",
    "aiBudget": "AI Asistan Kredisi",
    "lockedTitle": "Bu özellik mevcut planınızda yer almıyor",
    "lockedDesc": "Hemen kullanmaya başlamak için planınızı yükseltin veya yönetici ayarlarından bu modülü etkinleştirin.",
    "openAdminBtn": "Plan Ayarlarını Yönet",
    "connectStep1Title": "Hesap İzinleri",
    "connectStep1Desc": "Standart izinler otomatik olarak etkinleştirilir.",
    "connectStep2Title": "Yeni Hesap Ekle (Tek Tıkla Bağlantı)",
    "connectStep2Desc": "Hesabınızı saniyeler içinde bağlamak için aşağıdaki platformlardan birine tıklayın:",
    "entityPickerTitle": "Sayfa veya Profil Seçin",
    "entityPickerDesc": "Yönetmek istediğiniz sayfayı veya kanalı seçin:",
    "directTokenTitle": "Shopify veya WordPress Hızlı Bağlantı",
    "directTokenDesc": "Mağaza alan adınızı veya site adresinizi girerek doğrudan bağlayın:",
    "connectTokenBtn": "Mağazayı Bağla",
    "connectedAccountsTitle": "Bağlı Hesaplarınız",
    "composerTitle": "Yeni Gönderi Oluştur ve Planla",
    "composerPlaceholder": "Gönderi metninizi buraya yazın... Etiketler, bağlantılar veya emojiler ekleyin ✨",
    "useSmartQueue": "En yüksek etkileşim saatinde otomatik yayınla (Smart Queue)",
    "uploadMediaBtn": "Resim / Video Ekle",
    "publishNowBtn": "Şimdi Yayınla / Planla",
    "inboxTitle": "Birleşik Mesaj ve Yorum Kutusu",
    "replyBtn": "Gönder",
    "automationTitle": "Yorumlara Otomatik DM",
    "automationDesc": "Bir kullanıcı gönderinize belirli bir anahtar kelime yazdığında otomatik özel mesaj gönderin:",
    "activateAutomationBtn": "Otomatik DM'yi Etkinleştir",
    "analyticsImpressions": "Görüntülenmeler",
    "analyticsReach": "Toplam Erişim",
    "analyticsEngagement": "Etkileşim Oranı",
    "analyticsFollowers": "Yeni Takipçiler",
    "adsTitle": "Aktif Reklam Kampanyaları",
    "connectAdBtn": "Reklam Hesabı Bağla",
    "capiTitle": "Dönüşüm API'si (CAPI) İzleyici",
    "capiDesc": "Meta ve Google reklam dağıtımını iyileştirmek için satın alma olaylarını iletin.",
    "sendCapiBtn": "Test Dönüşümü Gönder",
    "kycTitle": "Telefon Numarası Doğrulama",
    "kycDesc": "Yeni bir uluslararası telefon numarasını tek adımda aktifleştirin ve doğrulayın.",
    "generateKycBtn": "Yeni Numarayı Doğrula",
    "voiceAgentTitle": "7/24 AI Sesli Karşılama",
    "voiceAgentDesc": "Gelen telefon çağrılarını akıllı bir yapay zeka sesli asistanına yönlendirin.",
    "bindVoiceBtn": "Sesli AI'yi Etkinleştir",
    "webrtcTitle": "Tarayıcı Telefon Arayıcısı",
    "webrtcDesc": "Ekstra yazılıma ihtiyaç duymadan doğrudan tarayıcınızdan arama yapın ve yanıtlayın.",
    "startWebrtcBtn": "Web Arayıcıyı Aç",
    "commerceTitle": "Mağaza Ürünleri (Shopify / WooCommerce)",
    "localSeoTitle": "Google Business Şubeleri",
    "aiSupportTitle": "Yapay Zeka Asistanı ve API Anahtarları",
    "aiSupportDesc": "Gönderilerinizi veya bağlı hesaplarınızı denetlemesi için AI Asistan'a danışın:",
    "runDiagnosisBtn": "AI Asistan'a Danış"
  },
  "admin": {
    "title": "Platform Yönetimi ve Plan Ayarları",
    "subtitle": "Etkin ürünleri, desteklenen platformları, fiyat planlarını ve müşteri hesaplarını yönetin.",
    "headlessEnforced": "Doğrudan Bağlantı Etkin",
    "headlessOptional": "Standart Mod",
    "tabGlobal": "1. Etkin Ürünler ve Kanallar",
    "tabPlans": "2. Planlar ve Fiyatlar",
    "tabTenants": "3. Müşteriler ve API Anahtarları",
    "tabBilling": "4. Gelirler ve Maliyetler",
    "globalServicesTitle": "Platformun 8 Ürününü Aç veya Kapat",
    "globalScopesTitle": "Varsayılan OAuth İzinleri",
    "globalPlatformsTitle": "Desteklenen Sosyal ve Blog Kanalları (18 Platform)",
    "globalAdsTitle": "Desteklenen Reklam Ağları (8 Ağ)",
    "provisionTenantBtn": "Yeni Hesap Oluştur",
    "openWorkspaceBtn": "Paneli Görüntüle",
    "mintKeyBtn": "API Anahtarı Oluştur",
    "suspendBtn": "Askıya Al",
    "restoreBtn": "Etkinleştir",
    "billingTitle": "Tedarikçi Maliyeti ve Abonelik Gelir Raporu",
    "colTenant": "Müşteri Hesabı",
    "colProfile": "Profil Kimliği",
    "colPlan": "Plan",
    "colWholesale": "Toptan Maliyet",
    "colRetail": "Abonelik Fiyatı",
    "colMargin": "Net Kâr"
  },
  "docs": {
    "badge": "Resmi Geliştirici Dokümantasyonu · asra3.com/docs",
    "title": "Asra3 API Dokümantasyonu",
    "subtitle": "Bir API anahtarı alın, bir hesap bağlayın ve 5 çağrıda ilk gönderinizi planlayın.",
    "baseUrlLabel": "Temel API Adresi (Base URL)",
    "authTitle": "Kimlik Doğrulama ve API Anahtarları",
    "authDesc": "Tüm isteklerde API anahtarınızı Authorization: Bearer tk_live_... başlığıyla iletin.",
    "webhooksTitle": "Webhook'lar ve Gerçek Zamanlı Olaylar",
    "webhooksDesc": "HMAC-SHA256 ile korunan mesaj ve gönderi bildirimlerini anlık olarak alın.",
    "endpointsTitle": "Uç Nokta Referansı",
    "tryEndpointBtn": "Canlı Test Et"
  },
  "telephony": {
    "eyebrow": "Sanal Numaralar, WhatsApp ve Sesli AI",
    "title": "55+ Ülkede Numara Alın, SMS Alıp Gönderin ve Çağrı Yapın",
    "subtitle": "Özel hatlar edinin, bunları onaylı şablonlarla WhatsApp Business'a bağlayın ve gerçek telefon aramaları yapan düşük gecikmeli AI sesli asistanları devreye alın.",
    "marketTitle": "Sanal Numara Pazaryeri",
    "marketSubtitle": "Otomatik KYC uyumluluğu ile 55'ten fazla ülkede anında kullanıma hazır numaralar",
    "buyBtn": "Numarayı Satın Al ve Aktifleştir",
    "typeFilterAll": "Tümü (Yerel, Mobil, Ücretsiz)",
    "typeFilterMobile": "Mobil Numaralar",
    "typeFilterLocal": "Yerel Numaralar",
    "typeFilterTollFree": "Ücretsiz Hatlar (Toll-Free)",
    "dialerTitle": "Web Telefon Arayıcısı ve Çağrı Konsolu",
    "dialerSubtitle": "Sanal hatlarınız üzerinden doğrudan tarayıcınızdan telefon görüşmeleri yapın",
    "callModeDirect": "Doğrudan Sesli Çağrı",
    "callModeAi": "Yapay Zeka Sesli Asistan Çağrısı",
    "callBtn": "Aramayı Başlat",
    "endCallBtn": "Aramayı Sonlandır",
    "smsTitle": "Çift Yönlü Canlı SMS ve WhatsApp Kutusu",
    "simulateOtpBtn": "Gelen OTP Kodunu Simüle Et",
    "simulateSmsBtn": "Gelen SMS'i Simüle Et",
    "whatsappTitle": "Numarayı WhatsApp Business'a Bağla",
    "linkWhatsappBtn": "WhatsApp Bağlama Sihirbazını Başlat"
  },
  "connectionWizard": {
    "modalTitle": "Kanal ve Platform Bağlantı Sihirbazı",
    "modalSubtitle": "Sosyal medya ağlarını, mesajlaşma uygulamalarını, mağazaları ve blogları rehberli adımlarla bağlayın.",
    "step1Title": "1. Platform ve Yöntem Seçin",
    "step2Title": "2. Kimlik Doğrulama ve Yetkilendirme",
    "step3Title": "3. Hedef Sayfa veya Kanalı Belirleyin",
    "step4Title": "4. Doğrulandı ve Hazır",
    "methodOAuth": "Güvenli Tek Tıkla OAuth",
    "methodToken": "Doğrudan Anahtar / Bot Token",
    "testPostBtn": "Test Gönderisi / Mesajı Gönder",
    "connectedBadge": "Bağlandı ve Kullanıma Hazır ✓"
  },
  "auth": {
        "loginTitle": "Çalışma Alanınıza Giriş Yapın",
        "loginSubtitle": "Yalıtılmış müşteri çalışma alanınıza erişmek ve kanalları ile telefon hatlarınızı yönetmek için bilgilerinizi girin.",
        "signupTitle": "Asra3 Hesabınızı Oluşturun",
        "signupSubtitle": "Sosyal kanallarınızı bağlayın, gönderileri planlayın, mesaj ve reklamları yönetin veya hemen API anahtarınızı alın.",
        "emailLabel": "İş E-postası",
        "passwordLabel": "Şifre",
        "nameLabel": "Ad Soyad",
        "companyLabel": "Proje / Şirket Adı (İsteğe bağlı)",
        "selectPlanLabel": "Planınızı Seçin:",
        "submitLogin": "Giriş Yap",
        "submitSignup": "Ücretsiz Başlayın",
        "alreadyHaveAccount": "Zaten bir hesabınız var mı? ",
        "needAccount": "Hesabınız yok mu? ",
        "demoPersonasTitle": "Hızlı Demo Profilleri",
        "whatYouGetTitle": "Hemen Elde Edecekleriniz",
        "workEmailRequired": "Lütfen iş e-postanızı girin.",
        "signInFailed": "Giriş başarısız. Bilgilerinizi kontrol edin.",
        "unableToSignIn": "Kimlik doğrulama sunucusuna bağlanılamadı.",
        "signingIn": "Doğrulanıyor...",
        "orContinueWith": "Veya şununla devam edin",
        "continueWithGoogle": "Google ile Devam Et",
        "enterpriseIsolation": "Kurumsal Seviyede Kiracı Yalıtımı",
        "unifiedTitle": "Birleşik İletişim ve Pazarlama Platformu",
        "unifiedDesc": "Karışıklık olmadan özel çalışma alanınıza erişin. 18 sosyal kanalı bağlayın, 55+ ülkeden sanal numaralar edinin ve WhatsApp ile Sesli Yapay Zekayı otomatikleştirin.",
        "socialChannelsFeature": "18 Sosyal Medya ve Mesajlaşma Kanalı",
        "telephonyFeature": "Küresel Telefon ve Sesli Yapay Zeka",
        "telephonyFeatureDesc": "SMS alın, WhatsApp duyuruları gönderin ve WebRTC aramaları yapın",
        "storageFeature": "Kalıcı Dosya Tabanlı Depolama",
        "storageFeatureDesc": "Her işlem, numara ve kanal çalışma alanınıza kalıcı olarak kaydedilir",
        "signUpBadge": "60 saniyeden kısa sürede ücretsiz başlayın",
        "fullNamePlaceholder": "Mehmet Yılmaz",
        "companyNamePlaceholder": "Markam",
        "whatYouGet1": "18 platform için tek tıkla bağlantı (Instagram, TikTok, LinkedIn, YouTube, WhatsApp, Shopify ve daha fazlası).",
        "whatYouGet2": "Gönderi & Reels planlayın, birleşik gelen kutusundan yanıtlayın ve Comment-to-DM özelliğini etkinleştirin.",
        "whatYouGet3": "Kendi uygulamanıza entegre etmek için anında Asra3 API Anahtarı (tk_live_...).",
        "exploreApiDocs": "Geliştirici API Dokümantasyonunu İnceleyin"
    },
  "showcase": {
        "platformEyebrow": "Kapsamlı 18 Ağ Platformu",
        "platformTitle": "Canlı Platform Önizlemeleri ile Gelişmiş Yerel Entegrasyonlar",
        "platformSubtitle": "Tek bir birleşik API'den tüm ağlarda içerik yayınlayın, yorumları yönetin ve mesajlaşmayı otomatikleştirin.",
        "adsEyebrow": "Birleşik 8 Ağ Reklam Motoru",
        "adsTitle": "8 Reklam Ağında Kampanyalar Başlatın, Yönetin ve Raporlayın",
        "adsSubtitle": "Bütçe otomasyonu ve CAPI izleme ile Meta, Google, TikTok, LinkedIn, X, Pinterest, Reddit ve OpenAI Ads ile tam senkronizasyon.",
        "devHubEyebrow": "Geliştirici ve Yapay Zeka Ajanı Merkezi",
        "devHubTitle": "8 SDK, Kullanıma Hazır MCP Sunucusu ve Geliştirici CLI",
        "devHubSubtitle": "Favori programlama dilinizde kodlayın veya Claude Code ile Cursor'ın paylaşım ve telefon yönetimini otomatikleştirmesine izin verin.",
        "copied": "Kopyalandı!",
        "copyPrompt": "Yapay Zeka Kurulum İstemini Kopyala",
        "promptCopiedToast": "Kurulum istemi panoya kopyalandı!"
    }
};

const dict_ru: TranslationDictionary = {
  "brand": {
    "name": "Asra3",
    "domain": "asra3.com",
    "tagline": "Единая облачная платформа и API для соцсетей, рекламы, мессенджеров, голосового ИИ и интернет-магазинов"
  },
  "nav": {
    "home": "Главная",
    "workspace": "Панель управления",
    "docs": "API Документация",
    "admin": "Админ",
    "login": "Войти",
    "signup": "Начать бесплатно",
    "lightMode": "Светлая тема",
    "darkMode": "Тёмная тема",
    "logout": "Выйти",
    "signOut": "Выход"
  },
  "hero": {
    "badge": "Единое облако маркетинга и коммуникаций + API для разработчиков · asra3.com",
    "titlePart1": "Будьте на связи с клиентами везде через",
    "titleHighlight": "единую платформу и один API",
    "titlePart2": "без долгих согласований и бюрократии.",
    "subtitle": "Asra3 (asra3.com) объединяет 18 соцсетей и блогов, 8 рекламных сетей, общий входящий ящик WhatsApp/Instagram, международную телефонию с голосовым ИИ и интернет-магазины: готово к работе через удобный интерфейс или интеграцию по REST API за считанные минуты.",
    "ctaStart": "Начать бесплатно",
    "ctaWorkspace": "Открыть панель",
    "ctaDocs": "Документация API",
    "stat1Label": "Готовых эндпоинтов API",
    "stat2Label": "Каналов соцсетей и рекламы",
    "stat3Label": "Шага до первого поста",
    "stat4Label": "Мгновенное подключение в 1 клик"
  },
  "subServicesSection": {
    "eyebrow": "Полный комплекс инструментов",
    "title": "8 интегрированных продуктов — используйте в веб-панели или через API",
    "subtitle": "Управляйте всеми каналами в едином удобном интерфейсе или встраивайте Asra3 как ваш внешний маркетинговый API.",
    "openInWorkspace": "Открыть в панели",
    "viewApiDocs": "Справочник API",
    "services": {
      "core_connect": {
        "title": "Подключение аккаунтов в 1 клик",
        "shortTitle": "Подключенные аккаунты",
        "tagline": "Подключайте 18 соцсетей, мессенджеров, блогов и магазинов за секунды",
        "bullets": [
          "Мгновенный OAuth в 1 клик для Instagram, TikTok, Facebook, X, LinkedIn, YouTube и Threads",
          "Поддержка Telegram, Discord, Slack, WhatsApp, Snapchat, Pinterest, Reddit и Bluesky",
          "Прямое подключение магазинов Shopify, блогов WordPress и точек Google Business",
          "Автоматическое обновление токенов и непрерывный мониторинг статуса авторизации"
        ]
      },
      "publishing": {
        "title": "Кросс-платформенная публикация и умные очереди",
        "shortTitle": "Публикация и планирование",
        "tagline": "Напишите один раз и запланируйте посты, Reels и карусели в 16 сетях",
        "bullets": [
          "Единый редактор для фото, видео, Reels, каруселей, тредов и опросов",
          "Планирование с учётом часовых поясов и умные очереди автоматической публикации (Smart Queue)",
          "Высокоскоростная загрузка медиа с автоматической проверкой форматов",
          "Автоматический первый комментарий и адаптация текста под каждую платформу"
        ]
      },
      "inbox_crm": {
        "title": "Единый ящик сообщений, авто-DM и социальная CRM",
        "shortTitle": "Сообщения и авто-DM",
        "tagline": "Объединяйте диалоги WhatsApp, Instagram, Facebook, комментарии и отзывы",
        "bullets": [
          "Общий ящик для личных сообщений, комментариев к постам и отзывов Google/Facebook",
          "Автоматическая отправка сообщений в директ (Comment-to-DM) по ключевым словам",
          "Массовые рассылки по каналам и автоворонки повторных сообщений",
          "Встроенная база контактов с настраиваемыми CRM-полями"
        ]
      },
      "analytics": {
        "title": "Сквозная аналитика и отчёты",
        "shortTitle": "Аналитика",
        "tagline": "Отслеживайте просмотры, охват, уровень вовлечённости и прирост подписчиков в реальном времени",
        "bullets": [
          "Единый дашборд охвата, показов, кликов и коэффициента вовлечённости (ER)",
          "Тепловые карты оптимального времени публикаций на основе активности аудитории",
          "Анализ результативности каждого поста и сравнение периодов",
          "Экспорт отчётов и полный доступ через REST API"
        ]
      },
      "ads": {
        "title": "Менеджер рекламы и Conversions API (CAPI)",
        "shortTitle": "Таргетированная реклама",
        "tagline": "Запуск и аналитика кампаний в Meta, Google, TikTok, LinkedIn, X и OpenAI",
        "bullets": [
          "Создание кампаний, групп объявлений и управление бюджетами из единого центра",
          "Продвижение постов в 1 клик и объявления с переходом в WhatsApp (Click-to-WhatsApp)",
          "Серверный Conversions API (CAPI) для точного учёта покупок и конверсий",
          "Быстрая синхронизация клиентских баз и похожих аудиторий (Lookalike)"
        ]
      },
      "telephony": {
        "title": "Облачная телефония, SMS и голосовой ИИ",
        "shortTitle": "Телефония и голосовой ИИ",
        "tagline": "Международные номера, SMS/WhatsApp, WebRTC-звонки и ИИ-ассистенты 24/7",
        "bullets": [
          "Покупка и перенос виртуальных номеров с поддержкой звонков, SMS, RCS и WhatsApp",
          "Перевод входящих звонков на умного голосового ИИ-секретаря в 1 клик",
          "Исходящие и входящие вызовы прямо из браузера (WebRTC-софтфон)",
          "Отправка кодов авторизации (OTP) и работа с официальным WhatsApp Business"
        ]
      },
      "commerce_local": {
        "title": "Интернет-магазины и локальное SEO в Google",
        "shortTitle": "Магазины и локальное SEO",
        "tagline": "Управляйте товарами Shopify и WooCommerce, статьями в блогах и карточками Google Business",
        "bullets": [
          "Единый обзор каталога товаров, остатков, заказов и промокодов",
          "Публикация статей в блоги Shopify и WordPress через один редактор",
          "Управление филиалами Google Business Profile, графиком работы и отзывами",
          "Синхронизация каталогов с динамической рекламой в Meta и TikTok"
        ]
      },
      "support_ai": {
        "title": "ИИ-ассистент и API-ключи для разработчиков",
        "shortTitle": "ИИ-ассистент и API",
        "tagline": "Мгновенная ИИ-диагностика ваших каналов + API-ключи для интеграции в сторонние приложения",
        "bullets": [
          "Спросите ИИ-ассистента о причине ошибки публикации или проверьте здоровье аккаунтов",
          "Генерируйте API-ключи Asra3 (tk_live_...) для подключения к вашему сервису",
          "Настраивайте вебхуки реального времени для входящих сообщений и постов"
        ]
      }
    }
  },
  "pricingSection": {
    "eyebrow": "Прозрачные и понятные тарифы",
    "title": "Начните бесплатно и масштабируйтесь по мере роста",
    "subtitle": "Каждый тариф включает полный доступ к панели управления и ко всем возможностям Asra3 REST API.",
    "perMonth": "/ месяц",
    "choosePlan": "Выбрать тариф",
    "popularBadge": "Хит продаж",
    "plans": {
      "starter": {
        "name": "Стартовый (Starter)",
        "desc": "Отлично подходит для авторов контента, экспертов и небольших команд.",
        "features": [
          "До 5 подключенных аккаунтов соцсетей",
          "300 запланированных постов в месяц",
          "Кросс-платформенный редактор и умная очередь",
          "Базовая аналитика + доступ к API"
        ]
      },
      "growth": {
        "name": "Рост (Growth)",
        "desc": "Для развивающихся компаний, которым нужен единый входящий ящик и интеграция с магазином.",
        "features": [
          "До 15 аккаунтов + 1 виртуальный номер телефона",
          "2 000 постов и 10 000 сообщений в месяц",
          "Единый ящик диалогов + авто-DM по комментариям",
          "Синхронизация с Shopify, WooCommerce и Google Business"
        ]
      },
      "agency": {
        "name": "Про / Агентство (Pro / Agency)",
        "desc": "Все 8 продуктов без ограничений, включая рекламу и голосового ИИ-секретаря.",
        "features": [
          "До 50 аккаунтов + 5 международных телефонных номеров",
          "Все 8 рекламных платформ + Conversions API",
          "Голосовой агент на базе ИИ + WebRTC-телефон в браузере",
          "Мгновенные вебхуки и приоритетная техподдержка"
        ]
      },
      "enterprise": {
        "name": "Корпоративный (Enterprise)",
        "desc": "Максимальные лимиты, множество API-ключей и выделенная инфраструктура.",
        "features": [
          "500 подключенных аккаунтов + 50 телефонных номеров",
          "Несколько API-ключей с разграничением прав для инженеров",
          "Персональные лимиты скорости и личный менеджер аккаунта",
          "SLA доступности 99,9% и индивидуальные доработки"
        ]
      }
    }
  },
  "faqSection": {
    "eyebrow": "Часто задаваемые вопросы",
    "title": "Всё, что вам нужно знать о платформе Asra3 (asra3.com)",
    "subtitle": "Прямые ответы на вопросы об использовании веб-интерфейса и программного API.",
    "items": [
      {
        "q": "Что представляет собой платформа Asra3 (asra3.com)?",
        "a": "Asra3 (asra3.com) — это универсальная платформа маркетинга, коммуникаций и API для разработчиков. Она позволяет объединить 18 соцсетей и блогов, обрабатывать сообщения WhatsApp/Instagram в едином ящике, вести рекламу в 8 сетях и пользоваться виртуальными телефонными номерами с голосовым ИИ."
      },
      {
        "q": "Могу ли я использовать Asra3, если не умею программировать?",
        "a": "Конечно! Наша панель управления (/dashboard) создана для бизнеса, маркетологов и создателей контента. Вы можете привязать аккаунты в 1 клик, планировать контент, отвечать клиентам и запускать рекламу без единой строчки кода."
      },
      {
        "q": "Можно ли интегрировать Asra3 как сторонний API в своё приложение или ИИ-агента?",
        "a": "Безусловно. Разработчики могут выпустить API-ключ (tk_live_...) и отправлять запросы к https://asra3.com/api/v1 для подключения аккаунтов пользователей, планирования постов, чтения метрик и автоматической отправки сообщений WhatsApp/SMS."
      },
      {
        "q": "Какие социальные сети и рекламные площадки поддерживаются?",
        "a": "Мы поддерживаем 18 каналов (Instagram, Facebook, TikTok, LinkedIn, X/Twitter, YouTube, Threads, Pinterest, Reddit, Bluesky, Snapchat, Google Business, Telegram, Discord, Slack, WhatsApp, Shopify и WordPress) и 8 рекламных сетей (Meta, Google, TikTok, LinkedIn, Pinterest, X, Reddit и OpenAI Ads)."
      }
    ]
  },
  "dashboard": {
    "activeTenant": "Текущий аккаунт",
    "newTenant": "+ Новый аккаунт",
    "syncBtn": "Обновить",
    "groupChannels": "Аккаунты и публикации",
    "groupGrowth": "Диалоги и аналитика",
    "groupEnterprise": "Реклама, телефон и магазин",
    "quotasTitle": "Расход лимитов тарифа",
    "maxChannels": "Подключенные аккаунты",
    "monthlyPosts": "Публикаций в месяц",
    "phoneNumbers": "Телефонные номера",
    "aiBudget": "Баланс ИИ-ассистента",
    "lockedTitle": "Функция недоступна в текущем тарифе",
    "lockedDesc": "Повысьте тариф или активируйте этот модуль в панели администратора для мгновенного доступа.",
    "openAdminBtn": "Управление тарифами",
    "connectStep1Title": "Права доступа аккаунта",
    "connectStep1Desc": "Стандартные права активируются автоматически.",
    "connectStep2Title": "Подключение нового аккаунта (в 1 клик)",
    "connectStep2Desc": "Нажмите на платформу ниже, чтобы связать аккаунт за секунды:",
    "entityPickerTitle": "Выбор страницы или канала",
    "entityPickerDesc": "Выберите страницу или профиль для администрирования:",
    "directTokenTitle": "Быстрое подключение Shopify или WordPress",
    "directTokenDesc": "Введите адрес магазина или сайта для прямой привязки:",
    "connectTokenBtn": "Привязать магазин",
    "connectedAccountsTitle": "Ваши подключенные аккаунты",
    "composerTitle": "Создание и планирование публикации",
    "composerPlaceholder": "Напишите текст поста здесь... Добавьте хештеги, ссылки или эмодзи ✨",
    "useSmartQueue": "Публиковать в часы максимального вовлечения (Smart Queue)",
    "uploadMediaBtn": "Прикрепить фото / видео",
    "publishNowBtn": "Опубликовать / запланировать",
    "inboxTitle": "Единый ящик сообщений и комментариев",
    "replyBtn": "Отправить",
    "automationTitle": "Авто-DM по комментариям",
    "automationDesc": "Автоматически отправлять личное сообщение, когда подписчик оставляет ключевое слово:",
    "activateAutomationBtn": "Включить авто-DM",
    "analyticsImpressions": "Просмотры",
    "analyticsReach": "Суммарный охват",
    "analyticsEngagement": "Коэффициент вовлечённости",
    "analyticsFollowers": "Новые подписчики",
    "adsTitle": "Активные рекламные кампании",
    "connectAdBtn": "Подключить рекламный кабинет",
    "capiTitle": "Трекер Conversions API (CAPI)",
    "capiDesc": "Передавайте события покупок для оптимизации рекламы в Meta и Google.",
    "sendCapiBtn": "Отправить тестовую конверсию",
    "kycTitle": "Верификация телефонного номера",
    "kycDesc": "Активируйте и подтвердите международный номер телефона в один шаг.",
    "generateKycBtn": "Верифицировать номер",
    "voiceAgentTitle": "Голосовой ИИ-секретарь 24/7",
    "voiceAgentDesc": "Перенаправляйте входящие телефонные звонки на голосового ИИ-агента.",
    "bindVoiceBtn": "Подключить голосовой ИИ",
    "webrtcTitle": "Телефонный номеронабиратель в браузере",
    "webrtcDesc": "Звоните и принимайте звонки прямо из вкладки браузера без сторонних программ.",
    "startWebrtcBtn": "Открыть веб-телефон",
    "commerceTitle": "Товары магазина (Shopify / WooCommerce)",
    "localSeoTitle": "Филиалы в Google Business",
    "aiSupportTitle": "ИИ-ассистент и API-ключи",
    "aiSupportDesc": "Обратитесь к ИИ-ассистенту для аудита постов или проверки подключений:",
    "runDiagnosisBtn": "Проверить через ИИ"
  },
  "admin": {
    "title": "Управление платформой и тарифами",
    "subtitle": "Управляйте включенными модулями, поддерживаемыми каналами, тарифами и клиентами.",
    "headlessEnforced": "Прямое подключение активно",
    "headlessOptional": "Стандартный режим",
    "tabGlobal": "1. Продукты и каналы",
    "tabPlans": "2. Тарифы и цены",
    "tabTenants": "3. Клиенты и API-ключи",
    "tabBilling": "4. Доходы и расходы",
    "globalServicesTitle": "Включение или отключение 8 модулей платформы",
    "globalScopesTitle": "OAuth-права по умолчанию",
    "globalPlatformsTitle": "Поддерживаемые соцсети и блоги (18 платформ)",
    "globalAdsTitle": "Поддерживаемые рекламные сети (8 платформ)",
    "provisionTenantBtn": "Создать клиента",
    "openWorkspaceBtn": "Перейти в дашборд",
    "mintKeyBtn": "Выпустить API-ключ",
    "suspendBtn": "Приостановить",
    "restoreBtn": "Восстановить",
    "billingTitle": "Себестоимость провайдера против доходов от подписок",
    "colTenant": "Клиент / Компания",
    "colProfile": "ID профиля",
    "colPlan": "Тариф",
    "colWholesale": "Себестоимость",
    "colRetail": "Стоимость подписки",
    "colMargin": "Чистая прибыль"
  },
  "docs": {
    "badge": "Официальная документация для разработчиков · asra3.com/docs",
    "title": "Документация по API Asra3",
    "subtitle": "Создайте API-ключ, подключите аккаунт и запланируйте первую публикацию за 5 запросов.",
    "baseUrlLabel": "Базовый URL API",
    "authTitle": "Аутентификация и API-ключи",
    "authDesc": "Передавайте ваш секретный ключ в заголовке Authorization: Bearer tk_live_... в каждом запросе.",
    "webhooksTitle": "Вебхуки и события реального времени",
    "webhooksDesc": "Получайте мгновенные уведомления о сообщениях и постах с валидацией через HMAC-SHA256.",
    "endpointsTitle": "Справочник эндпоинтов",
    "tryEndpointBtn": "Тестировать вживую"
  },
  "telephony": {
    "eyebrow": "Виртуальные номера, WhatsApp и голосовой ИИ",
    "title": "Покупайте номера в 55+ странах, отправляйте SMS и звоните",
    "subtitle": "Приобретайте выделенные телефонные линии, связывайте их с WhatsApp Business по шаблонам и разворачивайте голосовых ИИ-ассистентов с минимальной задержкой в реальной телефонной сети.",
    "marketTitle": "Каталог виртуальных номеров",
    "marketSubtitle": "Номера с мгновенной активацией в 55+ странах и автоматической проверкой KYC",
    "buyBtn": "Купить и активировать номер",
    "typeFilterAll": "Все (городские, мобильные, бесплатные)",
    "typeFilterMobile": "Мобильные номера",
    "typeFilterLocal": "Городские номера",
    "typeFilterTollFree": "Бесплатные вызовы (8-800)",
    "dialerTitle": "Веб-телефон и панель управления звонками",
    "dialerSubtitle": "Звоните и принимайте звонки прямо в браузере через ваши виртуальные линии",
    "callModeDirect": "Обычный голосовой звонок",
    "callModeAi": "Звонок с голосовым ИИ-агентом",
    "callBtn": "Позвонить сейчас",
    "endCallBtn": "Завершить вызов",
    "smsTitle": "Входящие и исходящие SMS и WhatsApp в прямом эфире",
    "simulateOtpBtn": "Симулировать входящий код OTP",
    "simulateSmsBtn": "Симулировать входящее SMS",
    "whatsappTitle": "Привязать номер к WhatsApp Business",
    "linkWhatsappBtn": "Запустить мастер привязки WhatsApp"
  },
  "connectionWizard": {
    "modalTitle": "Мастер подключения каналов и платформ",
    "modalSubtitle": "Подключайте социальные сети, мессенджеры, магазины и блоги по простым пошаговым подсказкам.",
    "step1Title": "1. Выбор платформы и способа",
    "step2Title": "2. Аутентификация и доступы",
    "step3Title": "3. Выбор целевой страницы или канала",
    "step4Title": "4. Проверено и готово",
    "methodOAuth": "Безопасный OAuth в 1 клик",
    "methodToken": "Прямой API-ключ / Bot Token",
    "testPostBtn": "Отправить тестовый пост / сообщение",
    "connectedBadge": "Подключено и готово к работе ✓"
  },
  "auth": {
        "loginTitle": "Вход в рабочее пространство",
        "loginSubtitle": "Введите учетные данные для доступа к изолированному рабочему пространству и управлению каналами и телефонией.",
        "signupTitle": "Создать аккаунт Asra3",
        "signupSubtitle": "Подключайте соцсети, планируйте публикации, управляйте сообщениями и рекламой или сразу получите API-ключ.",
        "emailLabel": "Рабочий e-mail",
        "passwordLabel": "Пароль",
        "nameLabel": "Полное имя",
        "companyLabel": "Название проекта или компании (Необязательно)",
        "selectPlanLabel": "Выберите ваш тариф:",
        "submitLogin": "Войти",
        "submitSignup": "Начать бесплатно",
        "alreadyHaveAccount": "Уже зарегистрированы? ",
        "needAccount": "Еще нет аккаунта? ",
        "demoPersonasTitle": "Быстрые демо-профили",
        "whatYouGetTitle": "Что вы получаете сразу",
        "workEmailRequired": "Пожалуйста, введите рабочий e-mail.",
        "signInFailed": "Ошибка входа. Проверьте введенные данные.",
        "unableToSignIn": "Не удалось подключиться к серверу аутентификации.",
        "signingIn": "Проверка данных...",
        "orContinueWith": "Или войти через",
        "continueWithGoogle": "Войти через Google",
        "enterpriseIsolation": "Корпоративная изоляция арендаторов",
        "unifiedTitle": "Единая платформа коммуникаций и маркетинга",
        "unifiedDesc": "Получите доступ к чистому рабочему пространству. Подключите 18 социальных сетей, приобретайте виртуальные номера в 55+ странах и автоматизируйте WhatsApp и голосовой ИИ.",
        "socialChannelsFeature": "18 соцсетей и мессенджеров",
        "telephonyFeature": "Глобальная телефония и голосовой ИИ",
        "telephonyFeatureDesc": "Прием SMS, рассылки WhatsApp и звонки WebRTC прямо из браузера",
        "storageFeature": "Постоянное файловое хранилище",
        "storageFeatureDesc": "Каждое действие, номер и канал сохраняются надежно и навсегда",
        "signUpBadge": "Начните бесплатно менее чем за 60 секунд",
        "fullNamePlaceholder": "Алексей Смирнов",
        "companyNamePlaceholder": "Мой Бренд",
        "whatYouGet1": "Подключение в 1 клик к 18 платформам (Instagram, TikTok, LinkedIn, YouTube, WhatsApp, Shopify и др.).",
        "whatYouGet2": "Планируйте посты и Reels, отвечайте во входящих и настройте автоответы Comment-to-DM.",
        "whatYouGet3": "Мгновенный API-ключ Asra3 (tk_live_...) для интеграции с вашими сервисами.",
        "exploreApiDocs": "Документация API для разработчиков"
    },
  "showcase": {
        "platformEyebrow": "Комплексная платформа для 18 сетей",
        "platformTitle": "Передовые нативные интеграции с живыми мокапами платформ",
        "platformSubtitle": "Публикуйте контент, модерируйте комментарии и автоматизируйте сообщения во всех сетях через единый API.",
        "adsEyebrow": "Единый рекламный движок для 8 сетей",
        "adsTitle": "Запускайте, модерируйте и анализируйте кампании в 8 рекламных сетях",
        "adsSubtitle": "Полная синхронизация с Meta, Google, TikTok, LinkedIn, X, Pinterest, Reddit и OpenAI Ads с автоматизацией бюджета и CAPI.",
        "devHubEyebrow": "Хаб разработчиков и ИИ-агентов",
        "devHubTitle": "8 SDK, готовый к работе MCP-сервер и CLI для разработчиков",
        "devHubSubtitle": "Пишите на любимом языке программирования или доверьте Claude Code и Cursor публикацию контента и покупку номеров.",
        "copied": "Скопировано!",
        "copyPrompt": "Скопировать промпт настройки ИИ",
        "promptCopiedToast": "Промпт настройки скопирован в буфер обмена!"
    }
};

const dict_zh: TranslationDictionary = {
  "brand": {
    "name": "Asra3",
    "domain": "asra3.com",
    "tagline": "集社交媒体、广告营销、全渠道消息、AI语音电话与电商于一体的统一企业级平台与 API"
  },
  "nav": {
    "home": "首页",
    "workspace": "控制台",
    "docs": "API 文档",
    "admin": "管理后台",
    "login": "登录",
    "signup": "免费开始",
    "lightMode": "浅色模式",
    "darkMode": "深色模式",
    "logout": "退出登录",
    "signOut": "退出"
  },
  "hero": {
    "badge": "一体化营销与通讯云 + 开发者统一 API · asra3.com",
    "titlePart1": "通过",
    "titleHighlight": "一个平台与一个 API 密钥",
    "titlePart2": "触达全球每一个渠道的客户，无需漫长资质审核。",
    "subtitle": "Asra3 (asra3.com) 深度集成 18 个社交与博客渠道、8 大主流广告网络、统一 WhatsApp/Instagram 收件箱、支持 AI 语音助理的全球云电话及电商平台——既可在现代化控制台中即开即用，也可在数分钟内通过 REST API 快速集成。",
    "ctaStart": "免费开始使用",
    "ctaWorkspace": "打开控制台",
    "ctaDocs": "查阅 API 文档",
    "stat1Label": "生产就绪 API 接口",
    "stat2Label": "社交与广告连接通道",
    "stat3Label": "步调用即可首发内容",
    "stat4Label": "一键极速授权绑定"
  },
  "subServicesSection": {
    "eyebrow": "全栈产品矩阵",
    "title": "8 款集成化产品 — 既可在控制台操作，亦可经由 API 驱动",
    "subtitle": "直接在我们直观优雅的工作台中集中管理所有渠道，或以 Asra3 为底层 API 引擎构建专属应用。",
    "openInWorkspace": "在控制台中体验",
    "viewApiDocs": "API 接口参考",
    "services": {
      "core_connect": {
        "title": "一键快速连接多平台账号",
        "shortTitle": "已连接账号",
        "tagline": "数秒内将 18 个社交媒体、即时通讯、博客和网店平台一网打尽",
        "bullets": [
          "支持 Instagram、TikTok、Facebook、X、LinkedIn、YouTube 和 Threads 的一键 OAuth 授权",
          "深度集成 Telegram、Discord、Slack、WhatsApp、Snapchat、Pinterest、Reddit 与 Bluesky",
          "支持 Shopify 独立站、WordPress 博客和 Google Business 商家地址直连",
          "凭据自动静默刷新，实时监测各平台连接健康状态"
        ]
      },
      "publishing": {
        "title": "跨平台内容发布与智能时段排程",
        "shortTitle": "发布与排程",
        "tagline": "单次撰写，即可在 16 个主流平台上自动排程发布图文、Reels 与轮播卡片",
        "bullets": [
          "专为图片、视频、Reels、轮播、推文串和投票打造的统一富媒体编辑器",
          "支持智能时区识别与基于最佳互动时段的自动化发布排队（Smart Queue）",
          "极速预签名媒体文件直传，自动进行格式校验与压缩转码",
          "自动跟进首条置顶评论，并支持针对各平台特点进行差异化文案微调"
        ]
      },
      "inbox_crm": {
        "title": "多合一收件箱、自动私信与社交 CRM",
        "shortTitle": "收件箱与自动私信",
        "tagline": "在单一界面聚合 WhatsApp、Instagram、Facebook 私信、评论与评价",
        "bullets": [
          "单一集中式收件箱，集中回复私信、帖子公开评论及谷歌/脸书好评",
          "评论关键词自动转私信（Comment-to-DM）自动化工作流，快速沉淀线索",
          "多通道批量群发通知（Broadcasts）与自动化回访客户序列",
          "内置高扩展性客户关系档案管理及自定义 CRM 属性字段"
        ]
      },
      "analytics": {
        "title": "全渠道数据分析与多维报表",
        "shortTitle": "数据分析",
        "tagline": "实时洞悉全渠道内容曝光量、触达范围、互动率以及粉丝增长态势",
        "bullets": [
          "统一仪表盘集中展现各渠道总触达、展现频次、点击转化及互动率",
          "基于真实受众活跃热力图推演最佳发帖时间窗口",
          "逐帖细分指标对比以及跨时间周期的同比/环比增长曲线",
          "报表支持一键导出或通过标准 REST API 无缝同步至自建 BI 系统"
        ]
      },
      "ads": {
        "title": "广告投放矩阵与服务器转化 API (CAPI)",
        "shortTitle": "付费广告投放",
        "tagline": "一站式创建并追踪 Meta、Google、TikTok、LinkedIn、X 及 OpenAI 广告活动",
        "bullets": [
          "在统一面板中组织广告系列架构、广告组定位与跨平台预算再分配",
          "高互动帖子一键加推及点击直达 WhatsApp（Click-to-WhatsApp）转化广告",
          "服务器端转化回传 API (CAPI)，实现高精度订单转化与归因追踪",
          "自动同步第一方客户名单并构建各平台类似受众（Lookalike Audiences）"
        ]
      },
      "telephony": {
        "title": "云电话网络、短信通知与 AI 语音代理",
        "shortTitle": "云电话与 AI 语音",
        "tagline": "全球本地电话号码、双向短信/WhatsApp、WebRTC 浏览器拨号及 7x24 AI 语音前台",
        "bullets": [
          "支持即时购买或转入支持语音、短信、RCS 及 WhatsApp 的国际虚拟电话号码",
          "一键将进线呼叫绑定至低延迟拟真 AI 智能语音接待员",
          "基于浏览器 WebRTC 技术直接发起并接听电话，免安装任何客户端",
          "极速下发短信验证码（OTP），无缝驱动企业级 WhatsApp Business 对话流"
        ]
      },
      "commerce_local": {
        "title": "跨境电商店铺与 Google 本地商家 SEO",
        "shortTitle": "网店与本地 SEO",
        "tagline": "集中管理 Shopify 与 WooCommerce 商品、博客文章与 Google Business 门店",
        "bullets": [
          "统一盘点商品目录、实时库存、订单履约及优惠券配置",
          "在单一编辑窗口直接向 Shopify 博客与 WordPress 站点发布 SEO 文章",
          "统一维护 Google 商业档案网点信息、营业时段、限时促销并快速回复顾客评价",
          "商品类目数据一键同步至 Meta 和 TikTok 动态产品广告库"
        ]
      },
      "support_ai": {
        "title": "AI 诊断助理与开发者 API 密钥管理",
        "shortTitle": "AI 助理与 API",
        "tagline": "利用 AI 快速排查各渠道发布故障 + 获取标准化生产 API 密钥",
        "bullets": [
          "随时向 AI 助理提问帖子发布失败原因或一键诊断渠道连接健康状况",
          "快速签发 Asra3 API 生产密钥（tk_live_...），轻松接入您的企业系统",
          "配置实时 Webhook 回调监听新消息与发布完成状态通知"
        ]
      }
    }
  },
  "pricingSection": {
    "eyebrow": "透明合理的定价策略",
    "title": "免费开始体验，随业务规模弹性升级",
    "subtitle": "所有套餐均包含对直观管理面板以及 Asra3 REST API 的完整访问权限。",
    "perMonth": "/ 月",
    "choosePlan": "立即订阅",
    "popularBadge": "最受欢迎",
    "plans": {
      "starter": {
        "name": "初创版 (Starter)",
        "desc": "专为个人创作者、自由职业者及早期微型团队量身打造。",
        "features": [
          "支持最多绑定 5 个社交账号",
          "每月支持 300 篇计划发布帖子",
          "跨平台富文本编辑器与智能发布排队",
          "核心指标分析看板 + 开发者 API 接入权限"
        ]
      },
      "growth": {
        "name": "增长版 (Growth)",
        "desc": "面向需要全渠道整合收件箱、自动化回复与店铺同步的成长型企业。",
        "features": [
          "支持最多绑定 15 个账号 + 1 个国际云电话号码",
          "每月 2,000 篇发布额度及 10,000 条消息配额",
          "多合一集中收件箱 + 评论自动转私信工作流",
          "Shopify、WooCommerce 与 Google Business 全量同步"
        ]
      },
      "agency": {
        "name": "专业机构版 (Pro / Agency)",
        "desc": "解锁全部 8 大产品线，涵盖付费广告集中投放与 AI 智能语音接待。",
        "features": [
          "支持最多绑定 50 个账号 + 5 个国际虚拟号码",
          "涵盖全部 8 大广告投放网络 + Conversions API",
          "企业级 AI 智能语音代理 + 网页端 WebRTC 电话拨号台",
          "毫秒级实时 Webhooks 回调与专属技术优先支持"
        ]
      },
      "enterprise": {
        "name": "企业定制版 (Enterprise)",
        "desc": "超高吞吐配额、细粒度团队密钥与私有化高可用基础设施支持。",
        "features": [
          "500 个渠道连接配额 + 50 个全球专属电话号码",
          "为工程团队签发多个按权限隔离的高级 API 密钥",
          "专享高频 API 速率限制 (Rate Limits) 与专属客户成功经理",
          "提供 99.9% 运行时间 SLA 保证及深度定制化系统对接"
        ]
      }
    }
  },
  "faqSection": {
    "eyebrow": "常见问题解答",
    "title": "关于 Asra3 (asra3.com) 平台您所需了解的一切",
    "subtitle": "关于如何上手控制台操作以及如何通过 API 深度对接的清晰解答。",
    "items": [
      {
        "q": "Asra3 (asra3.com) 究竟是什么平台，能解决哪些核心需求？",
        "a": "Asra3 (asra3.com) 是一站式全渠道营销、即时通讯与开发者 API 基础设施。它允许您在一个控制台或通过单个 REST API 密钥管理 18 个社交与博客渠道、处理统一的 WhatsApp/Instagram 消息、跨 8 大网络投放管理广告，以及部署带有 AI 语音代理的国际云电话。"
      },
      {
        "q": "完全没有编程经验的用户是否可以使用 Asra3？",
        "a": "完全可以！我们的 Web 控制台（/dashboard）专为企业运营人员、市场营销团队及内容创作者设计。您可以像使用日常应用一样一键连接账号、排程发帖、回复消息以及发起广告，全程无需编写任何代码。"
      },
      {
        "q": "我能否将 Asra3 作为第三方服务 API 嵌入到自己的软件系统或 AI 智能体中？",
        "a": "当然可以。开发者只需签发 API 密钥（tk_live_...），即可调用 https://asra3.com/api/v1 接口，以代码方式全自动为您的用户连接平台账号、排程发布图文内容、读取数据报表并发送 WhatsApp 或短信通知。"
      },
      {
        "q": "目前平台具体支持哪些社交媒体网络和广告投放渠道？",
        "a": "我们支持 18 个主流平台（Instagram、Facebook、TikTok、LinkedIn、X/Twitter、YouTube、Threads、Pinterest、Reddit、Bluesky、Snapchat、Google Business Profile、Telegram、Discord、Slack、WhatsApp、Shopify 及 WordPress）以及 8 个主流广告投放网络（Meta、Google、TikTok、LinkedIn、Pinterest、X、Reddit 和 OpenAI Ads）。"
      }
    ]
  },
  "dashboard": {
    "activeTenant": "当前工作区",
    "newTenant": "+ 新建工作区",
    "syncBtn": "刷新数据",
    "groupChannels": "账号连接与内容发布",
    "groupGrowth": "客户消息与数据统计",
    "groupEnterprise": "广告投放、电话与网店",
    "quotasTitle": "当前套餐配额监控",
    "maxChannels": "已连接渠道配额",
    "monthlyPosts": "本月已排程帖子",
    "phoneNumbers": "已持有电话号码",
    "aiBudget": "AI 助理诊断点数",
    "lockedTitle": "当前套餐暂未包含此高级功能",
    "lockedDesc": "如需立即启用该模块，请升级您的订阅计划或前往管理后台开启相应权限。",
    "openAdminBtn": "管理套餐设置",
    "connectStep1Title": "账号访问权限配置",
    "connectStep1Desc": "连接时将默认自动申请必要的基础权限范围。",
    "connectStep2Title": "一键绑定新社交平台账号",
    "connectStep2Desc": "点击下方任意平台图标，即可在数秒内完成授权直连：",
    "entityPickerTitle": "挑选要管理的主页或频道",
    "entityPickerDesc": "选择您希望接入并统一管理的社交主页或子账号：",
    "directTokenTitle": "Shopify 网店或 WordPress 站点直连",
    "directTokenDesc": "输入您的店铺域名或网站地址即可建立直接集成：",
    "connectTokenBtn": "立即绑定网店",
    "connectedAccountsTitle": "当前已建立连接的平台账号",
    "composerTitle": "创建并安排发布新内容",
    "composerPlaceholder": "在此撰写您的精彩帖子内容... 支持添加标签、跳转链接或生动表情 ✨",
    "useSmartQueue": "自动安排在互动高峰时段发布（Smart Queue）",
    "uploadMediaBtn": "上传图片或视频素材",
    "publishNowBtn": "立即发布 / 定时排程",
    "inboxTitle": "多渠道聚合消息与互动评论区",
    "replyBtn": "发送回复",
    "automationTitle": "公开评论自动触发私信（Auto-DM）",
    "automationDesc": "当粉丝在评论区输入指定触发关键词时，系统将全自动发送一条专属私信：",
    "activateAutomationBtn": "启用自动私信规则",
    "analyticsImpressions": "总展现曝光量",
    "analyticsReach": "实际触达受众",
    "analyticsEngagement": "综合互动参与率",
    "analyticsFollowers": "净增新增粉丝",
    "adsTitle": "正在运行的广告投放计划",
    "connectAdBtn": "关联广告投放账号",
    "capiTitle": "服务器端转化 API (CAPI) 追踪",
    "capiDesc": "向 Meta 和 Google 回传高意向购买事件，深度优化算法出价策略。",
    "sendCapiBtn": "发送测试转化事件",
    "kycTitle": "电话号码合规身份核验",
    "kycDesc": "仅需一步即可完成国际电话号码的合规验证并激活上线。",
    "generateKycBtn": "生成号码验证链接",
    "voiceAgentTitle": "7x24 小时 AI 智能语音接待前台",
    "voiceAgentDesc": "将进线呼叫无缝流转至能言善辩的对话式 AI 语音智能体。",
    "bindVoiceBtn": "激活 AI 语音接听",
    "webrtcTitle": "网页端软电话呼叫拨号台",
    "webrtcDesc": "直接在浏览器内拨打并接听真实电话，无需依赖额外硬件设备。",
    "startWebrtcBtn": "打开网络拨号台",
    "commerceTitle": "网店商品清单（Shopify / WooCommerce）",
    "localSeoTitle": "Google Business 本地商铺网点",
    "aiSupportTitle": "AI 智能诊断助手与开发者密钥",
    "aiSupportDesc": "向 AI 助理咨询关于发布异常或渠道健康状态的优化建议：",
    "runDiagnosisBtn": "启动 AI 智能诊断"
  },
  "admin": {
    "title": "全局平台管控与套餐策略后台",
    "subtitle": "集中配置可用产品线、支持的渠道网络、定价模型及多租户企业客户账号。",
    "headlessEnforced": "直连模式生效中",
    "headlessOptional": "标准托管模式",
    "tabGlobal": "1. 平台产品与连接网络",
    "tabPlans": "2. 计费方案与定价",
    "tabTenants": "3. 租户管理与 API 密钥",
    "tabBilling": "4. 收入结算与供应商成本",
    "globalServicesTitle": "启用或停用平台 8 大核心子产品",
    "globalScopesTitle": "默认授权 Scope 权限项",
    "globalPlatformsTitle": "支持的 18 个社交与内容博客平台",
    "globalAdsTitle": "支持的 8 大主流广告投放网络",
    "provisionTenantBtn": "快速开通新租户",
    "openWorkspaceBtn": "进入租户控制台",
    "mintKeyBtn": "签发 API 密钥",
    "suspendBtn": "暂停服务",
    "restoreBtn": "恢复访问",
    "billingTitle": "供应商采购成本 vs 客户订阅营收利润分析",
    "colTenant": "客户 / 企业主体",
    "colProfile": "租户 Profile ID",
    "colPlan": "订阅套餐",
    "colWholesale": "供应商底价",
    "colRetail": "零售定价",
    "colMargin": "净收益空间"
  },
  "docs": {
    "badge": "官方开发者技术参考文档 · asra3.com/docs",
    "title": "Asra3 开发者 API 技术参考",
    "subtitle": "仅需 5 次标准请求即可完成密钥获取、渠道绑定以及首次内容跨平台排程。",
    "baseUrlLabel": "生产 API 根路径 (Base URL)",
    "authTitle": "身份认证与 API 访问密钥",
    "authDesc": "请在所有 API 请求头中附加 Authorization: Bearer tk_live_... 凭据。",
    "webhooksTitle": "实时 Webhooks 与事件监听",
    "webhooksDesc": "通过 HMAC-SHA256 签名机制实时安全接收客户消息与发布状态更新推送。",
    "endpointsTitle": "核心接口端点汇总",
    "tryEndpointBtn": "即刻在线调试"
  },
  "telephony": {
    "eyebrow": "国际虚拟电话号码、WhatsApp 与 AI 语音",
    "title": "在 55+ 国家选购号码，随时收发短信与接打电话",
    "subtitle": "轻松选购专属国际号码，通过官方预审模板一键绑定 WhatsApp Business，并快速上线具备真实通话能力的超低延迟 AI 对话式语音代理。",
    "marketTitle": "全球虚拟电话号码选购中心",
    "marketSubtitle": "即选即开，覆盖全球 55+ 热门国家与地区，全自动搞定本地通信合规审查",
    "buyBtn": "购买并即刻激活此号码",
    "typeFilterAll": "全部类型 (本地、移动手机、免费热线)",
    "typeFilterMobile": "移动手机号码 (Mobile)",
    "typeFilterLocal": "本地固话号码 (Local)",
    "typeFilterTollFree": "免费热线号码 (Toll-Free)",
    "dialerTitle": "网页端软电话拨号台与通话控制中心",
    "dialerSubtitle": "通过您的专属云号码直接在浏览器网页端拨出或接听电话",
    "callModeDirect": "普通语音直拨呼叫",
    "callModeAi": "AI 对话式智能体代呼",
    "callBtn": "立即拨打电话",
    "endCallBtn": "挂断通话",
    "smsTitle": "双向实时短信与 WhatsApp 对话工作台",
    "simulateOtpBtn": "模拟接收短信验证码 (OTP)",
    "simulateSmsBtn": "模拟客户进线短信",
    "whatsappTitle": "将所购号码绑定至 WhatsApp Business",
    "linkWhatsappBtn": "启动 WhatsApp 绑定向导"
  },
  "connectionWizard": {
    "modalTitle": "多渠道社交与即时通讯连接引导向导",
    "modalSubtitle": "通过结构化分步交互，轻松完成社交媒体、消息应用、独立站与博客的连接配置。",
    "step1Title": "1. 选择连接平台与接入机制",
    "step2Title": "2. 身份验证与平台权限授权",
    "step3Title": "3. 指定要关联的具体主页或频道",
    "step4Title": "4. 连通性测试与就绪确认",
    "methodOAuth": "一键安全 OAuth 2.0 快捷授权",
    "methodToken": "直接凭据接入 / 机器人 Bot Token",
    "testPostBtn": "发送测试内容 / 模拟测试消息",
    "connectedBadge": "已成功连通并就绪 ✓"
  },
  "auth": {
        "loginTitle": "登录至您的工作区",
        "loginSubtitle": "输入凭据以访问您的独立客户租户工作区，管理全渠道与云通讯。",
        "signupTitle": "创建您的 Asra3 账号",
        "signupSubtitle": "连接社交平台、排期发布、管理统一收件箱和广告，或直接获取 API 密钥。",
        "emailLabel": "工作邮箱",
        "passwordLabel": "密码",
        "nameLabel": "真实姓名",
        "companyLabel": "项目或公司名称（可选）",
        "selectPlanLabel": "选择最适合您的套餐：",
        "submitLogin": "登录",
        "submitSignup": "立即免费开始",
        "alreadyHaveAccount": "已经有账号了？ ",
        "needAccount": "还没有账号？ ",
        "demoPersonasTitle": "快速演示体验账号",
        "whatYouGetTitle": "注册后即可立即享有",
        "workEmailRequired": "请输入您的工作邮箱。",
        "signInFailed": "登录失败，请检查登录信息。",
        "unableToSignIn": "无法连接至身份验证服务器。",
        "signingIn": "正在验证...",
        "orContinueWith": "或者继续使用",
        "continueWithGoogle": "使用 Google 账号登录",
        "enterpriseIsolation": "企业级多租户数据严格隔离",
        "unifiedTitle": "一站式全渠道营销与智能通讯平台",
        "unifiedDesc": "登录即可获得专属干净的工作空间。连接 18 个社交平台，购买全球 55+ 国家的虚拟号码，并配置 WhatsApp 与 AI 语音应答。",
        "socialChannelsFeature": "18 个社交媒体与即时通讯渠道",
        "telephonyFeature": "全球虚拟电话与 AI 语音座席",
        "telephonyFeatureDesc": "接收 SMS 短信、触发 WhatsApp 群发并进行网页端 WebRTC 呼叫",
        "storageFeature": "原子级文件数据持久化",
        "storageFeatureDesc": "您所有的号码、渠道及对话记录均永久可靠保存",
        "signUpBadge": "无需信用卡，60秒内快速启航",
        "fullNamePlaceholder": "张明",
        "companyNamePlaceholder": "我的品牌",
        "whatYouGet1": "一键连接 18 个主流平台（Instagram、TikTok、LinkedIn、YouTube、WhatsApp、Shopify 等）。",
        "whatYouGet2": "定时发布图文与短视频、统一收件箱极速回复、评论转私信自动化。",
        "whatYouGet3": "即刻获取 Asra3 API 生产密钥（tk_live_...），轻松接入您的现有系统。",
        "exploreApiDocs": "浏览面向开发者的 API 文档"
    },
  "showcase": {
        "platformEyebrow": "全能 18 大网络整合平台",
        "platformTitle": "高级原生集成与真实平台仿真交互",
        "platformSubtitle": "通过统一的 API 接口，在所有主流网络上发布内容、管理评论并开启私信自动化流。",
        "adsEyebrow": "跨 8 大网络统一广告引擎",
        "adsTitle": "在 8 大广告网络中统一投放、审核与实时报表",
        "adsSubtitle": "全面同步 Meta、Google、TikTok、LinkedIn、X、Pinterest、Reddit 及 OpenAI Ads，支持预算自动优化与 CAPI 追踪。",
        "devHubEyebrow": "开发者与 AI 智能体中心",
        "devHubTitle": "8 大语言 SDK、开箱即用的 MCP 服务器及开发者 CLI",
        "devHubSubtitle": "使用您最喜爱的编程语言开发，或直接让 Claude Code 与 Cursor 自动化管理社交发布与云端号码分配。",
        "copied": "已复制！",
        "copyPrompt": "复制 AI 智能体配置 Prompt",
        "promptCopiedToast": "配置 Prompt 已成功复制到剪贴板！"
    }
};

const dict_ja: TranslationDictionary = {
  "brand": {
    "name": "Asra3",
    "domain": "asra3.com",
    "tagline": "SNS運用・広告配信・メッセージ・AI音声クラウド電話・ECを統合する開発者向けAPIプラットフォーム"
  },
  "nav": {
    "home": "ホーム",
    "workspace": "ダッシュボード",
    "docs": "APIドキュメント",
    "admin": "管理画面",
    "login": "ログイン",
    "signup": "無料で始める",
    "lightMode": "ライトモード",
    "darkMode": "ダークモード",
    "logout": "ログアウト",
    "signOut": "サインアウト"
  },
  "hero": {
    "badge": "統合マーケティング＆メッセージングクラウド + 開発者API · asra3.com",
    "titlePart1": "あらゆるチャネルの顧客へ",
    "titleHighlight": "1つのプラットフォームと1つのAPI",
    "titlePart2": "で今すぐリーチ。面倒な審査待ちも不要です。",
    "subtitle": "Asra3 (asra3.com) は18のSNS・ブログ、8つの広告網、WhatsApp/Instagram共通受信箱、AI音声クラウド電話、EC管理を直感的な画面とREST APIで提供します。",
    "ctaStart": "無料で始める",
    "ctaWorkspace": "ダッシュボードを開く",
    "ctaDocs": "APIドキュメント",
    "stat1Label": "実装済みAPIエンドポイント",
    "stat2Label": "対応SNS・広告チャネル",
    "stat3Label": "ステップで初回投稿完了",
    "stat4Label": "ワンクリック即時連携"
  },
  "subServicesSection": {
    "eyebrow": "充実のプロダクトスイート",
    "title": "8つの統合プロダクト — 画面操作でもAPI経由でも自在に利用可能",
    "subtitle": "洗練された管理画面から直接チャネルを操作することも、Asra3をバックエンドAPIとして自社サービスに組み込むことも可能です。",
    "openInWorkspace": "ダッシュボードで体験",
    "viewApiDocs": "APIリファレンス",
    "services": {
      "core_connect": {
        "title": "ワンクリック・マルチアカウント連携",
        "shortTitle": "連携アカウント",
        "tagline": "18のSNS、メッセージアプリ、ブログ、ECストアをわずか数秒で接続",
        "bullets": [
          "Instagram、TikTok、Facebook、X、LinkedIn、YouTube、Threadsに対応したワンクリックOAuth",
          "Telegram、Discord、Slack、WhatsApp、Snapchat、Pinterest、Reddit、Blueskyを網羅",
          "Shopifyストア、WordPressブログ、Googleビジネスプロフィールのダイレクト接続",
          "トークンの自動更新とリアルタイムな接続ヘルスチェック機能"
        ]
      },
      "publishing": {
        "title": "マルチプラットフォーム投稿＆スマートキュー",
        "shortTitle": "投稿＆スケジュール",
        "tagline": "1回の作成で、16のプラットフォームへ投稿・リール・カルーセルを一括配信",
        "bullets": [
          "画像、動画、リール、カルーセル、スレッド、投票に対応した高機能エディタ",
          "タイムゾーン対応の予約投稿とエンゲージメント最適化キュー（Smart Queue）",
          "署名付きURLによる高速メディアアップロードとフォーマット自動変換",
          "自動ファーストコメント追加および各SNS向けキャプション最適化機能"
        ]
      },
      "inbox_crm": {
        "title": "統合インボックス・自動DM・ソーシャルCRM",
        "shortTitle": "受信箱＆自動DM",
        "tagline": "WhatsApp、Instagram、FacebookのDM、コメント、レビューを一元管理",
        "bullets": [
          "DM、投稿コメント、Google/Facebookレビューを集約するマルチチャネル受信箱",
          "特定キーワードに反応して自動でDMを送信するコメント自動返信（Comment-to-DM）",
          "マルチチャネル一斉配信（Broadcasts）と自動ステップ配信シーケンス",
          "顧客コンタクト履歴管理と柔軟なカスタムCRMフィールド"
        ]
      },
      "analytics": {
        "title": "クロスチャネル・アナリティクス＆レポート",
        "shortTitle": "分析・レポート",
        "tagline": "インプレッション、リーチ、エンゲージメント率、フォロワー推移をリアルタイムに可視化",
        "bullets": [
          "リーチ、表示回数、クリック数、エンゲージメント率をまとめた統合ダッシュボード",
          "オーディエンスの活動時間帯に基づいた最適な投稿タイミングのヒートマップ",
          "投稿ごとの詳細なパフォーマンス比較と期間別グロース分析",
          "ワンクリックでのレポート出力およびREST APIによるメトリクス自動取得"
        ]
      },
      "ads": {
        "title": "広告マネージャー＆コンバージョンAPI (CAPI)",
        "shortTitle": "運用型広告",
        "tagline": "Meta、Google、TikTok、LinkedIn、X、OpenAI広告の出稿と成果計測を一元化",
        "bullets": [
          "キャンペーン設計、広告セット、予算配分をひとつのダッシュボードから最適化",
          "人気投稿のワンクリックブーストおよびWhatsApp直行広告（CTWA）の作成",
          "正確な購入追跡とプライバシー保護を実現するサーバーサイドConversions API (CAPI)",
          "顧客リストのシームレスな連携と類似オーディエンス（Lookalike）の自動生成"
        ]
      },
      "telephony": {
        "title": "クラウド電話・SMS・AI音声エージェント",
        "shortTitle": "電話＆AI音声",
        "tagline": "世界各国の仮想電話番号、双方向SMS/WhatsApp、ブラウザ電話、24時間AI受付",
        "bullets": [
          "音声通話、SMS、RCS、WhatsAppに対応した国際仮想電話番号の即時購入・ポータビリティ",
          "着信通話をワンクリックで自然言語AI音声受付アシスタントに接続",
          "専用アプリ不要でWebブラウザから直接受発信できるWebRTCソフトフォン",
          "2要素認証OTPコードの配信およびWhatsApp Business公式フローの自動化"
        ]
      },
      "commerce_local": {
        "title": "ECストア管理＆GoogleビジネスローカルSEO",
        "shortTitle": "ストア＆ローカルSEO",
        "tagline": "Shopify/WooCommerceの商品、ブログ記事、Googleマップ店舗情報を一括運用",
        "bullets": [
          "商品カタログ、在庫残数、受注情報、クーポンの一元管理画面",
          "単一のエディタからShopifyブログやWordPressへSEO記事を直接投稿",
          "Googleビジネスプロフィールの店舗情報、営業時間、クチコミ返信の統合管理",
          "MetaやTikTokのダイナミック広告へ商品カタログをリアルタイム同期"
        ]
      },
      "support_ai": {
        "title": "AIアシスタント＆開発者APIキー",
        "shortTitle": "AIアシスタント＆API",
        "tagline": "AIによるアカウント障害の即時診断＋自社アプリ連携用の安全なAPIキー",
        "bullets": [
          "投稿の失敗原因やアカウントの接続状態をAIアシスタントがワンクリックで解析",
          "自社システムへ機能を統合するためのAsra3 APIキー（tk_live_...）を発行",
          "メッセージ受信や投稿完了イベントをリアルタイムに受け取るWebhooks設定"
        ]
      }
    }
  },
  "pricingSection": {
    "eyebrow": "明瞭で柔軟な料金プラン",
    "title": "無料でスタートし、ビジネスの成長に合わせて柔軟にスケール",
    "subtitle": "すべてのプランにWebダッシュボードとAsra3 REST APIの完全な利用権が含まれます。",
    "perMonth": "/ 月",
    "choosePlan": "このプランで始める",
    "popularBadge": "一番人気",
    "plans": {
      "starter": {
        "name": "スターター (Starter)",
        "desc": "個人クリエイターや小規模なスタートアップチームに最適です。",
        "features": [
          "最大5つのSNSアカウント連携",
          "月間300件の予約投稿枠",
          "統合型投稿エディタ＆スマートキュー",
          "基本アナリティクス画面＋APIアクセス権"
        ]
      },
      "growth": {
        "name": "グロース (Growth)",
        "desc": "統合受信箱、自動返信、ストア連携を必要とする成長中の企業向け。",
        "features": [
          "最大15アカウント連携＋クラウド電話番号1回線",
          "月間2,000件の投稿枠＆10,000件のメッセージ枠",
          "統合インボックス＋コメント自動DMワークフロー",
          "Shopify、WooCommerce、Googleビジネスの同期"
        ]
      },
      "agency": {
        "name": "プロ／代理店 (Pro / Agency)",
        "desc": "広告管理やAI音声受付を含む全8プロダクトを制限なく開放。",
        "features": [
          "最大50アカウント連携＋5つの国際電話番号",
          "8大広告ネットワーク対応＋Conversions API",
          "AI音声エージェント＋WebRTCブラウザ電話機能",
          "リアルタイムWebhook通知＋優先テクニカルサポート"
        ]
      },
      "enterprise": {
        "name": "エンタープライズ (Enterprise)",
        "desc": "大規模な通信量、複数のチーム用APIキー、専用インフラを完備。",
        "features": [
          "500アカウント連携＋50回線の国際電話番号",
          "開発チーム向けの権限分離型複数APIキー発行",
          "カスタムレートリミット＋専任アカウントマネージャー",
          "99.9%稼働率SLA保証＋オーダーメイドのシステム統合"
        ]
      }
    }
  },
  "faqSection": {
    "eyebrow": "よくある質問",
    "title": "Asra3 (asra3.com) に関するすべての疑問にお答えします",
    "subtitle": "ダッシュボードの基本的な使い方からAPIの実装方法まで詳しく解説します。",
    "items": [
      {
        "q": "Asra3 (asra3.com) とはどのようなサービスですか？",
        "a": "Asra3 (asra3.com) は、企業のマーケティング、オムニチャネル通信、開発者APIをひとつに統合した包括的クラウドプラットフォームです。18のSNS・ブログの投稿予約、WhatsApp/Instagramの共通受信箱、8大広告プラットフォームの運用、AI音声対話付きクラウド電話をひとつの管理画面またはREST APIキーから操作できます。"
      },
      {
        "q": "プログラミングや専門知識がなくても利用できますか？",
        "a": "はい、問題ありません！Web管理画面（/dashboard）は直感的に操作できるように設計されています。コードを1行も書くことなく、ワンクリックでアカウントを接続し、コンテンツを予約し、メッセージに返信し、広告を出稿できます。"
      },
      {
        "q": "自社のWebサイト、業務アプリ、AIエージェントにAPIとして組み込めますか？",
        "a": "もちろん可能です。発行したAPIキー（tk_live_...）を用いて https://asra3.com/api/v1 のエンドポイントを呼び出すことで、ユーザーアカウントの認証、投稿の自動スケジュール、統計データの取得、WhatsAppやSMSの自動送信を完全にプログラムから制御できます。"
      },
      {
        "q": "対応しているSNSチャネルと広告ネットワークを教えてください。",
        "a": "18のチャネル（Instagram、Facebook、TikTok、LinkedIn、X/Twitter、YouTube、Threads、Pinterest、Reddit、Bluesky、Snapchat、Googleビジネスプロフィール、Telegram、Discord、Slack、WhatsApp、Shopify、WordPress）と8つの広告ネットワーク（Meta、Google、TikTok、LinkedIn、Pinterest、X、Reddit、OpenAI Ads）に対応しています。"
      }
    ]
  },
  "dashboard": {
    "activeTenant": "現在のワークスペース",
    "newTenant": "+ 新規ワークスペース",
    "syncBtn": "データを更新",
    "groupChannels": "アカウント連携＆投稿",
    "groupGrowth": "受信箱＆アナリティクス",
    "groupEnterprise": "広告・電話＆ECストア",
    "quotasTitle": "プラン利用状況",
    "maxChannels": "連携アカウント上限",
    "monthlyPosts": "月間予約投稿数",
    "phoneNumbers": "保持電話番号数",
    "aiBudget": "AIアシスタント利用枠",
    "lockedTitle": "現在のプランには含まれていない機能です",
    "lockedDesc": "この機能をご利用いただくには、プランをアップグレードするか管理者画面からモジュールを有効化してください。",
    "openAdminBtn": "プラン設定を管理",
    "connectStep1Title": "アカウント権限の確認",
    "connectStep1Desc": "標準権限が自動的に付与されます。",
    "connectStep2Title": "新しいアカウントを接続（ワンクリック接続）",
    "connectStep2Desc": "以下のプラットフォームを選択して数秒で連携を完了できます：",
    "entityPickerTitle": "ページまたはプロフィールの選択",
    "entityPickerDesc": "管理するSNSページやアカウントを選択してください：",
    "directTokenTitle": "ShopifyまたはWordPressのクイック接続",
    "directTokenDesc": "ストアのドメインまたはサイトURLを入力して直接接続します：",
    "connectTokenBtn": "ストアを連携する",
    "connectedAccountsTitle": "連携済みのアカウント一覧",
    "composerTitle": "新規投稿の作成と予約",
    "composerPlaceholder": "ここに投稿内容を入力してください... ハッシュタグ、リンク、絵文字も追加できます ✨",
    "useSmartQueue": "最も反応が良い時間帯に自動予約（Smart Queue）",
    "uploadMediaBtn": "画像／動画を添付",
    "publishNowBtn": "今すぐ投稿／予約する",
    "inboxTitle": "統合メッセージ＆コメント一覧",
    "replyBtn": "返信を送信",
    "automationTitle": "コメント連動型自動DM",
    "automationDesc": "特定のキーワードがコメントされた際、自動で個別のDMを送信します：",
    "activateAutomationBtn": "自動DMを有効化",
    "analyticsImpressions": "総表示回数",
    "analyticsReach": "リーチ数",
    "analyticsEngagement": "エンゲージメント率",
    "analyticsFollowers": "新規フォロワー",
    "adsTitle": "配信中の広告キャンペーン",
    "connectAdBtn": "広告アカウントを連携",
    "capiTitle": "Conversions API (CAPI) トラッカー",
    "capiDesc": "MetaやGoogleの広告配信アルゴリズムを最適化するために購入イベントを送信します。",
    "sendCapiBtn": "テストコンバージョンを送信",
    "kycTitle": "電話番号の本人確認手続き",
    "kycDesc": "国際電話番号のコンプライアンス確認を1ステップで完了できます。",
    "generateKycBtn": "番号確認リンクを発行",
    "voiceAgentTitle": "24時間対応AI音声受付",
    "voiceAgentDesc": "着信通話を自然な会話ができるAI音声エージェントに自動転送します。",
    "bindVoiceBtn": "AI音声を有効化",
    "webrtcTitle": "ブラウザ内蔵電話ダイヤラー",
    "webrtcDesc": "追加アプリなしでブラウザ上から直接電話をかけたり受けたりできます。",
    "startWebrtcBtn": "Web電話を開く",
    "commerceTitle": "ストア商品一覧（Shopify / WooCommerce）",
    "localSeoTitle": "Googleビジネス店舗情報",
    "aiSupportTitle": "AIアシスタント＆APIキー",
    "aiSupportDesc": "投稿の診断や連携アカウントの状態確認をAIアシスタントに依頼できます：",
    "runDiagnosisBtn": "AI診断を実行する"
  },
  "admin": {
    "title": "プラットフォーム管理＆プラン設定",
    "subtitle": "有効な機能、サポートチャネル、料金プラン、顧客アカウントを一元管理します。",
    "headlessEnforced": "ダイレクト連携有効",
    "headlessOptional": "標準モード",
    "tabGlobal": "1. 有効プロダクト＆チャネル",
    "tabPlans": "2. プラン＆価格設定",
    "tabTenants": "3. 顧客アカウント＆APIキー",
    "tabBilling": "4. 売上＆インフラコスト",
    "globalServicesTitle": "プラットフォームの8つの主力プロダクトの有効化/無効化",
    "globalScopesTitle": "デフォルトOAuthスコープ",
    "globalPlatformsTitle": "対応SNSおよびブログチャネル（18プラットフォーム）",
    "globalAdsTitle": "対応広告配信ネットワーク（8ネットワーク）",
    "provisionTenantBtn": "新規顧客を作成",
    "openWorkspaceBtn": "ダッシュボードを開く",
    "mintKeyBtn": "APIキーを発行",
    "suspendBtn": "一時停止",
    "restoreBtn": "再開する",
    "billingTitle": "プロバイダー原価とサブスクリプション売上の比較分析",
    "colTenant": "顧客名／企業名",
    "colProfile": "プロフィールID",
    "colPlan": "加入プラン",
    "colWholesale": "仕入れ原価",
    "colRetail": "サブスクリプション価格",
    "colMargin": "純利益"
  },
  "docs": {
    "badge": "公式開発者ドキュメント · asra3.com/docs",
    "title": "Asra3 API ドキュメント",
    "subtitle": "わずか5回のリクエストでAPIキーを取得し、アカウントを接続し、最初の予約投稿を完了できます。",
    "baseUrlLabel": "基本エンドポイント (Base URL)",
    "authTitle": "認証方式とAPIキー",
    "authDesc": "すべてのリクエストヘッダーに Authorization: Bearer tk_live_... を付与して送信してください。",
    "webhooksTitle": "Webhooksとリアルタイム通知",
    "webhooksDesc": "HMAC-SHA256署名によって保護された安全なメッセージ・投稿イベント通知を即座に受信できます。",
    "endpointsTitle": "主要エンドポイント一覧",
    "tryEndpointBtn": "ブラウザでテスト実行"
  },
  "telephony": {
    "eyebrow": "仮想電話番号・WhatsApp・AI音声通話",
    "title": "55カ国以上の番号を購入し、SMS送受信や電話通話を即座に実現",
    "subtitle": "専用電話番号を取得し、事前承認済みテンプレートでWhatsApp Businessに接続。超低遅延で自然に対話するAI音声エージェントを実際の電話回線へ展開できます。",
    "marketTitle": "仮想電話番号マーケットプレイス",
    "marketSubtitle": "世界55カ国以上で即時利用可能、現地の通信規制KYCも自動で完了します",
    "buyBtn": "番号を購入して有効化",
    "typeFilterAll": "すべて（市内局番、モバイル、フリーダイヤル）",
    "typeFilterMobile": "携帯電話番号 (Mobile)",
    "typeFilterLocal": "固定電話番号 (Local)",
    "typeFilterTollFree": "フリーダイヤル (Toll-Free)",
    "dialerTitle": "Web電話ダイヤラー＆通話コンソール",
    "dialerSubtitle": "取得した仮想回線を利用して、ブラウザから直接電話をかけたり受けたりできます",
    "callModeDirect": "通常の音声通話",
    "callModeAi": "AI音声エージェント通話",
    "callBtn": "通話を開始する",
    "endCallBtn": "通話を終了する",
    "smsTitle": "双方向リアルタイムSMS＆WhatsApp受信箱",
    "simulateOtpBtn": "着信OTP認証コードをシミュレート",
    "simulateSmsBtn": "着信SMSメッセージをシミュレート",
    "whatsappTitle": "番号をWhatsApp Businessに接続",
    "linkWhatsappBtn": "WhatsApp接続ウィザードを開始"
  },
  "connectionWizard": {
    "modalTitle": "チャネル＆プラットフォーム接続ウィザード",
    "modalSubtitle": "画面のガイダンスに従うだけで、SNS、メッセージング、ECストア、ブログを迷わず接続できます。",
    "step1Title": "1. プラットフォームと接続方式の選択",
    "step2Title": "2. 認証とアクセス権限の付与",
    "step3Title": "3. 管理対象ページ・チャンネルの選択",
    "step4Title": "4. 接続検証とテスト投稿の確認",
    "methodOAuth": "安全なワンクリックOAuth認証",
    "methodToken": "直接認証情報／Bot Token",
    "testPostBtn": "テスト投稿／メッセージを送信",
    "connectedBadge": "正常に接続され準備完了 ✓"
  },
  "auth": {
        "loginTitle": "ワークスペースにサインイン",
        "loginSubtitle": "認証情報を入力して、独立した顧客ワークスペースにアクセスし、チャンネルと電話回線を管理します。",
        "signupTitle": "Asra3 アカウントを作成",
        "signupSubtitle": "SNSアカウントを連携し、投稿を予約し、メッセージと広告を管理し、APIキーを即座に取得できます。",
        "emailLabel": "勤務先メールアドレス",
        "passwordLabel": "パスワード",
        "nameLabel": "氏名",
        "companyLabel": "プロジェクトまたは会社名（任意）",
        "selectPlanLabel": "プランを選択してください：",
        "submitLogin": "サインイン",
        "submitSignup": "無料で始める",
        "alreadyHaveAccount": "既にアカウントをお持ちですか？ ",
        "needAccount": "アカウントをお持ちでないですか？ ",
        "demoPersonasTitle": "クイックデモ用ペルソナ",
        "whatYouGetTitle": "登録後すぐに利用できる機能",
        "workEmailRequired": "勤務先メールアドレスを入力してください。",
        "signInFailed": "サインインに失敗しました。入力内容を確認してください。",
        "unableToSignIn": "認証サーバーに接続できませんでした。",
        "signingIn": "確認中...",
        "orContinueWith": "または次で続行",
        "continueWithGoogle": "Googleで続行",
        "enterpriseIsolation": "エンタープライズ級のマルチテナント分離",
        "unifiedTitle": "統合マーケティング＆コミュニケーション基盤",
        "unifiedDesc": "整理された専用ワークスペースへアクセス。18のSNS連携、世界55か国以上の仮想番号購入、WhatsApp＆音声AIの自動化を実現します。",
        "socialChannelsFeature": "18のSNS＆メッセージングチャンネル",
        "telephonyFeature": "グローバル電話回線＆音声AI",
        "telephonyFeatureDesc": "SMS受信、WhatsApp一斉配信、ブラウザWebRTC通話に対応",
        "storageFeature": "永続的なファイルベースストレージ",
        "storageFeatureDesc": "すべての操作、番号、チャンネルはワークスペースに安全に保存されます",
        "signUpBadge": "60秒以内で無料スタート",
        "fullNamePlaceholder": "山田 太郎",
        "companyNamePlaceholder": "自社ブランド",
        "whatYouGet1": "18のプラットフォーム（Instagram、TikTok、LinkedIn、YouTube、WhatsApp、Shopifyなど）にワンクリック連携。",
        "whatYouGet2": "投稿やReelsの予約配信、統合受信トレイでの顧客対応、Comment-to-DMの自動化。",
        "whatYouGet3": "自社アプリに即時連携できるAsra3 APIキー（tk_live_...）を発行。",
        "exploreApiDocs": "開発者向けAPIドキュメントを見る"
    },
  "showcase": {
        "platformEyebrow": "18の主要ネットワーク対応プラットフォーム",
        "platformTitle": "リアルなUIプレビューを備えた高度なネイティブ統合",
        "platformSubtitle": "ひとつの統合APIから、すべてのネットワークでのコンテンツ配信、コメント管理、メッセージ自動化を実現。",
        "adsEyebrow": "8大ネットワーク統合広告エンジン",
        "adsTitle": "8つの広告ネットワークでキャンペーンを配信・管理・分析",
        "adsSubtitle": "Meta、Google、TikTok、LinkedIn、X、Pinterest、Reddit、OpenAI Adsと完全同期し、予算自動化とCAPIに対応。",
        "devHubEyebrow": "開発者＆AIエージェントハブ",
        "devHubTitle": "8言語対応SDK、即時利用可能なMCPサーバー、開発者CLI",
        "devHubSubtitle": "お好みの言語で実装するか、Claude CodeやCursorにSNS投稿や仮想番号プロビジョニングを自動化させましょう。",
        "copied": "コピー完了！",
        "copyPrompt": "AIエージェント設定プロンプトをコピー",
        "promptCopiedToast": "設定プロンプトをクリップボードにコピーしました！"
    }
};

export const DICTIONARIES: Record<SupportedLocale, TranslationDictionary> = {
  ar: dict_ar,
  en: dict_en,
  es: dict_es,
  fr: dict_fr,
  de: dict_de,
  'pt-BR': dict_pt_BR,
  tr: dict_tr,
  ru: dict_ru,
  zh: dict_zh,
  ja: dict_ja,
};
