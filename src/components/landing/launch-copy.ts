import type { TranslationDictionary } from '@/i18n/dictionaries';

/** Public launch copy deliberately separates current manual tools from future features. */
export function launchCopy(dictionary: TranslationDictionary, arabic: boolean): TranslationDictionary {
  const text = (ar: string, en: string) => arabic ? ar : en;
  return {
    ...dictionary,
    hero: {
      ...dictionary.hero,
      badge: text('إطلاق الأدوات اليدوية والنشر', 'Manual tools & publishing launch'),
      titlePart1: text('عملاؤك ومحادثاتك', 'Your customers and conversations'),
      titleHighlight: text('في مكان واحد', 'in one place'),
      titlePart2: '',
      subtitle: text(
        'سجّل عملاءك، ورد على رسائل Facebook وInstagram وWhatsApp، وانشر المحتوى على TikTok والشبكات المدعومة، وراجع حملاتك يدوياً. الأتمتة والإعلانات والتجارة — قريباً.',
        'Record customers, reply on Facebook, Instagram and WhatsApp, publish content on TikTok and active networks, and review campaigns manually. Automation, advertising and commerce — Coming soon.'
      ),
      stat1Label: text('مساحة عمل معزولة', 'Isolated workspace'),
      stat4Label: text('واجهة عربية وإنجليزية', 'Arabic and English interface'),
    },
    showcase: {
      ...dictionary.showcase,
      platformEyebrow: 'Facebook · Instagram · TikTok · WhatsApp',
      platformTitle: text('قنواتك الحالية', 'Your current channels'),
      platformSubtitle: text(
        'نشر ومحادثات ومراجعة تعليقات يدوية. العروض التالية أمثلة توضيحية وليست نتائج حية.',
        'Publishing, conversations and manual comment review. The previews below are illustrations, not live results.'
      ),
    },
    pricingSection: {
      ...dictionary.pricingSection,
      eyebrow: text('الدفع بالتواصل معنا', 'Arrange payment with us'),
      title: text('Starter: ‏20 دولاراً شهرياً', 'Starter: $20 per month'),
      subtitle: text(
        'يشمل حسابين متصلين؛ كل حساب إضافي 8 دولارات شهرياً. إيجار الأرقام ورسائل SMS منفصلان ومدفوعان مسبقاً. تواصل معنا لترتيب الدفع. التسجيل العام مغلق حالياً.',
        'Includes two connected accounts; each extra account is $8/month. Number rental and SMS are separate prepaid services. Contact us to arrange payment. Public registration is currently closed.'
      ),
    },
    faqSection: {
      ...dictionary.faqSection,
      items: [
        {
          q: text('ما المتاح الآن؟', 'What is available now?'),
          a: text(
            'إدارة العملاء يدوياً، وربط Facebook وInstagram وTikTok وWhatsApp، والنشر والرسائل والتعليقات وتقارير النشاط المتاحة، وحملات واتساب المراجعة، وإدارة الأرقام حسب موافقة المزود والمخصصات.',
            'Manual customer management, Facebook/Instagram/TikTok/WhatsApp connection, publishing, messages, comments, available activity reports, reviewed WhatsApp campaigns and phone tools subject to provider approval and spending allocation.'
          ),
        },
        {
          q: text('كيف أدفع أو أضيف رصيداً؟', 'How do I pay or add balance?'),
          a: text(
            'تواصل مع الإدارة عبر support@asra3.com لترتيب تفاصيل الدفع يدوياً. يُضاف الرصيد بعد التحقق من استلام الدفعة فقط. الدفع الإلكتروني داخل الموقع غير متاح حالياً.',
            'Contact the administrator at support@asra3.com to arrange manual payment details. Your balance is credited only after payment receipt is verified. Online checkout is currently unavailable.'
          ),
        },
        {
          q: text('هل الردود تلقائية؟', 'Are replies automated?'),
          a: text('الأتمتة والردود التلقائية — قريباً. الإرسال الحالي إجراء يدوي يُراجع قبل التنفيذ.', 'Automation and automatic replies — Coming soon. Current sends are reviewed manual actions.'),
        },
        {
          q: text('كيف تُدار بيانات العملاء؟', 'How is customer data managed?'),
          a: text(
            'تُحفظ بيانات العملاء في مساحة عملك داخل Asra3 مع الهويات والحقول والملاحظات والموافقات. لا تتم مزامنتها تلقائياً مع جهات اتصال المزود.',
            'Customer identities, fields, notes and consent are stored durably in your Asra3 workspace. Provider contact synchronization is not automatic.'
          ),
        },
      ],
    },
    telephony: {
      ...dictionary.telephony,
      title: text('الأرقام وواتساب والرسائل المدفوعة مسبقاً', 'Numbers, WhatsApp and prepaid messaging'),
      subtitle: text(
        'الشراء والربط والإرسال تحتاج موافقة المزود ومخصصات تشغيل. الأسعار والتوافر التالية أمثلة؛ راجع القيم الفعلية داخل مساحة العمل.',
        'Purchase, connection and sending require provider approval and spending allocation. Prices and availability below are examples; review actual values in your workspace.'
      ),
      marketSubtitle: text('أمثلة للعرض فقط — التوافر والسعر من المزود', 'Illustrative examples — actual availability and price come from the provider'),
      buyBtn: text('مراجعة الأرقام في مساحة العمل', 'Review numbers in workspace'),
    },
  };
}
