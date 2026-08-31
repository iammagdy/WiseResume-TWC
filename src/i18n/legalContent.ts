export interface LegalSection {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalDocument {
  title: string;
  effectiveDate: string;
  intro: string;
  sections: LegalSection[];
  contactTitle: string;
  contactText: string;
  primaryContact: string;
  secondaryContact: string;
  backLabel: string;
}

export const legalContent: Record<'en' | 'ar', Record<'privacy' | 'terms' | 'refund', LegalDocument>> = {
  en: {
    privacy: {
      title: 'Privacy Policy',
      effectiveDate: 'Effective Date: February 20, 2026 · Last Updated: March 9, 2026',
      intro: 'Your privacy matters to us. This policy explains what data WiseResume collects, how we use it, how AI processing operates, and how we protect your personal information.',
      sections: [
        {
          title: 'Information We Collect',
          bullets: [
            'Account Information: Email address, display name, and language preferences created during registration.',
            'Resume and Career Content: Resumes, cover letters, portfolios, job descriptions, work history, education, and skills you upload or enter.',
            'Usage & Technical Log Data: IP address, browser type, device information, access logs, and session tokens stored via essential cookies or local storage for security and authentication.',
            'Subscription & Transaction Metadata: Subscription tier status and transaction references. Payment card details are processed directly by Paddle (Merchant of Record) and are never stored or processed directly on WiseResume servers.',
          ],
        },
        {
          title: 'How We Use Your Information',
          bullets: [
            'Deliver core features: resume building, AI writing assistance, cover letter generation, portfolio hosting, job matching, and interview practice.',
            'Process user-initiated AI feature requests to generate tailored suggestions.',
            'Maintain account security, prevent fraudulent activity, and enforce platform usage limits.',
            'Send essential service notices, email verifications, and security alerts.',
          ],
        },
        {
          title: 'AI Processing and Data Boundaries',
          bullets: [
            'User-Initiated Processing: Resume content and job descriptions are sent to AI providers only when you explicitly request an AI action.',
            'No Sale of Personal Data: WiseResume does NOT sell your personal data or resume content to third parties.',
            'No Public Model Training: Your uploaded resume content is not used by WiseResume to train public AI models.',
            'User Review Responsibility: AI-generated outputs are automated suggestions; you remain responsible for reviewing and approving all content before use.',
          ],
        },
        {
          title: 'Subprocessors and Infrastructure Partners',
          paragraphs: [
            'We work with trusted service providers to deliver WiseResume under strict data protection standards:',
          ],
          bullets: [
            'Appwrite: Managed cloud database, file storage, and authentication services.',
            'Paddle: Merchant of Record, payment processing, tax compliance, and transaction receipts.',
            'Server-Side AI Services: Secure API providers for processing user-requested AI feature inputs.',
            'Vercel: Global web hosting and content delivery network.',
          ],
        },
        {
          title: 'Data Security, Retention, and Ownership',
          paragraphs: [
            'We enforce transport encryption (TLS/HTTPS) and access controls to shield your information. Your resumes and documents remain private by default and are shared publicly only if you choose to publish a portfolio or share a public link.',
            'We retain personal information only as long as reasonably necessary to operate your account, fulfill requested services, or satisfy legal and security obligations. You can edit, export, or delete your content anytime, or request full account deletion via account settings and support channels.',
          ],
        },
        {
          title: 'Your Rights and Choices',
          bullets: [
            'Access and review your stored account and document data.',
            'Request corrections or complete export of your personal information.',
            'Delete documents or request account termination at any time.',
            'Statutory rights under applicable consumer and data protection laws are preserved.',
          ],
        },
      ],
      contactTitle: 'Privacy & Data Inquiries',
      contactText: 'Have questions about your personal data, AI disclosures, or this Privacy Policy?',
      primaryContact: 'Privacy Team',
      secondaryContact: 'Data Protection Officer',
      backLabel: 'Go back',
    },
    terms: {
      title: 'Terms of Service',
      effectiveDate: 'Effective Date: February 20, 2026 · Last Updated: March 9, 2026',
      intro: 'These Terms of Service govern your access to and use of WiseResume. By creating an account or using WiseResume, you agree to these Terms.',
      sections: [
        {
          title: 'Eligibility and Account Security',
          paragraphs: [
            'You must be at least 16 years old (or the legal age of majority in your jurisdiction) to use WiseResume. You are responsible for safeguarding your login credentials and for all activities conducted under your account.',
          ],
        },
        {
          title: 'Service Scope and AI Assistance',
          bullets: [
            'WiseResume provides digital tools for resume building, AI-assisted writing, smart job tailoring, cover letter creation, public portfolio hosting, and interview practice coaching.',
            'AI outputs are automated suggestions intended to assist your application process. They do not constitute professional career advice or hiring guarantees.',
            'You are responsible for reviewing, verifying, and editing generated text before submitting it to prospective employers. WiseResume does not guarantee interview selection, employment outcomes, or specific ATS score results.',
          ],
        },
        {
          title: 'User Content Ownership and License',
          paragraphs: [
            'You retain full ownership of all resumes, cover letters, portfolios, work history, and documents you create or upload to WiseResume.',
            'You grant WiseResume a non-exclusive, worldwide, royalty-free license solely to host, display, format, and process your content as required to operate the service for you.',
          ],
        },
        {
          title: 'Subscriptions and Pricing',
          bullets: [
            'WiseResume offers Free, Pro ($5/month), and Ultimate ($10/month) plans as detailed on our Pricing page.',
            'Paid subscriptions automatically renew each month until cancelled. You may cancel your subscription at any time via your account settings to prevent future renewal charges.',
            'Feature limits and entitlement access update immediately upon plan changes.',
          ],
        },
        {
          title: 'Merchant of Record & Payment Handling',
          paragraphs: [
            'Subscription purchases are processed through Paddle, which acts as the Merchant of Record for transactions processed via Paddle. Paddle handles order completion, payment card security, local tax compliance, and billing support.',
            'WiseResume does not store or process raw credit card numbers on its servers.',
          ],
        },
        {
          title: 'Acceptable Use Policy',
          bullets: [
            'Do not create fraudulent, deceptive, defamatory, or unlawful content.',
            'Do not reverse-engineer, scrape, breach, or disrupt WiseResume infrastructure or security controls.',
            'Do not share account credentials or access another user’s account without authorization.',
          ],
        },
        {
          title: 'Disclaimers, Liability & Mandatory Consumer Rights',
          paragraphs: [
            'WiseResume is provided "as is" and "as available". To the maximum extent permitted by applicable law, WiseResume shall not be liable for indirect, incidental, or consequential damages arising from service usage.',
            'Nothing in these Terms excludes or limits mandatory statutory consumer rights guaranteed under applicable law.',
          ],
        },
      ],
      contactTitle: 'Legal & Terms Questions',
      contactText: 'Have questions regarding these Terms or subscription policies?',
      primaryContact: 'Legal Department',
      secondaryContact: 'General Support',
      backLabel: 'Go back',
    },
    refund: {
      title: 'Refund Policy',
      effectiveDate: 'Effective Date: February 20, 2026 · Last Updated: March 9, 2026',
      intro: 'This Refund Policy describes how subscription cancellations, statutory consumer rights, and refund requests are handled for WiseResume.',
      sections: [
        {
          title: 'Merchant of Record Model',
          paragraphs: [
            'WiseResume subscription purchases are processed through Paddle as the Merchant of Record. Paddle is responsible for order processing, billing compliance, customer receipts, and processing qualified refunds in accordance with applicable consumer laws and Paddle buyer terms.',
          ],
        },
        {
          title: 'Subscription Cancellation',
          bullets: [
            'You may cancel your paid subscription (Pro or Ultimate) at any time from your account settings under the Subscription section.',
            'Upon cancellation, your subscription will remain active until the end of the current billing cycle. Cancelling stops future recurring billing.',
            'Cancelling a subscription prevents future renewals but does not automatically issue a retroactive refund for previously billed periods unless required by applicable law or Paddle buyer policy.',
          ],
        },
        {
          title: 'Refund Eligibility and Statutory Rights',
          bullets: [
            'Statutory Withdrawal Rights: Mandatory consumer cooling-off or statutory withdrawal rights guaranteed under applicable law (such as the EU/UK statutory 14-day right of withdrawal) are fully honored.',
            'Service Issues & Billing Errors: If you experience duplicate charges, technical errors preventing access to paid features, or unauthorized account activity, please contact support for prompt review.',
            'Refund Processing: Approved refunds are processed through Paddle back to the original payment method. When a refund is completed, your account access reverts to the Free tier.',
          ],
        },
        {
          title: 'How to Request Assistance',
          paragraphs: [
            'To request a refund or ask a billing question, you can contact WiseResume support using the in-app Contact form or follow the buyer support link provided on your Paddle transaction receipt.',
          ],
        },
      ],
      contactTitle: 'Billing & Refund Support',
      contactText: 'Need help with a transaction, cancellation, or refund request?',
      primaryContact: 'Billing Support',
      secondaryContact: 'Customer Care',
      backLabel: 'Go back',
    },
  },
  ar: {
    privacy: {
      title: 'سياسة الخصوصية',
      effectiveDate: 'تاريخ السريان: 20 فبراير 2026 · آخر تحديث: 9 مارس 2026',
      intro: 'خصوصيتك مهمة جداً بالنسبة لنا. توضح هذه السياسة البيانات التي تجمعها WiseResume، وكيفية استخدامها، وكيفية عمل معالجة الذكاء الاصطناعي، ووسائل حماية معلوماتك الشخصية.',
      sections: [
        {
          title: 'البيانات التي نجمعها',
          bullets: [
            'معلومات الحساب: البريد الإلكتروني، الاسم المعروض، وتفضيلات اللغة عند التسجيل.',
            'محتوى السيرة الذاتية والتطوير المهني: السير الذاتية، خطابات التقديم، معرض الأعمال، وصف الوظائف، والخبرات والمهارات التي تدخلها.',
            'بيانات الاستخدام والسجلات التقنية: عنوان IP، نوع المتصفح، معلومات الجهاز، وسجلات الوصول والرموز المحفوظة لحماية الحساب والتحقق من الهوية.',
            'بيانات الاشتراك والمعاملات: حالة خطة الاشتراك ومعرف المعاملات. تُعالج بيانات بطاقات الدفع مباشرة بواسطة Paddle بصفتها التاجر المسجل (Merchant of Record) ولا تُخزن على خوادم WiseResume.',
          ],
        },
        {
          title: 'كيفية استخدام البيانات',
          bullets: [
            'تقديم الميزات الأساسية: إنشاء السيرة الذاتية، الكتابة بالذكاء الاصطناعي، تخصيص الطلبات، استضافة الأعمال، وممارسة المقابلات.',
            'معالجة طلبات الذكاء الاصطناعي التي يطلبها المستخدم لتقديم اقتراحات مخصصة.',
            'الحفاظ على أمان الحساب ومنع الأنشطة الاحتيالية وتطبيق حدود الاستخدام.',
            'إرسال إشعارات الخدمة الأساسية، ورسائل التحقق من البريد، والتنبيهات الأمنية.',
          ],
        },
        {
          title: 'معالجة الذكاء الاصطناعي وحدود البيانات',
          bullets: [
            'المعالجة بطلب المستخدم: يُرسل المحتوى للذكاء الاصطناعي فقط عندما تطلب استخدام ميزة تعتمد عليه.',
            'عدم بيع البيانات الشخصية: لا تبيع WiseResume بياناتك الشخصية أو محتوى سيرتك الذاتية لأي طرف ثالث.',
            'عدم استخدام البيانات لتدريب النماذج العامة: لا تُستخدم مستنداتك لتدريب نماذج ذكاء اصطناعي عامة.',
            'مسؤولية مراجعة المحتوى: اقتراحات الذكاء الاصطناعي هي أدوات مساعدة؛ وتظل مسؤولاً عن مراجعة واعتتماد المحتوى قبل استخدامه.',
          ],
        },
        {
          title: 'معالجو البيانات والشركاء',
          paragraphs: [
            'نعمل مع مزودي خدمات موثوقين لتقديم الخدمة وفق أعلى معايير حماية البيانات:',
          ],
          bullets: [
            'Appwrite: قواعد البيانات السحابية، والتخزين، وإدارة الهوية والتحقق.',
            'Paddle: التاجر المسجل والمعالج المعتمد لعمليات الدفع والضرائب والإيصالات.',
            'خدمات الذكاء الاصطناعي عبر الخادم: مزودو واجهات البرمجة الآمنة لمعالجة الطلبات.',
            'Vercel: استضافة الموقع والشبكة العالمية لتوصيل المحتوى.',
          ],
        },
        {
          title: 'أمان البيانات والاحتفاظ بها والملكية',
          paragraphs: [
            'نطبق التشفير أثناء النقل (TLS/HTTPS) وضوابط الوصول لحماية معلوماتك. تظل مستنداتك خاصة افتراضياً ولا تظهر للعامة إلا إذا اخترت نشر معرض أعمالك أو مشاركة رابط عام.',
            'نحتفظ بالمعلومات الشخصية فقط للفترة اللازمة لتشغيل حسابك وتقديم الخدمات المطلوبة أو الامتثال للالتزامات القانونية والأمنية. يمكنك تعديل محتواك أو تصديره أو حذفه في أي وقت، أو طلب حذف الحساب بالكامل.',
          ],
        },
        {
          title: 'حقوقك وخياراتك',
          bullets: [
            'الوصول إلى بيانات حسابك ومستنداتك ومراجعتها.',
            'طلب تصحيح البيانات أو تصديرها بالكامل.',
            'حذف المستندات أو طلب إنهاء الحساب في أي وقت.',
            'الحقوق القانونية المضمونة بموجب قوانين حماية المستهلك والبيانات تظل محفوظة.',
          ],
        },
      ],
      contactTitle: 'الاستفسارات حول الخصوصية',
      contactText: 'هل لديك أسئلة حول بياناتك أو إفصاحات الذكاء الاصطناعي أو سياسة الخصوصية؟',
      primaryContact: 'فريق الخصوصية',
      secondaryContact: 'مسؤول حماية البيانات',
      backLabel: 'العودة',
    },
    terms: {
      title: 'شروط الخدمة',
      effectiveDate: 'تاريخ السريان: 20 فبراير 2026 · آخر تحديث: 9 مارس 2026',
      intro: 'تنظم شروط الخدمة هذه الوصول إلى WiseResume واستخدامها. بإنشاء حساب أو استخدام الخدمة، فإنك توافق على هذه الشروط.',
      sections: [
        {
          title: 'الأهلية وأمان الحساب',
          paragraphs: [
            'يجب ألا يقل عمرك عن 16 عاماً (أو سن الرشد القانوني في بلدك) لاستخدام WiseResume. أنت مسؤول عن حماية بيانات تسجيل الدخول وعن جميع الأنشطة التي تتم عبر حسابك.',
          ],
        },
        {
          title: 'نطاق الخدمة وميزات الذكاء الاصطناعي',
          bullets: [
            'توفر WiseResume أدوات رقمية لإنشاء السيرة الذاتية، والكتابة بمساعدة الذكاء الاصطناعي، وتكييف السيرة الذاتية، وإنشاء خطابات التقديم، واستضافة الأعمال، والتدريب على المقابلات.',
            'مخرجات الذكاء الاصطناعي هي اقتراحات آلية تهدف لمساعدتك ولا تُعد استشارة مهنية أو ضماناً للتوظيف.',
            'أنت مسؤول عن مراجعة المحتوى وتدقيقه قبل تقديمه لأصحاب العمل. لا تضمن WiseResume القبول في المقابلات أو نتائج التوظيف أو درجات أنظمة ATS.',
          ],
        },
        {
          title: 'ملكية المحتوى والترخيص',
          paragraphs: [
            'تحتفظ بالملكية الكاملة لجميع السير الذاتية وخطابات التقديم ومعارض الأعمال والمستندات التي تنشئها أو ترفعها على WiseResume.',
            'تمنح WiseResume ترخيصاً غير حصري وعالمياً ومعفياً من الإتاوات فقط لاستضافة المحتوى وعرضه وتنسيقه ومعالجته بالشكل اللازم لتشغيل الخدمة لك.',
          ],
        },
        {
          title: 'الاشتراكات والأسعار',
          bullets: [
            'توفر WiseResume خططاً مجانية (Free)، واحترافية (Pro - $5/شهرياً)، وشاملة (Ultimate - $10/شهرياً) كما هو موضح في صفحة الأسعار.',
            'تتجدد الاشتراكات المدفوعة تلقائياً كل شهر حتى يتم إلغاؤها. يمكنك إلغاء اشتراكك في أي وقت عبر إعدادات حسابك لمنع التجديد المستقبلي.',
            'تُحدث حدود الميزات وصلاحيات الوصول فور تغيير الخطة.',
          ],
        },
        {
          title: 'التاجر المسجل ومعالجة المدفوعات',
          paragraphs: [
            'تُعالج عمليات شراء الاشتراكات عبر Paddle بصفتها التاجر المسجل (Merchant of Record). تتولى Paddle معالجة الطلبات، وأمان بطاقات الدفع، والامتثال الضريبي المحلي، ودعم الفواتير.',
            'لا تقوم WiseResume بتخزين أو معالجة أرقام البطاقات الائتمانية على خوادمها.',
          ],
        },
        {
          title: 'سياسة الاستخدام المقبول',
          bullets: [
            'عدم إنشاء محتوى مضلل أو احتيالي أو غير قانوني.',
            'عدم محاولة الهندسة العكسية أو كشط البيانات أو تعطيل بنية الخدمة وأمانها.',
            'عدم مشاركة بيانات الدخول أو الوصول إلى حساب شخص آخر بدون تصريح.',
          ],
        },
        {
          title: 'إخلاء المسؤولية والحقوق القانونية للمستهلك',
          paragraphs: [
            'تُقدم WiseResume "كما هي" و"حسب التوفر". وإلى الحد الأقصى الذي يسمح به القانون، لا تكون WiseResume مسؤولة عن أي أضرار غير مباشرة أو عرضية.',
            'لا شيء في هذه الشروط يستبعد أو يقلل من الحقوق القانونية الإلزامية للمستهلك بموجب القوانين المعمول بها.',
          ],
        },
      ],
      contactTitle: 'الاستفسارات القانونية',
      contactText: 'هل لديك سؤال حول شروط الخدمة أو سياسات الاشتراك؟',
      primaryContact: 'القسم القانوني',
      secondaryContact: 'الدعم العام',
      backLabel: 'العودة',
    },
    refund: {
      title: 'سياسة الاسترداد',
      effectiveDate: 'تاريخ السريان: 20 فبراير 2026 · آخر تحديث: 9 مارس 2026',
      intro: 'توضح سياسة الاسترداد هذه كيفية التعامل مع إلغاء الاشتراكات، والحقوق القانونية للمستهلك، وطلبات الاسترداد في WiseResume.',
      sections: [
        {
          title: 'نموذج التاجر المسجل (Merchant of Record)',
          paragraphs: [
            'تتم عمليات شراء الاشتراكات في WiseResume عبر Paddle بصفتها التاجر المسجل. تتولى Paddle معالجة الطلبات والامتثال المالي وإيصالات الشراء ومعالجة طلبات الاسترداد المؤهلة وفقاً للقوانين وشروط المشتري لدى Paddle.',
          ],
        },
        {
          title: 'إلغاء الاشتراك',
          bullets: [
            'يمكنك إلغاء اشتراكك المدفوع (Pro أو Ultimate) في أي وقت من إعدادات حسابك في قسم الاشتراك.',
            'عند الإلغاء، يظل اشتراكك نشطاً حتى نهاية فترة الفوترة الحالية. يوقف الإلغاء الفواتير التلقائية المستقبلية.',
            'إلغاء الاشتراك يمنع التجديد المستقبلي ولكنه لا يصدر استرداداً تلقائياً للفترات المسددة سابقاً إلا إذا نص القانون أو سياسة Paddle على خلاف ذلك.',
          ],
        },
        {
          title: 'أهلية الاسترداد والحقوق القانونية',
          bullets: [
            'الحقوق القانونية في الانسحاب: يُحترم حق الانسحاب القانوني للمستهلك (مثل فترة الانسحاب البالغة 14 يوماً بموجب قوانين الاتحاد الأوروبي والمملكة المتحدة عند تطبيقها).',
            'مشاكل الخدمة وأخطاء الفوترة: في حال حدوث دفع مكرر أو خطأ تقني يمنع الوصول للميزات المدفوعة، يرجى التواصل مع الدعم للمراجعة الفورية.',
            'طريقة الاسترداد: تُعالج طلبات الاسترداد المقبولة عبر Paddle بنفس طريقة الدفع الأصلية. وعند اكتمال الاسترداد، تعود الخطة إلى الفئة المجانية.',
          ],
        },
        {
          title: 'كيفية طلب المساعدة',
          paragraphs: [
            'لطلب استرداد أو الاستفسار عن عملية دفع، يمكنك التواصل مع دعم WiseResume من خلال نموذج التواصل داخل التطبيق أو من خلال رابط الدعم الموجود في إيصال الشراء من Paddle.',
          ],
        },
      ],
      contactTitle: 'دعم الفواتير والاسترداد',
      contactText: 'هل تحتاج إلى مساعدة بشأن معاملة مالية أو طلب إلغاء أو استرداد؟',
      primaryContact: 'دعم الفواتير',
      secondaryContact: 'رعاية العملاء',
      backLabel: 'العودة',
    },
  },
};
