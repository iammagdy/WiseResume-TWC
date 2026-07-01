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

export const legalContent: Record<'en' | 'ar', Record<'privacy' | 'terms', LegalDocument>> = {
  en: {
    privacy: {
      title: 'Privacy Policy',
      effectiveDate: 'Effective Date: February 20, 2026 · Last Updated: March 9, 2026',
      intro: 'Your privacy matters to us. This policy explains what data WiseResume collects, how we use it, and how we keep it safe.',
      sections: [
        { title: 'What We Collect', bullets: ['Account information such as your email and display name.', 'Resumes, cover letters, portfolios, and other content you create.', 'Aggregated usage data and device information used for compatibility and security.'] },
        { title: 'How We Use It', bullets: ['Provide resume building, AI writing, interview preparation, job matching, and portfolio features.', 'Keep your account secure and send essential service messages.', 'Improve the product using aggregated insights.'] },
        { title: 'AI and Your Data', bullets: ['Content is sent to AI services only when you request an AI feature.', 'Your content is not sold or used by WiseResume to train public AI models.', 'You remain responsible for reviewing generated suggestions.'] },
        { title: 'Security and Sharing', paragraphs: ['We use access controls and encrypted connections to protect your information. Your documents are private by default and become public only when you choose to share or publish them.'] },
        { title: 'Your Rights', bullets: ['Access and correct your information.', 'Export your data.', 'Delete content or request account deletion through supported settings and support channels.'] },
      ],
      contactTitle: 'Contact Our Team', contactText: 'Questions about your data or this policy?', primaryContact: 'Privacy Team', secondaryContact: 'Data Protection', backLabel: 'Go back',
    },
    terms: {
      title: 'Terms of Service',
      effectiveDate: 'Effective Date: February 20, 2026 · Last Updated: March 9, 2026',
      intro: 'These Terms govern your use of WiseResume. By creating an account or using the service, you agree to these Terms.',
      sections: [
        { title: 'Eligibility and Your Account', paragraphs: ['You must be at least 16 years old. You are responsible for your credentials and activity under your account.'] },
        { title: 'Your Content', paragraphs: ['You retain ownership of resumes, cover letters, portfolios, and other content you create. You grant us only the permission required to operate the service.'] },
        { title: 'AI Features', bullets: ['AI output is a suggestion, not professional advice.', 'Review and approve generated content before using it.', 'We cannot guarantee that every output is complete or suitable for every situation.'] },
        { title: 'Acceptable Use', bullets: ['Do not create unlawful, deceptive, or harmful content.', 'Do not reverse-engineer, scrape, disrupt, or misuse the service.', 'Do not access another person’s account or data.'] },
        { title: 'Plans and Liability', paragraphs: ['Paid plans, when offered, follow the terms shown at purchase. WiseResume is provided as available, subject to applicable law and the limitations described in these Terms.'] },
      ],
      contactTitle: 'Legal Help', contactText: 'Have a question about these Terms?', primaryContact: 'Legal Department', secondaryContact: 'General Support', backLabel: 'Go back',
    },
  },
  ar: {
    privacy: {
      title: 'سياسة الخصوصية',
      effectiveDate: 'تاريخ السريان: 20 فبراير 2026 · آخر تحديث: 9 مارس 2026',
      intro: 'خصوصيتك مهمة لنا. توضح هذه السياسة البيانات التي تجمعها WiseResume وكيف نستخدمها ونحميها.',
      sections: [
        { title: 'البيانات التي نجمعها', bullets: ['معلومات الحساب مثل البريد الإلكتروني والاسم المعروض.', 'السير الذاتية وخطابات التقديم ومعارض الأعمال والمحتوى الذي تنشئه.', 'بيانات استخدام مجمعة ومعلومات الجهاز اللازمة للتوافق والأمان.'] },
        { title: 'كيف نستخدم البيانات', bullets: ['تقديم أدوات إنشاء السيرة الذاتية والكتابة بالذكاء الاصطناعي والاستعداد للمقابلات ومطابقة الوظائف ومعرض الأعمال.', 'حماية حسابك وإرسال رسائل الخدمة الأساسية.', 'تحسين المنتج بالاعتماد على معلومات مجمعة.'] },
        { title: 'الذكاء الاصطناعي وبياناتك', bullets: ['يُرسل المحتوى إلى خدمات الذكاء الاصطناعي فقط عندما تطلب استخدام ميزة تعتمد عليه.', 'لا تبيع WiseResume محتواك ولا تستخدمه لتدريب نماذج ذكاء اصطناعي عامة.', 'تظل مسؤولاً عن مراجعة الاقتراحات التي يتم إنشاؤها.'] },
        { title: 'الأمان والمشاركة', paragraphs: ['نستخدم ضوابط الوصول والاتصالات المشفرة لحماية معلوماتك. تكون مستنداتك خاصة افتراضياً ولا تصبح عامة إلا عندما تختار مشاركتها أو نشرها.'] },
        { title: 'حقوقك', bullets: ['الوصول إلى معلوماتك وتصحيحها.', 'تصدير بياناتك.', 'حذف المحتوى أو طلب حذف الحساب من خلال الإعدادات وقنوات الدعم المتاحة.'] },
      ],
      contactTitle: 'تواصل مع فريقنا', contactText: 'هل لديك سؤال حول بياناتك أو هذه السياسة؟', primaryContact: 'فريق الخصوصية', secondaryContact: 'حماية البيانات', backLabel: 'العودة',
    },
    terms: {
      title: 'شروط الخدمة',
      effectiveDate: 'تاريخ السريان: 20 فبراير 2026 · آخر تحديث: 9 مارس 2026',
      intro: 'تنظم هذه الشروط استخدامك لخدمة WiseResume. بإنشاء حساب أو استخدام الخدمة فإنك توافق على هذه الشروط.',
      sections: [
        { title: 'الأهلية وحسابك', paragraphs: ['يجب ألا يقل عمرك عن 16 عاماً. أنت مسؤول عن حماية بيانات تسجيل الدخول وعن النشاط الذي يتم من خلال حسابك.'] },
        { title: 'المحتوى الخاص بك', paragraphs: ['تحتفظ بملكية السير الذاتية وخطابات التقديم ومعارض الأعمال وأي محتوى تنشئه. وتمنحنا فقط الصلاحية اللازمة لتشغيل الخدمة.'] },
        { title: 'ميزات الذكاء الاصطناعي', bullets: ['المخرجات التي ينشئها الذكاء الاصطناعي هي اقتراحات وليست استشارة مهنية.', 'يجب مراجعة المحتوى والموافقة عليه قبل استخدامه.', 'لا نضمن أن تكون كل نتيجة كاملة أو مناسبة لكل حالة.'] },
        { title: 'الاستخدام المقبول', bullets: ['لا تنشئ محتوى غير قانوني أو مضللاً أو ضاراً.', 'لا تحاول الهندسة العكسية أو جمع البيانات آلياً أو تعطيل الخدمة أو إساءة استخدامها.', 'لا تصل إلى حساب أو بيانات شخص آخر.'] },
        { title: 'الخطط والمسؤولية', paragraphs: ['تخضع الخطط المدفوعة، عند توفرها، للشروط المعروضة وقت الشراء. تُقدم WiseResume حسب توفرها ووفقاً للقانون المعمول به وحدود المسؤولية الموضحة في هذه الشروط.'] },
      ],
      contactTitle: 'المساعدة القانونية', contactText: 'هل لديك سؤال حول شروط الخدمة؟', primaryContact: 'القسم القانوني', secondaryContact: 'الدعم العام', backLabel: 'العودة',
    },
  },
};
