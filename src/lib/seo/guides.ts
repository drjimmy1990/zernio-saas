import type { PublicLocale, PublicTopic } from './site';

type Section = { title: string; body: string; points?: string[] };
export type ProductGuide = {
  label: string;
  title: string;
  description: string;
  intro: string;
  sections: Section[];
  questions: { question: string; answer: string }[];
};

export const GUIDES: Record<PublicLocale, Record<PublicTopic, ProductGuide>> = {
  en: {
    '': {
      label: 'Overview',
      title: 'Customer management and business messaging in one workspace',
      description: 'Explore Asra3 for manual CRM, WhatsApp campaigns, Facebook and Instagram messages, social publishing and reports. Built for business owners.',
      intro: 'Asra3 helps business owners keep customer records, connected accounts and daily communication together. Your team decides what to publish, who to contact and when to send. Start with a customer record, connect your business channels, then review the results of your work.',
      sections: [
        { title: 'Keep the customer context', body: 'Record contact details, platform identities, tags, custom fields and notes in your CRM. Track communication consent and do-not-contact preferences before preparing a campaign. Customer records are managed within your workspace.' },
        { title: 'Work across your business channels', body: 'Connect Facebook, Instagram and WhatsApp accounts with the permissions required by each platform. Handle supported conversations and comments, publish social content, and prepare WhatsApp campaigns for an audience you have reviewed. Availability depends on the account, provider and platform permissions.' },
        { title: 'Review what actually happened', body: 'Use date filters and reports to review the activity and metrics supplied by your connected channels. A missing delivery receipt or unavailable cost is shown as unavailable. It is not treated as evidence of success.' },
        { title: 'Know what is coming later', body: 'Automation, automatic replies, advertising, commerce and payment collection are coming soon. Paid upgrades and top-ups are not available for purchase. Phone purchases and messaging can incur provider charges and require spending approval; availability varies by number and country.' },
      ],
      questions: [
        { question: 'Who is Asra3 designed for?', answer: 'Business owners and teams that need a practical workspace for customer records, business conversations, social publishing and reviewed WhatsApp campaigns.' },
        { question: 'Does Asra3 replace my Facebook, Instagram or WhatsApp account?', answer: 'No. You connect eligible business accounts. Platform permissions, account status, messaging policies and provider availability still apply.' },
        { question: 'Can I read the product guide in Arabic?', answer: 'Yes. Every guide in this section has Arabic and English versions. Use the language links to open the equivalent page. Additional public translations will be added after review.' },
      ],
    },
    crm: {
      label: 'Customer CRM',
      title: 'A CRM for customer details, platform identities and consent',
      description: 'Organize contacts, platform identities, custom fields, tags, notes and communication consent in the Asra3 CRM. Preview CSV imports before saving.',
      intro: 'A useful customer record holds more than a phone number. Asra3 brings contact details and the context your team needs into a manual CRM, so the next person helping a customer can see the information your team has recorded.',
      sections: [
        { title: 'Build a customer record that fits your business', body: 'Add the contact information you know and keep platform identities with their account context. Use typed custom fields for additional business information, tags for grouping, notes for context, and status and owner fields for follow-up.', points: ['Contact details and scoped platform identities', 'Custom fields, tags, notes, status and owner', 'Communication consent, withdrawal and do-not-contact preferences'] },
        { title: 'Review imports before committing them', body: 'Import contacts from CSV through a preview. Review the mapped data and make explicit decisions about duplicates before saving. An import is not evidence that someone has agreed to receive marketing messages.' },
        { title: 'Separate contact records from permission to message', body: 'Keep consent current and record a withdrawal when a customer opts out. Campaign dispatch checks consent again before sending. A contact can remain useful for your records while being excluded from outreach.' },
        { title: 'Keep the workflow under your control', body: 'The launch CRM is managed manually. It does not promise automatic contact synchronization, automatic enrichment or triggered follow-up sequences. Review customer changes and manage the record through your workspace.' },
      ],
      questions: [
        { question: 'Can one customer have more than one platform identity?', answer: 'Yes. A contact can hold multiple scoped identities, so you can record the customer information relevant to different connected channels.' },
        { question: 'Does importing a contact automatically send a message?', answer: 'No. Importing records and sending a campaign are separate actions. Review your audience and current communication consent before sending.' },
        { question: 'Does the CRM include automations?', answer: 'Automation is coming soon. The current CRM focuses on contact records, organization, notes, imports and consent management.' },
      ],
    },
    whatsapp: {
      label: 'WhatsApp',
      title: 'WhatsApp Business conversations and reviewed campaigns',
      description: 'Connect an eligible WhatsApp Business number, manage conversations and prepare consent-based campaigns in Asra3. Review templates, audiences and results.',
      intro: 'Use Asra3 to organize manual WhatsApp work: connect a business number, handle customer conversations and prepare campaigns with a reviewed audience. A successful connection is the beginning; consent, message eligibility and provider results still govern each send.',
      sections: [
        { title: 'Choose how to connect your number', body: 'Connect an existing eligible WhatsApp Business number, or explore purchasing a provider number and then linking it. A purchased number is not automatically WhatsApp-ready. Country availability, number capability, verification and provider approval must be checked before use.' },
        { title: 'Prepare a campaign with a clear audience', body: 'Select the connected sending account and review the supported audience, message template and recipient data. Check the audience before approving or scheduling the campaign. Consent and do-not-contact preferences are checked again before dispatch.' },
        { title: 'Follow the platform messaging rules', body: 'Use free-form replies only when the platform permits them. Approved templates are required where the WhatsApp messaging rules call for them. A saved template or scheduled campaign does not override account restrictions or the customer service window.' },
        { title: 'Read results as evidence arrives', body: 'Review campaign progress and individual outcomes. Provider acceptance, delivery and read evidence are different stages. If a receipt or metric has not arrived, the report keeps it unavailable. Phone and message operations may incur provider charges and need an approved spending allocation.' },
      ],
      questions: [
        { question: 'Can I use my existing WhatsApp Business number?', answer: 'The connection flow supports existing eligible numbers. The account and number must satisfy the platform and provider requirements; availability cannot be guaranteed for every number.' },
        { question: 'Can I buy a number and connect it to WhatsApp?', answer: 'Both steps are supported in the phone workflow where the provider offers an eligible number. Purchase, verification and WhatsApp connection are separate steps, subject to approval and spending allocation.' },
        { question: 'Can I send a campaign to an imported list?', answer: 'Only use recipients you are permitted to contact. Review the imported records, consent and message requirements. Adding a phone number to the CRM does not establish consent.' },
      ],
    },
    'facebook-instagram': {
      label: 'Facebook & Instagram',
      title: 'Manage Facebook and Instagram messages, comments and publishing',
      description: 'Connect eligible Facebook and Instagram business accounts to Asra3. Review messages, comments, scheduled posts and publishing results in your workspace.',
      intro: 'Bring supported Facebook and Instagram work into one business workspace. Connect the accounts you manage, confirm the granted permissions and use the appropriate tools for conversations, comments and social publishing.',
      sections: [
        { title: 'Connect the right business account', body: 'Complete the authorization flow with an account that can manage the required business assets. Select the correct account or page and check the connection status. If permissions expire or an account becomes disconnected, reconnect it before expecting operations to succeed.' },
        { title: 'Respond with the conversation in view', body: 'Review supported Messenger and Instagram conversations and comments, then send a manual reply when the platform permits it. Available actions can differ by account type, granted permissions and conversation status. Selected messaging settings are also available for eligible accounts.' },
        { title: 'Review content before publishing', body: 'Choose the connected account, prepare the post and validate the content for the target platform. Publish immediately or schedule supported posts. Instagram formats include feed posts, Reels, carousels and Stories within the supported validation limits.' },
        { title: 'Check provider outcomes', body: 'A scheduled time or local save does not prove that a post is published. Check the publishing status and any provider error, resolve the reported issue, and confirm the outcome. Automatic replies and comment-triggered workflows are coming soon.' },
      ],
      questions: [
        { question: 'Can Asra3 manage Facebook Messenger and Instagram messages?', answer: 'It provides manual inbox tools for supported connected accounts. Messaging availability depends on platform permissions, account eligibility and conversation rules.' },
        { question: 'Why can a connected account still fail to publish or reply?', answer: 'A connection can exist while a required permission, media rule or messaging condition is not satisfied. Review the returned error and connection status before retrying.' },
        { question: 'Are automatic replies included?', answer: 'No. Automatic replies and customer automations are coming soon. Current conversations and comments are handled through manual actions.' },
      ],
    },
    reports: {
      label: 'Reports',
      title: 'Campaign and social reports based on available evidence',
      description: 'Review Asra3 campaign and social activity with date filters and CSV reports. Missing delivery, cost or engagement data stays unavailable.',
      intro: 'Reports should help you decide what to do next without making the numbers look more complete than they are. Asra3 presents the activity and metrics available from your workspace and connected providers, with explicit limits where evidence is missing.',
      sections: [
        { title: 'Choose the period you want to understand', body: 'Use the available date filters to inspect a period of activity. Keep the period and connected account consistent when comparing results, and distinguish scheduled work from work that actually ran.' },
        { title: 'Separate progress from delivery', body: 'Review campaign lifecycle and recipient outcomes alongside the provider evidence. Queued, attempted, accepted, delivered and read states have different meanings. Not every provider or account supplies every state or timestamp.' },
        { title: 'Keep missing values visible', body: 'An unavailable value is not the same as zero. Missing delivery receipts, costs or metrics remain unavailable. Reports do not manufacture revenue, attribution, return on investment or customer engagement that the connected services have not supplied.' },
        { title: 'Export the data you can verify', body: 'Use the supported CSV reports for further review. Exports follow workspace access permissions and retain the distinction between actual values and missing data. Check the report period and coverage before sharing results with a colleague or customer.' },
      ],
      questions: [
        { question: 'Why does a metric say unavailable?', answer: 'The necessary evidence may not be provided by that service, account or period, or may not have arrived yet. Asra3 does not replace missing evidence with an invented number.' },
        { question: 'Does a successful send mean the customer read the message?', answer: 'No. An accepted send, delivery confirmation and read receipt are separate events. A report can only show the evidence available for that message.' },
        { question: 'Can I export a report?', answer: 'Supported customer reports include CSV export for authorized workspace roles. Available columns and values depend on the report and source data.' },
      ],
    },
  },
  ar: {
    '': {
      label: 'نظرة عامة',
      title: 'إدارة العملاء ومحادثات الأعمال في مساحة عمل واحدة',
      description: 'تعرّف على Asra3 لإدارة العملاء وحملات واتساب ورسائل فيسبوك وإنستجرام والنشر والتقارير. أدوات عملية لأصحاب الأعمال.',
      intro: 'يساعد Asra3 أصحاب الأعمال على جمع بيانات العملاء والحسابات المتصلة والتواصل اليومي في مكان واحد. يحدد فريقك المحتوى الذي ينشره، والعملاء الذين يتواصل معهم، وموعد الإرسال. ابدأ ببيانات العميل، ثم اربط قنوات أعمالك وراجع نتائج العمل.',
      sections: [
        { title: 'احتفظ بالمعلومات التي تساعدك على خدمة العميل', body: 'سجّل بيانات الاتصال وهويات العميل على المنصات والوسوم والحقول المخصصة والملاحظات. تابع موافقة التواصل وتفضيلات عدم الاتصال قبل تجهيز أي حملة. تُدار هذه السجلات داخل مساحة عملك.' },
        { title: 'تابع العمل عبر قنواتك', body: 'اربط حسابات فيسبوك وإنستجرام وواتساب بالصلاحيات المطلوبة لكل منصة. تعامل مع المحادثات والتعليقات المدعومة، وانشر المحتوى، وجهّز حملات واتساب لجمهور راجعته. تعتمد الإتاحة على الحساب والمزود وصلاحيات المنصة.' },
        { title: 'راجع ما حدث فعلاً', body: 'استخدم فلاتر التاريخ والتقارير لمراجعة النشاط والمؤشرات التي توفرها قنواتك المتصلة. إذا لم تتوفر تكلفة أو إثبات تسليم، تظل القيمة غير متاحة ولا تتحول إلى نتيجة نجاح مفترضة.' },
        { title: 'اعرف ما سيأتي لاحقاً', body: 'الأتمتة والردود التلقائية والإعلانات والتجارة وتحصيل المدفوعات قادمة لاحقاً. شراء الترقيات وشحن الرصيد غير متاح حالياً. قد تترتب رسوم مزود على شراء الأرقام وإرسال الرسائل، وتتطلب موافقة على الإنفاق؛ وتختلف الإتاحة حسب الرقم والدولة.' },
      ],
      questions: [
        { question: 'لمن صُمم Asra3؟', answer: 'لأصحاب الأعمال والفرق التي تحتاج إلى مساحة عملية لبيانات العملاء ومحادثات الأعمال والنشر على المنصات وحملات واتساب التي يراجعها الفريق قبل الإرسال.' },
        { question: 'هل يحل Asra3 محل حسابي على فيسبوك أو إنستجرام أو واتساب؟', answer: 'لا. تربط حسابات أعمال مؤهلة، وتظل صلاحيات المنصة وحالة الحساب وسياسات المراسلة وإتاحة المزود سارية.' },
        { question: 'هل يتوفر دليل المنتج بالإنجليزية؟', answer: 'نعم. لكل دليل في هذا القسم نسخة عربية وأخرى إنجليزية. استخدم روابط اللغة لفتح الصفحة المقابلة. ستُضاف ترجمات عامة أخرى بعد مراجعتها.' },
      ],
    },
    crm: {
      label: 'إدارة العملاء',
      title: 'إدارة بيانات العملاء وهويات المنصات وموافقة التواصل',
      description: 'نظّم جهات الاتصال وهويات المنصات والحقول المخصصة والوسوم والملاحظات وموافقة التواصل في Asra3. راجع ملفات CSV قبل الاستيراد.',
      intro: 'سجل العميل المفيد يتضمن أكثر من رقم هاتف. يجمع Asra3 بيانات الاتصال والمعلومات التي يحتاجها فريقك في نظام يدوي لإدارة العملاء، حتى يتمكن الشخص الذي يتابع مع العميل من الاطلاع على ما سجّله الفريق.',
      sections: [
        { title: 'أنشئ سجل عميل يناسب عملك', body: 'أضف بيانات الاتصال المتوفرة وهويات المنصات مع سياق الحساب المرتبط بها. استخدم الحقول المخصصة لأنواع البيانات المختلفة، والوسوم للتجميع، والملاحظات للسياق، والحالة والمسؤول لتنظيم المتابعة.', points: ['بيانات الاتصال وهويات العميل على المنصات', 'حقول مخصصة ووسوم وملاحظات وحالة ومسؤول', 'موافقة التواصل وسحب الموافقة وتفضيلات عدم الاتصال'] },
        { title: 'راجع الاستيراد قبل حفظ البيانات', body: 'استورد جهات الاتصال من ملف CSV عبر خطوة معاينة. راجع ربط الحقول والبيانات، وحدد طريقة التعامل مع السجلات المكررة قبل الحفظ. استيراد السجل لا يثبت موافقة العميل على استقبال رسائل تسويقية.' },
        { title: 'افصل سجل العميل عن إذن مراسلته', body: 'حدّث موافقة التواصل وسجّل سحبها عند طلب العميل إيقاف الرسائل. تُراجع الموافقة مجدداً قبل إرسال الحملة. يمكنك الاحتفاظ بسجل مفيد للعميل مع استبعاده من التواصل التسويقي.' },
        { title: 'تحكم في خطوات العمل', body: 'إدارة العملاء في الإصدار الحالي يدوية. لا تتضمن وعداً بالمزامنة التلقائية لجهات الاتصال أو الإثراء التلقائي للبيانات أو سلاسل متابعة آلية. راجع التغييرات وأدر السجل من مساحة عملك.' },
      ],
      questions: [
        { question: 'هل يمكن تسجيل أكثر من هوية منصة للعميل نفسه؟', answer: 'نعم. يمكن أن يتضمن سجل العميل هويات متعددة مرتبطة بسياقها، لتسجيل البيانات المناسبة لقنوات التواصل المختلفة.' },
        { question: 'هل يؤدي استيراد جهة اتصال إلى إرسال رسالة تلقائياً؟', answer: 'لا. استيراد السجلات وإرسال الحملات عمليتان منفصلتان. راجع الجمهور وموافقة التواصل الحالية قبل الإرسال.' },
        { question: 'هل توجد أتمتة لإدارة العملاء؟', answer: 'الأتمتة قادمة لاحقاً. يركز الإصدار الحالي على السجلات والتنظيم والملاحظات والاستيراد وإدارة الموافقات.' },
      ],
    },
    whatsapp: {
      label: 'واتساب',
      title: 'محادثات واتساب للأعمال وحملات يراجعها فريقك',
      description: 'اربط رقم واتساب للأعمال مؤهلاً، وأدر المحادثات وجهّز الحملات في Asra3. راجع الجمهور والموافقات والقوالب والنتائج قبل المتابعة.',
      intro: 'نظّم عمل واتساب اليدوي في Asra3: اربط رقم أعمال، وتابع محادثات العملاء، وجهّز الحملات لجمهور راجعته. نجاح الربط هو البداية؛ تظل الموافقة وأهلية الرسالة ونتائج المزود عوامل تحكم كل عملية إرسال.',
      sections: [
        { title: 'اختر طريقة ربط الرقم', body: 'اربط رقم واتساب للأعمال موجوداً ومؤهلاً، أو ابحث عن رقم يتيحه المزود للشراء ثم الربط. شراء الرقم لا يعني جاهزيته التلقائية لواتساب. يجب مراجعة إتاحة الدولة وقدرات الرقم والتحقق وموافقة المزود قبل الاستخدام.' },
        { title: 'جهّز الحملة لجمهور واضح', body: 'اختر حساب الإرسال المتصل وراجع الجمهور المدعوم وقالب الرسالة وبيانات المستلمين. راجع الجمهور قبل اعتماد الحملة أو جدولتها. تُفحص موافقة التواصل وتفضيلات عدم الاتصال مجدداً قبل الإرسال.' },
        { title: 'التزم بقواعد المراسلة على المنصة', body: 'استخدم الردود الحرة عندما تسمح بها المنصة فقط، والقوالب المعتمدة عندما تتطلبها قواعد واتساب. حفظ قالب أو جدولة حملة لا يتجاوز قيود الحساب أو نافذة خدمة العملاء.' },
        { title: 'تابع النتائج عند وصول الأدلة', body: 'راجع تقدم الحملة ونتائج المستلمين. قبول المزود للرسالة وتسليمها وقراءتها مراحل مختلفة. عند غياب إيصال أو مؤشر تظل قيمته غير متاحة. قد تترتب رسوم مزود على الأرقام والرسائل، وتتطلب العمليات مخصص إنفاق معتمداً.' },
      ],
      questions: [
        { question: 'هل أستطيع استخدام رقم واتساب للأعمال الحالي؟', answer: 'يدعم مسار الربط الأرقام الحالية المؤهلة. يجب أن يستوفي الحساب والرقم شروط المنصة والمزود؛ ولا يمكن ضمان الإتاحة لكل رقم.' },
        { question: 'هل أستطيع شراء رقم ثم ربطه بواتساب؟', answer: 'يدعم مسار الأرقام الخطوتين عندما يوفر المزود رقماً مؤهلاً. الشراء والتحقق والربط بواتساب خطوات منفصلة تخضع للموافقة ومخصص الإنفاق.' },
        { question: 'هل يمكن إرسال حملة لقائمة مستوردة؟', answer: 'استخدم فقط مستلمين مسموحاً لك بالتواصل معهم. راجع السجلات والموافقة ومتطلبات الرسالة. إضافة رقم إلى نظام العملاء لا تُثبت الموافقة.' },
      ],
    },
    'facebook-instagram': {
      label: 'فيسبوك وإنستجرام',
      title: 'إدارة رسائل فيسبوك وإنستجرام والتعليقات والنشر',
      description: 'اربط حسابات فيسبوك وإنستجرام المؤهلة في Asra3. راجع رسائل ماسنجر وإنستجرام والتعليقات والمنشورات المجدولة ونتائج النشر.',
      intro: 'اجمع العمل المدعوم على فيسبوك وإنستجرام في مساحة أعمال واحدة. اربط الحسابات التي تديرها، وتأكد من الصلاحيات الممنوحة، ثم استخدم أدوات المحادثات والتعليقات والنشر المناسبة.',
      sections: [
        { title: 'اربط حساب الأعمال الصحيح', body: 'أكمل التفويض بحساب يملك صلاحية إدارة أصول الأعمال المطلوبة. اختر الحساب أو الصفحة الصحيحة وراجع حالة الاتصال. إذا انتهت صلاحية التفويض أو انقطع الاتصال، فأعد الربط قبل توقع نجاح العمليات.' },
        { title: 'رد مع الاطلاع على سياق المحادثة', body: 'راجع محادثات ماسنجر وإنستجرام والتعليقات المدعومة، وأرسل رداً يدوياً عندما تسمح المنصة. قد تختلف الإجراءات المتاحة حسب نوع الحساب والصلاحيات وحالة المحادثة. تتوفر أيضاً إعدادات مراسلة محددة للحسابات المؤهلة.' },
        { title: 'راجع المحتوى قبل النشر', body: 'اختر الحساب المتصل وجهّز المنشور وتحقق من مناسبة المحتوى للمنصة. انشر فوراً أو جدوِل المنشورات المدعومة. تشمل صيغ إنستجرام منشورات الخلاصة وريلز والمنشورات متعددة الوسائط والقصص ضمن حدود التحقق المدعومة.' },
        { title: 'تأكد من نتيجة المزود', body: 'الموعد المجدول أو الحفظ المحلي لا يثبت نشر المحتوى. راجع حالة النشر ورسالة الخطأ إن وجدت، وعالج السبب ثم تأكد من النتيجة. الردود التلقائية والإجراءات التي تبدأ من التعليقات قادمة لاحقاً.' },
      ],
      questions: [
        { question: 'هل يدعم Asra3 رسائل فيسبوك ماسنجر وإنستجرام؟', answer: 'يوفر أدوات صندوق وارد يدوية للحسابات المتصلة المدعومة. تعتمد الإتاحة على الصلاحيات وأهلية الحساب وقواعد المحادثة.' },
        { question: 'لماذا قد يفشل النشر أو الرد رغم اتصال الحساب؟', answer: 'قد يكون الحساب متصلاً مع غياب صلاحية مطلوبة أو عدم استيفاء قواعد الوسائط أو شروط المراسلة. راجع الخطأ وحالة الاتصال قبل إعادة المحاولة.' },
        { question: 'هل الردود التلقائية متاحة؟', answer: 'لا. الردود التلقائية وأتمتة التواصل قادمة لاحقاً. تُدار المحادثات والتعليقات الحالية بإجراءات يدوية.' },
      ],
    },
    reports: {
      label: 'التقارير',
      title: 'تقارير الحملات والمنصات المبنية على البيانات المتاحة',
      description: 'راجع نشاط الحملات والمنصات في Asra3 بفلاتر التاريخ وتقارير CSV. بيانات التسليم والتكلفة والتفاعل المفقودة تظل غير متاحة.',
      intro: 'ينبغي أن تساعدك التقارير على تحديد الخطوة التالية دون إظهار الأرقام بصورة أكمل من الواقع. يعرض Asra3 النشاط والمؤشرات المتاحة من مساحة عملك والمزودين المتصلين، مع توضيح حدود البيانات عند غياب الدليل.',
      sections: [
        { title: 'حدد الفترة التي تريد فهمها', body: 'استخدم فلاتر التاريخ المتاحة لمراجعة فترة من النشاط. حافظ على اتساق الفترة والحساب المتصل عند المقارنة، وميّز العمل المجدول عن العمل الذي نُفّذ بالفعل.' },
        { title: 'ميّز تقدم الحملة عن التسليم', body: 'راجع دورة حياة الحملة ونتائج المستلمين إلى جانب أدلة المزود. وجود الرسالة في الانتظار ومحاولة إرسالها وقبولها وتسليمها وقراءتها حالات مختلفة. لا يوفر كل مزود أو حساب كل الحالات أو التوقيتات.' },
        { title: 'أبقِ القيم المفقودة واضحة', body: 'القيمة غير المتاحة ليست صفراً. تظل إيصالات التسليم والتكاليف والمؤشرات المفقودة غير متاحة. لا تُنشئ التقارير إيرادات أو إسناداً تسويقياً أو عائداً على الاستثمار أو تفاعلاً لم توفره الخدمات المتصلة.' },
        { title: 'صدّر البيانات التي يمكنك مراجعتها', body: 'استخدم تقارير CSV المدعومة للمراجعة. تتبع الصادرات صلاحيات مساحة العمل وتحافظ على الفرق بين القيم الفعلية والبيانات المفقودة. راجع الفترة ونطاق البيانات قبل مشاركة النتائج مع زميل أو عميل.' },
      ],
      questions: [
        { question: 'لماذا تظهر بعض المؤشرات كغير متاحة؟', answer: 'قد لا توفر الخدمة أو الحساب البيانات المطلوبة لتلك الفترة، أو لم تصل بعد. لا يستبدل Asra3 الدليل المفقود برقم مفترض.' },
        { question: 'هل نجاح الإرسال يعني أن العميل قرأ الرسالة؟', answer: 'لا. قبول الإرسال وإثبات التسليم وإيصال القراءة أحداث منفصلة. لا يعرض التقرير إلا الدليل المتاح لتلك الرسالة.' },
        { question: 'هل يمكن تصدير تقرير؟', answer: 'تتضمن التقارير المدعومة تصدير CSV للأدوار المسموح لها داخل مساحة العمل. تعتمد الأعمدة والقيم المتاحة على التقرير ومصدر البيانات.' },
      ],
    },
  },
};
