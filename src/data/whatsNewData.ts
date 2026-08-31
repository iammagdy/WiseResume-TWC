import {
  Sparkles,
  Shield,
  Zap,
  Globe,
  BarChart3,
  Mic,
  FileText,
  Bot,
  Wand2,
  Target,
  Star,
  Gauge,
  BookOpen,
  QrCode,
  Trophy,
  Layers,
  PenLine,
  Palette,
  Wrench,
  Briefcase,
  Lock,
  FileCheck,
  CreditCard,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import React from 'react';

export type ReleaseCategory =
  | 'all'
  | 'features'
  | 'ai'
  | 'jobs'
  | 'resume'
  | 'security'
  | 'improvements';

export interface ReleaseUpdate {
  id: string;
  date: string;
  monthYear: string;
  year: number;
  category: ReleaseCategory;
  categoryLabel: {
    en: string;
    ar: string;
  };
  categoryBg: string;
  categoryText: string;
  iconBg: string;
  icon: React.ElementType;
  title: {
    en: string;
    ar: string;
  };
  description: {
    en: string;
    ar: string;
  };
  highlights: {
    en: string[];
    ar: string[];
  };
  featured?: boolean;
}

export const CATEGORY_FILTERS: { id: ReleaseCategory; label: { en: string; ar: string } }[] = [
  { id: 'all', label: { en: 'All Updates', ar: 'جميع التحديثات' } },
  { id: 'features', label: { en: 'New Features', ar: 'ميزات جديدة' } },
  { id: 'ai', label: { en: 'AI & Tailoring', ar: 'الذكاء الاصطناعي والتخصيص' } },
  { id: 'jobs', label: { en: 'Jobs & Career', ar: 'الوظائف والمهنة' } },
  { id: 'resume', label: { en: 'Resume & Portfolio', ar: 'السيرة والملف الشخصي' } },
  { id: 'security', label: { en: 'Security & Legal', ar: 'الأمان والقوانين' } },
  { id: 'improvements', label: { en: 'Improvements & Fixes', ar: 'تحسينات وإصلاحات' } },
];

export const MONTH_GROUPS = [
  { id: 'august-2026', label: { en: 'August 2026', ar: 'أغسطس 2026' } },
  { id: 'july-2026', label: { en: 'July 2026', ar: 'يوليو 2026' } },
  { id: 'june-2026', label: { en: 'June 2026', ar: 'يونيو 2026' } },
  { id: 'may-2026', label: { en: 'May 2026', ar: 'مايو 2026' } },
  { id: 'april-2026', label: { en: 'April 2026', ar: 'أبريل 2026' } },
  { id: 'older', label: { en: 'Older Updates', ar: 'تحديثات أقدم' } },
];

export const whatsNewReleases: ReleaseUpdate[] = [
  // ── August 2026 ─────────────────────────────────────────────
  {
    id: 'aug-2026-paddle-legal',
    date: 'August 2026',
    monthYear: 'august-2026',
    year: 2026,
    category: 'security',
    categoryLabel: { en: 'Security & Legal', ar: 'الأمان والقوانين' },
    categoryBg: 'bg-emerald-500/10',
    categoryText: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-500/15',
    icon: FileCheck,
    featured: true,
    title: {
      en: 'Updated Legal Transparency & Merchant Compliance',
      ar: 'شفافية قانونية محدثة وتوافق التجارة',
    },
    description: {
      en: 'We completely audited and updated our Terms of Service, Privacy Policy, and Refund Policy to align with global merchant requirements and statutory consumer protection rules.',
      ar: 'قمنا بمراجعة وتحديث شروط الخدمة وسياسة الخصوصية وسياسة الاسترداد لتتوافق مع المعايير العالمية وحماية المستهلك.',
    },
    highlights: {
      en: [
        'Updated Privacy, Terms, and Refund policies with clear August 2026 compliance definitions',
        'Explicit disclosures for Merchant of Record billing and statutory withdrawal rights',
        'Direct footer accessibility to legal policies in both English LTR and Arabic RTL',
      ],
      ar: [
        'تحديث سياسات الخصوصية والشروط والاسترداد بتعريفات قانونية محدثة لأغسطس 2026',
        'إفصاحات واضحة لعمليات الفوترة وحقوق الانسحاب القانونية للمستهلك',
        'وصول مباشر في أسفل الصفحة للسياسات القانونية باللغتين العربية والإنجليزيّة',
      ],
    },
  },
  {
    id: 'aug-2026-ultimate-plan',
    date: 'August 2026',
    monthYear: 'august-2026',
    year: 2026,
    category: 'features',
    categoryLabel: { en: 'New Features', ar: 'ميزات جديدة' },
    categoryBg: 'bg-violet-500/10',
    categoryText: 'text-violet-600 dark:text-violet-400',
    iconBg: 'bg-violet-500/15',
    icon: CreditCard,
    title: {
      en: 'Standardized Plan Tiering & Ultimate Membership',
      ar: 'توحيد مستويات الاشتراكات واشتراك Ultimate',
    },
    description: {
      en: 'We refined our membership structure across the entire app. Tier names and subscription benefits have been standardized across mobile and desktop interfaces.',
      ar: 'قمنا بتحسين هيكل العضويات عبر التطبيق. تم توحيد مسميات خطط الاشتراك ومزاياها عبر كافة الشاشات والهواتف.',
    },
    highlights: {
      en: [
        'Renamed top tier to Ultimate for clearer feature distinction and localized badges',
        'Transparent Test Mode & Sandbox disclosures on pricing and checkout surfaces',
        'Bilingual English and Arabic subscription interfaces for all users',
      ],
      ar: [
        'تسمية الخطة الأعلى باسم Ultimate لتميز أعلى مع شارات مخصصة باللغة العربية',
        'إفصاحات واضحة لنموذج التجربة على صفحة الأسعار ودفع الاشتراكات',
        'واجهات اشتراكات ثنائية اللغة بالكامل باللغتين العربية والإنجليزيّة',
      ],
    },
  },

  // ── July 2026 ───────────────────────────────────────────────
  {
    id: 'jul-2026-portfolio-protection',
    date: 'July 2026',
    monthYear: 'july-2026',
    year: 2026,
    category: 'security',
    categoryLabel: { en: 'Security & Legal', ar: 'الأمان والقوانين' },
    categoryBg: 'bg-emerald-500/10',
    categoryText: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-500/15',
    icon: Lock,
    title: {
      en: 'Public Portfolio Scrape & Abuse Protection',
      ar: 'حماية الملفات الشخصية العامة من الجمع الآلي',
    },
    description: {
      en: 'Enhanced protective measures for your public portfolio pages, safeguarding contact info and preventing automated rate abuse without affecting human visitors.',
      ar: 'تعزيز وسائل الحماية لصفحات الملفات الشخصية العامة لحماية بيانات الاتصال ومنع الجمع الآلي غير المصرح به.',
    },
    highlights: {
      en: [
        'Protected public contact details against casual automated collection scripts',
        'Applied validation rate limits to public interactions and share links',
        'Hardened document-level permissions for all stored resume documents',
      ],
      ar: [
        'حماية بيانات الاتصال العامة من برامج التجميع الآلي العشوائية',
        'تطبيق قيود حماية وتأكيد على التفاعلات العامة وروابط المشاركة',
        'تعزيز صلاحيات وتشفير مستندات السيرة الذاتية المخزنة',
      ],
    },
  },
  {
    id: 'jul-2026-pdf-export-layout',
    date: 'July 2026',
    monthYear: 'july-2026',
    year: 2026,
    category: 'improvements',
    categoryLabel: { en: 'Improvements & Fixes', ar: 'تحسينات وإصلاحات' },
    categoryBg: 'bg-cyan-500/10',
    categoryText: 'text-cyan-600 dark:text-cyan-400',
    iconBg: 'bg-cyan-500/15',
    icon: Wrench,
    title: {
      en: 'Clean PDF Export Page-Break Boundaries',
      ar: 'تحسين الفواصل بين صفحات تصدير الـ PDF',
    },
    description: {
      en: 'We upgraded the PDF export engine so resume sections flow naturally across page breaks without awkwardly splitting section headings or bullet lists.',
      ar: 'قمنا بتطوير محرك تصدير الـ PDF لضمان تدفق أقسام السيرة الذاتية بشكل طبيعي بين الصفحات دون قطع العناوين أو النقاط.',
    },
    highlights: {
      en: [
        'Section headers now stay glued to their supporting text content',
        'Improved print margin alignment across all professional resume templates',
        'Consistent font rendering across light and dark export options',
      ],
      ar: [
        'بقاء عناوين الأقسام متصلة بالنصوص التابعة لها دون انفصال',
        'تحسين محاذاة الهوامش لكافة قوالب السيرة الذاتية الاحترافية',
        'عرض وتنسيق متناسق للخطوط عند التصدير بنمطي الإضاءة والظلام',
      ],
    },
  },

  // ── June 2026 ───────────────────────────────────────────────
  {
    id: 'jun-2026-remote-jobs',
    date: 'June 2026',
    monthYear: 'june-2026',
    year: 2026,
    category: 'jobs',
    categoryLabel: { en: 'Jobs & Career', ar: 'الوظائف والمهنة' },
    categoryBg: 'bg-blue-500/10',
    categoryText: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-500/15',
    icon: Briefcase,
    title: {
      en: 'Remote Jobs Feed Integrated into Workspace',
      ar: 'خلاصة الوظائف عن بُعد داخل مساحة العمل',
    },
    description: {
      en: 'Explore relevant remote career opportunities right from your WiseResume dashboard and seamlessly tailor your resume to match the position.',
      ar: 'استكشف الفرص الوظيفية عن بُعد مباشرة من لوحة تحكم WiseResume وقم بتكييف سيرتك الذاتية بسهولة.',
    },
    highlights: {
      en: [
        'Dedicated Remote Jobs tab to browse active listings across tech and business roles',
        'One-click transition from job description to AI resume tailoring',
        'Track targeted positions directly in your Application Tracker board',
      ],
      ar: [
        'تبويب مخصص للوظائف عن بُعد لتصفح الوظائف المتاحة في التقنية والأعمال',
        'الانتقال بنقرة واحدة من الوصف الوظيفي إلى تخصيص السيرة بالذكاء الاصطناعي',
        'تتبع الوظائف المستهدفة مباشرة في لوحة متابعة الطلبات',
      ],
    },
  },
  {
    id: 'jun-2026-ai-receipts',
    date: 'June 2026',
    monthYear: 'june-2026',
    year: 2026,
    category: 'ai',
    categoryLabel: { en: 'AI & Tailoring', ar: 'الذكاء الاصطناعي والتخصيص' },
    categoryBg: 'bg-indigo-500/10',
    categoryText: 'text-indigo-600 dark:text-indigo-400',
    iconBg: 'bg-indigo-500/15',
    icon: Bot,
    title: {
      en: 'Transparent AI Quota Tracking & Direct Settings Fallback',
      ar: 'تتبع كوتا الذكاء الاصطناعي وتنبيهات الإعدادات',
    },
    description: {
      en: 'Improved clarity around AI generation limits with automatic retries on temporary network drops and clean setup guidance when credentials need updating.',
      ar: 'تحسين وضوح حدود التوليد بالذكاء الاصطناعي مع إعادة المحاولة التلقائية عند انقطاع الشبكة وإرشاد مباشر للإعدادات.',
    },
    highlights: {
      en: [
        'Clear indicator when AI configuration requires setup, including an "Open Settings" shortcut',
        'Automatic retry logic for transient network or service provider delays',
        'Transparent daily credit usage counters across dashboard surfaces',
      ],
      ar: [
        'تنبيه واضح عند الحاجة لضبط الذكاء الاصطناعي مع زر مباشر لفتح الإعدادات',
        'منطق إعادة المحاولة التلقائي عند التأخير العابر في الاتصال',
        'عداد شفاف لاستخدام الرصيد اليومي عبر شاشات مساحة العمل',
      ],
    },
  },

  // ── May 2026 ────────────────────────────────────────────────
  {
    id: 'may-2026-portfolio-ai-assistant',
    date: 'May 2026',
    monthYear: 'may-2026',
    year: 2026,
    category: 'resume',
    categoryLabel: { en: 'Resume & Portfolio', ar: 'السيرة والملف الشخصي' },
    categoryBg: 'bg-teal-500/10',
    categoryText: 'text-teal-600 dark:text-teal-400',
    iconBg: 'bg-teal-500/15',
    icon: Globe,
    title: {
      en: 'Public Portfolio Visitor AI Assistant & Fast Loading Skeletons',
      ar: 'مساعد الزوار الذكي بالملف الشخصي وشاشات التحميل السريعة',
    },
    description: {
      en: 'Visitors to your public portfolio page can now interact with an AI assistant grounded in your published details, while skeleton states ensure instant visual response.',
      ar: 'يمكن لزوار ملفك الشخصي العام الآن التفاعل مع مساعد ذكي يستند لمعلوماتك المنشورة مع شاشات تحميل فورية.',
    },
    highlights: {
      en: [
        'Visitors can ask questions about your published background and skills',
        'Share loading skeleton screens prevent blank flashes when opening public portfolios',
        'Real-time view counters on your portfolio management dashboard',
      ],
      ar: [
        'يمكن للزوار طرح أسئلة حول مهاراتك وخبرتك المنشورة في الملف',
        'شاشات تحضير التحميل تمنع ظهور شاشات فارغة أثناء فتح الملف الشخصي',
        'عداد زيارات مباشر داخل لوحة إدارة ملفك الشخصي',
      ],
    },
  },
  {
    id: 'may-2026-onboarding-auth',
    date: 'May 2026',
    monthYear: 'may-2026',
    year: 2026,
    category: 'improvements',
    categoryLabel: { en: 'Improvements & Fixes', ar: 'تحسينات وإصلاحات' },
    categoryBg: 'bg-sky-500/10',
    categoryText: 'text-sky-600 dark:text-sky-400',
    iconBg: 'bg-sky-500/15',
    icon: UserCheck,
    title: {
      en: 'Streamlined Onboarding & Authentication Delivery',
      ar: 'تبسيط التسجيل والتحقق من الحساب',
    },
    description: {
      en: 'We refined account creation and email verification flows to make getting started on WiseResume faster and more reliable.',
      ar: 'قمنا بتحسين خطوات إنشاء الحساب وتأكيد البريد الإلكتروني لجعل البدء في استخدام WiseResume أسرع وأكثر موثوقية.',
    },
    highlights: {
      en: [
        'One-tap Google OAuth sign-in and direct email verification links',
        'Session persistence keeps you logged in across browser restarts',
        'Clear error categorization on authentication screens',
      ],
      ar: [
        'تسجيل الدخول بنقرة واحدة عبر Google ورابط تأكيد مباشر للبريد',
        'استمرار الجلسة لتسجيل الدخول التلقائي عند فتح المتصفح',
        'تصنيف واضح وتوجيه لطيف عند حدوث أي خطأ في تسجيل الدخول',
      ],
    },
  },

  // ── April 2026 ──────────────────────────────────────────────
  {
    id: 'apr-2026-examples-gallery',
    date: 'April 2026',
    monthYear: 'april-2026',
    year: 2026,
    category: 'features',
    categoryLabel: { en: 'New Features', ar: 'ميزات جديدة' },
    categoryBg: 'bg-violet-500/10',
    categoryText: 'text-violet-600 dark:text-violet-400',
    iconBg: 'bg-violet-500/15',
    icon: BookOpen,
    title: {
      en: 'Browse Practical Resume Examples Gallery',
      ar: 'مكتبة نماذج السيرة الذاتية العملية',
    },
    description: {
      en: 'Compare curated sample resumes across multiple industries and job levels to inspire your structure before drafting.',
      ar: 'قارن بين نماذج سير ذاتية مخصصة لمختلف المجالات والمستويات المهنية لاستلهام الهيكل المناسب.',
    },
    highlights: {
      en: [
        'Browse sample resumes grouped by role and industry',
        'Inspect structural patterns for work history and technical skills',
        'Use any example layout as a starting reference in the editor',
      ],
      ar: [
        'تصفح نماذج سير ذاتية مقسمة حسب المسمى الوظيفي والمجال',
        'استكشف التنسيقات المناسبة لعرض الخبرات والمهارات التقنية',
        'استخدم أي نموذج كمصدر إلهام لبناء سيرتك الذاتية',
      ],
    },
  },

  // ── March 2026 ──────────────────────────────────────────────
  {
    id: 'mar-2026-interview-coach',
    date: 'March 2026',
    monthYear: 'older',
    year: 2026,
    category: 'ai',
    categoryLabel: { en: 'AI & Tailoring', ar: 'الذكاء الاصطناعي والتخصيص' },
    categoryBg: 'bg-orange-500/10',
    categoryText: 'text-orange-600 dark:text-orange-400',
    iconBg: 'bg-orange-500/15',
    icon: Mic,
    title: {
      en: 'Practice Interviews Out Loud with Voice Coach',
      ar: 'التدريب على المقابلات الشخصية بالصوت',
    },
    description: {
      en: 'Practice your interview responses out loud. Our Interview Coach listens to your spoken answers and offers structured feedback for improvement.',
      ar: 'تدرب على إجابات المقابلات بصوتك. يستمع مدرب المقابلات الذكي لإجاباتك ويقدم ملاحظات منظمة للتحسين.',
    },
    highlights: {
      en: [
        'Speak answers naturally using microphone input',
        'Receive actionable tips on answer structure and key points',
        'Review past practice sessions directly in your workspace',
      ],
      ar: [
        'تحدث بإجاباتك بشكل طبيعي عبر الميكروفون',
        'احصل على نصائح عملية حول ترتيب الإجابة والنقاط الرئيسية',
        'مراجعة جلسات التدريب السابقة مباشرة من مساحة العمل',
      ],
    },
  },
  {
    id: 'mar-2026-app-tracker',
    date: 'March 2026',
    monthYear: 'older',
    year: 2026,
    category: 'jobs',
    categoryLabel: { en: 'Jobs & Career', ar: 'الوظائف والمهنة' },
    categoryBg: 'bg-indigo-500/10',
    categoryText: 'text-indigo-600 dark:text-indigo-400',
    iconBg: 'bg-indigo-500/15',
    icon: FileText,
    title: {
      en: 'Application Tracker Board',
      ar: 'لوحة تتبع طلبات التوظيف',
    },
    description: {
      en: 'Organize your job hunt with a visual kanban board tracking every application stage from saved to offer.',
      ar: 'نظّم رحلة البحث عن عمل عبر لوحة بصرية لتتبع مراحل تقديم الطلبات من الحفظ إلى العرض.',
    },
    highlights: {
      en: [
        'Visual columns for Saved, Applied, Interviewing, and Offered',
        'Attach custom notes and tailored resume versions to each application',
        'Single dashboard view for your job search progress',
      ],
      ar: [
        'أعمدة بصرية تمثل: المحفوظة، التقديم، المقابلة، والعرض الوظيفي',
        'ربط الملاحظات والنسخ المخصصة من السيرة الذاتية بكل طلب',
        'شاشة موحدة لمتابعة تقدم طلبات التوظيف الخاصة بك',
      ],
    },
  },

  // ── January 2026 ────────────────────────────────────────────
  {
    id: 'jan-2026-qr-code',
    date: 'January 2026',
    monthYear: 'older',
    year: 2026,
    category: 'resume',
    categoryLabel: { en: 'Resume & Portfolio', ar: 'السيرة والملف الشخصي' },
    categoryBg: 'bg-amber-500/10',
    categoryText: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-500/15',
    icon: QrCode,
    title: {
      en: 'Share Your Resume with a QR Code',
      ar: 'مشاركة السيرة الذاتية عبر رمز QR',
    },
    description: {
      en: 'Generate a clean scannable QR code linking to your online portfolio or PDF resume for networking events or printed cards.',
      ar: 'قم بإنشاء رمز QR قابل للمسح يربط بملفك الشخصي الإلكتروني أو سريتك الذاتية للمناسبات المهنية.',
    },
    highlights: {
      en: [
        'Instant QR code generation for any resume or portfolio link',
        'Download high-resolution image for print materials',
        'Direct link to your live portfolio site',
      ],
      ar: [
        'توليد فوري لرمز QR لأي رابط سيرة ذاتية أو ملف شخصي',
        'تحميل صورة عالية الدقة لاستخدامها في الطباعة',
        'ربط مباشر بصفحة ملفك الشخصي الإلكتروني',
      ],
    },
  },

  // ── October 2025 ────────────────────────────────────────────
  {
    id: 'oct-2025-launch',
    date: 'October 2025',
    monthYear: 'older',
    year: 2025,
    category: 'features',
    categoryLabel: { en: 'New Features', ar: 'ميزات جديدة' },
    categoryBg: 'bg-primary/10',
    categoryText: 'text-primary',
    iconBg: 'bg-primary/15',
    icon: Sparkles,
    title: {
      en: 'WiseResume Official Release',
      ar: 'الإطلاق الرسمي لـ WiseResume',
    },
    description: {
      en: 'Build, tailor, and refine your resume with AI assistance, match your experience against job requirements, and export clean PDFs.',
      ar: 'أنشئ وخصص وطور سيرتك الذاتية بمساعدة الذكاء الاصطناعي، وقارن خبراتك مع متطلبات الوظائف، وصدّر ملفات PDF منسقة.',
    },
    highlights: {
      en: [
        'Structured resume builder with real-time preview',
        'AI writing and section tailoring suggestions',
        'Multiple exportable professional PDF styles',
      ],
      ar: [
        'مُنشئ سير ذاتية منظم مع معاينة فورية',
        'اقتراحات تحسين وتخصيص بالذكاء الاصطناعي',
        'أنماط قوالب متعددة وتصدير ملفات PDF احترافية',
      ],
    },
  },
];

export const COMING_SOON_ITEMS = [
  {
    icon: Globe,
    iconBg: 'bg-emerald-500/10',
    title: { en: 'Expanded International Portfolios', ar: 'ملفات شخصية متعددة اللغات' },
    description: {
      en: 'Enhanced multi-language portfolio sharing for global applications.',
      ar: 'تحسين مشاركة الملفات الشخصية متعددة اللغات للفرص العالمية.',
    },
  },
  {
    icon: Sparkles,
    iconBg: 'bg-amber-500/10',
    title: { en: 'Smart Application Assistant', ar: 'مساعد التقديم الذكي' },
    description: {
      en: 'Streamlined autofill assistance when organizing job applications.',
      ar: 'مساعدة ذكية لتسريع عملية تنظيم وتعبئة الطلبات.',
    },
  },
];
