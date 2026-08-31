import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import triggerHaptic from '@/lib/haptics';
import { toast } from 'sonner';
import { useLocale } from '@/i18n/LocaleProvider';
import { LanguageSwitcher } from '@/i18n/LanguageSwitcher';
import {
  whatsNewReleases,
  CATEGORY_FILTERS,
  MONTH_GROUPS,
  COMING_SOON_ITEMS,
  type ReleaseCategory,
  type ReleaseUpdate,
} from '@/data/whatsNewData';
import {
  Sparkles,
  Rocket,
  Clock,
  ChevronDown,
  ChevronUp,
  Filter,
  Calendar,
  Share2,
  Check,
  Zap,
} from 'lucide-react';

export default function WhatsNewPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { locale, direction } = useLocale();

  const lang = (locale === 'ar' ? 'ar' : 'en') as 'en' | 'ar';
  const isRTL = direction === 'rtl';

  const [activeCategory, setActiveCategory] = useState<ReleaseCategory>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [showOlder, setShowOlder] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Separate featured update from the main list
  const featuredRelease = useMemo(() => {
    return whatsNewReleases.find((r) => r.featured);
  }, []);

  // Filtered releases list
  const filteredReleases = useMemo(() => {
    return whatsNewReleases.filter((release) => {
      // Exclude featured release from main feed when all categories & months are selected to avoid duplication
      if (release.featured && activeCategory === 'all' && selectedMonth === 'all') {
        return false;
      }
      // Category filter
      if (activeCategory !== 'all' && release.category !== activeCategory) {
        return false;
      }
      // Month filter
      if (selectedMonth !== 'all') {
        if (selectedMonth === 'older') {
          if (release.year >= 2026 && release.monthYear !== 'older') return false;
        } else if (release.monthYear !== selectedMonth) {
          return false;
        }
      }
      // Progressive disclosure: hide 2025 releases unless showOlder is true or user filtered explicitly
      if (!showOlder && release.year < 2026 && selectedMonth === 'all') {
        return false;
      }
      return true;
    });
  }, [activeCategory, selectedMonth, showOlder]);

  const handleGetStarted = () => {
    triggerHaptic.light();
    void Promise.resolve(navigate('/auth?mode=signup')).catch(() => {
      toast.error(
        lang === 'ar'
          ? 'تعذر فتح صفحة التسجيل. يرجى المحاولة مرة أخرى.'
          : 'Could not open sign-up. Please try again.'
      );
    });
  };

  const handleShareAnchor = (id: string) => {
    triggerHaptic.light();
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    void navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      toast.success(
        lang === 'ar'
          ? 'تم نسخ رابط التحديث إلى الحافظة'
          : 'Update link copied to clipboard'
      );
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  const resetFilters = () => {
    triggerHaptic.light();
    setActiveCategory('all');
    setSelectedMonth('all');
  };

  return (
    <div className="min-h-screen bg-background text-foreground aurora-page-root flex flex-col" dir={direction}>
      {/* Sticky Navigation Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-xs">
        <div className="flex items-center justify-between px-4 sm:px-6 h-16 max-w-6xl mx-auto w-full">
          <Link
            to="/"
            className="flex items-center gap-2 text-lg font-bold text-primary tracking-tight hover:opacity-85 transition-opacity"
          >
            <Zap className="w-5 h-5 text-primary fill-primary/20" />
            <span>WiseResume</span>
          </Link>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            {isAuthenticated ? (
              <button
                onClick={() => {
                  triggerHaptic.light();
                  navigate('/dashboard');
                }}
                className="text-sm font-semibold px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
              >
                {lang === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
              </button>
            ) : (
              <button
                onClick={handleGetStarted}
                className="text-sm font-semibold px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
              >
                {lang === 'ar' ? 'ابدأ مجاناً' : 'Get Started Free'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Hub */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 w-full">
        {/* Page Hero Header */}
        <div className="text-center mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 border border-primary/20 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            {lang === 'ar' ? 'مركز تحديثات المنتجات' : 'WiseResume Release Hub'}
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4 text-foreground">
            {lang === 'ar' ? 'ما الجديد في WiseResume' : "What's New in WiseResume"}
          </h1>

          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            {lang === 'ar'
              ? 'استكشف أحدث الميزات، التحسينات، والتحديثات القانونية التي تم إطلاقها في WiseResume.'
              : 'Explore the latest features, enhancements, performance improvements, and updates shipped to WiseResume.'}
          </p>
        </div>

        {/* Featured Release Card */}
        {featuredRelease && (
          <div className="mb-10 rounded-2xl border border-primary/20 bg-card p-6 sm:p-8 shadow-sm relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-primary text-primary-foreground">
                <Rocket className="w-3.5 h-3.5" />
                {lang === 'ar' ? 'إصدار رئيسي بارز' : 'Featured Release'}
              </div>
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {featuredRelease.date}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold mb-3 text-foreground">
              {featuredRelease.title[lang]}
            </h2>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-5">
              {featuredRelease.description[lang]}
            </p>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {featuredRelease.highlights[lang].map((highlight, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm text-foreground/90">
                  <span className="mt-1 flex-shrink-0 w-4 h-4 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">
                    ✓
                  </span>
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Controls Section: Category Filters & Month Selector */}
        <div className="mb-8 space-y-4">
          {/* Category Filter Tabs */}
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'التصنيف' : 'Category'}</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
              {CATEGORY_FILTERS.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      triggerHaptic.light();
                      setActiveCategory(cat.id);
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all snap-start ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {cat.label[lang]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Month Jump Selector */}
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'الشهر' : 'Month'}</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
              <button
                onClick={() => {
                  triggerHaptic.light();
                  setSelectedMonth('all');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all snap-start ${
                  selectedMonth === 'all'
                    ? 'bg-secondary text-secondary-foreground font-semibold border border-border'
                    : 'bg-background border border-border/60 text-muted-foreground hover:text-foreground'
                }`}
              >
                {lang === 'ar' ? 'جميع الأشهر' : 'All Months'}
              </button>
              {MONTH_GROUPS.map((month) => {
                const isActive = selectedMonth === month.id;
                return (
                  <button
                    key={month.id}
                    onClick={() => {
                      triggerHaptic.light();
                      setSelectedMonth(month.id);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all snap-start ${
                      isActive
                        ? 'bg-secondary text-secondary-foreground font-semibold border border-border'
                        : 'bg-background border border-border/60 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {month.label[lang]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Release Cards Feed */}
        {filteredReleases.length === 0 ? (
          <div className="text-center py-14 px-4 bg-card border border-border rounded-2xl">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 text-muted-foreground">
              <Filter className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">
              {lang === 'ar' ? 'لم يتم العثور على تحديثات' : 'No updates found'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
              {lang === 'ar'
                ? 'جرّب تغيير خيارات التصفية لعرض التحديثات المتاحة.'
                : 'Try clearing your active filters to see available updates.'}
            </p>
            <button
              onClick={resetFilters}
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {lang === 'ar' ? 'إعادة ضبط التصفية' : 'Reset Filters'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredReleases.map((entry) => {
              const Icon = entry.icon;
              const isCopied = copiedId === entry.id;

              return (
                <article
                  key={entry.id}
                  id={entry.id}
                  className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-2xs hover:shadow-xs transition-all relative group"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg ${entry.iconBg} flex items-center justify-center flex-shrink-0`}
                      >
                        <Icon className={`w-4 h-4 ${entry.categoryText}`} />
                      </div>
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${entry.categoryBg} ${entry.categoryText}`}
                      >
                        {entry.categoryLabel[lang]}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">
                        {entry.date}
                      </span>
                    </div>

                    <button
                      onClick={() => handleShareAnchor(entry.id)}
                      title={lang === 'ar' ? 'نسخ رابط التحديث' : 'Copy update link'}
                      className="text-muted-foreground hover:text-foreground opacity-60 hover:opacity-100 p-1.5 rounded-lg hover:bg-muted transition-all"
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-foreground mb-2 leading-snug">
                    {entry.title[lang]}
                  </h3>

                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {entry.description[lang]}
                  </p>

                  <ul className="space-y-2 pt-2 border-t border-border/50">
                    {entry.highlights[lang].map((highlight, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        )}

        {/* Progressive Disclosure Toggle for Older Releases */}
        {selectedMonth === 'all' && (
          <div className="mt-8 text-center">
            <button
              onClick={() => {
                triggerHaptic.light();
                setShowOlder((prev) => !prev);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted/50 transition-colors shadow-2xs"
            >
              {showOlder ? (
                <>
                  <span>{lang === 'ar' ? 'إخفاء التحديثات الأقدم' : 'Hide Older Updates'}</span>
                  <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>{lang === 'ar' ? 'عرض تحديثات 2025 الأقدم' : 'Show Older 2025 Updates'}</span>
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Coming Soon Section */}
        <div className="mt-14 pt-8 border-t border-border">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-wider">
              {lang === 'ar' ? 'قريباً في WiseResume' : 'Coming Soon'}
            </h2>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {COMING_SOON_ITEMS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="flex items-start gap-3.5 p-4 rounded-xl border border-dashed border-border bg-card/50"
                >
                  <div
                    className={`flex-shrink-0 w-9 h-9 rounded-lg ${item.iconBg} flex items-center justify-center`}
                  >
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground mb-0.5">
                      {item.title[lang]}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.description[lang]}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Call to Action Card */}
        <div className="mt-14 rounded-2xl border border-border bg-card p-8 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-foreground">
            {lang === 'ar' ? 'جاهز لتطوير سيرتك الذاتية؟' : 'Ready to upgrade your resume?'}
          </h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto leading-relaxed">
            {lang === 'ar'
              ? 'انضم إلى WiseResume وابدأ في تكييف سيرتك الذاتية وتطوير مسارك المهني مع كل تحديث جديد.'
              : 'Join WiseResume to tailor your CV, track applications, and level up your career search.'}
          </p>
          {isAuthenticated ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 h-11 px-7 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors text-sm shadow-xs"
            >
              {lang === 'ar' ? 'الانتقال إلى لوحة التحكم' : 'Go to Dashboard'}
            </button>
          ) : (
            <button
              onClick={handleGetStarted}
              className="inline-flex items-center gap-2 h-11 px-7 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors text-sm shadow-xs"
            >
              {lang === 'ar' ? 'ابدأ مجاناً الان' : 'Get Started Free'}
            </button>
          )}
        </div>
      </main>

      {/* Canonical Footer */}
      <footer className="border-t border-border py-8 text-center text-xs sm:text-sm text-muted-foreground bg-card/30 mt-auto">
        <div className="flex flex-wrap justify-center gap-5 mb-3 font-medium">
          <Link to="/" className="hover:text-foreground transition-colors">
            {lang === 'ar' ? 'الرئيسية' : 'Home'}
          </Link>
          <Link to={locale === 'ar' ? '/ar/pricing' : '/pricing'} className="hover:text-foreground transition-colors">
            {lang === 'ar' ? 'الأسعار' : 'Pricing'}
          </Link>
          <Link to={locale === 'ar' ? '/ar/privacy' : '/privacy'} className="hover:text-foreground transition-colors">
            {lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
          </Link>
          <Link to={locale === 'ar' ? '/ar/terms' : '/terms'} className="hover:text-foreground transition-colors">
            {lang === 'ar' ? 'شروط الخدمة' : 'Terms of Service'}
          </Link>
          <Link to={locale === 'ar' ? '/ar/refund-policy' : '/refund-policy'} className="hover:text-foreground transition-colors">
            {lang === 'ar' ? 'سياسة الاسترداد' : 'Refund Policy'}
          </Link>
        </div>
        <p>© {new Date().getFullYear()} WiseResume. All rights reserved.</p>
      </footer>
    </div>
  );
}
