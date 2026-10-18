import type { SupportedLocale } from './dictionaries';

export interface LandingPageCopy {
  navAnchors: {
    platforms: string;
    telephony: string;
    ads: string;
    developers: string;
    pricing: string;
    faq: string;
  };
  heroExtra: {
    specLink: string;
    agentReadyLabel: string;
    agentTags: {
      cli: string;
      composer: string;
      actions: string;
      autonomous: string;
      nodes: string;
    };
    windowConnectedBadge: string;
    copyBtn: string;
    copiedBtn: string;
    radarCards: {
      igTitle: string;
      igStatus: string;
      ttTitle: string;
      ttStatus: string;
      liTitle: string;
      liStatus: string;
      waTitle: string;
      waStatus: string;
    };
    radarFooter: string;
    stat1Value: string;
    stat2Value: string;
    stat2Sub: string;
    stat3Value: string;
    stat3Sub: string;
    stat4Value: string;
  };
  howItWorks: {
    eyebrow: string;
    title: string;
    subtitle: string;
    steps: Array<{
      stepNum: string;
      badge: string;
      title: string;
      desc: string;
      highlights: string[];
      ctaText: string;
      ctaHref: string;
    }>;
  };
  platformShowcase: {
    connectCta: string;
    all18Title: string;
    checklists: [string, string, string];
    platforms: {
      instagram: {
        name: string;
        category: string;
        tag: string;
        badge: string;
        description: string;
      };
      tiktok: {
        name: string;
        category: string;
        tag: string;
        badge: string;
        description: string;
      };
      facebook: {
        name: string;
        category: string;
        tag: string;
        badge: string;
        description: string;
      };
      x_threads: {
        name: string;
        category: string;
        tag: string;
        badge: string;
        description: string;
      };
      linkedin_youtube: {
        name: string;
        category: string;
        tag: string;
        badge: string;
        description: string;
      };
      google_shopify: {
        name: string;
        category: string;
        tag: string;
        badge: string;
        description: string;
      };
    };
    mockups: {
      igSponsored: string;
      igStories: [string, string, string, string, string];
      igReelTitle: string;
      igReelSub: string;
      igLikes: string;
      igCaption: string;
      igAutoDm: string;
      ttFollowing: string;
      ttForYou: string;
      ttLive: string;
      ttVideoTitle: string;
      ttCaption: string;
      ttAudio: string;
      fbTime: string;
      fbPostText: string;
      fbReactions: string;
      fbCommentsShares: string;
      fbUserComment: string;
      fbAutoDmBadge: string;
      fbAutoDmReply: string;
      xThreadBadge: string;
      xPost1: string;
      xPost2: string;
      xCardLabel: string;
      liFollowers: string;
      liPostText: string;
      liPdfSub: string;
      liViewDoc: string;
      ytMonetized: string;
      ytVideoTitle: string;
      ytViews: string;
      gmbRating: string;
      gmbGuide: string;
      gmbReviewText: string;
      gmbOwnerLabel: string;
      gmbOwnerReply: string;
      shopifyStock: string;
      shopifyDesc: string;
    };
  };
  telephonyShowcase: {
    typeLabel: string;
    types: {
      All: string;
      Mobile: string;
      Local: string;
      'Toll-Free': string;
    };
    countries: {
      SA: string;
      AE: string;
      EG: string;
      US: string;
      GB: string;
      DE: string;
    };
    availableBadge: string;
    numberLabel: string;
    capabilitiesBadge: string;
    perMonthSuffix: string;
    bento1: {
      badge: string;
      metaBadge: string;
      title: string;
      desc: string;
      storeName: string;
      officialAccount: string;
      msg1Title: string;
      msg1Body: string;
      msg2Body: string;
      msg3Body: string;
    };
    bento2: {
      badge: string;
      latencyBadge: string;
      title: string;
      desc: string;
      activeCall: string;
      agentName: string;
      transcriptHeader: string;
      callerLabel: string;
      callerText: string;
      aiLabel: string;
      aiText: string;
      mute: string;
      speaker: string;
      end: string;
    };
    bento3: {
      badge: string;
      protocolBadge: string;
      title: string;
      desc: string;
      clearBtn: string;
      callActiveBtn: string;
      callStartBtn: string;
    };
    bento4: {
      badge: string;
      routingBadge: string;
      title: string;
      desc: string;
      otpHeader: string;
      otpBodyPrefix: string;
      otpBodySuffix: string;
      receivedOn: string;
      outboundSms: string;
      delivered: string;
      openDashboardLink: string;
    };
  };
  adsShowcase: {
    tab1: string;
    tab2: string;
    tab3: string;
    capiBadge: string;
    moreNetworks: string;
    launchTitle: string;
    launchSub: string;
    campaignTitle: string;
    campaignSub: string;
    activeBadge: string;
    adSet1Title: string;
    adSet1Sub: string;
    adSet2Title: string;
    adSet2Sub: string;
    perDay: string;
    creativeA: string;
    creativeAText: string;
    creativeB: string;
    creativeBText: string;
    moderateTitle: string;
    moderateSub: string;
    totalDailyLabel: string;
    spentTodayLabel: string;
    targetRoasLabel: string;
    reportTitle: string;
    reportSub: string;
    blendedRoasBadge: string;
    metricSpend: string;
    metricSpendSub: string;
    metricRev: string;
    metricRevSub: string;
    metricCpa: string;
    metricCpaSub: string;
    metricConv: string;
    metricConvVal: string;
    metricConvSub: string;
    spendLabel: string;
    revLabel: string;
    footerCta: string;
  };
  devHub: {
    tab1: string;
    tab2: string;
    tab3: string;
    fullDocsLink: string;
    copyBtn: string;
    copiedBtn: string;
    copyCodeBtn: string;
    copyConfigBtn: string;
    mcpTitle: string;
    mcpDesc: string;
    mcpToolsHeader: string;
    tool1Desc: string;
    tool2Desc: string;
    tool3Desc: string;
    tool4Desc: string;
    cliTitle: string;
    cliDesc: string;
  };
  footer: {
    brandSubtitle: string;
    col1Title: string;
    col1Links: [string, string, string, string];
    col2Title: string;
    col2Links: [string, string, string, string];
    col3Title: string;
    col3Links: [string, string, string, string];
    col4Title: string;
    col4Links: [string, string, string, string];
    statusText: string;
    copyrightSuffix: string;
  };
}

const AR_COPY: LandingPageCopy = {
  navAnchors: {
    platforms: 'المنصات الـ 18',
    telephony: 'الأرقام وواتساب',
    ads: 'الإعلانات الممولة',
    developers: 'المطورون والـ API',
    pricing: 'الأسعار',
    faq: 'الأسئلة الشائعة',
  },
  heroExtra: {
    specLink: 'الإصدار v1.2 الكامل',
    agentReadyLabel: 'متوافق فوراً مع وكلاء الذكاء الاصطناعي:',
    agentTags: {
      cli: 'سطر أوامر أصلي',
      composer: 'محرر ذكي',
      actions: 'مهام مؤتمتة',
      autonomous: 'وكيل مستقل',
      nodes: 'عُقد معتمدة',
    },
    windowConnectedBadge: '18 منصة متصلة لحظياً',
    copyBtn: 'نسخ',
    copiedBtn: 'تم النسخ',
    radarCards: {
      igTitle: 'إنستغرام ريلز (Instagram)',
      igStatus: 'تم النشر بدقة 1080p',
      ttTitle: 'تيك توك (TikTok 9:16)',
      ttStatus: 'بث فيديو عمودي مباشر',
      liTitle: 'صفحة لينكدإن (LinkedIn)',
      liStatus: 'مقال وعرض شرائح PDF',
      waTitle: 'واتساب للأعمال (WhatsApp)',
      waStatus: 'رد تلقائي فوري ✓✓',
    },
    radarFooter: 'إرسال متزامن عبر 18 نقطة اتصال • زمن استجابة أقل من 140ms',
    stat1Value: '+884',
    stat2Value: '18 قناة',
    stat2Sub: 'تواصل اجتماعي، واتساب، SMS وصوت',
    stat3Value: '+55 دولة',
    stat3Sub: 'أرقام هاتفية افتراضية فورية',
    stat4Value: '99.99%',
  },
  howItWorks: {
    eyebrow: 'طريقة العمل خطوة بخطوة',
    title: 'كيف تبدأ وتتحكم في كل قنواتك وأرقامك في 3 خطوات؟',
    subtitle:
      'صممنا Asra3 لتعمل معك فوراً بدون أي تعقيد تقني — سواء كنت تدير علامتك التجارية من لوحة التحكم أو تبني تطبيقك عبر الـ API.',
    steps: [
      {
        stepNum: '01',
        badge: 'الخطوة الأولى • الربط والأرقام',
        title: 'اربط حساباتك الـ 18 أو اشترِ رقمك الافتراضي',
        desc: 'بضغطة زر واحدة عبر معالج الربط التفاعلي (OAuth 2.0)، اربط إنستغرام، فيسبوك، تيك توك، يوتيوب، إكس، لينكدإن، شوبيفاي، أو اشترِ رقماً هاتفياً دولياً من 55+ دولة.',
        highlights: [
          'ربط مباشر بدون الحاجة لإنشاء تطبيقات مطورين معقدة',
          'أرقام محلية وجوال ومجانية في السعودية، الإمارات، مصر، أمريكا وأوروبا',
        ],
        ctaText: 'جرّب معالج الربط الآن',
        ctaHref: '/dashboard?tab=core_connect',
      },
      {
        stepNum: '02',
        badge: 'الخطوة الثانية • الأتمتة والتفعيل',
        title: 'اربط رقمك بواتساب للأعمال والوكيل الصوتي الذكي',
        desc: 'فعّل واتساب الرسمي (WhatsApp Business API) على رقمك باستلام كود التحقق تلقائياً، واضبط موظف الاستقبال الصوتي بالذكاء الاصطناعي للرد على المكالمات على مدار الساعة.',
        highlights: [
          'مزامنة قوالب رسائل واتساب المعتمدة والرد التلقائي على التعليقات (Auto-DM)',
          'لوحة اتصال Web Phone مدمجة لإجراء واستقبال المكالمات والـ SMS من المتصفح',
        ],
        ctaText: 'استكشف الأرقام وواتساب',
        ctaHref: '/dashboard?tab=telephony',
      },
      {
        stepNum: '03',
        badge: 'الخطوة الثالثة • النشر والنمو',
        title: 'انشر محتواك، أطلق إعلاناتك، أو ادمج الـ API',
        desc: 'انشر الـ Reels والمنشورات عبر كل المنصات في آن واحد، وأطلق حملاتك الإعلانية عبر 8 شبكات مع تتبع المبيعات، أو دع وكيل الذكاء الاصطناعي يديرها برمجياً.',
        highlights: [
          'جدولة ذكية (Smart Queue) وتقارير أداء موحدة لحظية',
          '8 مكتبات برمجية (SDKs) وخادم MCP جاهز لـ Claude Code و Cursor',
        ],
        ctaText: 'ابدأ تجربتك المجانية',
        ctaHref: '/signup',
      },
    ],
  },
  platformShowcase: {
    connectCta: 'اربط المنصة من لوحة التحكم',
    all18Title: 'جميع المنصات والقنوات الـ 18 المدعومة بتكامل برمجي كامل:',
    checklists: [
      'ضبط تلقائي لأبعاد الصور والفيديو وأعلى جودة بث لكل منصة',
      'تجديد تلقائي لمفاتيح الربط (OAuth Tokens) ومراقبة حالة الاتصال حياً',
      'إشعارات Webhooks لحظية فور وصول أي تعليق أو رسالة جديدة',
    ],
    platforms: {
      instagram: {
        name: 'إنستغرام (Instagram)',
        category: 'التواصل المرئي والـ Reels',
        tag: 'قصص Stories • ريلز Reels • منشورات • رد آلي Auto-DM',
        badge: 'Graph API v21.0',
        description:
          'انشر مقاطع Reels بدقة 1080p وألبومات الكاروسيل، وجدول القصص، وفعّل تحويل التعليقات تلقائياً إلى رسائل خاصة لزيادة المبيعات.',
      },
      tiktok: {
        name: 'تيك توك (TikTok)',
        category: 'الفيديو القصير والانتشار',
        tag: 'فيديو عمودي 9:16 • نشر مباشر Direct Post API',
        badge: 'Content Posting API',
        description:
          'ارفع مقاطع الفيديو العمودية 9:16 مباشرة مع تحديد الصوت الأصلي، وإدارة التعليقات، وربط منتجات متجرك بالمقاطع.',
      },
      facebook: {
        name: 'فيسبوك وماسنجر (Facebook)',
        category: 'الصفحات والمراسلة الفورية',
        tag: 'الصفحات العامة • المجموعات • تحويل التعليق لرسالة',
        badge: 'Meta Business Suite',
        description:
          'انشر في صفحاتك التجارية وأطلق محادثات ماسنجر فورية تلقائياً عندما يعلق العميل بكلمة مفتاحية محددة.',
      },
      x_threads: {
        name: 'إكس وثريدز (X & Threads)',
        category: 'التدوين المصغر والثريدات',
        tag: 'سلاسل تغريدات مترابطة • استطلاعات رأي • رد تلقائي',
        badge: 'X API v2 + Threads API',
        description:
          'جدول سلاسل التغريدات المترابطة (Threads) واستطلاعات الرأي، وتابع الإشارات لعلامتك التجارية مع المزامنة الفورية مع Meta Threads.',
      },
      linkedin_youtube: {
        name: 'لينكدإن ويوتيوب (LinkedIn & YouTube)',
        category: 'الأعمال B2B واستوديو الفيديو',
        tag: 'صفحات الشركات • ملفات PDF • فيديو 4K UHD',
        badge: 'v2 & Data API v3',
        description:
          'انشر عروض PDF التفاعلية على صفحات الشركات في لينكدإن، وجدول فيديوهات يوتيوب بدقة 4K مع الفصول التلقائية وتحسين محركات البحث.',
      },
      google_shopify: {
        name: 'جوجل بيزنس وشوبيفاي (Google & Shopify)',
        category: 'المتاجر الإلكترونية والظهور المحلي',
        tag: 'تقييمات 5 نجوم • خرائط جوجل • مزامنة المنتجات',
        badge: 'Local SEO & Storefront',
        description:
          'رد تلقائياً على تقييمات العملاء في خرائط جوجل، وانشر تشكيلات المنتجات والمقالات مباشرة في متاجر Shopify و WordPress.',
      },
    },
    mockups: {
      igSponsored: 'مُموّل • صوت أصلي معتمد',
      igStories: ['قصتك', 'الإطلاق', 'الباقات', 'تحديثات', 'الـ API'],
      igReelTitle: 'إصدار جديد: نظام التسويق والاتصالات الموحد',
      igReelSub: 'asra3.com • الرد الآلي مفعل',
      igLikes: '24,819 إعجاب',
      igCaption:
        'أدر جميع قنواتك التسويقية وأرقامك من مكان واحد. اكتب كلمة "TECH" في التعليقات ليصلك الرابط فوراً في الرسائل الخاصة!',
      igAutoDm: 'مُشغّل Auto-DM: الكلمة "TECH" ← تم إرسال 142 رسالة خاصة هذه الساعة',
      ttFollowing: 'أتابعهم',
      ttForYou: 'لك (For You)',
      ttLive: 'مباشر',
      ttVideoTitle: 'كيف تنشر في 18 منصة وتفعّل واتساب بضغطة واحدة عبر Asra3',
      ttCaption: 'تحكم كامل في حساباتك وأرقامك من لوحة واحدة. الرابط في البايو! ⚡',
      ttAudio: '🎵 الصوت الأصلي — Asra3 Official Sound',
      fbTime: 'الآن • 🌍 عام',
      fbPostText:
        'خبر سار لأصحاب المتاجر والشركات! خدمات الأرقام الهاتفية وربط واتساب وأتمتة التسويق متاحة الآن بالكامل. اكتب "عرض" في التعليقات للحصول على كود خصم 50% فوراً في ماسنجر! 🎉',
      fbReactions: '482 تفاعل',
      fbCommentsShares: '129 تعليق • 45 مشاركة',
      fbUserComment: 'أريد "عرض" من فضلكم! أحتاج هذه الخدمة لمتجري.',
      fbAutoDmBadge: '⚡ تم تفعيل التحويل التلقائي لماسنجر (Comment-to-DM)',
      fbAutoDmReply:
        'تم إرسال رسالة خاصة: "أهلاً بك! إليك قسيمة الخصم الخاصة بك بنسبة 50%: ASRA350 🚀"',
      xThreadBadge: 'سلسلة مترابطة (2/2)',
      xPost1:
        '1/2 لماذا تشتت فريقك بين 18 لوحة تحكم مختلفة بينما يمكنك إدارة كل منشور، ورسالة واتساب، ورقم هاتفي سحابي من منصة واحدة؟',
      xPost2:
        '2/2 مصممة لفرق التسويق الحديثة ووكلاء الذكاء الاصطناعي (Claude Code و Cursor). جرّبها مجاناً الآن عبر asra3.com ⚡',
      xCardLabel: '🔗 asra3.com — منصة التسويق والاتصالات السحابية الموحدة',
      liFollowers: '12,400 متابع • منذ 4 ساعات',
      liPostText:
        'يسعدنا مشاركة الدليل التنفيذي لعام 2026: كيف توحد الشركات الرائدة قنوات التسويق والرد الصوتي الذكي عبر 18 قناة متزامنة.',
      liPdfSub: '16 صفحة • الشريحة 1 من 16',
      liViewDoc: 'عرض الملف',
      ytMonetized: 'مُفعّل للربح ✓',
      ytVideoTitle: 'شرح عملي: النشر المتزامن وإدارة الأرقام بدون تأخير',
      ytViews: '18.4 ألف مشاهدة • 94.2% إعجاب',
      gmbRating: 'تقييم 5.0 ★★★★★',
      gmbGuide: 'مرشد محلي • 42 تقييماً',
      gmbReviewText:
        '"خدمة استثنائية! تحديثات الطلبات عبر واتساب والدعم الصوتي الفوري جعلت تجربتنا سلسة للغاية."',
      gmbOwnerLabel: 'رد من مالك النشاط التجاري: ',
      gmbOwnerReply:
        'شكراً جزيلاً لكِ سارة! يسعدنا دائماً تقديم أفضل تجربة لعملائنا الكرام.',
      shopifyStock: 'متوفر بالمخزون: 142 قطعة',
      shopifyDesc:
        'جاكيت التشكيلة الشتوية — تمت مزامنته ونشره تلقائياً في متجر إنستغرام وتيك توك وبنترست.',
    },
  },
  telephonyShowcase: {
    typeLabel: 'الفئة:',
    types: {
      All: 'الكل',
      Mobile: 'جوال (Mobile)',
      Local: 'محلي (Local)',
      'Toll-Free': 'مجاني (Toll-Free)',
    },
    countries: {
      SA: 'المملكة العربية السعودية',
      AE: 'الإمارات العربية المتحدة',
      EG: 'مصر',
      US: 'الولايات المتحدة',
      GB: 'المملكة المتحدة',
      DE: 'ألمانيا',
    },
    availableBadge: '✓ متاح للتفعيل الفوري',
    numberLabel: 'رقم',
    capabilitiesBadge: 'يدعم واتساب + المكالمات الصوتية + SMS',
    perMonthSuffix: '/شهرياً',
    bento1: {
      badge: 'واجهة واتساب للأعمال الرسمية',
      metaBadge: 'Meta Cloud API معتمد',
      title: 'حملات واتساب الجماعية والرد الآلي على رقمك',
      desc: 'اربط رقمك المشترى بواتساب للأعمال في خطوات واضحة، وأرسل إشعارات الطلبات والحملات الترويجية بعلامة التوثيق.',
      storeName: 'متجر Asra3 الرسمي',
      officialAccount: 'حساب تجاري رسمي موثق',
      msg1Title: '🔔 تم شحن طلبك (#TK-8492)',
      msg1Body:
        'مرحباً عمر! شحنتك في الطريق إليك. يمكنك تتبع المندوب مباشرة أو الرد برقم 1 للتحدث مع المساعد الذكي.',
      msg2Body: 'هل يمكن تغيير موعد التوصيل إلى الغد الساعة 4 عصراً؟',
      msg3Body:
        'تم التحديث يا عمر! تم جدولة موعد التوصيل ليوم الغد الساعة 4:00 عصراً. يومك سعيد! ✨',
    },
    bento2: {
      badge: 'وكيل صوتي بالذكاء الاصطناعي (PSTN / WebRTC)',
      latencyBadge: 'استجابة أقل من 350ms',
      title: 'مكالمات صوتية ذكية طبيعية باللغة العربية والإنجليزية',
      desc: 'استقبل مكالمات العملاء الواردة أو أطلق مكالمات صادرة مؤتمتة بصوت طبيعي يفهم اللهجات العربية ويجيب بدقة.',
      activeCall: 'مكالمة نشطة الآن',
      agentName: 'سارة (المساعد الصوتي الذكي)',
      transcriptHeader: 'التفريغ النصي المباشر للمكالمة:',
      callerLabel: 'المتصل:',
      callerText: '"ما هي مواعيد العمل لديكم يوم الغد؟"',
      aiLabel: 'سارة (AI):',
      aiText: '"نعمل غداً من الساعة 9 صباحاً حتى 10 مساءً في جميع فروعنا، كيف يمكنني مساعدتك أيضاً؟"',
      mute: 'كتم',
      speaker: 'مكبر الصوت',
      end: 'إنهاء',
    },
    bento3: {
      badge: 'هاتف المتصفح المدمج (Web Phone)',
      protocolBadge: 'اتصال دولي مباشر SIP / WebRTC',
      title: 'أجرِ واستقبل المكالمات مباشرة من المتصفح',
      desc: 'اتصل بأي رقم جوال أو هاتف أرضي حول العالم مباشرة من لوحة التحكم باستخدام رقمك الافتراضي كمعرف للمتصل (Caller ID).',
      clearBtn: 'مسح',
      callActiveBtn: 'إنهاء المكالمة الجارية',
      callStartBtn: 'اتصل الآن من هذا الرقم',
    },
    bento4: {
      badge: 'رسائل SMS ثنائية الاتجاه واستلام الـ OTP',
      routingBadge: 'توجيه دولي فوري',
      title: 'استقبل أكواد التحقق (OTP) وأرسل رسائل SMS تفاعلية',
      desc: 'استلم رموز تفعيل المنصات والردود النصية من العملاء فوراً داخل صندوق الرسائل، وأرسل روابط التتبع والتنبيهات.',
      otpHeader: 'رسالة رمز تحقق واردة (OTP Verification)',
      otpBodyPrefix: 'رمز التحقق الخاص بك هو ',
      otpBodySuffix: '. صالح لمدة 10 دقائق.',
      receivedOn: 'تم الاستلام على الرقم:',
      outboundSms: 'تم شحن طلبك رقم #4912 بنجاح! رابط التتبع المباشر: https://asra3.com/t/4912',
      delivered: 'تم التسليم ✓',
      openDashboardLink: 'افتح صندوق الرسائل ولوحة الاتصال في الداش بورد',
    },
  },
  adsShowcase: {
    tab1: '1. إطلاق الحملات (الهيكلة)',
    tab2: '2. التحكم بالميزانيات',
    tab3: '3. تقارير العائد (ROAS)',
    capiBadge: 'دقة مطابقة التحويلات CAPI: 99.8%',
    moreNetworks: '+3 شبكات أخرى',
    launchTitle: 'هيكلة إعلانية موحدة: الحملة ← المجموعة الإعلانية ← الإعلان',
    launchSub: 'انشر حملاتك في عدة شبكات إعلانية في وقت واحد مع تكييف تلقائي للمقاسات والصيغ.',
    campaignTitle: 'الحملة الرئيسية: التوسع الإقليمي للربع الرابع Q4',
    campaignSub: 'الهدف: المبيعات وتحقيق أعلى عائد ROAS • مستهدفة عبر 8 شبكات',
    activeBadge: '✓ نشطة الآن',
    adSet1Title: 'المجموعة الإعلانية 1: المتسوقون في الخليج (السعودية والإمارات)',
    adSet1Sub: 'ميتا وتيك توك • الميزانية: $150/يوم • جمهور مشابه 2%',
    adSet2Title: 'المجموعة الإعلانية 2: صناع القرار والشركات (B2B)',
    adSet2Sub: 'لينكدإن وجوجل • الميزانية: $100/يوم • استهداف المدراء التنفيذيين',
    perDay: '/ يومياً',
    creativeA: 'إعلان A',
    creativeAText: 'فيديو ريلز قصير 9:16 مع زر "تسوق الآن"',
    creativeB: 'إعلان B',
    creativeBText: 'كاروسيل 5 شرائح: استعراض مزايا المنصة المتكاملة',
    moderateTitle: 'أتمتة الميزانيات والتحكم الفوري بالحملات',
    moderateSub: 'عدّل الميزانيات اليومية أو أوقف/فعّل أي شبكة إعلانية بضغطة زر مع مزامنة لحظية.',
    totalDailyLabel: 'إجمالي الميزانية اليومية:',
    spentTodayLabel: 'المنفق اليوم:',
    targetRoasLabel: 'العائد المستهدف:',
    reportTitle: 'تقارير الإحالة الموحدة وعائد الإنفاق الإعلاني (ROAS)',
    reportSub: 'تتبع دقيق للمبيعات والتحويلات عبر جميع القنوات مع منع تكرار احتساب العمليات.',
    blendedRoasBadge: 'متوسط العائد الموحد: 4.82x (+$38,420 صافي المبيعات)',
    metricSpend: 'إجمالي الإنفاق الإعلاني',
    metricSpendSub: 'ضمن الميزانية المستهدفة',
    metricRev: 'المبيعات المحققة',
    metricRevSub: '+28.4% مقارنة بالفترة السابقة',
    metricCpa: 'متوسط تكلفة الاستحواذ (CPA)',
    metricCpaSub: 'انخفاض التكلفة بنسبة 32%-',
    metricConv: 'إجمالي الطلبات والتحويلات',
    metricConvVal: '642 طلباً',
    metricConvSub: 'مؤكدة عبر Server CAPI',
    spendLabel: 'الإنفاق:',
    revLabel: 'العائد:',
    footerCta: 'إدارة وإطلاق الحملات الإعلانية من لوحة التحكم',
  },
  devHub: {
    tab1: '1. مكتبات البرمجة (8 SDKs)',
    tab2: '2. خادم MCP للوكلاء الأذكياء',
    tab3: '3. أداة سطر الأوامر (CLI)',
    fullDocsLink: 'توثيق الـ API الكامل',
    copyBtn: 'نسخ',
    copiedBtn: 'تم النسخ',
    copyCodeBtn: 'نسخ الكود',
    copyConfigBtn: 'نسخ الإعدادات',
    mcpTitle: 'خادم Model Context Protocol (MCP) للذكاء الاصطناعي',
    mcpDesc:
      'امنح Claude Code و Cursor و OpenClaw القدرة على نشر المحتوى، وشراء الأرقام الهاتفية، وإرسال رسائل واتساب وSMS تلقائياً.',
    mcpToolsHeader: 'الأدوات الجاهزة للوكيل الذكي (Native Agent Tools):',
    tool1Desc: 'نشر النصوص والصور والـ Reels عبر 18 قناة في طلب واحد',
    tool2Desc: 'البحث عن الأرقام الهاتفية وشراؤها فورياً في 55+ دولة',
    tool3Desc: 'إرسال حملات واتساب المعتمدة والردود التلقائية السريعة',
    tool4Desc: 'إجراء مكالمات صوتية بالذكاء الاصطناعي مع تفريغ نصي مباشر',
    cliTitle: 'أداة سطر الأوامر Asra3 CLI',
    cliDesc:
      'أدر عمليات النشر، وشراء الأرقام، وإرسال الرسائل مباشرة من الطرفية (Terminal) على أنظمة Windows و macOS و Linux.',
  },
  footer: {
    brandSubtitle: 'منصة التسويق الموحد، الأرقام السحابية، واتساب للأعمال والذكاء الصوتي',
    col1Title: 'منصة التواصل والنشر',
    col1Links: [
      'ربط الـ 18 منصة اجتماعية',
      'نشر وجدولة المحتوى والـ Reels',
      'صندوق الرسائل الموحد (Inbox)',
      'إدارة الإعلانات عبر 8 شبكات',
    ],
    col2Title: 'الأرقام وواتساب والصوت',
    col2Links: [
      'سوق الأرقام في 55+ دولة',
      'ربط واتساب للأعمال الرسمي',
      'الوكيل الصوتي الذكي (AI Voice)',
      'هاتف المتصفح ورسائل الـ SMS',
    ],
    col3Title: 'المطورون والـ API',
    col3Links: [
      'بوابة توثيق الـ API التفاعلية',
      'مكتبات البرمجة الـ 8 (SDKs)',
      'خادم @asra3/mcp-server',
      'لوحة الإدارة ومراقبة الأداء',
    ],
    col4Title: 'المعايير والفهرسة الذكية',
    col4Links: [
      'ملف llms.txt لمحركات الذكاء الاصطناعي',
      'خريطة الموقع sitemap.xml',
      'قواعد الزحف robots.txt',
      'توافق كامل مع معايير SOC-2 و GDPR',
    ],
    statusText: 'جميع واجهات الـ API الـ 18 وخوادم الاتصالات تعمل بكفاءة (99.99%)',
    copyrightSuffix: 'جميع الحقوق محفوظة — مدعوم بتقنيات Asra3 Cloud.',
  },
};

const EN_COPY: LandingPageCopy = {
  navAnchors: {
    platforms: '18 Platforms',
    telephony: 'Numbers & WhatsApp',
    ads: 'Ad Network Suite',
    developers: 'Developers & API',
    pricing: 'Pricing',
    faq: 'FAQ',
  },
  heroExtra: {
    specLink: 'Full v1.2 Spec',
    agentReadyLabel: 'AI Agent Ready:',
    agentTags: {
      cli: 'Native CLI',
      composer: 'Composer / Agent',
      actions: 'OpenAI Actions',
      autonomous: 'Autonomous',
      nodes: 'Verified Nodes',
    },
    windowConnectedBadge: '18 PLATFORMS CONNECTED',
    copyBtn: 'Copy',
    copiedBtn: 'Copied',
    radarCards: {
      igTitle: 'Instagram Reel',
      igStatus: 'Published 1080p',
      ttTitle: 'TikTok Vertical',
      ttStatus: 'Live 9:16 Video',
      liTitle: 'LinkedIn Page',
      liStatus: 'Article & Carousel',
      waTitle: 'WhatsApp Business',
      waStatus: 'Auto-DM ✓✓ Sent',
    },
    radarFooter: 'Simultaneous dispatch across 18 endpoints • <140ms latency',
    stat1Value: '884+',
    stat2Value: '18 Channels',
    stat2Sub: 'Social, WhatsApp, SMS & Voice',
    stat3Value: '55+ Countries',
    stat3Sub: 'Instant Virtual Phone Numbers',
    stat4Value: '99.99%',
  },
  howItWorks: {
    eyebrow: 'HOW ASRA3 WORKS',
    title: 'Go from Zero to Full Omnichannel & Telephony in 3 Guided Steps',
    subtitle:
      'Designed for immediate clarity—operate everything visually from the Customer Dashboard or automate it through our unified REST API & MCP Server.',
    steps: [
      {
        stepNum: '01',
        badge: 'Step 1 • Connect & Provision',
        title: 'Connect 18 Channels or Buy a Virtual Number',
        desc: 'Use our 1-click OAuth 2.0 wizard to link Instagram, Facebook, TikTok, YouTube, X, LinkedIn, and Shopify, or provision local/mobile numbers in 55+ countries.',
        highlights: [
          'Zero complex developer app approvals required to get started',
          'Instant numbers in Saudi Arabia, UAE, Egypt, US, UK & Europe',
        ],
        ctaText: 'Open Connection Wizard',
        ctaHref: '/dashboard?tab=core_connect',
      },
      {
        stepNum: '02',
        badge: 'Step 2 • Link WhatsApp & Voice AI',
        title: 'Bind Your Number to WhatsApp Business & AI Voice',
        desc: 'Verify WhatsApp Business Cloud API with automatic OTP capture right inside your inbox, and attach a bilingual AI Voice Agent to answer or place phone calls.',
        highlights: [
          'Sync official WhatsApp templates & trigger Comment-to-DM funnels',
          'Built-in browser Web Phone keypad for 2-way calls and SMS',
        ],
        ctaText: 'Explore Numbers & WhatsApp',
        ctaHref: '/dashboard?tab=telephony',
      },
      {
        stepNum: '03',
        badge: 'Step 3 • Publish, Advertise & Scale',
        title: 'Publish Everywhere, Launch Ads, or Call the API',
        desc: 'Schedule Reels and threads across all networks at once, manage campaigns across 8 ad networks with CAPI tracking, or let AI agents run workflows via MCP.',
        highlights: [
          'Smart Queue scheduling & real-time cross-channel attribution',
          '8 official SDKs, CLI tool, and native MCP Server integration',
        ],
        ctaText: 'Start Free Account',
        ctaHref: '/signup',
      },
    ],
  },
  platformShowcase: {
    connectCta: 'Connect in Dashboard',
    all18Title: 'All 18 Supported Omnichannel Platforms with Full API Parity:',
    checklists: [
      'Automatic aspect-ratio optimization & HD media encoding',
      'Live OAuth token refresh & real-time connection health telemetry',
      'Instant HMAC-signed webhook notifications on every message or comment',
    ],
    platforms: {
      instagram: {
        name: 'Instagram',
        category: 'Social & Video',
        tag: 'Stories • Reels • Feed • Auto-DM',
        badge: 'Graph API v21.0',
        description:
          'Publish 1080p Reels and carousels, schedule Stories, and automate comment-to-DM sales funnels.',
      },
      tiktok: {
        name: 'TikTok',
        category: 'Social & Video',
        tag: '9:16 Video • Direct Post API',
        badge: 'Content Posting API',
        description:
          'Direct upload vertical 9:16 video, audio attribution, comment management, and commerce tags.',
      },
      facebook: {
        name: 'Facebook & Messenger',
        category: 'Social & Messaging',
        tag: 'Pages • Groups • Comment-to-DM',
        badge: 'Meta Business Suite',
        description:
          'Cross-post to Pages and automatically trigger instant private Messenger conversations on comment keywords.',
      },
      x_threads: {
        name: 'X (Twitter) & Threads',
        category: 'Social & Microblogging',
        tag: 'Connected Threads • Media Polls',
        badge: 'X API v2 + Threads API',
        description:
          'Schedule multi-post connected threads, polls, auto-reply to brand mentions, and sync to Meta Threads.',
      },
      linkedin_youtube: {
        name: 'LinkedIn & YouTube',
        category: 'B2B & Video Studio',
        tag: 'Company Pages • 4K Video Uploads',
        badge: 'v2 & Data API v3',
        description:
          'Publish multi-page PDF carousels to LinkedIn Orgs and schedule 4K YouTube videos with automated Chapters & SEO.',
      },
      google_shopify: {
        name: 'Google Business & Shopify',
        category: 'Commerce & Local SEO',
        tag: '5-Star Reviews • Product Drops',
        badge: 'Local Services & Storefront',
        description:
          'Auto-reply to 5-star customer reviews on Google Maps and publish new product collections to Shopify & WordPress.',
      },
    },
    mockups: {
      igSponsored: 'Sponsored • Original Audio',
      igStories: ['Your Story', 'Launch', 'Pricing', 'API v1', 'Updates'],
      igReelTitle: 'New Release: AI Omnichannel OS',
      igReelSub: 'asra3.com • Auto-DM Active',
      igLikes: '24,819 likes',
      igCaption:
        "Automate your marketing stack with one unified API call. Drop 'TECH' in comments for our developer kit!",
      igAutoDm: 'Auto-DM Trigger: "TECH" → 142 DMs sent this hour',
      ttFollowing: 'Following',
      ttForYou: 'For You',
      ttLive: 'LIVE',
      ttVideoTitle: 'How Asra3 Deploys to 18 Channels in 1 Request',
      ttCaption: 'Full omnichannel control from one unified dashboard. Link in bio! ⚡',
      ttAudio: '🎵 Asra3 Original Audio — Verified Business Sound',
      fbTime: 'Just now • 🌍 Public',
      fbPostText:
        'Big news for e-commerce brands! Asra3 telephony and marketing automation is now fully live. Reply "OFFER" below to receive an exclusive 50% promo code straight to your Messenger! 🎉',
      fbReactions: '482 reactions',
      fbCommentsShares: '129 comments • 45 shares',
      fbUserComment: 'OFFER please! Need this for my shop.',
      fbAutoDmBadge: '⚡ Comment-to-DM Triggered',
      fbAutoDmReply:
        'Private message sent: "Hey John! Here is your 50% discount voucher: ASRA350 🚀"',
      xThreadBadge: 'Connected Thread (2/2)',
      xPost1:
        '1/2 Why manage 18 different APIs when you can orchestrate every post, direct message, and virtual phone number through one unified endpoint?',
      xPost2:
        '2/2 Built for modern AI agents (Claude Code, Cursor, OpenClaw) and marketing teams alike. Try it free at asra3.com ⚡',
      xCardLabel: '🔗 asra3.com — The Omnichannel Cloud Platform',
      liFollowers: '12,400 followers • 4h',
      liPostText:
        'Delighted to share our 2026 Enterprise Omnichannel Playbook: How leading brands synchronize marketing and conversational AI across 18 channels.',
      liPdfSub: '16 Pages • Slide 1 of 16',
      liViewDoc: 'View Doc',
      ytMonetized: 'Monetized ✓',
      ytVideoTitle: 'API Deep Dive: Zero Latency Dispatch',
      ytViews: '18.4K views • 94.2% Likes',
      gmbRating: '5.0 ★★★★★ Rating',
      gmbGuide: 'Local Guide • 42 reviews',
      gmbReviewText:
        '"Incredible service! WhatsApp order updates and instant AI voice support made our experience seamless."',
      gmbOwnerLabel: 'Response from the owner: ',
      gmbOwnerReply:
        'Thank you Sarah! Delighted we could deliver a smooth experience. See you soon!',
      shopifyStock: 'In Stock: 142 units',
      shopifyDesc:
        'Winter Drop Jacket — Auto-published to Instagram Shop, TikTok Store, and Pinterest Catalogs.',
    },
  },
  telephonyShowcase: {
    typeLabel: 'Type:',
    types: {
      All: 'All',
      Mobile: 'Mobile',
      Local: 'Local',
      'Toll-Free': 'Toll-Free',
    },
    countries: {
      SA: 'Saudi Arabia',
      AE: 'United Arab Emirates',
      EG: 'Egypt',
      US: 'United States',
      GB: 'United Kingdom',
      DE: 'Germany',
    },
    availableBadge: '✓ Available Now',
    numberLabel: 'Number',
    capabilitiesBadge: 'WhatsApp + Voice + SMS Enabled',
    perMonthSuffix: '/mo',
    bento1: {
      badge: 'WhatsApp Business API',
      metaBadge: 'Verified Meta Cloud API',
      title: 'Broadcasts & Auto-DM on Your Number',
      desc: 'Link your purchased number to WhatsApp Business in guided steps. Trigger verified template broadcasts with blue double-checkmarks.',
      storeName: 'Asra3 Store',
      officialAccount: 'Official Business Account',
      msg1Title: '🔔 Order Dispatched (#TK-8492)',
      msg1Body:
        'Hello Omar! Your shipment is on its way. Track live or reply 1 to speak with our AI agent.',
      msg2Body: 'Can you change delivery to tomorrow at 4 PM?',
      msg3Body:
        'Updated Omar! Courier rescheduled for tomorrow at 4:00 PM. Have a great day! ✨',
    },
    bento2: {
      badge: 'AI Voice Agents (WebRTC / PSTN)',
      latencyBadge: '<350ms Latency',
      title: 'Real-Time Conversational AI Voice Calling',
      desc: 'Accept inbound customer calls or trigger automated outbound phone calls with natural multilingual Arabic & English voices.',
      activeCall: 'Active Call',
      agentName: 'Sara (AI Voice Concierge)',
      transcriptHeader: 'Speech-to-Text Live Transcript:',
      callerLabel: 'Caller:',
      callerText: '"What are your business hours tomorrow?"',
      aiLabel: 'Sara (AI):',
      aiText: '"We are open from 9 AM to 10 PM across all branches!"',
      mute: 'Mute',
      speaker: 'Speaker',
      end: 'End',
    },
    bento3: {
      badge: 'Web Phone Dialer',
      protocolBadge: 'PSTN & WebRTC SIP',
      title: 'Direct In-Browser Voice Calling',
      desc: 'Place real phone calls to any mobile or landline directly from your browser using your purchased caller ID.',
      clearBtn: 'Clear',
      callActiveBtn: 'End Active Call',
      callStartBtn: 'Place Call from Number',
    },
    bento4: {
      badge: 'Live SMS & MMS Suite',
      routingBadge: '2-Way Global Routing',
      title: 'Receive OTPs & Send Two-Way SMS',
      desc: 'Capture incoming verification codes, customer replies, and send automated tracking updates with high deliverability.',
      otpHeader: 'Incoming OTP Verification Code',
      otpBodyPrefix: 'Your verification code is ',
      otpBodySuffix: '. Valid for 10 minutes.',
      receivedOn: 'Received on:',
      outboundSms:
        'Your order #4912 has been shipped! Live delivery tracker: https://asra3.com/t/4912',
      delivered: 'Delivered ✓',
      openDashboardLink: 'Open Live SMS & Dialer in Dashboard',
    },
  },
  adsShowcase: {
    tab1: '1. Launch (Hierarchy)',
    tab2: '2. Moderate (Budgets)',
    tab3: '3. Report (ROAS)',
    capiBadge: 'Server CAPI Match Rate: 99.8%',
    moreNetworks: '+3 more',
    launchTitle: 'Live Multi-Network Hierarchy: Campaign → Ad Set → Ad',
    launchSub: 'Publish to multiple networks simultaneously with automatic format adaptation.',
    campaignTitle: 'Campaign: Global Omnichannel Q4 Scale',
    campaignSub: 'Objective: Purchases / High ROAS • 8 Networks Target',
    activeBadge: '✓ Active',
    adSet1Title: 'Ad Set 1: Gulf High-Intent Shoppers (KSA & UAE)',
    adSet1Sub: 'Meta & TikTok • Budget: $150/day • Lookalike 2%',
    adSet2Title: 'Ad Set 2: B2B Decision Makers (US & Europe)',
    adSet2Sub: 'LinkedIn & Google Ads • Budget: $100/day • Job Title: CEO, VP Marketing',
    perDay: '/ day',
    creativeA: 'Creative A',
    creativeAText: 'Short 9:16 Video Reel with CTA "Shop Now"',
    creativeB: 'Creative B',
    creativeBText: 'Carousel 5 Slides: Omnichannel Features Breakdown',
    moderateTitle: 'Live Budget Automation & Campaign Moderation',
    moderateSub:
      'Real-time budget reallocation sliders that sync bid adjustments to ad networks in seconds.',
    totalDailyLabel: 'Total Daily:',
    spentTodayLabel: 'Spent today:',
    targetRoasLabel: 'Target ROAS:',
    reportTitle: 'Cross-Network Attribution & ROAS Sparklines',
    reportSub: 'Consolidated multi-touch attribution with de-duplicated conversion tracking.',
    blendedRoasBadge: 'Blended ROAS: 4.82x (+$38,420 Net Revenue)',
    metricSpend: 'Total Ad Spend',
    metricSpendSub: 'Within Target Budget',
    metricRev: 'Attributed Revenue',
    metricRevSub: '+28.4% vs last period',
    metricCpa: 'Avg. Cost / Acquisition',
    metricCpaSub: '-32% CPA reduction',
    metricConv: 'Conversions',
    metricConvVal: '642 orders',
    metricConvSub: 'De-duplicated via CAPI',
    spendLabel: 'Spend:',
    revLabel: 'Rev:',
    footerCta: 'Launch Ad Campaigns in Customer Workspace',
  },
  devHub: {
    tab1: '1. API 8 SDKs',
    tab2: '2. MCP Server (AI Agents)',
    tab3: '3. Asra3 CLI',
    fullDocsLink: 'Full API Docs',
    copyBtn: 'Copy',
    copiedBtn: 'Copied',
    copyCodeBtn: 'Copy Code',
    copyConfigBtn: 'Copy Configuration',
    mcpTitle: 'Model Context Protocol (MCP) Server',
    mcpDesc:
      'Empower Claude Code, Cursor, OpenClaw, and Codex agents to manage social posting, number purchase, and SMS autonomously.',
    mcpToolsHeader: 'Available Native Agent Tools:',
    tool1Desc: 'Post text, media & reels across 18 channels',
    tool2Desc: 'Search & provision numbers in 55+ countries',
    tool3Desc: 'Dispatch WhatsApp broadcast & auto-DM',
    tool4Desc: 'Initiate AI Voice Agent calls with live transcripts',
    cliTitle: 'Asra3 CLI Tooling',
    cliDesc:
      'Manage deployment pipelines, numbers, and marketing broadcasts right from your macOS / Linux / Windows terminal.',
  },
  footer: {
    brandSubtitle: 'Unified Omnichannel Marketing, Virtual Numbers, WhatsApp & AI Voice Cloud',
    col1Title: 'Omnichannel Suite',
    col1Links: [
      '18 Connected Platforms',
      'Publishing & Reels Studio',
      'Unified Social Inbox',
      '8-Network Ad Manager',
    ],
    col2Title: 'Telephony & Voice',
    col2Links: [
      '55+ Countries Marketplace',
      'WhatsApp Business Linking',
      'AI Voice Agents (PSTN)',
      'Web Phone Dialer & SMS',
    ],
    col3Title: 'Developers & MCP',
    col3Links: [
      'Interactive API Docs',
      '8 Production SDKs',
      '@asra3/mcp-server',
      'System Admin Telemetry',
    ],
    col4Title: 'Machine Discovery & Legal',
    col4Links: [
      'llms.txt (GEO Engine)',
      'sitemap.xml (SEO Index)',
      'robots.txt (Crawler Rules)',
      'SOC-2 Type II & GDPR Compliant',
    ],
    statusText: 'All 18 APIs & Telephony Clusters Operational (99.99%)',
    copyrightSuffix: 'All rights reserved. Powered by Asra3 Cloud.',
  },
};

const LOCALIZED_OVERRIDES: Partial<Record<SupportedLocale, Partial<LandingPageCopy>>> = {
  es: {
    navAnchors: {
      platforms: '18 Plataformas',
      telephony: 'Números y WhatsApp',
      ads: 'Publicidad',
      developers: 'Desarrolladores',
      pricing: 'Precios',
      faq: 'Preguntas',
    },
    howItWorks: {
      ...EN_COPY.howItWorks,
      eyebrow: 'CÓMO FUNCIONA ASRA3',
      title: 'Domina tus canales y telefonía en 3 sencillos pasos',
      subtitle:
        'Gestiona todo visualmente desde el panel de control o intégralo mediante nuestra API REST unificada.',
    },
  },
  fr: {
    navAnchors: {
      platforms: '18 Plateformes',
      telephony: 'Numéros & WhatsApp',
      ads: 'Publicité',
      developers: 'Développeurs',
      pricing: 'Tarifs',
      faq: 'FAQ',
    },
    howItWorks: {
      ...EN_COPY.howItWorks,
      eyebrow: 'COMMENT FONCTIONNE ASRA3',
      title: 'Déployez vos canaux et numéros virtuels en 3 étapes',
      subtitle:
        'Pilotez tout depuis le tableau de bord client ou automatisez via notre API REST et serveur MCP.',
    },
  },
  de: {
    navAnchors: {
      platforms: '18 Plattformen',
      telephony: 'Nummern & WhatsApp',
      ads: 'Werbung',
      developers: 'Entwickler & API',
      pricing: 'Preise',
      faq: 'FAQ',
    },
  },
  'pt-BR': {
    navAnchors: {
      platforms: '18 Plataformas',
      telephony: 'Números e WhatsApp',
      ads: 'Anúncios',
      developers: 'Desenvolvedores',
      pricing: 'Preços',
      faq: 'Perguntas',
    },
  },
  tr: {
    navAnchors: {
      platforms: '18 Platform',
      telephony: 'Numaralar ve WhatsApp',
      ads: 'Reklam Yönetimi',
      developers: 'Geliştirici & API',
      pricing: 'Fiyatlandırma',
      faq: 'SSS',
    },
  },
  ru: {
    navAnchors: {
      platforms: '18 Платформ',
      telephony: 'Номера и WhatsApp',
      ads: 'Реклама',
      developers: 'Разработчикам',
      pricing: 'Тарифы',
      faq: 'Вопросы',
    },
  },
  zh: {
    navAnchors: {
      platforms: '18 大社交平台',
      telephony: '虚拟号码与 WhatsApp',
      ads: '跨平台广告',
      developers: '开发者与 API',
      pricing: '价格方案',
      faq: '常见问题',
    },
  },
  ja: {
    navAnchors: {
      platforms: '18の連携チャネル',
      telephony: '電話番号 & WhatsApp',
      ads: '広告マネージャー',
      developers: '開発者 & API',
      pricing: '料金プラン',
      faq: 'よくある質問',
    },
  },
};

export function getLandingCopy(locale: SupportedLocale): LandingPageCopy {
  if (locale === 'ar') return AR_COPY;
  if (locale === 'en') return EN_COPY;
  const override = LOCALIZED_OVERRIDES[locale];
  if (!override) return EN_COPY;
  return {
    ...EN_COPY,
    ...override,
    navAnchors: {
      ...EN_COPY.navAnchors,
      ...(override.navAnchors || {}),
    },
  };
}
