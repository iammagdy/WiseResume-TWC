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
  Bell,
  Sliders,
  Smartphone,
  Cpu,
  Languages,
  FileSpreadsheet,
  Workflow,
  FileDown,
  Linkedin,
  History,
} from 'lucide-react';
import React from 'react';

export type ReleaseCategory =
  | 'all'
  | 'resume'
  | 'ai'
  | 'jobs'
  | 'platform'
  | 'security'
  | 'features'
  | 'improvements';

export type UpdateType = 'all' | 'new' | 'improved' | 'fixed';

export interface ReleaseUpdate {
  id: string;
  date: string;
  monthKey: string; // Canonical YYYY-MM format e.g. "2026-09"
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
  updateType: 'new' | 'improved' | 'fixed';
  featureArea?: {
    en: string;
    ar: string;
  };
}

export interface MonthGroup {
  id: string; // YYYY-MM
  year: number;
  month: number;
  label: {
    en: string;
    ar: string;
  };
}

export const TYPE_FILTERS: { id: UpdateType; label: { en: string; ar: string } }[] = [
  { id: 'all', label: { en: 'All Updates', ar: 'جميع التحديثات' } },
  { id: 'new', label: { en: 'New Features', ar: 'ميزات جديدة' } },
  { id: 'improved', label: { en: 'Improvements', ar: 'تحسينات' } },
  { id: 'fixed', label: { en: 'Fixes', ar: 'إصلاحات' } },
];

export const CATEGORY_FILTERS: { id: ReleaseCategory; label: { en: string; ar: string } }[] = [
  { id: 'all', label: { en: 'All Areas', ar: 'جميع الأقسام' } },
  { id: 'resume', label: { en: 'Resume & Portfolio', ar: 'السيرة والملف الشخصي' } },
  { id: 'ai', label: { en: 'AI & Tailoring', ar: 'الذكاء الاصطناعي والتخصيص' } },
  { id: 'jobs', label: { en: 'Jobs & Career', ar: 'الوظائف والمهنة' } },
  { id: 'platform', label: { en: 'Platform', ar: 'المنصة' } },
  { id: 'security', label: { en: 'Security & Legal', ar: 'الأمان والقوانين' } },
];

export function getUpdateType(release: ReleaseUpdate): 'new' | 'improved' | 'fixed' {
  return release.updateType;
}

const MONTH_NAMES_EN: Record<number, string> = {
  1: 'January',
  2: 'February',
  3: 'March',
  4: 'April',
  5: 'May',
  6: 'June',
  7: 'July',
  8: 'August',
  9: 'September',
  10: 'October',
  11: 'November',
  12: 'December',
};

const MONTH_NAMES_AR: Record<number, string> = {
  1: 'يناير',
  2: 'فبراير',
  3: 'مارس',
  4: 'أبريل',
  5: 'مايو',
  6: 'يونيو',
  7: 'يوليو',
  8: 'أغسطس',
  9: 'سبتمبر',
  10: 'أكتوبر',
  11: 'نوفمبر',
  12: 'ديسمبر',
};

export function getAvailableMonthGroups(releases: ReleaseUpdate[]): MonthGroup[] {
  const map = new Map<string, { year: number; month: number }>();
  for (const item of releases) {
    if (!item.monthKey) continue;
    const parts = item.monthKey.split('-');
    if (parts.length === 2) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      if (!isNaN(year) && !isNaN(month)) {
        map.set(item.monthKey, { year, month });
      }
    }
  }

  const sortedKeys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
  return sortedKeys.map((key) => {
    const { year, month } = map.get(key)!;
    const enMonth = MONTH_NAMES_EN[month] || '';
    const arMonth = MONTH_NAMES_AR[month] || '';
    return {
      id: key,
      year,
      month,
      label: {
        en: `${enMonth} ${year}`,
        ar: `${arMonth} ${year}`,
      },
    };
  });
}

export const whatsNewReleases: ReleaseUpdate[] = [
  // ── September 2026 ──────────────────────────────────────────
  {
    id: 'sep-2026-native-pdf-export',
    date: 'September 2026',
    monthKey: '2026-09',
    year: 2026,
    category: 'resume',
    updateType: 'fixed',
    featureArea: { en: 'PDF Export', ar: 'تصدير PDF' },
    categoryLabel: { en: 'Resume & Portfolio', ar: 'السيرة والملف الشخصي' },
    categoryBg: 'bg-cyan-500/10',
    categoryText: 'text-cyan-600 dark:text-cyan-400',
    iconBg: 'bg-cyan-500/15',
    icon: FileDown,
    featured: true,
    title: {
      en: 'More Reliable Native PDF Exports',
      ar: 'تصدير ملفات PDF موثوق ومحسّن',
    },
    description: {
      en: 'PDF exports are working reliably again across the main resume, preview, cover letter, and tailoring result workflows.',
      ar: 'تعمل عمليات تصدير PDF الآن بموثوقية عالية عبر المسارات الرئيسية للسيرة الذاتية والمعاينة وخطاب التقديم ونتائج التخصيص.',
    },
    highlights: {
      en: [
        'Restored reliable PDF generation for Designed and ATS resume formats',
        'Verified downloads across resume preview, cover letters, and tailored results',
        'Reliable downloads across the main resume, preview, cover letter, and tailoring result workflows',
      ],
      ar: [
        'استعادة تصدير ملفات PDF بموثوقية لكلا النمطين المصمم وATS',
        'تحميل معتمد وموثوق عبر معاينة السيرة وخطابات التقديم ونتائج التخصيص',
        'تنزيل موثوق عبر المسارات الرئيسية للسيرة الذاتية والمعاينة وخطاب التقديم ونتائج التخصيص',
      ],
    },
  },
  {
    id: 'sep-2026-linkedin-optimizer-async',
    date: 'September 2026',
    monthKey: '2026-09',
    year: 2026,
    category: 'ai',
    updateType: 'fixed',
    featureArea: { en: 'AI Studio', ar: 'استوديو الذكاء الاصطناعي' },
    categoryLabel: { en: 'AI & Tailoring', ar: 'الذكاء الاصطناعي والتخصيص' },
    categoryBg: 'bg-blue-500/10',
    categoryText: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-500/15',
    icon: Linkedin,
    featured: true,
    title: {
      en: 'Asynchronous LinkedIn Profile Optimization & Word Export',
      ar: 'تحسين الملف الشخصي على LinkedIn في الخلفية وتصدير Word',
    },
    description: {
      en: 'The AI Studio LinkedIn Optimizer now runs in the background, generating tailored headlines, multi-length About summaries, experience rewrites, and downloadable Word documents without timeout interruptions.',
      ar: 'يعمل مُحسّن لينكد إن في استوديو الذكاء الاصطناعي في الخلفية، حيث يُنشئ عناوين احترافية، وموجزات نبذة متنوعة، وصياغات للخبرات، مع تصدير لمستند Word دون انقطاع المهلة.',
    },
    highlights: {
      en: [
        'Reliable background profile generation without timeout interruptions',
        'Tailored headlines, 3 About summary lengths, experience rewrites, and skill suggestions',
        'One-click Word (.docx) profile download and clipboard copying',
      ],
      ar: [
        'توليد موثوق للملف الشخصي في الخلفية دون انقطاع بسبب مهلة الطلب',
        'عناوين مخصصة، و3 خيارات لطول النبذة المهنية، وصياغة للخبرات، واقتراحات للمهارات',
        'تصدير بنقرة واحدة لمستند Word (.docx) ونسخ المحتوى للحافظة',
      ],
    },
  },
  {
    id: 'sep-2026-tailoring-cancellation',
    date: 'September 2026',
    monthKey: '2026-09',
    year: 2026,
    category: 'ai',
    updateType: 'improved',
    featureArea: { en: 'Tailoring Hub', ar: 'مركز التخصيص' },
    categoryLabel: { en: 'AI & Tailoring', ar: 'الذكاء الاصطناعي والتخصيص' },
    categoryBg: 'bg-amber-500/10',
    categoryText: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-500/15',
    icon: History,
    featured: true,
    title: {
      en: 'Instant Tailoring Cancellation & Workspace Protection',
      ar: 'إلغاء فوري لعمليات التخصيص وحماية مساحة العمل',
    },
    description: {
      en: 'Closing or cancelling a tailoring flow now clears active client state and drops late results so abandoned runs do not overwrite the current workspace.',
      ar: 'إغلاق أو إلغاء مسار التخصيص يقوم الآن بمسح الحالة النشطة وإهمال النتائج المتأخرة لمنع الكتابة فوق مساحة العمل الحالية.',
    },
    highlights: {
      en: [
        'Instant client cancellation across Tailoring Hub, Editor sheets, and Fast Tailor',
        'Immediate recovery of active editor controls when abandoning a run',
        'Prevents stale late-arriving results from overwriting your active workspace',
      ],
      ar: [
        'إلغاء فوري عبر مركز التخصيص، ونوافذ المحرر، وخاصية التخصيص السريع',
        'استعادة فورية لعناصر التحكم في المحرر عند التراجع عن العملية',
        'منع النتائج المتأخرة من الكتابة فوق مساحة العمل النشطة',
      ],
    },
  },
  {
    id: 'sep-2026-autosave-deduplication',
    date: 'September 2026',
    monthKey: '2026-09',
    year: 2026,
    category: 'resume',
    updateType: 'improved',
    featureArea: { en: 'Resume Editor', ar: 'محرر السيرة الذاتية' },
    categoryLabel: { en: 'Resume & Portfolio', ar: 'السيرة والملف الشخصي' },
    categoryBg: 'bg-violet-500/10',
    categoryText: 'text-violet-600 dark:text-violet-400',
    iconBg: 'bg-violet-500/15',
    icon: Zap,
    title: {
      en: 'Efficient Cloud Autosave & Cache Synchronization',
      ar: 'حفظ تلقائي سحابي فعال ومزامنة مباشرة للبيانات',
    },
    description: {
      en: 'Autosave now avoids redundant document reads after successful saves, reducing unnecessary background network work while keeping resume data synchronized.',
      ar: 'يتجنب الحفظ التلقائي الآن عمليات قراءة المستندات المتكررة بعد نجاح الحفظ، مما يقلل العمل الشبكي غير الضروري مع الحفاظ على تزامن بيانات السيرة الذاتية.',
    },
    highlights: {
      en: [
        'Avoids redundant document reads after background cloud saves',
        'Direct cache reconciliation keeps resume content accurately synchronized',
        'Keeps active resume data synchronized without triggering redundant post-save document reads',
      ],
      ar: [
        'تجنب قراءة المستندات المتكررة بعد الحفظ السحابي في الخلفية',
        'مزامنة مباشرة لذاكرة التخزين المؤقت للحفاظ على دقة محتوى السيرة الذاتية',
        'الحفاظ على تزامن بيانات السيرة الذاتية دون تكرار عمليات القراءة بعد الحفظ',
      ],
    },
  },
  {
    id: 'sep-2026-portfolio-turnstile-contact',
    date: 'September 2026',
    monthKey: '2026-09',
    year: 2026,
    category: 'resume',
    updateType: 'new',
    featureArea: { en: 'Public Portfolio', ar: 'الملف المهني العام' },
    categoryLabel: { en: 'Resume & Portfolio', ar: 'السيرة والملف الشخصي' },
    categoryBg: 'bg-emerald-500/10',
    categoryText: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-500/15',
    icon: Shield,
    title: {
      en: 'Protected Visitor Inquiries for Public Portfolios',
      ar: 'رسائل تواصل محمية للملف المهني العام',
    },
    description: {
      en: 'Visitors can contact you through your public portfolio with spam protection and owner notifications.',
      ar: 'يمكن للزوار التواصل معك عبر ملفك المهني العام مع حماية مدمجة من الرسائل غير المرغوبة وإشعارات لصاحب الملف.',
    },
    highlights: {
      en: [
        'Direct visitor contact form on public portfolio profiles',
        'Built-in spam prevention on incoming message submissions',
        'Email notifications when a visitor sends a portfolio inquiry',
      ],
      ar: [
        'نموذج تواصل مباشر للزوار في الملفات المهنية العامة',
        'حماية مدمجة من الرسائل العشوائية عند إرسال الاستفسارات',
        'إشعارات بريد إلكتروني فورية عند إرسال أي زائر استفساراً عبر الملف',
      ],
    },
  },
  {
    id: 'sep-2026-client-polling-efficiency',
    date: 'September 2026',
    monthKey: '2026-09',
    year: 2026,
    category: 'platform',
    updateType: 'improved',
    featureArea: { en: 'Platform', ar: 'المنصة' },
    categoryLabel: { en: 'Platform', ar: 'المنصة' },
    categoryBg: 'bg-indigo-500/10',
    categoryText: 'text-indigo-600 dark:text-indigo-400',
    iconBg: 'bg-indigo-500/15',
    icon: Gauge,
    title: {
      en: 'Optimized Background Account Synchronization',
      ar: 'تحسين وتنسيق التحقق من الحساب في الخلفية',
    },
    description: {
      en: 'Reduced unnecessary background account checks while preserving realtime updates and refresh-on-focus behavior.',
      ar: 'تقليل عمليات التحقق غير الضرورية من الحساب في الخلفية مع الحفاظ على التحديثات الفورية وإعادة التحقق عند التركيز على النافذة.',
    },
    highlights: {
      en: [
        'Optimized account polling interval for open browser tabs',
        'Immediate refresh on window focus and critical user actions',
        'Realtime workspace updates and refresh-on-focus behavior remain preserved',
      ],
      ar: [
        'فترات فحص محسّنة للحساب في علامات التبويب المفتوحة',
        'تحديث فوري عند العودة إلى نافذة المتصفح وعند الإجراءات المهمة',
        'استمرار التحديثات الفورية في مساحة العمل والتحديث عند التركيز على النافذة',
      ],
    },
  },

  // ── August 2026 ─────────────────────────────────────────────
  {
    id: 'aug-2026-remote-jobs',
    date: 'August 2026',
    monthKey: '2026-08',
    year: 2026,
    category: 'jobs',
    updateType: 'new',
    featureArea: { en: 'Jobs Feed', ar: 'خلاصة الوظائف' },
    categoryLabel: { en: 'Jobs & Career', ar: 'الوظائف والمهنة' },
    categoryBg: 'bg-blue-500/10',
    categoryText: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-500/15',
    icon: Briefcase,
    featured: true,
    title: {
      en: 'Remote Jobs Feed Integrated into WiseResume',
      ar: 'خلاصة الوظائف عن بُعد داخل WiseResume',
    },
    description: {
      en: 'Explore relevant remote career opportunities through the WiseResume Remote Jobs Feed and tailor your resume for targeted positions.',
      ar: 'استكشف الفرص الوظيفية المتاحة عن بُعد عبر خلاصة وظائف WiseResume وقم بتكييف سيرتك الذاتية بسهولة.',
    },
    highlights: {
      en: [
        'Browse active remote tech and business job listings',
        'One-click transition from job listing to AI resume tailoring',
        'Organize saved roles in your Application Tracker board',
      ],
      ar: [
        'تصفح الوظائف المتاحة عن بُعد في مجالات التقنية والأعمال',
        'الانتقال بنقرة واحدة من تفاصيل الوظيفة إلى تخصيص السيرة الذاتية بالذكاء الاصطناعي',
        'تنظيم الوظائف المحفوظة في لوحة متابعة الطلبات',
      ],
    },
  },
  {
    id: 'aug-2026-ultimate-plan',
    date: 'August 2026',
    monthKey: '2026-08',
    year: 2026,
    category: 'platform',
    updateType: 'improved',
    featureArea: { en: 'Workspace', ar: 'مساحة العمل' },
    categoryLabel: { en: 'Platform', ar: 'المنصة' },
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
    monthKey: '2026-08',
    year: 2026,
    category: 'security',
    updateType: 'improved',
    featureArea: { en: 'Compliance', ar: 'الامتثال القانوني' },
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
  {
    id: 'aug-2026-tailoring-fact-integrity',
    date: 'August 2026',
    monthKey: '2026-08',
    year: 2026,
    category: 'ai',
    updateType: 'improved',
    featureArea: { en: 'Fact Integrity', ar: 'نزاهة الحقائق' },
    categoryLabel: { en: 'AI & Tailoring', ar: 'الذكاء الاصطناعي والتخصيص' },
    categoryBg: 'bg-amber-500/10',
    categoryText: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-500/15',
    icon: Shield,
    title: {
      en: 'Source-First AI Fact Integrity Verification',
      ar: 'التحقق من صحة البيانات بالذكاء الاصطناعي',
    },
    description: {
      en: 'Tailoring recommendations now reconcile source data first, protecting verified work history and preventing unbacked skill claims.',
      ar: 'توصيات التخصيص الآن تتحقق أولاً من مصدر البيانات لحماية سجل الخبرة وتجنب ادعاء مهارات غير مثبتة.',
    },
    highlights: {
      en: [
        'Source-first evidence verification for tailored bullets and skills',
        'Rejection of unbacked numerical achievement metric claims',
        'Consistent prompt rules across resume, cover letter, and job tailoring tools',
      ],
      ar: [
        'تحقق دقيق يستند للمصدر لكل النقاط والمهارات المخصصة',
        'استبعاد الإحصائيات غير المثبتة تلقائياً لضمان مصداقية السيرة الذاتية',
        'قواعد موحدة لسلامة التوليد بالذكاء الاصطناعي عبر كافة الأدوات',
      ],
    },
  },
  {
    id: 'aug-2026-pdf-export-scaling',
    date: 'August 2026',
    monthKey: '2026-08',
    year: 2026,
    category: 'resume',
    updateType: 'improved',
    featureArea: { en: 'PDF Export', ar: 'تصدير PDF' },
    categoryLabel: { en: 'Resume & Portfolio', ar: 'السيرة والملف الشخصي' },
    categoryBg: 'bg-cyan-500/10',
    categoryText: 'text-cyan-600 dark:text-cyan-400',
    iconBg: 'bg-cyan-500/15',
    icon: Wrench,
    title: {
      en: 'Bounded PDF Export & Auto-Page Scaling',
      ar: 'تحسين قياس وتصدير ملفات PDF التلقائي',
    },
    description: {
      en: 'Our server PDF export renderer now automatically scales single-page resumes and enforces strict Letter/A4 physical boundaries.',
      ar: 'محرك تصدير الـ PDF الآن يضبط الهوامش والتحجيم التلقائي للصفحات المنفردة بدقة متناهية مع معايير Letter وA4.',
    },
    highlights: {
      en: [
        'Automatic single-page coordinate scaling for perfectly fitted resumes',
        'Bounded PDF document size limits and memory safety caps',
        'Exact Letter and A4 physical page dimension alignment',
      ],
      ar: [
        'تحجيم تلقائي لأبعاد الصفحة المنفردة لتتناسب ببراعة مع المستند',
        'حدود أمان دقيقة لأحجام الملفات والذاكرة أثناء التصدير',
        'توافق كامل مع مقاسات الطباعة المعتمدة Letter وA4',
      ],
    },
  },
  {
    id: 'aug-2026-sentry-fixes',
    date: 'August 2026',
    monthKey: '2026-08',
    year: 2026,
    category: 'platform',
    updateType: 'fixed',
    featureArea: { en: 'Stability', ar: 'الاستقرار' },
    categoryLabel: { en: 'Platform', ar: 'المنصة' },
    categoryBg: 'bg-indigo-500/10',
    categoryText: 'text-indigo-600 dark:text-indigo-400',
    iconBg: 'bg-indigo-500/15',
    icon: Gauge,
    title: {
      en: 'Workspace Stability & Browser Compatibility Fixes',
      ar: 'تحسين استقرار مساحة العمل وتوافق المتصفحات',
    },
    description: {
      en: 'We resolved upload widget lifecycle boundaries, web-vitals compatibility issues, and Realtime socket reconnection handling.',
      ar: 'قمنا بإصلاح كائنات الرفع، وتوافق مؤشرات الأداء مع المتصفحات القديمة، واستقرار الاتصال المباشر.',
    },
    highlights: {
      en: [
        'Resolved dashboard file upload component initialization edge cases',
        'Safer performance tracking fallback for older browser environments',
        'Resilient background Realtime socket reconnection handling',
      ],
      ar: [
        'معالجة استثناءات رفع الملفات في لوحة التحكم عند التحميل الأول',
        'توافق أمن لقياس أداء الموقع على المتصفحات القديمة',
        'استعادة الاتصال المباشر تلقائياً وبأمان في خلفية التطبيق',
      ],
    },
  },

  // ── July 2026 ───────────────────────────────────────────────
  {
    id: 'jul-2026-broadcasts',
    date: 'July 2026',
    monthKey: '2026-07',
    year: 2026,
    category: 'platform',
    updateType: 'new',
    featureArea: { en: 'Workspace', ar: 'مساحة العمل' },
    categoryLabel: { en: 'Platform', ar: 'المنصة' },
    categoryBg: 'bg-violet-500/10',
    categoryText: 'text-violet-600 dark:text-violet-400',
    iconBg: 'bg-violet-500/15',
    icon: Bell,
    title: {
      en: 'Authenticated Workspace Announcements & Notifications',
      ar: 'نظام الإعلانات والتنبيهات المباشرة في مساحة العمل',
    },
    description: {
      en: 'Stay informed on important platform updates and maintenance announcements directly within your workspace top bar.',
      ar: 'ابق على اطلاع بأحدث التحديثات وتنبيهات التطبيق المهمة مباشرة من الشريط العلوي لمساحة العمل.',
    },
    highlights: {
      en: [
        'Authenticated announcement banner with dismissible state tracking',
        'Important system notification delivery across all workspace tools',
        'Seamless integration with user notification preference settings',
      ],
      ar: [
        'شريط إعلانات موثق يتيح إخفاء التنبيهات بسهولة',
        'وصول الإشعارات الهامة عبر جميع أدوات مساحة العمل',
        'تكامل كامل مع إعدادات وتفضيلات التنبيهات للمستخدم',
      ],
    },
  },
  {
    id: 'jul-2026-project-metadata',
    date: 'July 2026',
    monthKey: '2026-07',
    year: 2026,
    category: 'ai',
    updateType: 'improved',
    featureArea: { en: 'Tailoring Hub', ar: 'مركز التخصيص' },
    categoryLabel: { en: 'AI & Tailoring', ar: 'الذكاء الاصطناعي والتخصيص' },
    categoryBg: 'bg-amber-500/10',
    categoryText: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-500/15',
    icon: Wand2,
    title: {
      en: 'Resume Tailoring Project Metadata Preservation',
      ar: 'الحفاظ على بيانات وتواريخ المشاريع أثناء التخصيص',
    },
    description: {
      en: 'Tailoring preserves project dates, links, and chronological order while rewriting descriptions.',
      ar: 'أداة التخصيص تحافظ على تواريخ المشاريع وروابطها وترتيبها الزمني بدقة أثناء إعادة الصياغة.',
    },
    highlights: {
      en: [
        'Preserves project start/end dates and live URL links',
        'Maintains deterministic chronological project ordering during AI rewrites',
        'Prevents synthetic project invention or accidental date normalization',
      ],
      ar: [
        'الحفاظ على تواريخ البدء والانتهاء للمشاريع والروابط',
        'الالتزام بالترتيب الزمني أثناء إعادة الصياغة بالذكاء الاصطناعي',
        'منع توليد مشاريع وهمية أو تغيير التواريخ الأصلية',
      ],
    },
  },
  {
    id: 'jul-2026-portfolio-mobile',
    date: 'July 2026',
    monthKey: '2026-07',
    year: 2026,
    category: 'resume',
    updateType: 'improved',
    featureArea: { en: 'Public Portfolio', ar: 'الملف المهني العام' },
    categoryLabel: { en: 'Resume & Portfolio', ar: 'السيرة والملف الشخصي' },
    categoryBg: 'bg-teal-500/10',
    categoryText: 'text-teal-600 dark:text-teal-400',
    iconBg: 'bg-teal-500/15',
    icon: Smartphone,
    title: {
      en: 'Public Portfolio Mobile Layout Optimization',
      ar: 'تحسين عرض الملف الشخصي على الهواتف',
    },
    description: {
      en: 'Public portfolio sites render cleanly on mobile devices with optimized avatar delivery and layout shift reduction.',
      ar: 'تحسين عرض صفحات الملف الشخصي العامة على أجهزة الجوال مع ضبط أبعاد الصورة وحمايتها.',
    },
    highlights: {
      en: [
        'Responsive image formatting for mobile avatars',
        'Reduced visual layout shift across public portfolio hero sections',
        'Direct data resolution for portfolio links (/p/:username)',
      ],
      ar: [
        'تنسيق استجابة لصور الملف الشخصي على الهواتف',
        'تقليل قفزات التنسيق البصري في الهيدر الرئيسي للملف الشخصي',
        'جلب بيانات للروابط المباشرة للملفات الشخصية',
      ],
    },
  },
  {
    id: 'jul-2026-editor-hydration',
    date: 'July 2026',
    monthKey: '2026-07',
    year: 2026,
    category: 'resume',
    updateType: 'fixed',
    featureArea: { en: 'Resume Editor', ar: 'محرر السيرة الذاتية' },
    categoryLabel: { en: 'Resume & Portfolio', ar: 'السيرة والملف الشخصي' },
    categoryBg: 'bg-purple-500/10',
    categoryText: 'text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-500/15',
    icon: Cpu,
    title: {
      en: 'Editor Resume Hydration & Document Loading Stability',
      ar: 'تحسين فتح وإعداد السيرة الذاتية داخل المحرر',
    },
    description: {
      en: 'Direct links to specific resumes open directly in the Editor without unnecessary list-loading delays or stale state.',
      ar: 'الروابط المباشرة للسير الذاتية تفتح مباشرة داخل المحرر دون إبطاء أو انتظار غير ضروري.',
    },
    highlights: {
      en: [
        'Route-first resume target resolution bypasses full list hydration',
        'Stale document protection prevents accidental overwrites on reload',
        'Clear loading states for intermittent connections',
      ],
      ar: [
        'فتح المستند المستهدف مباشرة اعتماداً على الرابط المباشر',
        'حماية الحفظ تمنع أي كتابة فوق البيانات السابقة عند إعادة التحميل',
        'شاشات تحضير واضحة تتعامل بسلاسة مع الاتصال',
      ],
    },
  },

  // ── June 2026 ───────────────────────────────────────────────
  {
    id: 'jun-2026-i18n-rtl',
    date: 'June 2026',
    monthKey: '2026-06',
    year: 2026,
    category: 'platform',
    updateType: 'new',
    featureArea: { en: 'Localization', ar: 'اللغة والتعريب' },
    categoryLabel: { en: 'Platform', ar: 'المنصة' },
    categoryBg: 'bg-indigo-500/10',
    categoryText: 'text-indigo-600 dark:text-indigo-400',
    iconBg: 'bg-indigo-500/15',
    icon: Languages,
    title: {
      en: 'Expanded Bilingual Arabic RTL & English LTR Support',
      ar: 'دعم توسيع اللغة العربية (RTL) والإنجليزيّة (LTR)',
    },
    description: {
      en: 'Switch smoothly between Arabic and English across key landing pages, workspace tools, builder screens, and settings.',
      ar: 'تنقل بسلاسة بين العربية والإنجليزيّة عبر الواجهات وأدوات بناء السيرة الذاتية والإعدادات.',
    },
    highlights: {
      en: [
        'Native Arabic Right-to-Left (RTL) layout rendering across core workspace screens',
        'Localized navigation, headers, forms, dialogs, and button actions',
        'Seamless language switcher with URL locale preservation',
      ],
      ar: [
        'عرض أصلي للواجهات بالاتجاه من اليمين إلى اليسار (RTL) باللغة العربية',
        'ترجمة العناصر والقوائم والنصوص والأزرار والنوافذ',
        'مبدل لغات سلس يحافظ على عنوان الصفحة والتفضيل المختار',
      ],
    },
  },
  {
    id: 'jun-2026-export-customization',
    date: 'June 2026',
    monthKey: '2026-06',
    year: 2026,
    category: 'resume',
    updateType: 'improved',
    featureArea: { en: 'ATS Export', ar: 'تصدير ATS' },
    categoryLabel: { en: 'Resume & Portfolio', ar: 'السيرة والملف الشخصي' },
    categoryBg: 'bg-emerald-500/10',
    categoryText: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-500/15',
    icon: FileSpreadsheet,
    title: {
      en: 'Clean ATS Resume Export & Professional Formatting Controls',
      ar: 'تصدير سيرة ذاتية متوافق مع نظام ATS وخيارات تنسيق',
    },
    description: {
      en: 'Customize font sizes, line spacing, margins, and paper sizes with print-ready ATS export previews.',
      ar: 'خصص أحجام الخطوط والمسافات الهوامش ومقاسات الورق مع معاينة للتصدير المتوافق مع نظم ATS.',
    },
    highlights: {
      en: [
        'ATS-formatted layout output ensuring compatibility with recruiter tracking systems',
        'Customizable document margins, typography scaling, and spacing controls',
        'High-resolution PDF download with clean vector text rendering',
      ],
      ar: [
        'تنسيق متوافق مع نظم تتبع المتقدمين (ATS) لضمان سهولة الفحص',
        'تحكم كامل في الهوامش وأحجام الخطوط والتباعد بين الأسطر',
        'تنزيل ملف PDF عالي الجودة بنصوص متجهة',
      ],
    },
  },

  // ── May 2026 ────────────────────────────────────────────────
  {
    id: 'may-2026-cover-letter-templates',
    date: 'May 2026',
    monthKey: '2026-05',
    year: 2026,
    category: 'ai',
    updateType: 'new',
    featureArea: { en: 'Cover Letters', ar: 'رسائل التغطية' },
    categoryLabel: { en: 'AI & Tailoring', ar: 'الذكاء الاصطناعي والتخصيص' },
    categoryBg: 'bg-rose-500/10',
    categoryText: 'text-rose-600 dark:text-rose-400',
    iconBg: 'bg-rose-500/15',
    icon: PenLine,
    title: {
      en: 'Cover Letter Template Gallery & Layout Styles',
      ar: 'معرض تصاميم وقوالب رسائل التغطية',
    },
    description: {
      en: 'Browse Classic, Modern, Compact, and Creative cover letter templates tailored to your resume and targeted positions.',
      ar: 'استكشف تصاميم وقوالب متعددة لرسائل التغطية تناسب سيرتك الذاتية والوظيفة المستهدفة.',
    },
    highlights: {
      en: [
        'Classic, Modern, Compact, and Creative cover letter template gallery',
        'Synchronized layout styling matching your resume theme',
        'Full draft control and customizable section paragraphs',
      ],
      ar: [
        'معرض قوالب يتضمن التصاميم الكلاسيكية، الحديثة، والمدمجة',
        'تنسيق متناسق يطابق مظهر سيرتك الذاتية',
        'تحكم كامل في تحرير المسودة والفقرات',
      ],
    },
  },

  // ── April 2026 ──────────────────────────────────────────────
  {
    id: 'apr-2026-portfolio-protection',
    date: 'April 2026',
    monthKey: '2026-04',
    year: 2026,
    category: 'security',
    updateType: 'improved',
    featureArea: { en: 'Portfolio Security', ar: 'أمان الملف المهني' },
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
      en: 'Enhanced privacy controls for public portfolio pages, safeguarding public contact details and protecting shared links.',
      ar: 'تحسين حماية الخصوصية والتفاعل لصفحات الملفات الشخصية العامة لحماية بيانات الاتصال والروابط المشاركة.',
    },
    highlights: {
      en: [
        'Protected public contact details against casual automated collection scripts',
        'Improved safeguards for public interactions and shared links',
        'Strengthened privacy protections around resume data',
      ],
      ar: [
        'حماية بيانات الاتصال العامة من برامج التجميع الآلي العشوائية',
        'تحسين وسائل الحماية للتفاعلات العامة والروابط المشاركة',
        'تعزيز حماية الخصوصية والأمان لبيانات السيرة الذاتية',
      ],
    },
  },
  {
    id: 'apr-2026-pdf-export-layout',
    date: 'April 2026',
    monthKey: '2026-04',
    year: 2026,
    category: 'resume',
    updateType: 'fixed',
    featureArea: { en: 'PDF Export', ar: 'تصدير PDF' },
    categoryLabel: { en: 'Resume & Portfolio', ar: 'السيرة والملف الشخصي' },
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
    monthKey: '2026-04',
    year: 2026,
    category: 'platform',
    updateType: 'improved',
    featureArea: { en: 'Performance', ar: 'الأداء' },
    categoryLabel: { en: 'Platform', ar: 'المنصة' },
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
    monthKey: '2026-04',
    year: 2026,
    category: 'resume',
    updateType: 'new',
    featureArea: { en: 'Examples Gallery', ar: 'معرض النماذج' },
    categoryLabel: { en: 'Resume & Portfolio', ar: 'السيرة والملف الشخصي' },
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
    monthKey: '2026-03',
    year: 2026,
    category: 'resume',
    updateType: 'improved',
    featureArea: { en: 'Resume Import', ar: 'استيراد السيرة' },
    categoryLabel: { en: 'Resume & Portfolio', ar: 'السيرة والملف الشخصي' },
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
    monthKey: '2026-03',
    year: 2026,
    category: 'security',
    updateType: 'improved',
    featureArea: { en: 'Account Security', ar: 'أمان الحساب' },
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
    monthKey: '2026-03',
    year: 2026,
    category: 'ai',
    updateType: 'improved',
    featureArea: { en: 'AI Routing', ar: 'مسارات الذكاء الاصطناعي' },
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
    monthKey: '2026-03',
    year: 2026,
    category: 'platform',
    updateType: 'improved',
    featureArea: { en: 'Visual Design', ar: 'التصميم المرئي' },
    categoryLabel: { en: 'Platform', ar: 'المنصة' },
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
    monthKey: '2026-03',
    year: 2026,
    category: 'resume',
    updateType: 'new',
    featureArea: { en: 'Public Portfolio', ar: 'الملف المهني العام' },
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
    monthKey: '2026-03',
    year: 2026,
    category: 'ai',
    updateType: 'new',
    featureArea: { en: 'Interview Prep', ar: 'الاستعداد للمقابلات' },
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
    monthKey: '2026-03',
    year: 2026,
    category: 'ai',
    updateType: 'new',
    featureArea: { en: 'AI Tailoring', ar: 'التخصيص بالذكاء الاصطناعي' },
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
    monthKey: '2026-03',
    year: 2026,
    category: 'ai',
    updateType: 'new',
    featureArea: { en: 'Interview Prep', ar: 'الاستعداد للمقابلات' },
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
    monthKey: '2026-03',
    year: 2026,
    category: 'jobs',
    updateType: 'new',
    featureArea: { en: 'Job Tracker', ar: 'متابعة الطلبات' },
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
    monthKey: '2026-02',
    year: 2026,
    category: 'platform',
    updateType: 'new',
    featureArea: { en: 'Authentication', ar: 'تسجيل الدخول' },
    categoryLabel: { en: 'Platform', ar: 'المنصة' },
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
    monthKey: '2026-01',
    year: 2026,
    category: 'resume',
    updateType: 'new',
    featureArea: { en: 'Resume Sharing', ar: 'مشاركة السيرة' },
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
    monthKey: '2026-01',
    year: 2026,
    category: 'resume',
    updateType: 'new',
    featureArea: { en: 'Milestones', ar: 'شاشات الإنجاز' },
    categoryLabel: { en: 'Resume & Portfolio', ar: 'السيرة والملف الشخصي' },
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
    monthKey: '2025-12',
    year: 2025,
    category: 'resume',
    updateType: 'new',
    featureArea: { en: 'Public Portfolio', ar: 'الملف المهني العام' },
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
    monthKey: '2025-12',
    year: 2025,
    category: 'resume',
    updateType: 'new',
    featureArea: { en: 'Resume Templates', ar: 'قوالب السيرة' },
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
    monthKey: '2025-11',
    year: 2025,
    category: 'ai',
    updateType: 'new',
    featureArea: { en: 'Cover Letters', ar: 'رسائل التغطية' },
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
    monthKey: '2025-11',
    year: 2025,
    category: 'platform',
    updateType: 'new',
    featureArea: { en: 'Workspace Themes', ar: 'سمات مساحة العمل' },
    categoryLabel: { en: 'Platform', ar: 'المنصة' },
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
    monthKey: '2025-10',
    year: 2025,
    category: 'platform',
    updateType: 'new',
    featureArea: { en: 'Core Platform', ar: 'المنصة الأساسية' },
    categoryLabel: { en: 'Platform', ar: 'المنصة' },
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
