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
  { id: 'april-2026', label: { en: 'April 2026', ar: 'أبريل 2026' } },
  { id: 'march-2026', label: { en: 'March 2026', ar: 'مارس 2026' } },
  { id: 'older', label: { en: 'Older Updates', ar: 'تحديثات أقدم' } },
];

export const whatsNewReleases: ReleaseUpdate[] = [
  // ── August 2026 ─────────────────────────────────────────────
  {
    id: 'aug-2026-remote-jobs',
    date: 'August 2026',
    monthYear: 'august-2026',
    year: 2026,
    category: 'jobs',
    categoryLabel: { en: 'Jobs & Career', ar: 'الوظائف والمهنة' },
    categoryBg: 'bg-blue-500/10',
    categoryText: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-500/15',
    icon: Briefcase,
    featured: true,
    title: {
      en: 'Remote Jobs Feed Integrated into Workspace',
      ar: 'خلاصة الوظائف عن بُعد داخل مساحة العمل',
    },
    description: {
      en: 'Explore relevant remote career opportunities directly from your WiseResume dashboard and seamlessly tailor your resume to match targeted positions.',
      ar: 'استكشف الفرص الوظيفية عن بُعد مباشرة من لوحة تحكم WiseResume وقم بتكييف سيرتك الذاتية بسهولة.',
    },
    highlights: {
      en: [
        'Browse active remote tech and business listings directly in your workspace',
        'One-click transition from job listing to AI resume tailoring',
        'Organize saved roles directly in your Application Tracker board',
      ],
      ar: [
        'تصفح الوظائف المتاحة عن بُعد في التقنية والأعمال مباشرة من مساحة العمل',
        'الانتقال بنقرة واحدة من تفاصيل الوظيفة إلى تخصيص السيرة الذاتية بالذكاء الاصطناعي',
        'تنظيم الوظائف المحفوظة مباشرة في لوحة متابعة الطلبات',
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
      en: 'Standardized Plan Tiering & Interface Polish',
      ar: 'توحيد مستويات الاشتراك وتنسيق الواجهات',
    },
    description: {
      en: 'We refined membership tier naming across the app, bringing clear benefit presentation and localized plan titles to both English and Arabic interfaces.',
      ar: 'قمنا بتوحيد مسميات خطط الاشتراك وتوضيح المزايا عبر كافة الشاشات باللغتين العربية والإنجليزيّة.',
    },
    highlights: {
      en: [
        'Standardized Free, Pro, and Ultimate plan tier naming across desktop and mobile',
        'Clearer feature limit badges on pricing and workspace navigation surfaces',
        'Bilingual subscription interface support for localized workspace navigation',
      ],
      ar: [
        'توحيد مسميات الخطط (المجانية، المحترفة، Ultimate) عبر جميع الشاشات',
        'شارات توضيحية لسرعة استكشاف المزايا والحدود المتاحة',
        'دعم كامل لواجهة الاشتراكات باللغتين العربية والإنجليزيّة',
      ],
    },
  },
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
    title: {
      en: 'Updated Legal Policies & Compliance Transparency',
      ar: 'سياسات قانونية محدثة وتوافق حقوق المستهلك',
    },
    description: {
      en: 'We completely audited our Terms of Service, Privacy Policy, and Refund Policy to ensure transparent consumer protection disclosures and clear merchant terms.',
      ar: 'قمنا بمراجعة وتحديث شروط الخدمة وسياسة الخصوصية وسياسة الاسترداد لضمان الشفافية وحماية حقوق المستهلك.',
    },
    highlights: {
      en: [
        'Updated Privacy, Terms, and Refund policies with clear compliance definitions',
        'Explicit disclosures for merchant transactions and statutory withdrawal information where applicable by law',
        'Direct footer accessibility to canonical legal policies in both English LTR and Arabic RTL',
      ],
      ar: [
        'تحديث سياسات الخصوصية والشروط والاسترداد بتعريفات قانونية محدثة',
        'إفصاحات واضحة لعمليات الشراء وحقوق الانسحاب المطبقة بحسب القوانين المعمول بها',
        'وصول مباشر في أسفل الصفحة للسياسات القانونية المعتمدة باللغتين العربية والإنجليزيّة',
      ],
    },
  },

  // ── April 2026 ──────────────────────────────────────────────
  {
    id: 'apr-2026-portfolio-protection',
    date: 'April 2026',
    monthYear: 'april-2026',
    year: 2026,
    category: 'security',
    categoryLabel: { en: 'Security & Legal', ar: 'الأمان والقوانين' },
    categoryBg: 'bg-emerald-500/10',
    categoryText: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-500/15',
    icon: Lock,
    title: {
      en: 'Improved Public Portfolio Privacy & Interaction Protections',
      ar: 'تحسين حماية الخصوصية والتفاعل للملفات الشخصية العامة',
    },
    description: {
      en: 'Enhanced privacy controls for public portfolio pages, safeguarding public contact details and preventing automated script collection without interrupting human visitors.',
      ar: 'تحسين حماية الخصوصية والأمان للتفاعلات على صفحات الملفات الشخصية العامة لحماية بيانات الاتصال ومنع الجمع الآلي.',
    },
    highlights: {
      en: [
        'Protected public contact details against casual automated collection scripts',
        'Applied validation rate limits to public interactions and share links',
        'Strengthened document-level privacy controls across user resume data',
      ],
      ar: [
        'حماية بيانات الاتصال العامة من برامج التجميع الآلي العشوائية',
        'تطبيق قيود حماية وتأكيد على التفاعلات العامة وروابط المشاركة',
        'تعزيز إعدادات الخصوصية والحماية لمستندات السيرة الذاتية',
      ],
    },
  },
  {
    id: 'apr-2026-pdf-export-layout',
    date: 'April 2026',
    monthYear: 'april-2026',
    year: 2026,
    category: 'improvements',
    categoryLabel: { en: 'Improvements & Fixes', ar: 'تحسينات وإصلاحات' },
    categoryBg: 'bg-cyan-500/10',
    categoryText: 'text-cyan-600 dark:text-cyan-400',
    iconBg: 'bg-cyan-500/15',
    icon: Wrench,
    title: {
      en: 'Smarter AI Error Guidance, Cleaner PDFs & Reliable Sessions',
      ar: 'إرشادات الذكاء الاصطناعي، تصدير الـ PDF وثبات الجلسات',
    },
    description: {
      en: 'A polish update making AI setup, PDF export layout boundaries, and session sign-in noticeably better.',
      ar: 'تحديث تحسيني لجعل رسائل تنبيه الذكاء الاصطناعي، وتنسيق صفحات تصدير الـ PDF، وثبات تسجيل الدخول أفضل بكثير.',
    },
    highlights: {
      en: [
        'Clear notification with a direct "Open Settings" shortcut when AI requires configuration',
        'PDF exports keep section headings attached to content across page breaks',
        'Automatic retry handling for eligible AI requests after background session refresh',
      ],
      ar: [
        'تنبيه واضح مع زر مباشر لفتح الإعدادات عند الحاجة لتهيئة الذكاء الاصطناعي',
        'تنسيق تصدير الـ PDF يبقي عناوين الأقسام متصلة بالنصوص دون قطع مفاجئ',
        'إعادة المحاولة التلقائية لطلبات الذكاء الاصطناعي المؤهلة عند تحديث الاتصال',
      ],
    },
  },
  {
    id: 'apr-2026-performance',
    date: 'April 2026',
    monthYear: 'april-2026',
    year: 2026,
    category: 'improvements',
    categoryLabel: { en: 'Improvements & Fixes', ar: 'تحسينات وإصلاحات' },
    categoryBg: 'bg-cyan-500/10',
    categoryText: 'text-cyan-600 dark:text-cyan-400',
    iconBg: 'bg-cyan-500/15',
    icon: Gauge,
    title: {
      en: 'Smoother Workspace Page Transitions & Performance',
      ar: 'تحسين سلاسة التنقل وسرعة استجابة التطبيق',
    },
    description: {
      en: 'We reduced avoidable rendering and navigation overhead across the workspace for a responsive experience.',
      ar: 'قمنا بتقليل عبء المعالجة أثناء التنقل بين صفحات مساحة العمل لتوفير تجربة استخدام أكثر سلاسة.',
    },
    highlights: {
      en: [
        'Optimized background rendering on common workspace routes',
        'Smoother visual page transitions when navigating between tools',
        'Better responsiveness on modest hardware and mobile devices',
      ],
      ar: [
        'تحسين التحميل الخفي لصفحات مساحة العمل الأكثر استخداماً',
        'انتقالات بصرية أكثر سلاسة أثناء التنقل بين الأدوات',
        'استجابة أفضل على الهواتف والأجهزة ذات الأداء البسيط',
      ],
    },
  },
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
      en: 'Compare curated sample resumes across multiple job roles and industries to inspire your layout structure before drafting.',
      ar: 'قارن بين نماذج سير ذاتية مخصصة لمختلف المجالات والمستويات المهنية لاستلهام الهيكل المناسب.',
    },
    highlights: {
      en: [
        'Browse sample resumes grouped by job title and industry',
        'Inspect structural patterns for work history and technical skills',
        'Use any example layout as inspiration in the editor',
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
    id: 'mar-2026-resume-parsing',
    date: 'March 2026',
    monthYear: 'march-2026',
    year: 2026,
    category: 'improvements',
    categoryLabel: { en: 'Improvements & Fixes', ar: 'تحسينات وإصلاحات' },
    categoryBg: 'bg-rose-500/10',
    categoryText: 'text-rose-600 dark:text-rose-400',
    iconBg: 'bg-rose-500/15',
    icon: Target,
    title: {
      en: 'Broader Resume Parsing Support',
      ar: 'تحسين دعم قراءة واستخراج مستندات السيرة الذاتية',
    },
    description: {
      en: 'We expanded the formatting patterns, date structures, and section headings our CV parser recognizes during import.',
      ar: 'قمنا بتوسيع نماذج التنسيق وهياكل التواريخ وعناوين الأقسام التي يتعرف عليها المحلل أثناء استيراد المستندات.',
    },
    highlights: {
      en: [
        'Recognizes more work history, project, and certification section layouts',
        'Highlights matching terms between your resume and pasted job descriptions',
        'Fallback extraction preserves basic content parsing when AI providers are offline',
      ],
      ar: [
        'التعرف على المزيد من تنسيقات أقسام الخبرة والمشاريع الشهادات',
        'إبراز مصطلحات التوافق بين سيرتك الذاتية والوصف الوظيفي',
        'استخراج احتياطي يحافظ على المحتوى الأساسي في حال تعذر الذكاء الاصطناعي',
      ],
    },
  },
  {
    id: 'mar-2026-account-security',
    date: 'March 2026',
    monthYear: 'march-2026',
    year: 2026,
    category: 'security',
    categoryLabel: { en: 'Security & Legal', ar: 'الأمان والقوانين' },
    categoryBg: 'bg-emerald-500/10',
    categoryText: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-500/15',
    icon: Shield,
    title: {
      en: 'Strengthened Account Protections & Session Stability',
      ar: 'تعزيز حماية الحسابات واستقرار الجلسات',
    },
    description: {
      en: 'We audited identity validation and account protection layers to keep your information safe and reliable.',
      ar: 'قمنا بمراجعة طبقات التحقق وحماية الحسابات للحفاظ على أمان معلوماتك واستقرار جلساتك.',
    },
    highlights: {
      en: [
        'Improved session token management to prevent unnecessary sign-out prompts',
        'Added extra abuse guards for shared public links',
        'Reliable login session handling even during intermittent connection drops',
      ],
      ar: [
        'تحسين إدارة جلسات الدخول لتجنب طلب إدخال البيانات بشكل مكرر',
        'إضافة وسائل حماية إضافية للروابط العامة المشاركة',
        'استمرار الجلسة بثبات حتى مع انقطاع الاتصال المؤقت',
      ],
    },
  },
  {
    id: 'mar-2026-ai-routing',
    date: 'March 2026',
    monthYear: 'march-2026',
    year: 2026,
    category: 'ai',
    categoryLabel: { en: 'AI & Tailoring', ar: 'الذكاء الاصطناعي والتخصيص' },
    categoryBg: 'bg-blue-500/10',
    categoryText: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-500/15',
    icon: Bot,
    title: {
      en: 'Updated AI Processing & Response Structuring',
      ar: 'تحديث معالجة وتنظيم استجابات الذكاء الاصطناعي',
    },
    description: {
      en: 'We upgraded backend AI suggestion routing for smoother rewrites, cover letter drafting, and feedback generation.',
      ar: 'قمنا بتحديث مسارات التوليد بالذكاء الاصطناعي للحصول على اقتراحات صياغة ومسودات رسائل توجيهية أكثر انضباطاً.',
    },
    highlights: {
      en: [
        'Quicker response delivery across rewrite and suggestion tools',
        'Structured outputs for cover letters, interview coaching, and section rewrites',
        'Option to configure custom AI key settings for expanded daily requests',
      ],
      ar: [
        'تسليم أسرع للاستجابات عبر أدوات إعادة الصياغة والاقتراحات',
        'مخرجات منظمة لرسائل التغطية والتدريب على المقابلات وتحسين الأقسام',
        'خيار ضبط مفتاح ذكاء اصطناعي خاص لزيادة حدود الاستخدام اليومية',
      ],
    },
  },
  {
    id: 'mar-2026-fresh-design',
    date: 'March 2026',
    monthYear: 'march-2026',
    year: 2026,
    category: 'improvements',
    categoryLabel: { en: 'Improvements & Fixes', ar: 'تحسينات وإصلاحات' },
    categoryBg: 'bg-purple-500/10',
    categoryText: 'text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-500/15',
    icon: Star,
    title: {
      en: 'Visual Upgrade & Sky Layer Polish',
      ar: 'تحديث بصري وتنسيق طبقات الخلفية',
    },
    description: {
      en: 'WiseResume received a refined visual refresh featuring ambient background sky layers that harmonize with light and dark modes.',
      ar: 'حصل WiseResume على تحديث بصري جذاب يتضمن خلفية سماء متكيفة مع نمط الإضاءة والظلام.',
    },
    highlights: {
      en: [
        'Ambient sky effect that adapts between light and dark themes',
        'Subtle depth transitions across hero card surfaces',
        'Automatic animation reduction for devices requesting reduced motion',
      ],
      ar: [
        'تأثير سماء لطيف يتكيف بين السمات الفاتحة والداكنة',
        'عمق بصري سلس عبر بطاقات وأسطح مساحة العمل',
        'تقليل التهدئة التلقائي للحركات على الأجهزة ذات خيار خفض الحركة',
      ],
    },
  },
  {
    id: 'mar-2026-portfolio-analytics',
    date: 'March 2026',
    monthYear: 'march-2026',
    year: 2026,
    category: 'resume',
    categoryLabel: { en: 'Resume & Portfolio', ar: 'السيرة والملف الشخصي' },
    categoryBg: 'bg-teal-500/10',
    categoryText: 'text-teal-600 dark:text-teal-400',
    iconBg: 'bg-teal-500/15',
    icon: Globe,
    title: {
      en: 'Interactive Portfolio AI Assistant & View Counter',
      ar: 'مساعد الذكاء الاصطناعي وعداد زيارات الملف الشخصي',
    },
    description: {
      en: 'Your public portfolio page includes a visitor assistant that answers questions based on your published details, plus a view counter on your dashboard.',
      ar: 'تتضمن صفحة ملفك الشخصي العام مساعداً يجيب على أسئلة الزوار بناءً على بياناتك المنشورة مع عداد زيارات.',
    },
    highlights: {
      en: [
        'Visitors can ask questions grounded in your published resume details',
        'Track total view counts directly from your portfolio management page',
        'Share public portfolio links with confidence across networking channels',
      ],
      ar: [
        'يمكن للزوار طرح أسئلة تستند لمحتوى سيرتك الذاتية المنشور',
        'متابعة إجمالي الزيارات مباشرة من صفحة إدارة الملف الشخصي',
        'مشاركة رابط ملفك الشخصي بسهولة عبر شبكات التواصل المهني',
      ],
    },
  },
  {
    id: 'mar-2026-company-brief',
    date: 'March 2026',
    monthYear: 'march-2026',
    year: 2026,
    category: 'ai',
    categoryLabel: { en: 'AI & Tailoring', ar: 'الذكاء الاصطناعي والتخصيص' },
    categoryBg: 'bg-amber-500/10',
    categoryText: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-500/15',
    icon: BarChart3,
    title: {
      en: 'Source-Based Company Prep Brief Builder',
      ar: 'مُنشئ ملخص الاستعداد للمقابلات والشركات',
    },
    description: {
      en: 'Organize your research notes or pasted job postings into a clean interview-prep summary before applications or interviews.',
      ar: 'أنشئ ملخصاً منظماً لاستعداد المقابلات من واقع ملاحظاتك أو الوصف الوظيفي المستورد.',
    },
    highlights: {
      en: [
        'Combine company notes with job posting requirements',
        'Structure verified details into reviewable interview discussion prompts',
        'Export a clean PDF summary to review before your meeting',
      ],
      ar: [
        'دمج ملاحظات الشركة مع متطلبات الوصف الوظيفي',
        'تنظيم التفاصيل المؤكدة في نقاط مناقشة مراجعة للمقابلة',
        'تصدير ملخص PDF مريح للمراجعة قبل المقابلة',
      ],
    },
  },
  {
    id: 'mar-2026-resume-tailoring',
    date: 'March 2026',
    monthYear: 'march-2026',
    year: 2026,
    category: 'ai',
    categoryLabel: { en: 'AI & Tailoring', ar: 'الذكاء الاصطناعي والتخصيص' },
    categoryBg: 'bg-amber-500/10',
    categoryText: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-500/15',
    icon: Wand2,
    title: {
      en: 'Job-Aligned Resume Rewrite Suggestions',
      ar: 'اقتراحات تخصيص السيرة الذاتية بحسب الوظيفة',
    },
    description: {
      en: 'Paste any job posting to receive grounded rewrite suggestions you can review side-by-side before applying.',
      ar: 'الصق أي وصف وظيفي للحصول على اقتراحات إعادة صياغة مخصصة ومراجعتها جنباً إلى جنب قبل التقديم.',
    },
    highlights: {
      en: [
        'Tailor bullet points to emphasize relevant skills found in job descriptions',
        'Side-by-side before-and-after comparison for full control over changes',
        'All AI tools — resume, cover letter, interview prep — centralized in AI Studio',
      ],
      ar: [
        'تكييف النقاط لإبراز المهارات المطلوبة في الوصف الوظيفي',
        'مقارنة قبل وبعد جنباً إلى جنب للتحكم الكامل في أي تعديل',
        'تجميع أدوات الذكاء الاصطناعي في شاشة موحدة',
      ],
    },
  },
  {
    id: 'mar-2026-interview-coach',
    date: 'March 2026',
    monthYear: 'march-2026',
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
      en: 'Practice your interview responses out loud. Our Voice Coach listens to your spoken answers and offers structured feedback for improvement.',
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
    monthYear: 'march-2026',
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

  // ── February 2026 ───────────────────────────────────────────
  {
    id: 'feb-2026-auth',
    date: 'February 2026',
    monthYear: 'older',
    year: 2026,
    category: 'improvements',
    categoryLabel: { en: 'Improvements & Fixes', ar: 'تحسينات وإصلاحات' },
    categoryBg: 'bg-sky-500/10',
    categoryText: 'text-sky-600 dark:text-sky-400',
    iconBg: 'bg-sky-500/15',
    icon: UserCheck,
    title: {
      en: 'Google OAuth & Direct Email Sign-In Integration',
      ar: 'تسجيل الدخول عبر Google والبريد الإلكتروني المباشر',
    },
    description: {
      en: 'We updated authentication flows to make signing in faster and more reliable via Google or email.',
      ar: 'قمنا بتحديث طريقة تسجيل الدخول لجعل الوصول للحساب أسرع وأكثر موثوقية عبر Google أو البريد.',
    },
    highlights: {
      en: [
        'One-tap Google OAuth sign-in and passwordless email recovery',
        'Session persistence keeps you logged in across browser restarts',
        'Secure data preservation across account sign-ins',
      ],
      ar: [
        'تسجيل الدخول بنقرة واحدة عبر Google واستعادة الحساب',
        'استمرار الجلسة للتسجيل التلقائي عند فتح المتصفح',
        'حفظ آمن للبيانات والسير الذاتية الخاصة بك',
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
      en: 'Generate a scannable QR code linking to your online portfolio or PDF resume for networking events or printed cards.',
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
  {
    id: 'jan-2026-achievements',
    date: 'January 2026',
    monthYear: 'older',
    year: 2026,
    category: 'features',
    categoryLabel: { en: 'New Features', ar: 'ميزات جديدة' },
    categoryBg: 'bg-amber-500/10',
    categoryText: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-500/15',
    icon: Trophy,
    title: {
      en: 'Profile Completion & Milestones Progress Tracker',
      ar: 'متابعة إنجاز واستكمال عناصر الملف الشخصي',
    },
    description: {
      en: 'Earn milestones as you complete resume sections, add skills, and prepare applications to keep your progress moving forward.',
      ar: 'احصل على شارات إنجاز أثناء استكمال أقسام السيرة الذاتية وإضافة المهارات لتتبع تقدمك.',
    },
    highlights: {
      en: [
        'Earn badges as you complete resume sections and skills',
        'Overall profile completeness indicator on dashboard',
        'Clear guidance on missing profile information',
      ],
      ar: [
        'الحصول على شارات استكمال الأقسام والمهارات',
        'مؤشر نسبة اكتمال السيرة الذاتية في لوحة التحكم',
        'إرشادات واضحة لإكمال النقاط الناقصة',
      ],
    },
  },

  // ── December 2025 ───────────────────────────────────────────
  {
    id: 'dec-2025-portfolio-website',
    date: 'December 2025',
    monthYear: 'older',
    year: 2025,
    category: 'resume',
    categoryLabel: { en: 'Resume & Portfolio', ar: 'السيرة والملف الشخصي' },
    categoryBg: 'bg-teal-500/10',
    categoryText: 'text-teal-600 dark:text-teal-400',
    iconBg: 'bg-teal-500/15',
    icon: Globe,
    title: {
      en: 'Turn Your Resume into a Public Portfolio Website',
      ar: 'تحويل السيرة الذاتية إلى موقع ملف شخصي عام',
    },
    description: {
      en: 'Transform your resume into a public web portfolio page with a custom shareable link — ideal for email signatures and networking.',
      ar: 'حول سيرتك الذاتية إلى موقع ملف شخصي إلكتروني برابط مخصص للمشاركة في التوقيع والشبكات.',
    },
    highlights: {
      en: [
        'Automatically generated from your active resume data',
        'Multiple layout themes and accent colors',
        'Shareable link for LinkedIn, WhatsApp, or business cards',
      ],
      ar: [
        'إنشاء تلقائي يستند لبيانات سيرتك الذاتية النشطة',
        'أنماط قوالب متعددة وألوان مميزة',
        'رابط قابل للمشاركة عبر LinkedIn والبريد وبطاقات العمل',
      ],
    },
  },
  {
    id: 'dec-2025-templates',
    date: 'December 2025',
    monthYear: 'older',
    year: 2025,
    category: 'resume',
    categoryLabel: { en: 'Resume & Portfolio', ar: 'السيرة والملف الشخصي' },
    categoryBg: 'bg-purple-500/10',
    categoryText: 'text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-500/15',
    icon: Layers,
    title: {
      en: 'Professional Resume Templates & Layout Styles',
      ar: 'قوالب سيرة ذاتية احترافية وأنماط تنسيق',
    },
    description: {
      en: 'Choose from professionally designed resume templates and switch layouts instantly without losing content.',
      ar: 'اختر من بين قوالب سيرة ذاتية احترافية وبدل بين التصاميم فوراً دون فقدان المحتوى.',
    },
    highlights: {
      en: [
        'Multiple clean layouts suitable for tech, business, and creative roles',
        'Switch template styles anytime without retyping content',
        'Readable fonts and PDF print options',
      ],
      ar: [
        'تصاميم متعددة تناسب المجالات التقنية والإدارية والإبداعية',
        'التبديل بين القوالب في أي وقت دون إعادة إدخال البيانات',
        'خطوط واضحة وإعدادات جاهزة للطباعة والتصدير',
      ],
    },
  },

  // ── November 2025 ───────────────────────────────────────────
  {
    id: 'nov-2025-cover-letters',
    date: 'November 2025',
    monthYear: 'older',
    year: 2025,
    category: 'ai',
    categoryLabel: { en: 'AI & Tailoring', ar: 'الذكاء الاصطناعي والتخصيص' },
    categoryBg: 'bg-rose-500/10',
    categoryText: 'text-rose-600 dark:text-rose-400',
    iconBg: 'bg-rose-500/15',
    icon: PenLine,
    title: {
      en: 'Cover Letter Generator & Draft Editor',
      ar: 'مُنشئ ومحرر مسودات رسائل التغطية',
    },
    description: {
      en: 'Draft tailored cover letters matching your resume and a pasted job description, then review and edit before export.',
      ar: 'أنشئ مسودات رسائل تغطية مخصصة تطابق سيرتك الذاتية والوصف الوظيفي ثم راجعها وعدلها قبل التصدير.',
    },
    highlights: {
      en: [
        'Tailored to your resume experience and job requirements',
        'Full editing control over tone, paragraphs, and claims',
        'Export as clean PDF document alongside your resume',
      ],
      ar: [
        'تخصيص يستند لخبرات سيرتك الذاتية ومتطلبات الوظيفة',
        'تحكم كامل في تعديل الصياغة والفقرات والنقاط',
        'تصدير كملف PDF منظم جنب لسيرة الذاتية',
      ],
    },
  },
  {
    id: 'nov-2025-dark-mode',
    date: 'November 2025',
    monthYear: 'older',
    year: 2025,
    category: 'improvements',
    categoryLabel: { en: 'Improvements & Fixes', ar: 'تحسينات وإصلاحات' },
    categoryBg: 'bg-purple-500/10',
    categoryText: 'text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-500/15',
    icon: Palette,
    title: {
      en: 'Dark Mode & Workspace Appearance Themes',
      ar: 'الوضع الداكن وسمات مظهر مساحة العمل',
    },
    description: {
      en: 'WiseResume supports dark mode and appearance preferences that carry across all workspace tools.',
      ar: 'يدعم WiseResume الوضع الداكن وتفضيلات المظهر التي تمتد عبر جميع أدوات مساحة العمل.',
    },
    highlights: {
      en: [
        'Switch between light and dark themes with one tap',
        'Theme preference persists across your browser session',
        'High contrast readability for editing and reviewing',
      ],
      ar: [
        'التبديل بين المظهر الفاتح والداكن بنقرة واحدة',
        'حفظ تفضيل المظهر تلقائياً في المتصفح',
        'تباين مريح للعين أثناء الكتابة والمراجعة',
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
      en: 'WiseResume Official Launch',
      ar: 'الإطلاق الرسمي لـ WiseResume',
    },
    description: {
      en: 'Build, tailor, and refine your resume with AI guidance, match your experience against job requirements, and export clean PDFs.',
      ar: 'أنشئ وخصص وطور سيرتك الذاتية بمساعدة الذكاء الاصطناعي، وقارن خبراتك مع متطلبات الوظائف، وصدّر ملفات PDF منسقة.',
    },
    highlights: {
      en: [
        'Structured resume builder with real-time live preview',
        'AI writing and section tailoring suggestions',
        'Professional exportable PDF styles',
      ],
      ar: [
        'مُنشئ سير ذاتية منظم مع معاينة فورية',
        'اقتراحات تحسين وتخصيص بالذكاء الاصطناعي',
        'أنماط قوالب متعددة وتصدير ملفات PDF احترافية',
      ],
    },
  },
];
